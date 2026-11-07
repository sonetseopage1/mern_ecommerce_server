const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { en: { type: String, required: true }, bn: String },
    slug: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    image: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
