const router = require('express').Router();
const Banner = require('../models/Banner');
const { staff } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');

// links may only be site-relative paths or http(s) URLs (never javascript:)
const safeLink = (l) => (typeof l === 'string' && /^(\/(?!\/)|https?:\/\/)/i.test(l.trim()) ? l.trim() : '/products');
const body = (b) => {
  const d = { image: b.image, title: b.title, subtitle: b.subtitle, buttonText: b.buttonText, link: b.link !== undefined ? safeLink(b.link) : undefined, active: b.active };
  Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
  return d;
};

router.get('/', wrap(async (_req, res) => res.json(await Banner.find({ active: true }).sort('order createdAt'))));
router.get('/admin/all', staff, wrap(async (_req, res) => res.json(await Banner.find().sort('order createdAt'))));

router.post('/', staff, wrap(async (req, res) => {
  if (!req.body.image) throw httpError(400, 'Image is required');
  res.status(201).json(await Banner.create({ ...body(req.body), order: await Banner.countDocuments() }));
}));

// { items: [{ id, order }] }
router.put('/reorder', staff, wrap(async (req, res) => {
  await Banner.bulkWrite((req.body.items || []).map((i) => ({ updateOne: { filter: { _id: i.id }, update: { order: i.order } } })));
  res.json({ ok: true });
}));

router.put('/:id', staff, wrap(async (req, res) => {
  const b = await Banner.findByIdAndUpdate(req.params.id, body(req.body), { new: true, runValidators: true });
  if (!b) throw httpError(404, 'Not found');
  res.json(b);
}));

router.delete('/:id', staff, wrap(async (req, res) => { await Banner.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = router;
