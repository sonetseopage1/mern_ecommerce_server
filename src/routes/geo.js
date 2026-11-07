const router = require('express').Router();
const GeoArea = require('../models/GeoArea');
const { wrap } = require('../utils/helpers');

const pick = (a) => ({ id: a.id, name: a.name, bn: a.bn, parentId: a.parentId, kind: a.kind });
// areas never change while the server runs (admin edits are not supported), so a short cache is safe
const cache = new Map();
const cached = async (key, find) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.data;
  const data = (await find).map(pick);
  cache.set(key, { at: Date.now(), data });
  return data;
};

router.get('/divisions', wrap(async (_req, res) => res.json(await cached('div', GeoArea.find({ type: 'division' }).sort('name')))));
router.get('/districts', wrap(async (req, res) => {
  const q = { type: 'district' };
  if (req.query.division) q.parentId = String(req.query.division);
  res.json(await cached('dis:' + (q.parentId || 'all'), GeoArea.find(q).sort('name')));
}));
router.get('/upazilas', wrap(async (req, res) => {
  const q = { type: 'upazila' };
  if (req.query.district) q.parentId = String(req.query.district);
  res.json(await cached('upa:' + (q.parentId || 'all'), GeoArea.find(q).sort('kind name')));
}));

module.exports = router;
