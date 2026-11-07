const mongoose = require('mongoose');

// Bangladesh administrative areas: division -> district -> upazila / thana
const geoSchema = new mongoose.Schema({
  type: { type: String, enum: ['division', 'district', 'upazila'], required: true },
  id: { type: String, required: true },
  parentId: String, // district -> division id, upazila -> district id
  name: { type: String, required: true },
  bn: String,
  kind: { type: String, enum: ['upazila', 'thana'] }, // only for type 'upazila'
});
geoSchema.index({ type: 1, id: 1 }, { unique: true });
geoSchema.index({ type: 1, parentId: 1 });

module.exports = mongoose.model('GeoArea', geoSchema);
