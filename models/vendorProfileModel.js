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

  businessInfo: {
    legalName: String,
    registrationNumber: String,
    taxId: String
  },

  store: {
    storeName: { type: String, required: true, index: true },
    storeSlug: { type: String, unique: true, index: true },
    description: String,
    logo: String,
    logoId: String,
    banner: String,
    contactEmail: String,
    contactPhone: String,
    address: {
      country: String,
      city: String,
      Street: String
    }
  },

  payout: {
    method: { type: String, enum: ['Bank', 'mobile_money', /*'Crypto'*/] },
    accountName: String,
    accountNumber: String,
    provider: String,
    paybill: String,
    paybillAcc: String,
    tillNumber: String,
    pochiLaBiashara: String,
  },

  metrics: {
    productsCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },

  verification: {
    isverified: { type: Boolean, default: false },
    verified: Date
  },

  socialLinks: {
    instagram: String,
    facebook: String,
    x: String,
    website: String,
  },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

vendorProfileSchema.index({ vendorId:1, storeName: 1, createdAt: -1 });

vendorProfileSchema.pre('save', function(next) {
  if (!this.isModified('storeName') || !this.storeName) return next();
  this.storeSlug = slugify(this.storeName);
  next();
});


module.exports = mongoose.model('VendorProfile', vendorProfileSchema);