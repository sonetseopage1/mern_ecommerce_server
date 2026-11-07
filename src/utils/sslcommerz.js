const PaymentConfig = require('../models/PaymentConfig');
const { decrypt } = require('./secure');
const { httpError } = require('./helpers');

const HOSTS = {
  sandbox: { init: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php', validate: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php' },
  live: { init: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php', validate: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php' },
};

async function getConfig() {
  return (await PaymentConfig.findOne({ key: 'payments' })) || { cod: { enabled: true }, sslcommerz: { enabled: false, sandbox: true } };
}

// credentials with the password decrypted (server side only)
async function creds() {
  const s = (await getConfig()).sslcommerz || {};
  return { enabled: !!s.enabled, sandbox: s.sandbox !== false, storeId: s.storeId || '', storePassword: decrypt(s.storePassword) };
}
const ready = (c) => !!(c.enabled && c.storeId && c.storePassword);
const urls = (c) => (c.sandbox ? HOSTS.sandbox : HOSTS.live);

const post = async (url, form) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  return r.json().catch(() => ({}));
};

// Starts a payment session and returns where to send the customer.
async function initSession({ order, user, apiBase, c }) {
  const tranId = `SN${Date.now().toString(36).toUpperCase()}${String(order._id).slice(-6).toUpperCase()}`;
  const sh = order.shipping || {};
  const data = await post(urls(c).init, {
    store_id: c.storeId, store_passwd: c.storePassword,
    total_amount: String(order.total), currency: 'BDT', tran_id: tranId,
    success_url: `${apiBase}/api/payments/sslcommerz/success`, fail_url: `${apiBase}/api/payments/sslcommerz/fail`,
    cancel_url: `${apiBase}/api/payments/sslcommerz/cancel`, ipn_url: `${apiBase}/api/payments/sslcommerz/ipn`,
    cus_name: sh.name || user.name, cus_email: user.email, cus_add1: (sh.address || 'N/A').slice(0, 50), cus_city: sh.district?.name || 'Dhaka',
    cus_state: sh.division?.name || 'Dhaka', cus_postcode: '1000', cus_country: 'Bangladesh', cus_phone: sh.phone || '01700000000',
    shipping_method: 'NO', num_of_item: String(order.items.length), product_name: `Order #${String(order._id).slice(-8).toUpperCase()}`,
    product_category: 'General', product_profile: 'general', value_a: String(order._id),
  });
  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) throw httpError(502, `SSLCommerz: ${data.failedreason || 'could not start the payment'}`);
  return { tranId, sessionKey: data.sessionkey, url: data.GatewayPageURL };
}

// Server-to-server check of a finished payment (never trust the browser redirect alone).
async function validatePayment(valId, c) {
  const q = new URLSearchParams({ val_id: valId, store_id: c.storeId, store_passwd: c.storePassword, format: 'json' });
  const r = await fetch(`${urls(c).validate}?${q}`);
  return r.json().catch(() => ({}));
}

// Marks the order paid when SSLCommerz confirms the transaction. Safe to call twice (browser redirect + IPN).
async function confirmOrderPayment(order, valId) {
  if (order.paymentStatus === 'paid') return true;
  const c = await creds();
  if (!valId || !c.storeId) return false;
  const v = await validatePayment(valId, c);
  const valid = ['VALID', 'VALIDATED'].includes(v.status);
  const sameTran = v.tran_id === order.payment?.tranId;
  const sameAmount = Math.abs(Number(v.currency_amount || v.amount) - order.total) < 1;
  if (!(valid && sameTran && sameAmount)) { order.payment = { ...order.payment?.toObject?.(), gatewayStatus: v.status || 'INVALID' }; await order.save(); return false; }
  order.paymentStatus = 'paid';
  order.payment = { ...order.payment.toObject(), valId, bankTranId: v.bank_tran_id, cardType: v.card_type, cardBrand: v.card_brand, amount: Number(v.amount), paidAt: new Date(), gatewayStatus: v.status };
  await order.save();
  return true;
}

module.exports = { getConfig, creds, ready, initSession, validatePayment, confirmOrderPayment };
