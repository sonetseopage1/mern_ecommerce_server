const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { httpError, wrap } = require('../utils/helpers');

const protect = wrap(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw httpError(401, 'Not authenticated');
  let payload;
  try { payload = jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch { throw httpError(401, 'Invalid token'); }
  const user = await User.findById(payload.id);
  if (!user) throw httpError(401, 'User no longer exists');
  req.user = user;
  next();
});

const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'Forbidden'));

const staff = [protect, authorize('admin', 'manager')];
const adminOnly = [protect, authorize('admin')];

module.exports = { protect, authorize, staff, adminOnly };
