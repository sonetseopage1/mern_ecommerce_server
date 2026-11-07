const router = require('express').Router();
const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { staff } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');
const { cleanBi } = require('../utils/sanitize');
const { parseVideo } = require('../utils/video');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function descendantIds(id) {
  const all = await Category.find().select('parent');
  const out = [String(id)];
  for (let i = 0; i < out.length; i++) {
    all.forEach((c) => { if (c.parent && String(c.parent) === out[i]) out.push(String(c._id)); });
  }
  return out;
}

router.get('/', wrap(async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, sort, flash, featured, all } = req.query;
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 12, 100);
  const filter = {};
  if (all !== '1') filter.active = true;
  if (q) {
    const r = new RegExp(esc(q), 'i');
    filter.$or = [{ 'name.en': r }, { 'name.bn': r }, { brand: r }];
  }
  if (category) {
    const c = mongoose.isValidObjectId(category) ? { _id: category } : { slug: category };
    const cat = await Category.findOne(c);
    filter.category = { $in: cat ? await descendantIds(cat._id) : [] };
  }
  if (brand) filter.brand = { $in: String(brand).split(',') };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = +minPrice;
    if (maxPrice) filter.price.$lte = +maxPrice;
  }
  if (flash === '1') Object.assign(filter, { 'flashDeal.active': true, 'flashDeal.endsAt': { $gte: new Date() } });
  if (featured === '1') filter.featured = true;
  const sorts = { newest: '-createdAt', 'price-asc': 'price', 'price-desc': '-price', popular: '-sold', discount: '-flashDeal.discountPercent' };
  const [items, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sorts[sort] || '-createdAt').skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/brands', wrap(async (_req, res) => res.json((await Product.distinct('brand', { active: true })).filter(Boolean).sort())));

router.get('/:idOrSlug', wrap(async (req, res) => {
  const k = req.params.idOrSlug;
  const p = await Product.findOne(mongoose.isValidObjectId(k) ? { _id: k } : { slug: k }).populate('category', 'name slug parent');
  if (!p) throw httpError(404, 'Product not found');
  res.json(p);
}));

const clean = (b) => {
  const d = { ...b };
  delete d._id; delete d.__v; delete d.sold;
  if (d.description) d.description = cleanBi(d.description);
  if (d.videos) d.videos = [...new Set(d.videos.map((v) => String(v).trim()).filter((v) => parseVideo(v)))].slice(0, 10);
  (d.variants || []).forEach((v) => { if (!v._id) delete v._id; });
  ['mfgDate', 'expDate'].forEach((k) => { if (d[k] === '') d[k] = null; });
  if (d.flashDeal) ['startsAt', 'endsAt'].forEach((k) => { if (d.flashDeal[k] === '') d.flashDeal[k] = null; });
  return d;
};

router.post('/', staff, wrap(async (req, res) => {
  const d = clean(req.body);
  if (!d.name?.en) throw httpError(400, 'English name is required');
  let slug = slugify(d.slug || d.name.en, { lower: true, strict: true });
  if (await Product.exists({ slug })) slug += '-' + Date.now().toString(36);
  res.status(201).json(await Product.create({ ...d, slug }));
}));

router.put('/:id', staff, wrap(async (req, res) => {
  const d = clean(req.body);
  delete d.slug;
  const p = await Product.findByIdAndUpdate(req.params.id, d, { new: true, runValidators: true });
  if (!p) throw httpError(404, 'Not found');
  res.json(p);
}));

router.delete('/:id', staff, wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
