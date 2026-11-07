const mongoose = require('mongoose');

// Shipping charge / cash-on-delivery rules.
// Most specific wins: upazila/thana > district > division > default. A null field means "inherit from the level above".
const ruleSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['default', 'division', 'district', 'upazila'], required: true },
    refId: { type: String, default: '' }, // GeoArea id (empty for the default rule)
    charge: { type: Number, min: 0, default: null },
    codAllowed: { type: Boolean, default: null },
    freeOver: { type: Number, min: 0, default: null }, // only used by the default rule: order total above which shipping is free
  },
  { timestamps: true }
);
ruleSchema.index({ level: 1, refId: 1 }, { unique: true });

module.exports = mongoose.model('ShippingRule', ruleSchema);
