// Adds extra demo categories + products WITHOUT deleting anything (safe to run many times).
//   npm run seed:more
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const extras = require('./seed-extras');
const Category = require('./models/Category');
const Product = require('./models/Product');

const API = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`) + '/api';
const days = (n) => new Date(Date.now() + n * 864e5);
const HUES = ['1b7a7e', 'f58a1f', '6366f1', 'e11d48', '16a34a', '0ea5e9', '9333ea'];
// 3 pictures per product: same icon, different tint
const img = (emoji, k = 0) => [0, 1, 2].map((i) => `${API}/placeholder.svg?e=${encodeURIComponent(emoji)}&c=${HUES[(k + i * 2) % HUES.length]}`);

// Real photos: server/public/photos/<products|categories>/ + index.json ({ slug: [files] }) = the photos picked for each item.
// Without index.json every file named <slug>-<n>.jpg is used.
function photoIndex(kind) {
  const dir = path.join(__dirname, '..', 'public', 'photos', kind);
  const out = {};
  if (!fs.existsSync(dir)) return out;
  const idx = path.join(dir, 'index.json');
  if (fs.existsSync(idx)) {
    for (const [slug, files] of Object.entries(JSON.parse(fs.readFileSync(idx, 'utf8')))) out[slug] = files.filter((f) => fs.existsSync(path.join(dir, f)));
  } else {
    fs.readdirSync(dir).filter((f) => /-\d+\.(jpe?g|png|webp)$/i.test(f)).sort().forEach((f) => { (out[f.replace(/-\d+\.[a-z]+$/i, '')] = out[f.replace(/-\d+\.[a-z]+$/i, '')] || []).push(f); });
  }
  const url = (f) => `${API}/media/photos/${kind}/${f}`;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v.length).map(([k, v]) => [k, v.map(url)]));
}
const localImages = () => photoIndex('products');

async function cat(en, bn, slug, parentSlug, order) {
  const found = await Category.findOne({ slug });
  if (found) return found;
  const parent = parentSlug ? (await Category.findOne({ slug: parentSlug }))._id : null;
  return Category.create({ name: { en, bn }, slug, parent, order });
}

// variants: colors = [[name, hex]...] | null, sizes = [...] | null
function vs(colors, sizes, price, old, stock = 12, step = 0) {
  const out = [];
  (colors || [[undefined, undefined]]).forEach(([color, colorHex]) =>
    (sizes || [undefined]).forEach((size, si) => out.push({ color, colorHex, size, price: price + si * step, oldPrice: old ? old + si * step : undefined, stock })));
  return out;
}
const C = { black: ['Black', '#111827'], white: ['White', '#f3f4f6'], red: ['Red', '#ef4444'], blue: ['Blue', '#3b82f6'], navy: ['Navy', '#1e3a8a'], green: ['Green', '#16a34a'], brown: ['Brown', '#92400e'], silver: ['Silver', '#cbd5e1'], gold: ['Gold', '#eab308'], rose: ['Rose Gold', '#e8a598'], wine: ['Wine', '#7f1d1d'], pink: ['Pink', '#f472b6'], maroon: ['Maroon', '#881337'], grey: ['Grey', '#6b7280'], beige: ['Beige', '#d6c3a3'] };

// [slug, en, bn, category, brand, manufacturer, price, old, stock, emoji, extra]
const P = [
  // ---------- Electronics ----------
  ['nova-lite-5g', 'Nova Lite 5G 8/128GB', 'নোভা লাইট ৫জি ৮/১২৮জিবি', 'smartphones', 'Nova', 'Nova Mobile Inc.', 18990, 21990, 0, '📱', { variants: vs([C.black, C.blue], ['128GB', '256GB'], 18990, 21990, 10, 4000), desc: ['6.5" 120Hz display, 5G, 5000mAh battery.', '৬.৫" ১২০হার্জ ডিসপ্লে, ৫জি, ৫০০০mAh ব্যাটারি।'] }],
  ['pixelon-pro-max', 'Pixelon Pro Max 256GB', 'পিক্সেলন প্রো ম্যাক্স ২৫৬জিবি', 'smartphones', 'Pixelon', 'Pixelon Tech', 64990, 72990, 0, '📲', { variants: vs([C.silver, C.black], ['256GB', '512GB'], 64990, 72990, 6, 12000), featured: true, desc: ['Flagship camera system with pro-grade video.', 'ফ্ল্যাগশিপ ক্যামেরা ও প্রো-গ্রেড ভিডিও।'] }],
  ['bass-boost-speaker', 'Bass Boost Bluetooth Speaker', 'বাস বুস্ট ব্লুটুথ স্পিকার', 'audio', 'SoundPeak', 'SoundPeak Electronics', 2490, 3290, 0, '🔊', { variants: vs([C.black, C.red, C.blue], null, 2490, 3290, 25), flash: 20 }],
  ['studio-headphones', 'Studio Over-Ear Headphones', 'স্টুডিও ওভার-ইয়ার হেডফোন', 'audio', 'SoundPeak', 'SoundPeak Electronics', 4590, 5990, 40, '🎧', { featured: true }],
  ['gaming-laptop-r7', 'Gaming Laptop Ryzen 7 16GB/512GB', 'গেমিং ল্যাপটপ রাইজেন ৭ ১৬জিবি/৫১২জিবি', 'laptops', 'Vortex', 'Vortex Computers', 89990, 99990, 8, '💻', { featured: true, flash: 8 }],
  ['ultraslim-laptop-i5', 'UltraSlim Laptop 14" Core i5', 'আল্ট্রাস্লিম ল্যাপটপ ১৪" কোর i5', 'laptops', 'Vortex', 'Vortex Computers', 64990, 72990, 12, '🖥️', {}],
  ['rgb-mechanical-keyboard', 'RGB Mechanical Keyboard', 'আরজিবি মেকানিক্যাল কিবোর্ড', 'accessories', 'KeyForge', 'KeyForge Ltd.', 3290, 4290, 35, '⌨️', {}],
  ['wireless-mouse', 'Wireless Mouse 2.4G', 'ওয়্যারলেস মাউস ২.৪জি', 'accessories', 'KeyForge', 'KeyForge Ltd.', 790, 1090, 120, '🖱️', { flash: 15 }],
  ['power-bank-20000', 'Power Bank 20000mAh Fast Charge', 'পাওয়ার ব্যাংক ২০০০০mAh ফাস্ট চার্জ', 'accessories', 'ChargeX', 'ChargeX Power', 1890, 2490, 80, '🔋', {}],
  ['smart-led-tv-43', 'Smart LED TV 43" 4K', 'স্মার্ট এলইডি টিভি ৪৩" ফোর-কে', 'home-appliances', 'Visio', 'Visio Electronics', 38990, 44990, 7, '📺', { featured: true }],
  ['air-fryer-5l', 'Digital Air Fryer 5L', 'ডিজিটাল এয়ার ফ্রায়ার ৫ লিটার', 'home-appliances', 'HomeChef', 'HomeChef Appliances', 6990, 8990, 22, '🍳', { flash: 25 }],
  ['electric-kettle', 'Stainless Electric Kettle 1.8L', 'স্টেইনলেস ইলেকট্রিক কেটলি ১.৮ লিটার', 'home-appliances', 'HomeChef', 'HomeChef Appliances', 1290, 1690, 60, '☕', {}],

  // ---------- Watches ----------
  ['classic-leather-watch', 'Classic Leather Strap Watch', 'ক্লাসিক লেদার স্ট্র্যাপ ঘড়ি', 'mens-watches', 'Tempo', 'Tempo Time Co.', 3490, 4990, 0, '⌚', { variants: vs([C.brown, C.black], null, 3490, 4990, 15), featured: true, desc: ['Japanese quartz movement, 3ATM water resistant.', 'জাপানি কোয়ার্টজ মুভমেন্ট, ৩এটিএম ওয়াটার রেজিস্ট্যান্ট।'] }],
  ['chronograph-steel-watch', 'Chronograph Steel Watch', 'ক্রোনোগ্রাফ স্টিল ঘড়ি', 'mens-watches', 'Tempo', 'Tempo Time Co.', 6990, 8990, 0, '⏱️', { variants: vs([C.silver, C.black, C.gold], null, 6990, 8990, 9), flash: 22 }],
  ['minimal-mesh-watch-women', 'Minimal Mesh Strap Ladies Watch', 'মিনিমাল মেশ স্ট্র্যাপ লেডিস ঘড়ি', 'womens-watches', 'Aura', 'Aura Timepieces', 2990, 3990, 0, '⌚', { variants: vs([C.rose, C.silver], null, 2990, 3990, 14), featured: true }],
  ['pearl-dial-ladies-watch', 'Pearl Dial Ladies Watch', 'পার্ল ডায়াল লেডিস ঘড়ি', 'womens-watches', 'Aura', 'Aura Timepieces', 4290, 5490, 18, '💎', {}],
  ['smartwatch-ultra-amoled', 'Smart Watch Ultra AMOLED', 'স্মার্ট ওয়াচ আল্ট্রা অ্যামোলেড', 'smart-watches', 'Nova', 'Nova Mobile Inc.', 7990, 9990, 0, '⌚', { variants: vs([C.black, C.silver], ['42mm', '46mm'], 7990, 9990, 11, 500), flash: 25, featured: true, desc: ['1.4" AMOLED, GPS, heart-rate & SpO2, 7-day battery.', '১.৪" অ্যামোলেড, জিপিএস, হার্ট-রেট ও SpO2, ৭ দিন ব্যাটারি।'] }],
  ['fitness-band-pro', 'Fitness Band Pro', 'ফিটনেস ব্যান্ড প্রো', 'smart-watches', 'Nova', 'Nova Mobile Inc.', 2490, 3290, 0, '🏃', { variants: vs([C.black, C.blue, C.pink], null, 2490, 3290, 30) }],
  ['digital-sports-watch', 'Digital Sports Watch Waterproof', 'ডিজিটাল স্পোর্টস ঘড়ি ওয়াটারপ্রুফ', 'mens-watches', 'Tempo', 'Tempo Time Co.', 1890, 2490, 45, '🕒', {}],

  // ---------- Dresses / Fashion ----------
  ['evening-gown-maxi', 'Evening Gown Maxi Dress', 'ইভনিং গাউন ম্যাক্সি ড্রেস', 'dresses', 'Bloom', 'Bloom Apparel', 3290, 4290, 0, '👗', { variants: vs([C.wine, C.navy], ['S', 'M', 'L', 'XL'], 3290, 4290, 6), featured: true }],
  ['casual-midi-dress', 'Casual Midi Dress', 'ক্যাজুয়াল মিডি ড্রেস', 'dresses', 'Bloom', 'Bloom Apparel', 1890, 2490, 0, '👗', { variants: vs([C.pink, C.beige, C.green], ['S', 'M', 'L'], 1890, 2490, 9), flash: 20 }],
  ['cotton-kurti-set', 'Cotton Kurti Set with Dupatta', 'কটন কুর্তি সেট ওড়না সহ', 'dresses', 'Bloom', 'Bloom Apparel', 1490, 1990, 0, '🥻', { variants: vs([C.red, C.blue, C.green], ['M', 'L', 'XL'], 1490, 1990, 10) }],
  ['katan-silk-saree', 'Katan Silk Saree', 'কাতান সিল্ক শাড়ি', 'sarees', 'Tantu', 'Tantu Handloom', 5990, 7490, 0, '🥻', { variants: vs([C.red, C.green, C.blue], null, 5990, 7490, 7), featured: true, desc: ['Handwoven katan with golden zari border.', 'হাতে বোনা কাতান, সোনালি জরির পাড়।'] }],
  ['jamdani-saree', 'Dhakai Jamdani Saree', 'ঢাকাই জামদানি শাড়ি', 'sarees', 'Tantu', 'Tantu Handloom', 4590, 5990, 0, '🧵', { variants: vs([C.white, C.pink, C.grey], null, 4590, 5990, 8), flash: 15 }],
  ['embroidered-panjabi', 'Embroidered Panjabi', 'এমব্রয়ডারি পাঞ্জাবি', 'panjabi', 'Urban Co.', 'Urban Textiles Ltd.', 2290, 2990, 0, '👘', { variants: vs([C.white, C.navy, C.maroon], ['M', 'L', 'XL', 'XXL'], 2290, 2990, 8, 100), featured: true }],
  ['eid-special-panjabi', 'Eid Special Premium Panjabi', 'ঈদ স্পেশাল প্রিমিয়াম পাঞ্জাবি', 'panjabi', 'Urban Co.', 'Urban Textiles Ltd.', 3490, 4490, 0, '👘', { variants: vs([C.beige, C.black], ['M', 'L', 'XL'], 3490, 4490, 7, 100), flash: 18 }],
  ['slim-fit-jeans', 'Slim Fit Denim Jeans', 'স্লিম ফিট ডেনিম জিন্স', 'jeans', 'Urban Co.', 'Urban Textiles Ltd.', 1890, 2490, 0, '👖', { variants: vs([C.blue, C.black], ['30', '32', '34', '36'], 1890, 2490, 10) }],
  ['formal-cotton-shirt', 'Formal Cotton Shirt', 'ফরমাল কটন শার্ট', 'shirts', 'Urban Co.', 'Urban Textiles Ltd.', 1290, 1690, 0, '👔', { variants: vs([C.white, C.blue, C.grey], ['M', 'L', 'XL'], 1290, 1690, 14) }],
  ['polo-tshirt', 'Classic Polo T-Shirt', 'ক্লাসিক পোলো টি-শার্ট', 't-shirts', 'Urban Co.', 'Urban Textiles Ltd.', 799, 1099, 0, '👕', { variants: vs([C.navy, C.red, C.white], ['M', 'L', 'XL'], 799, 1099, 25), flash: 20 }],

  // ---------- Home Decor ----------
  ['ceramic-flower-vase', 'Ceramic Flower Vase', 'সিরামিক ফুলদানি', 'vases-plants', 'Nest Living', 'Nest Living Decor', 990, 1390, 0, '🏺', { variants: vs([C.white, C.blue], ['Medium', 'Large'], 990, 1390, 15, 300), featured: true }],
  ['canvas-wall-art-set', 'Canvas Wall Art Set (3 pcs)', 'ক্যানভাস ওয়াল আর্ট সেট (৩ পিস)', 'wall-decor', 'Nest Living', 'Nest Living Decor', 2490, 3290, 20, '🖼️', { featured: true }],
  ['wooden-wall-clock', 'Wooden Wall Clock 16"', 'কাঠের ওয়াল ক্লক ১৬"', 'wall-decor', 'Nest Living', 'Nest Living Decor', 1490, 1990, 30, '🕰️', { flash: 15 }],
  ['led-table-lamp', 'LED Touch Table Lamp', 'এলইডি টাচ টেবিল ল্যাম্প', 'lighting', 'Lumo', 'Lumo Lighting', 1290, 1790, 0, '💡', { variants: vs([C.white, C.black, C.wine], null, 1290, 1790, 20) }],
  ['rattan-pendant-light', 'Rattan Pendant Light', 'র‍্যাটান পেন্ডেন্ট লাইট', 'lighting', 'Lumo', 'Lumo Lighting', 2890, 3690, 14, '🏮', { featured: true }],
  ['velvet-cushion-covers', 'Velvet Cushion Cover Set (5 pcs)', 'ভেলভেট কুশন কভার সেট (৫ পিস)', 'cushions-candles', 'Nest Living', 'Nest Living Decor', 890, 1290, 0, '🛋️', { variants: vs([C.navy, C.maroon, C.green, C.grey], null, 890, 1290, 25) }],
  ['artificial-indoor-plant', 'Artificial Indoor Plant with Pot', 'পটসহ আর্টিফিশিয়াল ইনডোর প্ল্যান্ট', 'vases-plants', 'Nest Living', 'Nest Living Decor', 690, 990, 50, '🪴', { flash: 20 }],
  ['scented-candle-gift-set', 'Scented Candle Gift Set', 'সুগন্ধি ক্যান্ডেল গিফট সেট', 'cushions-candles', 'Lumo', 'Lumo Lighting', 1190, 1590, 40, '🕯️', { exp: 540 }],
  ['round-decor-mirror', 'Round Decorative Mirror', 'গোলাকার ডেকোরেটিভ আয়না', 'wall-decor', 'Nest Living', 'Nest Living Decor', 2190, 2890, 16, '🪞', {}],
];

async function run() {
  // categories
  await cat('Watches', 'ঘড়ি', 'watches', null, 3);
  await cat('Home Decor', 'হোম ডেকর', 'home-decor', null, 4);
  const subs = [
    ['Laptops', 'ল্যাপটপ', 'laptops', 'electronics', 2], ['Home Appliances', 'হোম অ্যাপ্লায়েন্স', 'home-appliances', 'electronics', 3], ['Accessories', 'এক্সেসরিজ', 'accessories', 'electronics', 4],
    ["Men's Watches", 'পুরুষদের ঘড়ি', 'mens-watches', 'watches', 0], ["Women's Watches", 'মহিলাদের ঘড়ি', 'womens-watches', 'watches', 1], ['Smart Watches', 'স্মার্ট ওয়াচ', 'smart-watches', 'watches', 2],
    ['Dresses', 'ড্রেস', 'dresses', 'womens-wear', 0], ['Sarees', 'শাড়ি', 'sarees', 'womens-wear', 1],
    ['Panjabi', 'পাঞ্জাবি', 'panjabi', 'mens-wear', 1], ['Jeans', 'জিন্স', 'jeans', 'mens-wear', 2], ['Shirts', 'শার্ট', 'shirts', 'mens-wear', 3],
    ['Wall Decor', 'ওয়াল ডেকর', 'wall-decor', 'home-decor', 0], ['Lighting', 'লাইটিং', 'lighting', 'home-decor', 1], ['Vases & Plants', 'ফুলদানি ও গাছ', 'vases-plants', 'home-decor', 2], ['Cushions & Candles', 'কুশন ও ক্যান্ডেল', 'cushions-candles', 'home-decor', 3],
  ];
  for (const s of subs) await cat(...s);

  const local = localImages();
  const cats = Object.fromEntries((await Category.find()).map((c) => [c.slug, c._id]));
  let added = 0;
  for (let i = 0; i < P.length; i++) {
    const [slug, en, bn, catSlug, brand, manufacturer, price, oldPrice, stock, emoji, x] = P[i];
    if (await Product.exists({ slug })) continue;
    if (!cats[catSlug]) { console.warn('Missing category', catSlug); continue; }
    await Product.create({
      name: { en, bn }, slug, category: cats[catSlug], brand, manufacturer, price, oldPrice, stock, images: local[slug] || img(emoji, i),
      variants: x.variants || [], featured: !!x.featured, rating: +(4 + ((i * 7) % 10) / 10).toFixed(1), sold: x.sold ?? 15 + ((i * 53) % 320),
      mfgDate: days(-30 - ((i * 11) % 120)), expDate: x.exp ? days(x.exp) : undefined,
      description: { en: x.desc?.[0] || `${en} – quality product from ${brand}.`, bn: x.desc?.[1] || `${bn} – ${brand} এর মানসম্পন্ন পণ্য।` },
      flashDeal: x.flash ? { active: true, discountPercent: x.flash, startsAt: days(-1), endsAt: days(3 + (i % 4)) } : { active: false },
    });
    added++;
  }
  // use real photos for every product that has them (also updates products created earlier)
  let swapped = 0;
  for (const [slug, images] of Object.entries(local)) swapped += (await Product.updateOne({ slug }, { images })).modifiedCount;
  if (swapped) console.log(`seed-more: real photos applied to ${swapped} products`);
  let catSwapped = 0;
  for (const [slug, urls] of Object.entries(photoIndex('categories'))) catSwapped += (await Category.updateOne({ slug }, { image: urls[0] })).modifiedCount;
  if (catSwapped) console.log(`seed-more: photos applied to ${catSwapped} categories`);
  const migrated = await extras.migrateVariants();
  const phones = await extras.phoneVariants();
  await extras.defaults();
  const g = await extras.geo();
  console.log(`seed-more: areas ready – ${g.divisions} divisions, ${g.districts} districts, ${g.upazilas} upazilas/thanas`);
  const lg = await extras.logistics();
  if (lg.length) console.log(`seed-more: created ${lg.join(', ')}`);
  const nb = await extras.banners();
  if (nb) console.log(`seed-more: ${nb} hero banners created`);
  if (migrated || phones) console.log(`seed-more: option groups created on ${migrated} products, RAM/Storage variants on ${phones} phones`);
  console.log(`seed-more: ${added} products added (${P.length - added} already existed)`);
}

module.exports = { run };

if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_shop').then(run).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
