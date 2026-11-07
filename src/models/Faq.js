const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: { en: { type: String, required: true }, bn: String },
    answer: { en: String, bn: String }, // sanitized HTML
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faq', faqSchema);
