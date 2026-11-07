require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Coupon = require('./models/Coupon');
const Order = require('./models/Order');
const Settings = require('./models/Settings');
const Page = require('./models/Page');
const Faq = require('./models/Faq');
const Banner = require('./models/Banner');
const ShippingRule = require('./models/ShippingRule');
const PaymentConfig = require('./models/PaymentConfig');

const img = (seed) => `https://picsum.photos/seed/${seed}/800/800`;
const days = (n) => new Date(Date.now() + n * 864e5);

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_shop');
  await Promise.all([User, Category, Product, Coupon, Order, Settings, Page, Faq, Banner, ShippingRule, PaymentConfig].map((m) => m.deleteMany({})));

  await User.create([
    { name: 'Admin', email: 'admin@shop.com', password: 'admin123', role: 'admin' },
    { name: 'Manager', email: 'manager@shop.com', password: 'manager123', role: 'manager' },
    { name: 'Customer', email: 'user@shop.com', password: 'user123', role: 'user', phone: '01700000000', address: 'Dhaka' },
  ]);

  const mk = (en, bn, slug, parent = null, order = 0) => Category.create({ name: { en, bn }, slug, parent, order });
  const fashion = await mk('Fashion', 'ফ্যাশন', 'fashion', null, 0);
  const electronics = await mk('Electronics', 'ইলেকট্রনিক্স', 'electronics', null, 1);
  const grocery = await mk('Grocery', 'মুদি', 'grocery', null, 2);
  const men = await mk("Men's Wear", 'পুরুষের পোশাক', 'mens-wear', fashion._id, 0);
  const women = await mk("Women's Wear", 'মহিলাদের পোশাক', 'womens-wear', fashion._id, 1);
  const tshirts = await mk('T-Shirts', 'টি-শার্ট', 't-shirts', men._id, 0);
  const shoes = await mk('Shoes', 'জুতা', 'shoes', fashion._id, 2);
  const phones = await mk('Smartphones', 'স্মার্টফোন', 'smartphones', electronics._id, 0);
  const audio = await mk('Audio', 'অডিও', 'audio', electronics._id, 1);
  const snacks = await mk('Snacks', 'স্ন্যাকস', 'snacks', grocery._id, 0);
  await mk('Beverages', 'পানীয়', 'beverages', grocery._id, 1);

  const colors = [['Black', '#111827'], ['White', '#f3f4f6'], ['Red', '#ef4444'], ['Blue', '#3b82f6']];
  const tee = [];
  colors.forEach(([color, colorHex], ci) => ['S', 'M', 'L', 'XL'].forEach((size, si) =>
    tee.push({ color, colorHex, size, price: 599 + si * 50, oldPrice: 899 + si * 50, stock: 20, sku: `TEE-${ci}${si}` })));

  const shoeV = [];
  [['Brown', '#92400e'], ['Black', '#111827']].forEach(([color, colorHex]) => ['40', '41', '42', '43'].forEach((size) =>
    shoeV.push({ color, colorHex, size, price: 2490 + (size > '41' ? 200 : 0), oldPrice: 3290, stock: 8 })));

  const flash = { active: true, discountPercent: 25, startsAt: days(-1), endsAt: days(2) };
  await Product.create([
    { name: { en: 'Premium Cotton T-Shirt', bn: 'প্রিমিয়াম কটন টি-শার্ট' }, slug: 'premium-cotton-tshirt', category: tshirts._id, brand: 'Urban Co.', manufacturer: 'Urban Textiles Ltd.', mfgDate: days(-60), price: 599, oldPrice: 899, images: [img('tee1'), img('tee2'), img('tee3')], variants: tee, featured: true, flashDeal: flash, sold: 120,
      description: { en: '100% combed cotton, breathable and soft. Available in multiple colors and sizes.', bn: '১০০% কম্বড কটন, আরামদায়ক ও নরম। একাধিক রঙ ও সাইজে পাওয়া যায়।' } },
    { name: { en: 'Leather Formal Shoes', bn: 'লেদার ফরমাল জুতা' }, slug: 'leather-formal-shoes', category: shoes._id, brand: 'Walkmate', manufacturer: 'Walkmate Footwear', mfgDate: days(-90), price: 2490, oldPrice: 3290, images: [img('shoe1'), img('shoe2')], variants: shoeV, featured: true, sold: 64,
      description: { en: 'Genuine leather with cushioned insole for all-day comfort.', bn: 'আসল চামড়া ও কুশন সোল, সারাদিন আরামদায়ক।' } },
    { name: { en: 'Nova X Smartphone 128GB', bn: 'নোভা এক্স স্মার্টফোন ১২৮জিবি' }, slug: 'nova-x-smartphone', category: phones._id, brand: 'Nova', manufacturer: 'Nova Mobile Inc.', mfgDate: days(-30), price: 24990, oldPrice: 28990, images: [img('phone1'), img('phone2')], featured: true, flashDeal: { ...flash, discountPercent: 10 }, sold: 40,
      variants: [{ color: 'Midnight', colorHex: '#0f172a', size: '128GB', price: 24990, oldPrice: 28990, stock: 15 }, { color: 'Midnight', colorHex: '#0f172a', size: '256GB', price: 29990, oldPrice: 33990, stock: 9 }, { color: 'Silver', colorHex: '#cbd5e1', size: '128GB', price: 24990, oldPrice: 28990, stock: 11 }, { color: 'Silver', colorHex: '#cbd5e1', size: '256GB', price: 29990, oldPrice: 33990, stock: 6 }],
      description: { en: '6.7" AMOLED, 50MP camera, 5000mAh battery.', bn: '৬.৭" AMOLED ডিসপ্লে, ৫০MP ক্যামেরা, ৫০০০mAh ব্যাটারি।' } },
    { name: { en: 'Wireless Earbuds Pro', bn: 'ওয়্যারলেস ইয়ারবাডস প্রো' }, slug: 'wireless-earbuds-pro', category: audio._id, brand: 'SoundPeak', manufacturer: 'SoundPeak Electronics', mfgDate: days(-20), price: 3290, oldPrice: 4590, stock: 50, images: [img('buds1'), img('buds2')], flashDeal: { ...flash, discountPercent: 30 }, sold: 210,
      description: { en: 'Active noise cancellation, 30h battery life.', bn: 'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন, ৩০ ঘণ্টা ব্যাটারি।' } },
    { name: { en: 'Crunchy Potato Chips 150g', bn: 'ক্রাঞ্চি আলুর চিপস ১৫০গ্রা' }, slug: 'crunchy-potato-chips', category: snacks._id, brand: 'Munch', manufacturer: 'Munch Foods BD', mfgDate: days(-30), expDate: days(150), price: 80, oldPrice: 100, stock: 300, images: [img('chips1')], sold: 500,
      description: { en: 'Light, crispy and salted just right.', bn: 'হালকা, মচমচে ও পরিমিত লবণাক্ত।' } },
    { name: { en: 'Floral Summer Dress', bn: 'ফ্লোরাল সামার ড্রেস' }, slug: 'floral-summer-dress', category: women._id, brand: 'Bloom', manufacturer: 'Bloom Apparel', mfgDate: days(-45), price: 1590, oldPrice: 2190, images: [img('dress1'), img('dress2')], featured: true, sold: 33,
      variants: ['S', 'M', 'L'].flatMap((size) => [['Pink', '#f472b6'], ['Mint', '#6ee7b7']].map(([color, colorHex]) => ({ color, colorHex, size, price: 1590, oldPrice: 2190, stock: 10 }))),
      description: { en: 'Lightweight floral print dress for summer.', bn: 'গ্রীষ্মের জন্য হালকা ফ্লোরাল প্রিন্ট ড্রেস।' } },
  ]);

  await Coupon.create([
    { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 500, minOrder: 500, expiresAt: days(180) },
    { code: 'FLAT100', type: 'fixed', value: 100, minOrder: 1000, expiresAt: days(90) },
  ]);

  await require('./seed-more').run();
  console.log('Seeded. Logins: admin@shop.com/admin123, manager@shop.com/manager123, user@shop.com/user123');
  process.exit(0);
})();
