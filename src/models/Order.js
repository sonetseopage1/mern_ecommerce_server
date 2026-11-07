const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId: String,
  name: { en: String, bn: String },
  image: String,
  variantLabel: String,
  price: Number,
  qty: Number,
});

const area = { id: String, name: String, bn: String };

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [itemSchema],
    shipping: { name: String, phone: String, email: String, address: String, city: String, division: area, district: area, upazila: area, note: String },
    paymentMethod: { type: String, enum: ['COD', 'SSLCOMMERZ'], default: 'COD' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid' },
    payment: { tranId: String, sessionKey: String, valId: String, bankTranId: String, cardType: String, cardBrand: String, amount: Number, paidAt: Date, gatewayStatus: String },
    couponCode: String,
    subtotal: Number,
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: Number,
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: String }],
    adminNote: String,
  },
  { timestamps: true }
);
orderSchema.index({ 'payment.tranId': 1 });

module.exports = mongoose.model('Order', orderSchema);
