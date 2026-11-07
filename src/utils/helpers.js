const httpError = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function isFlashLive(p) {
  const f = p.flashDeal;
  if (!f || !f.active) return false;
  const now = Date.now();
  return (!f.startsAt || now >= +new Date(f.startsAt)) && (!f.endsAt || now <= +new Date(f.endsAt));
}

// Effective selling price for a product (and optional variant) incl. flash deal
function unitPrice(p, v) {
  const base = v ? v.price : p.price;
  return isFlashLive(p) ? Math.round(base * (1 - p.flashDeal.discountPercent / 100)) : base;
}

// subtotal = whole cart, eligible = part of the cart the coupon applies to (defaults to subtotal)
function couponDiscount(c, subtotal, eligible = subtotal) {
  if (!c || !c.active) throw httpError(400, 'Invalid coupon');
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) throw httpError(400, 'Coupon expired');
  if (c.startsAt && new Date(c.startsAt) > new Date()) throw httpError(400, 'Coupon not active yet');
  if (c.usageLimit && c.used >= c.usageLimit) throw httpError(400, 'Coupon usage limit reached');
  if (subtotal < (c.minOrder || 0)) throw httpError(400, `Minimum order ৳${c.minOrder} required`);
  if (eligible <= 0) throw httpError(400, 'This coupon is not valid for the products in your cart');
  let d = c.type === 'percent' ? (eligible * c.value) / 100 : c.value;
  if (c.type === 'percent' && c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return Math.min(Math.round(d), eligible);
}

const variantLabel = (v) => (!v ? '' : v.attributes?.length ? v.attributes.map((a) => a.value).join(' / ') : [v.color, v.size].filter(Boolean).join(' / '));

module.exports = { httpError, wrap, isFlashLive, unitPrice, couponDiscount, variantLabel };
