const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  storeName: { type: String, required: false, default: 'None', index: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim:true },
  username: { type: String, required:false, default: 'None', index: true  },
  role: { type: String, enum: ['Buyer', 'Vendor', 'Admin'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectionReason: { type: String, default: null },
  password: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
});

userSchema.index({ storeName:1, status: 1, username: 1, role:1, createdAt: -1 });

module.exports = mongoose.model('Users', userSchema);