const mongoose = require('mongoose');

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
  products: [
    {
      productId:{
        type: mongoose.Schema.ObjectId,
        ref:'Product',
        required: true,
        index: true,
      },
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  totalAmount: { type: Number, required: true },
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
  shippingAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

orderSchema.index({ buyerId: 1, vendorId:1, productId: 1, orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
