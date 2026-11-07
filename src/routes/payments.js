const router = require('express').Router();
const PaymentConfig = require('../models/PaymentConfig');
const Order = require('../models/Order');
const { adminOnly } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');
const { encrypt } = require('../utils/secure');
const { resolveArea, quote } = require('../utils/shipping');
const ssl = require('../utils/sslcommerz');

const apiBase = (req) => process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();

// Public: which payment methods the customer can pick (optionally for a given thana)
router.get('/methods', wrap(async (req, res) => {
  const cfg = await ssl.getConfig();
  let codHere = true;
  if (req.query.upazila) codHere = (await quote(await resolveArea(req.query.upazila), 0)).codAllowed;
  const c = await ssl.creds();
  res.json({
    cod: { enabled: cfg.cod?.enabled !== false, availableHere: codHere },
    sslcommerz: { enabled: ssl.ready(c), sandbox: c.sandbox },
  });
}));

// ---- Admin: switch methods on/off and store the SSLCommerz credentials ---------------------------------
router.get('/config', adminOnly, wrap(async (req, res) => {
  const cfg = await ssl.getConfig();
  const s = cfg.sslcommerz || {};
  res.json({
    cod: { enabled: cfg.cod?.enabled !== false },
    sslcommerz: { enabled: !!s.enabled, sandbox: s.sandbox !== false, storeId: s.storeId || '', hasPassword: !!s.storePassword }, // the password is never sent back
    urls: {
      success: `${apiBase(req)}/api/payments/sslcommerz/success`, fail: `${apiBase(req)}/api/payments/sslcommerz/fail`,
      cancel: `${apiBase(req)}/api/payments/sslcommerz/cancel`, ipn: `${apiBase(req)}/api/payments/sslcommerz/ipn`,
    },
  });
}));

router.put('/config', adminOnly, wrap(async (req, res) => {
  const { cod, sslcommerz: s } = req.body;
  const cur = await PaymentConfig.findOne({ key: 'payments' });
  const set = {};
  if (cod && cod.enabled !== undefined) set['cod.enabled'] = !!cod.enabled;
  if (s) {
    if (s.enabled !== undefined) set['sslcommerz.enabled'] = !!s.enabled;
    if (s.sandbox !== undefined) set['sslcommerz.sandbox'] = !!s.sandbox;
    if (s.storeId !== undefined) set['sslcommerz.storeId'] = String(s.storeId).trim();
    if (s.storePassword) set['sslcommerz.storePassword'] = encrypt(String(s.storePassword).trim()); // only replaced when a new one is typed
    const hasPw = !!(s.storePassword || cur?.sslcommerz?.storePassword);
    const storeId = s.storeId !== undefined ? String(s.storeId).trim() : cur?.sslcommerz?.storeId;
    if (s.enabled && !(hasPw && storeId)) throw httpError(400, 'Enter the SSLCommerz Store ID and Store Password before enabling it');
  }
  // never allow both methods to be off – customers could not check out
  const codOn = set['cod.enabled'] ?? (cur?.cod?.enabled !== false);
  const sslOn = set['sslcommerz.enabled'] ?? !!cur?.sslcommerz?.enabled;
  if (!codOn && !sslOn) throw httpError(400, 'At least one payment method must stay enabled');
  await PaymentConfig.findOneAndUpdate({ key: 'payments' }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ ok: true });
}));

// Admin: open a 10 BDT test session to prove the saved credentials work
router.post('/test', adminOnly, wrap(async (req, res) => {
  const c = await ssl.creds();
  if (!c.storeId || !c.storePassword) throw httpError(400, 'Save the Store ID and Password first');
  const fake = { _id: '000000000000000000000000', total: 10, items: [{}], shipping: { name: 'Test', phone: '01700000000', address: 'Test', district: { name: 'Dhaka' }, division: { name: 'Dhaka' } } };
  const s = await ssl.initSession({ order: fake, user: req.user, apiBase: apiBase(req), c });
  res.json({ ok: true, mode: c.sandbox ? 'sandbox' : 'live', gateway: s.url.split('/').slice(0, 3).join('/') });
}));

// ---- SSLCommerz callbacks (the gateway sends the customer's browser here with a POST) -------------------
const find = (b) => Order.findOne({ 'payment.tranId': b.tran_id || b.tranId });
const back = (res, order, result) => res.redirect(303, `${clientUrl()}/orders/${order ? order._id : ''}?payment=${result}`);

router.all('/sslcommerz/success', wrap(async (req, res) => {
  const b = { ...req.query, ...req.body };
  const order = await find(b);
  if (!order) return res.redirect(303, `${clientUrl()}/orders`);
  const ok = await ssl.confirmOrderPayment(order, b.val_id);
  if (!ok && order.paymentStatus !== 'paid') { order.paymentStatus = 'failed'; await order.save(); }
  back(res, order, order.paymentStatus === 'paid' ? 'success' : 'failed');
}));

router.all('/sslcommerz/fail', wrap(async (req, res) => {
  const order = await find({ ...req.query, ...req.body });
  if (order && order.paymentStatus !== 'paid') { order.paymentStatus = 'failed'; order.payment.gatewayStatus = 'FAILED'; await order.save(); }
  back(res, order, 'failed');
}));

router.all('/sslcommerz/cancel', wrap(async (req, res) => {
  const order = await find({ ...req.query, ...req.body });
  if (order && order.paymentStatus !== 'paid') { order.payment.gatewayStatus = 'CANCELLED'; await order.save(); }
  back(res, order, 'cancelled');
}));

// Instant Payment Notification: server-to-server, covers customers who close the browser before returning
router.post('/sslcommerz/ipn', wrap(async (req, res) => {
  const order = await find(req.body);
  if (order && ['VALID', 'VALIDATED'].includes(req.body.status)) await ssl.confirmOrderPayment(order, req.body.val_id);
  res.send('OK');
}));

module.exports = router;
