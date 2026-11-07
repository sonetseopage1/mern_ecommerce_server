const router = require('express').Router();
const Faq = require('../models/Faq');
const { adminOnly } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');
const { cleanBi } = require('../utils/sanitize');

router.get('/', wrap(async (_req, res) => res.json(await Faq.find({ active: true }).sort('order createdAt'))));
router.get('/admin/all', adminOnly, wrap(async (_req, res) => res.json(await Faq.find().sort('order createdAt'))));

const body = (b) => {
  const d = { question: b.question, answer: cleanBi(b.answer), active: b.active };
  Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
  return d;
};

router.post('/', adminOnly, wrap(async (req, res) => {
  if (!req.body.question?.en) throw httpError(400, 'English question is required');
  res.status(201).json(await Faq.create({ ...body(req.body), order: await Faq.countDocuments() }));
}));

// drag & drop ordering: { items: [{ id, order }] }
router.put('/reorder', adminOnly, wrap(async (req, res) => {
  await Faq.bulkWrite((req.body.items || []).map((i) => ({ updateOne: { filter: { _id: i.id }, update: { order: i.order } } })));
  res.json({ ok: true });
}));

router.put('/:id', adminOnly, wrap(async (req, res) => {
  const f = await Faq.findByIdAndUpdate(req.params.id, body(req.body), { new: true, runValidators: true });
  if (!f) throw httpError(404, 'Not found');
  res.json(f);
}));

router.delete('/:id', adminOnly, wrap(async (req, res) => { await Faq.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = router;
