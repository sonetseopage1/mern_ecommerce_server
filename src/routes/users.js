const router = require('express').Router();
const User = require('../models/User');
const { adminOnly } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/helpers');

router.get('/', adminOnly, wrap(async (_req, res) => res.json(await User.find().sort('-createdAt'))));

router.put('/:id/role', adminOnly, wrap(async (req, res) => {
  if (!['admin', 'manager', 'user'].includes(req.body.role)) throw httpError(400, 'Invalid role');
  if (String(req.user._id) === req.params.id) throw httpError(400, 'You cannot change your own role');
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!u) throw httpError(404, 'User not found');
  res.json(u);
}));

router.delete('/:id', adminOnly, wrap(async (req, res) => {
  if (String(req.user._id) === req.params.id) throw httpError(400, 'You cannot delete yourself');
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
