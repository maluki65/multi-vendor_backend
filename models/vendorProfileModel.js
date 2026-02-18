const mongoose = require('mongoose');

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
    contactEmail: String,
    contactPhone: String,
    addresses: {
      country: String,
      city: String,
      street: String,
      postal: String
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

  logo: { type: String, default: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg?semt=ais_wordcount_boost&w=740&q=80' },
  logoId: {type: String, default: '' },
  banner: { type: String, default: '' },
  bannerId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

vendorProfileSchema.index({ vendorId:1, 'store.storeName': 1, createdAt: -1 });

/*vendorProfileSchema.pre('save', function(next) {
  if (!this.isModified('store.storeName')) return next();
  
  if (this.store && this.store.storeName) {
    this.store.storeSlug = slugify(this.store.storeName);
  }

  next();
});*/


module.exports = mongoose.model('vendorProfile', vendorProfileSchema);