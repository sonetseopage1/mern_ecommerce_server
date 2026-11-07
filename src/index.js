require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(',') }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true })); // SSLCommerz posts its callbacks as a form
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// product photos downloaded by scripts/fetch-images.js (and any images you add to server/public)
app.use('/api/media', express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Demo product pictures: /api/placeholder.svg?e=⌚&c=1d4ed8  (icon on a tinted gradient, no external host needed)
app.get('/api/placeholder.svg', (req, res) => {
  const e = String(req.query.e || '🛍️').replace(/[<>&"']/g, '').slice(0, 8);
  const c = /^[0-9a-f]{6}$/i.test(req.query.c) ? req.query.c : '1b7a7e';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${c}" stop-opacity=".22"/><stop offset="1" stop-color="#${c}" stop-opacity=".06"/></linearGradient></defs><rect width="800" height="800" fill="#fff"/><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="400" r="270" fill="#${c}" fill-opacity=".14"/><circle cx="400" cy="400" r="200" fill="#fff" fill-opacity=".7"/><text x="400" y="400" font-size="260" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${e}</text></svg>`;
  res.set({ 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }).send(svg);
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/geo', require('./routes/geo'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/payments', require('./routes/payments'));

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  if (err.code === 11000) { status = 409; message = 'Duplicate value: ' + Object.keys(err.keyValue || {}).join(', '); }
  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.name === 'MulterError') { status = 400; message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message; }
  if (status === 500) console.error(err);
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_shop')
  .then(() => app.listen(PORT, () => console.log(`API running on :${PORT}`)))
  .catch((e) => { console.error('Mongo connection failed:', e.message); process.exit(1); });
