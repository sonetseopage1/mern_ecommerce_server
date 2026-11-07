const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0 },
    maxDiscount: Number,
    startsAt: Date,
    expiresAt: Date,
    usageLimit: Number,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // empty = valid for every product
    showOnProduct: { type: Boolean, default: false }, // advertise the code on the product page(s)
    used: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
