const mongoose = require('mongoose');
const slugify = require('../utils/slugify');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
  UUID: { type: String, unique: true, index: true, required: true },
  storeName: { type: String, unique: true, trim: true, required: false, default: 'None', index: true },
  storeSlug: { type: String, unique: true, index: true },

  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim:true },
  username: { type: String, required:false, default: 'None', index: true  },
  
  role: { type: String, enum: ['Buyer', 'Vendor', 'Admin'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },

  rejectionReason: { type: String, default: null },
  password: { type: String, required: true, select: false },
  passwordChangedAt: { type: Date },
  refreshTokenHash: { type: String, select: false },
  createdAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String, default: 'OnSignUp'},
});

userSchema.index({ UUID: 1, storeName:1, status: 1, username: 1, role:1, createdAt: -1 });

userSchema.pre('save', function(next) {
  
  if (this.role === 'Vendor' && !this.isModified('status')) {
    this.status = 'pending';
  }

  if (this.role === 'Buyer' && !this.isModified('status')) {
    this.status = 'approved';
  }

  next();
});

// on generating slug when storeName changes
userSchema.pre('save', function(next) {
  if (!this.isModified('storeName') || !this.storeName) return next();
  this.storeSlug = slugify(this.storeName);
  next();
});

// On securing hash for refresh token
userSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// On virtual profiles
userSchema.virtual('buyerProfile', {
  ref: 'BuyerProfile',
  localField: '_id',
  foreignField: 'buyerId',
  justOne: true,
});

userSchema.virtual('vendorProfile', {
  ref: 'VendorProfile',
  localField: '_id',
  foreignField: 'vendorId',
  justOne: true,
});

// On enabling virtuals in JSON
userSchema.set('toJSON',  { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Users', userSchema);