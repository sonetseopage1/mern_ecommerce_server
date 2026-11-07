const router = require('express').Router();
const slugify = require('slugify');
const Page = require('../models/Page');
const { adminOnly } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');
const { cleanBi } = require('../utils/sanitize');

// Public: titles of active pages (footer links)
router.get('/', wrap(async (_req, res) => res.json(await Page.find({ active: true }).select('slug title showInFooter order').sort('order createdAt'))));

// Admin: everything incl. content and inactive pages
router.get('/admin/all', adminOnly, wrap(async (_req, res) => res.json(await Page.find().sort('order createdAt'))));

router.get('/:slug', wrap(async (req, res) => {
  const p = await Page.findOne({ slug: req.params.slug, active: true });
  if (!p) throw httpError(404, 'Page not found');
  res.json(p);
}));

const body = (b) => {
  const d = { title: b.title, content: cleanBi(b.content), active: b.active, showInFooter: b.showInFooter, order: b.order };
  Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
  return d;
};

router.post('/', adminOnly, wrap(async (req, res) => {
  if (!req.body.title?.en) throw httpError(400, 'English title is required');
  const slug = slugify(req.body.slug || req.body.title.en, { lower: true, strict: true });
  if (!slug) throw httpError(400, 'Invalid slug');
  res.status(201).json(await Page.create({ ...body(req.body), slug }));
}));

router.put('/:id', adminOnly, wrap(async (req, res) => {
  const p = await Page.findByIdAndUpdate(req.params.id, body(req.body), { new: true, runValidators: true });
  if (!p) throw httpError(404, 'Not found');
  res.json(p);
}));

router.delete('/:id', adminOnly, wrap(async (req, res) => { await Page.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = router;
