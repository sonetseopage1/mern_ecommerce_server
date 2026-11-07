const mongoose = require('mongoose');

const bi = { en: String, bn: String };

// Single document (key: 'site') holding all site-wide settings
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },
    siteName: bi,
    tagline: bi,
    logo: String,
    favicon: String,
    appIcon: String, // apple-touch / PWA icon
    ogImage: String,
    metaTitle: bi,
    metaDescription: bi,
    metaKeywords: bi,
    contact: { phone: String, email: String, address: bi },
    social: { facebook: String, instagram: String, youtube: String, twitter: String, tiktok: String, linkedin: String, whatsapp: String, telegram: String, pinterest: String },
    footerText: bi,
    invoiceNote: bi,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
