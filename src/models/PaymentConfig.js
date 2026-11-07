const mongoose = require('mongoose');

// Single document: which payment methods are switched on + SSLCommerz credentials (password is stored encrypted)
const paymentSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'payments', unique: true },
    cod: { enabled: { type: Boolean, default: true } },
    sslcommerz: {
      enabled: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      storeId: String,
      storePassword: String, // AES-256-GCM encrypted, never sent to the browser
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentConfig', paymentSchema);
