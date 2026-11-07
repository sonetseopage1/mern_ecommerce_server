const router = require('express').Router();
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const { staff } = require('../middleware/auth');
const { httpError, wrap, couponDiscount, unitPrice } = require('../utils/helpers');

// Price the cart lines on the server and split out the part a coupon applies to.
async function cartTotals(items, coupon) {
  let subtotal = 0, eligible = 0;
  const allowed = new Set((coupon.products || []).map(String));
  for (const it of items || []) {
    const p = await Product.findById(it.product);
    if (!p) continue;
    const v = it.variantId ? p.variants.id(it.variantId) : null;
    const line = unitPrice(p, v) * Math.max(1, parseInt(it.qty, 10) || 1);
    subtotal += line;
    if (!allowed.size || allowed.has(String(p._id))) eligible += line;
  }
  return { subtotal, eligible };
}

// Public: validate a code against the cart ({ code, items:[{product, variantId, qty}] } – or legacy { subtotal })
router.post('/validate', wrap(async (req, res) => {
  const c = await Coupon.findOne({ code: String(req.body.code || '').toUpperCase().trim() });
  if (!c) throw httpError(404, 'Coupon not found');
  let subtotal = +req.body.subtotal || 0, eligible = subtotal;
  if (Array.isArray(req.body.items)) ({ subtotal, eligible } = await cartTotals(req.body.items, c));
  else if (c.products?.length) throw httpError(400, 'This coupon is for specific products');
  const discount = couponDiscount(c, subtotal, eligible);
  res.json({ code: c.code, discount, type: c.type, value: c.value, productSpecific: !!c.products?.length });
}));

// Public: coupons advertised on a product page
router.get('/for-product/:id', wrap(async (req, res) => {
  const now = new Date();
  const list = await Coupon.find({
    active: true, showOnProduct: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] },
      { $or: [{ products: { $size: 0 } }, { products: req.params.id }] },
    ],
  }).select('code type value minOrder maxDiscount expiresAt');
  res.json(list);
}));

router.get('/', staff, wrap(async (_req, res) => res.json(await Coupon.find().populate('products', 'name slug images').sort('-createdAt'))));

const body = (b) => {
  const d = { ...b };
  delete d._id; delete d.used; delete d.__v;
  d.products = (d.products || []).map((p) => (typeof p === 'object' ? p._id : p));
  return d;
};
router.post('/', staff, wrap(async (req, res) => res.status(201).json(await Coupon.create(body(req.body)))));
router.put('/:id', staff, wrap(async (req, res) => {
  const c = await Coupon.findByIdAndUpdate(req.params.id, body(req.body), { new: true, runValidators: true });
  if (!c) throw httpError(404, 'Not found');
  res.json(c);
}));
router.delete('/:id', staff, wrap(async (req, res) => { await Coupon.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = router;
