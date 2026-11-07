const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { staff } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

router.get('/', staff, wrap(async (_req, res) => {
  const [users, products, orders, rev, byStatus, recent, lowStock] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.find().populate('user', 'name').sort('-createdAt').limit(6),
    Product.find({ stock: { $lte: 5 }, 'variants.0': { $exists: false } }).select('name stock slug').limit(6),
  ]);
  res.json({ users, products, orders, revenue: rev[0]?.total || 0, byStatus, recent, lowStock });
}));

module.exports = router;
