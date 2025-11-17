const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId:{
    type: mongoose.Schema.ObjectId,
    ref:'Product',
    required: true,
    index: true,
  },
  name: String,
  price: Number,
  quantity: Number,
  commissionRate: { type: Number },
  commissionAmount: { type: Number },
  vendorEarnings: { type: Number },
});


const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  }, 
  vendorId: {
    type: mongoose.Schema.ObjectId,
    ref:'VendorProfile',
    required: true,
    index: true,
  },
  products: [orderItemSchema],
  paymentStatus: {
    type: String,
    enum: ['pending',  'completed', 'failed'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'completed'],
    default: 'pending',
    index: true,
  },
  statusHisory: [
    {
      from: { type: String },
      to: { type: String },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
      role: { type: String, enum: ['Admin', 'Vendor', 'Buyer'] },
      date: { type: Date, default: Date.now },
    },
  ],
  totalAmount: { type: Number, required: true },
  paymentProvider: { type: String },
  paymentReference: { type: String },
  vendorEarnings: { type: Number, required: true },
  shippingAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// On auto-updating `updatedAt` field before saving
orderSchema.pre('save', function (next){
  this.updatedAt = new Date();
  next();
});

orderSchema.index({ buyerId: 1, vendorId:1, productId: 1, orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
