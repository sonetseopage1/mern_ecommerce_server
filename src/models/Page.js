const mongoose = require('mongoose');

// Content pages edited with the rich-text editor (Terms, Privacy/Our Policy, About ...)
const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { en: { type: String, required: true }, bn: String },
    content: { en: String, bn: String }, // sanitized HTML
    active: { type: Boolean, default: true },
    showInFooter: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Page', pageSchema);
