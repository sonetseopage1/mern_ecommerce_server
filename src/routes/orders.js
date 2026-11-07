const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect, staff } = require('../middleware/auth');
const { httpError, wrap, unitPrice, couponDiscount, variantLabel } = require('../utils/helpers');
const { resolveArea, quote, brief } = require('../utils/shipping');
const ssl = require('../utils/sslcommerz');

const apiBase = (req) => process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAY_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'];

async function restoreStock(order) {
  for (const it of order.items) {
    const p = await Product.findById(it.product);
    if (!p) continue;
    if (it.variantId) { const v = p.variants.id(it.variantId); if (v) v.stock += it.qty; } else p.stock += it.qty;
    p.sold = Math.max(0, p.sold - it.qty);
    await p.save();
  }
}

router.post('/', protect, wrap(async (req, res) => {
  const { items, shipping = {}, couponCode, paymentMethod = 'COD' } = req.body;
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Cart is empty');
  if (!shipping.name || !shipping.phone || !shipping.address) throw httpError(400, 'Name, phone and address are required');
  if (!['COD', 'SSLCOMMERZ'].includes(paymentMethod)) throw httpError(400, 'Invalid payment method');
  const geo = await resolveArea(shipping.upazilaId); // division → district → thana must be a real combination

  const lines = [];
  for (const it of items) {
    const p = await Product.findById(it.product);
    if (!p || !p.active) throw httpError(400, 'A product in your cart is no longer available');
    const v = it.variantId ? p.variants.id(it.variantId) : null;
    if (it.variantId && !v) throw httpError(400, `Variant of ${p.name.en} is no longer available`);
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    const stock = v ? v.stock : p.stock;
    if (qty > stock) throw httpError(400, `Only ${stock} left for ${p.name.en}`);
    if (p.expDate && p.expDate < new Date()) throw httpError(400, `${p.name.en} has expired`);
    lines.push({ p, v, qty });
  }

  const orderItems = lines.map(({ p, v, qty }) => ({
    product: p._id, variantId: v ? String(v._id) : undefined, name: p.name,
    image: v?.image || p.images[0], variantLabel: variantLabel(v), price: unitPrice(p, v), qty,
  }));
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);

  let discount = 0, coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    const allowed = new Set((coupon?.products || []).map(String));
    const eligible = allowed.size ? orderItems.filter((i) => allowed.has(String(i.product))).reduce((s, i) => s + i.price * i.qty, 0) : subtotal;
    discount = couponDiscount(coupon, subtotal, eligible);
  }

  // shipping charge comes from the delivery area; payment method must be switched on (and COD allowed in that area)
  const ship = await quote(geo, subtotal - discount);
  const cfg = await ssl.getConfig();
  let creds = null;
  if (paymentMethod === 'COD') {
    if (cfg.cod?.enabled === false) throw httpError(400, 'Cash on delivery is currently unavailable');
    if (!ship.codAllowed) throw httpError(400, 'Cash on delivery is not available for your area – please pay online');
  } else {
    creds = await ssl.creds();
    if (!ssl.ready(creds)) throw httpError(400, 'Online payment is currently unavailable');
  }

  for (const { p, v, qty } of lines) {
    if (v) v.stock -= qty; else p.stock -= qty;
    p.sold += qty;
    await p.save();
  }

  const order = await Order.create({
    user: req.user._id, items: orderItems, paymentMethod, couponCode: coupon?.code, subtotal, discount, shippingFee: ship.charge, total: subtotal - discount + ship.charge,
    shipping: { name: shipping.name, phone: shipping.phone, email: req.user.email, address: shipping.address, note: shipping.note, city: geo.district.name, division: brief(geo.division), district: brief(geo.district), upazila: brief(geo.upazila) },
    statusHistory: [{ status: 'pending', by: req.user.name }],
  });

  if (paymentMethod === 'SSLCOMMERZ') {
    try {
      const s = await ssl.initSession({ order, user: req.user, apiBase: apiBase(req), c: creds });
      order.payment = { tranId: s.tranId, sessionKey: s.sessionKey };
      await order.save();
      if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { used: 1 } });
      return res.status(201).json({ order, paymentUrl: s.url });
    } catch (e) { // could not reach the gateway: undo the order so stock is not locked
      await restoreStock(order);
      order.status = 'cancelled';
      order.statusHistory.push({ status: 'cancelled', by: 'system' });
      await order.save();
      throw e;
    }
  }
  if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { used: 1 } });
  res.status(201).json({ order });
}));

router.get('/mine', protect, wrap(async (req, res) => res.json(await Order.find({ user: req.user._id }).sort('-createdAt'))));

// Staff list with simple filters: ?q= (order no / name / phone)  &status=  &payment=
router.get('/', staff, wrap(async (req, res) => {
  const { q, status, payment } = req.query;
  const f = {};
  if (STATUSES.includes(status)) f.status = status;
  if (PAY_STATUSES.includes(payment)) f.paymentStatus = payment;
  if (q) {
    const esc = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    f.$or = [{ 'shipping.name': new RegExp(esc, 'i') }, { 'shipping.phone': new RegExp(esc, 'i') }, { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${esc}$`, options: 'i' } } }];
  }
  res.json(await Order.find(f).populate('user', 'name email').sort('-createdAt').limit(300));
}));

router.get('/:id', protect, wrap(async (req, res) => {
  const o = await Order.findById(req.params.id).populate('user', 'name email');
  if (!o) throw httpError(404, 'Order not found');
  const owner = String(o.user._id) === String(req.user._id);
  if (!owner && req.user.role === 'user') throw httpError(403, 'Forbidden');
  res.json(o);
}));

router.put('/:id/status', staff, wrap(async (req, res) => {
  const next = req.body.status;
  if (!STATUSES.includes(next)) throw httpError(400, 'Invalid status');
  const o = await Order.findById(req.params.id);
  if (!o) throw httpError(404, 'Order not found');
  if (o.status === 'cancelled' && next !== 'cancelled') throw httpError(400, 'A cancelled order cannot be re-opened');
  if (o.status !== next) {
    if (next === 'cancelled') await restoreStock(o); // put the items back on the shelf
    o.status = next;
    o.statusHistory.push({ status: next, by: req.user.name });
    if (next === 'delivered' && o.paymentMethod === 'COD' && o.paymentStatus === 'unpaid') { // cash collected on delivery
      o.paymentStatus = 'paid';
      o.payment = { ...(o.payment?.toObject?.() || {}), amount: o.total, paidAt: new Date(), gatewayStatus: 'COD_COLLECTED' };
    }
    await o.save();
  }
  res.json(o);
}));

router.put('/:id/payment', staff, wrap(async (req, res) => {
  if (!PAY_STATUSES.includes(req.body.paymentStatus)) throw httpError(400, 'Invalid payment status');
  const o = await Order.findById(req.params.id);
  if (!o) throw httpError(404, 'Order not found');
  o.paymentStatus = req.body.paymentStatus;
  if (o.paymentStatus === 'paid' && !o.payment?.paidAt) o.payment = { ...(o.payment?.toObject?.() || {}), amount: o.total, paidAt: new Date() };
  await o.save();
  res.json(o);
}));

router.put('/:id/note', staff, wrap(async (req, res) => {
  const o = await Order.findByIdAndUpdate(req.params.id, { adminNote: String(req.body.adminNote || '').slice(0, 1000) }, { new: true });
  if (!o) throw httpError(404, 'Order not found');
  res.json(o);
}));

// Customer: retry the online payment of an unpaid order
router.post('/:id/pay', protect, wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || String(o.user) !== String(req.user._id)) throw httpError(404, 'Order not found');
  if (o.paymentMethod !== 'SSLCOMMERZ' || o.paymentStatus === 'paid' || o.status === 'cancelled') throw httpError(400, 'This order cannot be paid online');
  const c = await ssl.creds();
  if (!ssl.ready(c)) throw httpError(400, 'Online payment is currently unavailable');
  const s = await ssl.initSession({ order: o, user: req.user, apiBase: apiBase(req), c });
  o.payment = { ...(o.payment?.toObject?.() || {}), tranId: s.tranId, sessionKey: s.sessionKey, gatewayStatus: 'PENDING' };
  o.paymentStatus = 'unpaid';
  await o.save();
  res.json({ paymentUrl: s.url });
}));

module.exports = router;
