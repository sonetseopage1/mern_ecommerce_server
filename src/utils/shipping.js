const GeoArea = require('../models/GeoArea');
const ShippingRule = require('../models/ShippingRule');
const { httpError } = require('./helpers');

// used only if the default rule was never saved
const FALLBACK = { charge: 120, freeOver: 1500, codAllowed: true };

const brief = (a) => ({ id: a.id, name: a.name, bn: a.bn });

// upazila / thana id -> { division, district, upazila }
async function resolveArea(upazilaId) {
  const upazila = upazilaId ? await GeoArea.findOne({ type: 'upazila', id: String(upazilaId) }) : null;
  const district = upazila && (await GeoArea.findOne({ type: 'district', id: upazila.parentId }));
  const division = district && (await GeoArea.findOne({ type: 'division', id: district.parentId }));
  if (!upazila || !district || !division) throw httpError(400, 'Please select a valid division, district and thana');
  return { division, district, upazila };
}

// Most specific rule wins: thana/upazila > district > division > default. `payable` = order total before shipping.
async function quote(area, payable = 0) {
  const rules = await ShippingRule.find({
    $or: [{ level: 'default' }, { level: 'division', refId: area.division.id }, { level: 'district', refId: area.district.id }, { level: 'upazila', refId: area.upazila.id }],
  });
  const by = Object.fromEntries(rules.map((r) => [r.level, r]));
  const chain = [by.upazila, by.district, by.division].filter(Boolean);
  const def = by.default;
  const charge = chain.find((r) => r.charge != null)?.charge ?? def?.charge ?? FALLBACK.charge;
  const cod = chain.find((r) => r.codAllowed != null)?.codAllowed ?? def?.codAllowed ?? FALLBACK.codAllowed;
  const freeOver = def?.freeOver ?? FALLBACK.freeOver;
  const free = freeOver > 0 && payable >= freeOver;
  return { charge: free ? 0 : charge, baseCharge: charge, free, freeOver, codAllowed: cod !== false };
}

module.exports = { resolveArea, quote, brief, FALLBACK };
