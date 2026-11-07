const mongoose = require('mongoose');

// A variant is one combination of option values, e.g. [{name:'Color',value:'Black'},{name:'RAM',value:'8GB'},{name:'Storage',value:'128GB'}]
const variantSchema = new mongoose.Schema({
  attributes: [{ _id: false, name: String, value: String }],
  color: String, // legacy (older data) – still read by the UI when `attributes` is empty
  colorHex: String,
  size: String,
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  sku: String,
  image: String,
});

const productSchema = new mongoose.Schema(
  {
    name: { en: { type: String, required: true }, bn: String },
    description: { en: String, bn: String },
    slug: { type: String, required: true, unique: true },
    images: [String],
    videos: [String], // YouTube / Google Drive / direct video links
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: String,
    manufacturer: String,
    mfgDate: Date,
    expDate: Date,
    price: { type: Number, required: true, min: 0 }, // new / selling price (base)
    oldPrice: { type: Number, min: 0 }, // old / MRP price
    stock: { type: Number, default: 0, min: 0 },
    // Option definitions shown on the product page (Color swatches, RAM, Storage, Size ...)
    optionGroups: [{ _id: false, name: String, type: { type: String, enum: ['text', 'color'], default: 'text' }, values: [{ _id: false, label: String, hex: String }] }],
    variants: [variantSchema], // when present, variant price/stock override base
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    flashDeal: {
      active: { type: Boolean, default: false },
      discountPercent: { type: Number, default: 0, min: 0, max: 95 },
      startsAt: Date,
      endsAt: Date,
    },
    rating: { type: Number, default: 4.5 },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true }
);
productSchema.index({ 'name.en': 'text', 'name.bn': 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
