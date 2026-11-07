const router = require('express').Router();
const Settings = require('../models/Settings');
const { adminOnly } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

const DEFAULTS = {
  siteName: { en: 'ShopNest', bn: 'শপনেস্ট' },
  tagline: { en: 'Your one-stop modern shop.', bn: 'আপনার আধুনিক ওয়ান-স্টপ শপ।' },
  metaTitle: { en: 'ShopNest – Modern Online Shopping', bn: 'শপনেস্ট – আধুনিক অনলাইন শপিং' },
  metaDescription: { en: 'Shop fashion, electronics, watches and home decor with flash deals, coupons and fast delivery.', bn: 'ফ্যাশন, ইলেকট্রনিক্স, ঘড়ি ও হোম ডেকর কিনুন ফ্ল্যাশ ডিল ও কুপনসহ।' },
  contact: { phone: '01700-000000', email: 'support@shopnest.com', address: { en: 'Dhaka, Bangladesh', bn: 'ঢাকা, বাংলাদেশ' } },
};

const FIELDS = ['siteName', 'tagline', 'logo', 'favicon', 'appIcon', 'ogImage', 'metaTitle', 'metaDescription', 'metaKeywords', 'contact', 'social', 'footerText', 'invoiceNote'];

// Public – the site uses it for the header, footer, SEO tags, invoices ...
router.get('/', wrap(async (_req, res) => {
  const s = (await Settings.findOne({ key: 'site' }))?.toObject() || {};
  res.json({ ...DEFAULTS, ...s, contact: { ...DEFAULTS.contact, ...(s.contact || {}) } });
}));

router.put('/', adminOnly, wrap(async (req, res) => {
  const set = {};
  FIELDS.forEach((k) => { if (req.body[k] !== undefined) set[k] = req.body[k]; });
  const s = await Settings.findOneAndUpdate({ key: 'site' }, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true });
  res.json(s);
}));

module.exports = router;
