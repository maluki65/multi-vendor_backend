const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const vendorProfileSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  storeName: { type: String, required: true, index: true },
  storeSlug: { type: String, unique: true, index: true },

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

vendorProfileSchema.pre('save', function(next) {
  if (!this.isModified('storeName') || !this.storeName) return next();
  this.storeSlug = slugify(this.storeName);
  next();
});


module.exports = mongoose.model('VendorProfile', vendorProfileSchema);