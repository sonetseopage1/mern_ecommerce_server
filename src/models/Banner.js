const mongoose = require('mongoose');

// Hero slider slides on the home page
const bannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    title: { en: String, bn: String },
    subtitle: { en: String, bn: String },
    buttonText: { en: String, bn: String },
    link: { type: String, default: '/products' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
