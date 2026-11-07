// Seed helpers for the admin-managed content (settings, pages, FAQ), generic variants and product-specific coupons.
// Used by seed-more.js – every function is idempotent.
const Product = require('./models/Product');
const Coupon = require('./models/Coupon');
const Settings = require('./models/Settings');
const Page = require('./models/Page');
const Faq = require('./models/Faq');
const Banner = require('./models/Banner');
const GeoArea = require('./models/GeoArea');
const ShippingRule = require('./models/ShippingRule');
const PaymentConfig = require('./models/PaymentConfig');
const { encrypt } = require('./utils/secure');
const fs = require('fs');
const path = require('path');

const days = (n) => new Date(Date.now() + n * 864e5);

// ---- legacy color/size variants -> generic option groups + attributes ----------------------------------
async function migrateVariants() {
  const prods = await Product.find({ 'variants.0': { $exists: true }, 'optionGroups.0': { $exists: false } });
  for (const p of prods) {
    const hasColor = p.variants.some((v) => v.color), hasSize = p.variants.some((v) => v.size);
    const groups = [];
    if (hasColor) {
      const seen = new Map();
      p.variants.forEach((v) => v.color && !seen.has(v.color) && seen.set(v.color, v.colorHex));
      groups.push({ name: 'Color', type: 'color', values: [...seen].map(([label, hex]) => ({ label, hex })) });
    }
    if (hasSize) groups.push({ name: 'Size', type: 'text', values: [...new Set(p.variants.map((v) => v.size).filter(Boolean))].map((label) => ({ label })) });
    p.optionGroups = groups;
    p.variants.forEach((v) => {
      v.attributes = [];
      if (hasColor && v.color) v.attributes.push({ name: 'Color', value: v.color });
      if (hasSize && v.size) v.attributes.push({ name: 'Size', value: v.size });
    });
    await p.save();
  }
  return prods.length;
}

// ---- phones: Color x RAM x Storage, each combination with its own price --------------------------------
const PHONES = {
  'nova-lite-5g': { colors: [['Black', '#111827'], ['Blue', '#3b82f6']], ram: ['6GB', '8GB'], storage: ['128GB', '256GB'], base: 18990, old: 21990, ramStep: 2000, stStep: 3000, stock: 10 },
  'nova-x-smartphone': { colors: [['Midnight', '#0f172a'], ['Silver', '#cbd5e1'], ['Gold', '#eab308']], ram: ['8GB', '12GB'], storage: ['128GB', '256GB', '512GB'], base: 24990, old: 28990, ramStep: 3000, stStep: 5000, stock: 8 },
  'pixelon-pro-max': { colors: [['Silver', '#cbd5e1'], ['Black', '#111827']], ram: ['12GB', '16GB'], storage: ['256GB', '512GB', '1TB'], base: 64990, old: 72990, ramStep: 6000, stStep: 10000, stock: 5 },
};

async function phoneVariants() {
  let n = 0;
  for (const [slug, d] of Object.entries(PHONES)) {
    const p = await Product.findOne({ slug });
    if (!p || p.optionGroups?.some((g) => g.name === 'RAM')) continue;
    p.optionGroups = [
      { name: 'Color', type: 'color', values: d.colors.map(([label, hex]) => ({ label, hex })) },
      { name: 'RAM', type: 'text', values: d.ram.map((label) => ({ label })) },
      { name: 'Storage', type: 'text', values: d.storage.map((label) => ({ label })) },
    ];
    p.variants = [];
    d.colors.forEach(([color]) => d.ram.forEach((ram, ri) => d.storage.forEach((st, si) => {
      const price = d.base + ri * d.ramStep + si * d.stStep;
      const old = d.old + ri * d.ramStep + si * d.stStep;
      p.variants.push({ attributes: [{ name: 'Color', value: color }, { name: 'RAM', value: ram }, { name: 'Storage', value: st }], price, oldPrice: old, stock: d.stock, sku: `${slug}-${color}-${ram}-${st}`.toUpperCase() });
    })));
    await p.save();
    n++;
  }
  return n;
}

// ---- default content ------------------------------------------------------------------------------------
const TERMS_EN = '<h2>Terms &amp; Conditions</h2><p>By placing an order on this website you agree to the terms below.</p><h3>Orders</h3><ul><li>All orders are subject to product availability and confirmation.</li><li>Prices and flash-deal offers may change without prior notice.</li><li>We may cancel an order if the information provided is incomplete or incorrect.</li></ul><h3>Delivery</h3><ul><li>We deliver all over Bangladesh. Delivery time depends on your location.</li><li>Delivery is free for orders above ৳1,500; a flat fee applies otherwise.</li></ul><h3>Returns</h3><p>Damaged or wrong products can be returned within 7 days of delivery in their original condition.</p>';
const TERMS_BN = '<h2>শর্তাবলি</h2><p>এই ওয়েবসাইটে অর্ডার করার মাধ্যমে আপনি নিচের শর্তগুলোতে সম্মত হচ্ছেন।</p><h3>অর্ডার</h3><ul><li>সকল অর্ডার পণ্যের প্রাপ্যতা ও নিশ্চিতকরণ সাপেক্ষে।</li><li>দাম ও ফ্ল্যাশ ডিলের অফার পূর্ব নোটিশ ছাড়াই পরিবর্তন হতে পারে।</li><li>তথ্য অসম্পূর্ণ বা ভুল হলে আমরা অর্ডার বাতিল করার অধিকার রাখি।</li></ul><h3>ডেলিভারি</h3><ul><li>সারা বাংলাদেশে ডেলিভারি দেওয়া হয়। সময় আপনার অবস্থানের উপর নির্ভর করে।</li><li>৳১,৫০০ এর উপরে অর্ডারে ডেলিভারি ফ্রি, অন্যথায় নির্দিষ্ট ডেলিভারি চার্জ প্রযোজ্য।</li></ul><h3>রিটার্ন</h3><p>ক্ষতিগ্রস্ত বা ভুল পণ্য ডেলিভারির ৭ দিনের মধ্যে মূল অবস্থায় ফেরত দেওয়া যাবে।</p>';
const PRIV_EN = '<h2>Our Policy</h2><p>We respect your privacy and handle your information with care.</p><h3>Information we collect</h3><ul><li>Name, phone number, email and delivery address you provide when ordering.</li><li>Order history and basic usage data to improve the shop.</li></ul><h3>How we use it</h3><ul><li>To process and deliver your orders and to contact you about them.</li><li>We never sell your personal information to third parties.</li></ul><h3>Your choices</h3><p>You can update your profile or ask us to delete your account at any time by contacting support.</p>';
const PRIV_BN = '<h2>আমাদের নীতিমালা</h2><p>আমরা আপনার গোপনীয়তাকে সম্মান করি এবং আপনার তথ্য যত্নসহকারে ব্যবহার করি।</p><h3>আমরা যে তথ্য সংগ্রহ করি</h3><ul><li>অর্ডারের সময় আপনার দেওয়া নাম, ফোন নম্বর, ইমেইল ও ডেলিভারি ঠিকানা।</li><li>শপ উন্নত করতে অর্ডারের ইতিহাস ও সাধারণ ব্যবহারের তথ্য।</li></ul><h3>তথ্যের ব্যবহার</h3><ul><li>অর্ডার প্রক্রিয়া, ডেলিভারি ও যোগাযোগের জন্য।</li><li>আপনার ব্যক্তিগত তথ্য আমরা কখনো তৃতীয় পক্ষের কাছে বিক্রি করি না।</li></ul><h3>আপনার সিদ্ধান্ত</h3><p>আপনি যেকোনো সময় প্রোফাইল আপডেট করতে বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ জানাতে পারেন।</p>';

const FAQS = [
  ['How long does delivery take?', 'ডেলিভারিতে কত সময় লাগে?', '<p>Inside Dhaka 1–2 working days, outside Dhaka 3–5 working days.</p>', '<p>ঢাকার ভেতরে ১–২ কার্যদিবস, ঢাকার বাইরে ৩–৫ কার্যদিবস।</p>'],
  ['What payment methods do you accept?', 'কোন কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?', '<p>Currently we accept <strong>Cash on Delivery</strong> all over Bangladesh.</p>', '<p>বর্তমানে সারা বাংলাদেশে <strong>ক্যাশ অন ডেলিভারি</strong> গ্রহণ করা হয়।</p>'],
  ['How do I use a coupon code?', 'কুপন কোড কীভাবে ব্যবহার করব?', '<p>Add products to your cart, type the code in the coupon box and press <em>Apply</em>. Some coupons work only for selected products.</p>', '<p>কার্টে পণ্য যোগ করে কুপন বক্সে কোড লিখে <em>প্রয়োগ</em> চাপুন। কিছু কুপন শুধু নির্দিষ্ট পণ্যের জন্য প্রযোজ্য।</p>'],
  ['Can I return a product?', 'আমি কি পণ্য ফেরত দিতে পারব?', '<p>Yes. Damaged or wrong items can be returned within 7 days in original condition.</p>', '<p>হ্যাঁ। ক্ষতিগ্রস্ত বা ভুল পণ্য ৭ দিনের মধ্যে মূল অবস্থায় ফেরত দেওয়া যাবে।</p>'],
  ['How can I track my order?', 'অর্ডার ট্র্যাক করব কীভাবে?', '<p>Log in and open <strong>My orders</strong> to see the current status of every order.</p>', '<p>লগইন করে <strong>আমার অর্ডার</strong> থেকে প্রতিটি অর্ডারের বর্তমান অবস্থা দেখুন।</p>'],
  ['How do I download an invoice?', 'ইনভয়েস ডাউনলোড করব কীভাবে?', '<p>Open <strong>My orders</strong> and press the invoice button on the order. You can download it in English or Bangla.</p>', '<p><strong>আমার অর্ডার</strong> থেকে অর্ডারের ইনভয়েস বাটনে চাপ দিন। ইংরেজি বা বাংলায় ডাউনলোড করা যাবে।</p>'],
];

async function defaults() {
  if (!(await Settings.exists({ key: 'site' }))) {
    await Settings.create({
      key: 'site', siteName: { en: 'ShopNest', bn: 'শপনেস্ট' }, tagline: { en: 'Your one-stop modern shop.', bn: 'আপনার আধুনিক ওয়ান-স্টপ শপ।' },
      contact: { phone: '01700-000000', email: 'support@shopnest.com', address: { en: 'Dhaka, Bangladesh', bn: 'ঢাকা, বাংলাদেশ' } },
      social: { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', youtube: 'https://youtube.com/' },
    });
  }
  const pages = [
    ['terms-and-conditions', 'Terms & Conditions', 'শর্তাবলি', TERMS_EN, TERMS_BN, 0],
    ['privacy-policy', 'Our Policy', 'আমাদের নীতিমালা', PRIV_EN, PRIV_BN, 1],
  ];
  for (const [slug, en, bn, cEn, cBn, order] of pages) {
    if (!(await Page.exists({ slug }))) await Page.create({ slug, title: { en, bn }, content: { en: cEn, bn: cBn }, order });
  }
  if (!(await Faq.countDocuments())) await Faq.create(FAQS.map(([qe, qb, ae, ab], order) => ({ question: { en: qe, bn: qb }, answer: { en: ae, bn: ab }, order })));
  // a coupon that only works on smartphones
  if (!(await Coupon.exists({ code: 'PHONE500' }))) {
    const phones = await Product.find({ slug: { $in: Object.keys(PHONES) } }).select('_id');
    if (phones.length) await Coupon.create({ code: 'PHONE500', type: 'fixed', value: 500, minOrder: 10000, products: phones.map((p) => p._id), showOnProduct: true, expiresAt: days(120) });
  }
}

// ---- hero banners (photos picked in public/photos/banners/index.json: { key: [file] }) ---------------------
const BANNER_TEXT = {
  fashion: ['New Season Fashion', 'নতুন সিজনের ফ্যাশন', 'Up to 40% off on clothing & accessories', 'পোশাক ও এক্সেসরিজে ৪০% পর্যন্ত ছাড়', 'Shop fashion', 'ফ্যাশন কিনুন', '/products?category=fashion'],
  electronics: ['Smart Gadgets, Smarter Prices', 'স্মার্ট গ্যাজেট, সাশ্রয়ী দাম', 'Phones, laptops, audio and more with flash deals', 'ফ্ল্যাশ ডিলে ফোন, ল্যাপটপ, অডিও ও আরও অনেক কিছু', 'Explore electronics', 'ইলেকট্রনিক্স দেখুন', '/products?category=electronics'],
  decor: ['Make Your Home Beautiful', 'ঘর সাজান নতুন করে', 'Lighting, wall art, vases and cozy decor', 'লাইটিং, ওয়াল আর্ট, ফুলদানি ও আরামদায়ক ডেকর', 'Shop home decor', 'হোম ডেকর কিনুন', '/products?category=home-decor'],
  grocery: ['Fresh & Healthy, Delivered Fast', 'তাজা ও স্বাস্থ্যকর, দ্রুত ডেলিভারি', 'Everyday groceries at the best prices', 'প্রতিদিনের মুদি পণ্য সেরা দামে', 'Shop grocery', 'মুদি কিনুন', '/products?category=grocery'],
  delivery: ['Free Delivery over ৳1,500', '৳১,৫০০ এর উপরে ফ্রি ডেলিভারি', 'Cash on delivery all over Bangladesh', 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি', 'Start shopping', 'কেনাকাটা শুরু করুন', '/products'],
  watches: ['Timeless Watches', 'চিরন্তন ঘড়ির সংগ্রহ', 'Classic, sport and smart watches for everyone', 'ক্লাসিক, স্পোর্টস ও স্মার্ট ঘড়ি সবার জন্য', 'Shop watches', 'ঘড়ি কিনুন', '/products?category=watches'],
};
async function banners() {
  if (await Banner.countDocuments()) return 0;
  const idx = path.join(__dirname, '..', 'public', 'photos', 'banners', 'index.json');
  if (!fs.existsSync(idx)) return 0;
  const picks = JSON.parse(fs.readFileSync(idx, 'utf8'));
  const api = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`) + '/api';
  const docs = Object.entries(picks).filter(([k, f]) => BANNER_TEXT[k] && f[0]).map(([k, f], order) => {
    const [te, tb, se, sb, be, bb, link] = BANNER_TEXT[k];
    return { image: `${api}/media/photos/banners/${f[0]}`, title: { en: te, bn: tb }, subtitle: { en: se, bn: sb }, buttonText: { en: be, bn: bb }, link, order };
  });
  if (docs.length) await Banner.create(docs);
  return docs.length;
}

// ---- Bangladesh areas, shipping rates and payment methods -------------------------------------------------
async function geo() {
  const g = require('./data/bd-geo.json');
  const docs = [
    ...g.divisions.map((d) => ({ type: 'division', id: d.id, name: d.name, bn: d.bn })),
    ...g.districts.map((d) => ({ type: 'district', id: d.id, parentId: d.divisionId, name: d.name, bn: d.bn })),
    ...g.upazilas.map((u) => ({ type: 'upazila', id: u.id, parentId: u.districtId, name: u.name, bn: u.bn, kind: u.kind })),
  ];
  await GeoArea.bulkWrite(docs.map((d) => ({ updateOne: { filter: { type: d.type, id: d.id }, update: { $set: d }, upsert: true } })));
  return { divisions: g.divisions.length, districts: g.districts.length, upazilas: g.upazilas.length };
}

async function logistics() {
  const out = [];
  if (!(await ShippingRule.exists({ level: 'default' }))) {
    await ShippingRule.create({ level: 'default', refId: '', charge: 120, freeOver: 1500, codAllowed: true });
    out.push('default shipping 120');
  }
  if (!(await ShippingRule.countDocuments({ level: { $ne: 'default' } }))) {
    // inside Dhaka 60 ৳, nearby districts 80 ৳, everywhere else the 120 ৳ default
    const rates = { Dhaka: 60, Gazipur: 80, Narayanganj: 80 };
    for (const [name, charge] of Object.entries(rates)) {
      const d = await GeoArea.findOne({ type: 'district', name });
      if (d) await ShippingRule.create({ level: 'district', refId: d.id, charge });
    }
    out.push('district rates');
  }
  if (!(await PaymentConfig.exists({ key: 'payments' }))) {
    // SSLCommerz's public sandbox test store (works without an account; replace with your own sandbox / live keys in Admin → Payments)
    await PaymentConfig.create({ key: 'payments', cod: { enabled: true }, sslcommerz: { enabled: true, sandbox: true, storeId: 'testbox', storePassword: encrypt('qwerty') } });
    out.push('payment methods (COD + SSLCommerz sandbox)');
  }
  return out;
}

module.exports = { migrateVariants, phoneVariants, defaults, banners, geo, logistics };
