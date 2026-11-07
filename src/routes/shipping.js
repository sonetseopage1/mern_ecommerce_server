const router = require('express').Router();
const ShippingRule = require('../models/ShippingRule');
const GeoArea = require('../models/GeoArea');
const { staff } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');
const { resolveArea, quote, FALLBACK } = require('../utils/shipping');

// Public: shipping charge for a thana at a given cart total ({ upazilaId, subtotal })
router.post('/quote', wrap(async (req, res) => {
  const area = await resolveArea(req.body.upazilaId);
  const q = await quote(area, Math.max(0, +req.body.subtotal || 0));
  res.json({ ...q, area: { division: area.division.name, district: area.district.name, upazila: area.upazila.name } });
}));

// Admin / manager: every saved rule (the default one + overrides)
router.get('/rules', staff, wrap(async (_req, res) => {
  const rules = await ShippingRule.find();
  const def = rules.find((r) => r.level === 'default');
  res.json({
    default: { charge: def?.charge ?? FALLBACK.charge, freeOver: def?.freeOver ?? FALLBACK.freeOver, codAllowed: def?.codAllowed ?? FALLBACK.codAllowed },
    rules: rules.filter((r) => r.level !== 'default').map((r) => ({ level: r.level, refId: r.refId, charge: r.charge, codAllowed: r.codAllowed })),
  });
}));

const num = (v) => (v === '' || v == null ? null : Math.max(0, Number(v)));

router.put('/default', staff, wrap(async (req, res) => {
  const { charge, freeOver, codAllowed } = req.body;
  if (num(charge) == null || Number.isNaN(num(charge))) throw httpError(400, 'Enter a valid default charge');
  await ShippingRule.findOneAndUpdate({ level: 'default', refId: '' }, { charge: num(charge), freeOver: num(freeOver) ?? 0, codAllowed: codAllowed !== false }, { upsert: true, new: true });
  res.json({ ok: true });
}));

// Set / clear an override for a division, district or thana: { level, refId, charge, codAllowed }. null = inherit.
router.put('/rule', staff, wrap(async (req, res) => {
  const { level, refId } = req.body;
  if (!['division', 'district', 'upazila'].includes(level) || !refId) throw httpError(400, 'Invalid area');
  if (!(await GeoArea.exists({ type: level, id: String(refId) }))) throw httpError(404, 'Area not found');
  const charge = num(req.body.charge);
  const cod = req.body.codAllowed === null || req.body.codAllowed === undefined ? null : !!req.body.codAllowed;
  if (charge != null && Number.isNaN(charge)) throw httpError(400, 'Invalid charge');
  if (charge == null && cod == null) { await ShippingRule.deleteOne({ level, refId: String(refId) }); return res.json({ ok: true, removed: true }); }
  await ShippingRule.findOneAndUpdate({ level, refId: String(refId) }, { charge, codAllowed: cod }, { upsert: true, new: true });
  res.json({ ok: true });
}));

module.exports = router;
