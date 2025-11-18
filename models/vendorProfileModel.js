const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },
  storeName: { type: String, required: true, index: true },
  description: { type: String },
  logo: { type: String },
  banner: { type: String },
  contactEmail: { type: String },
  phone: { type: String },
  address: { type: String },
  socialLinks: {
    instagram: String,
    facebook: String,
    x: String,
    website: String,
  },
  createdAt: { type: Date, default: Date.now },
});

vendorProfileSchema.index({ vendorId:1, storeName: 1, createdAt: -1 });


module.exports = mongoose.model('VendorProfile', vendorProfileSchema);