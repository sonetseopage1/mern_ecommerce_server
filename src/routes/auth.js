const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const pub = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address, avatar: u.avatar });

router.post('/register', wrap(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (await User.findOne({ email })) throw httpError(409, 'Email already registered');
  const user = await User.create({ name, email, password, phone, role: 'user' }); // role is never client-controlled
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) throw httpError(401, 'Invalid email or password');
  res.json({ token: sign(user), user: pub(user) });
}));

router.get('/me', protect, (req, res) => res.json({ user: pub(req.user) }));

router.put('/me', protect, wrap(async (req, res) => {
  const { name, phone, address, avatar } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (address !== undefined) req.user.address = address;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  res.json({ user: pub(req.user) });
}));

router.put('/password', protect, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) throw httpError(400, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
}));

module.exports = router;
