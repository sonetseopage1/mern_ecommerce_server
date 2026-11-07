const router = require('express').Router();
const slugify = require('slugify');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { staff } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');

const mkSlug = (s) => slugify(s, { lower: true, strict: true }) || 'cat-' + Date.now();

router.get('/', wrap(async (req, res) => {
  const filter = req.query.all === '1' ? {} : { active: true };
  res.json(await Category.find(filter).sort('order createdAt'));
}));

router.post('/', staff, wrap(async (req, res) => {
  const { name, parent, image, active } = req.body;
  if (!name?.en) throw httpError(400, 'English name is required');
  const siblings = await Category.countDocuments({ parent: parent || null });
  let slug = mkSlug(name.en);
  if (await Category.findOne({ slug })) slug += '-' + Date.now().toString(36);
  res.status(201).json(await Category.create({ name, slug, parent: parent || null, image, active, order: siblings }));
}));

// Persist drag & drop ordering: [{ id, parent, order }]
router.put('/reorder', staff, wrap(async (req, res) => {
  const items = req.body.items || [];
  await Category.bulkWrite(items.map((i) => ({
    updateOne: { filter: { _id: i.id }, update: { order: i.order, parent: i.parent || null } },
  })));
  res.json({ ok: true });
}));

router.put('/:id', staff, wrap(async (req, res) => {
  const { name, parent, image, active } = req.body;
  if (parent && String(parent) === req.params.id) throw httpError(400, 'Category cannot be its own parent');
  // prevent cycles: parent must not be a descendant
  if (parent) {
    const all = await Category.find().select('parent');
    let cur = String(parent);
    const map = new Map(all.map((c) => [String(c._id), c.parent ? String(c.parent) : null]));
    while (cur) { if (cur === req.params.id) throw httpError(400, 'Invalid parent (cycle)'); cur = map.get(cur); }
  }
  const c = await Category.findByIdAndUpdate(req.params.id, { name, parent: parent || null, image, active }, { new: true, runValidators: true });
  if (!c) throw httpError(404, 'Not found');
  res.json(c);
}));

router.delete('/:id', staff, wrap(async (req, res) => {
  if (await Category.exists({ parent: req.params.id })) throw httpError(400, 'Delete or move sub-categories first');
  if (await Product.exists({ category: req.params.id })) throw httpError(400, 'Category has products');
  await Category.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
