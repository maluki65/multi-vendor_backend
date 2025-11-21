const mongoose = require('mongoose');

const checkoutItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  // On snapshot
  name: String,
  price: Number,
  quantity: Number,
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
  },
  image: String,
}, {_id: false});

const checkoutSessionSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    required: true,
    index: true,
  },

  // snapshot of cart items at moment of checkout
  items: [checkoutItemSchema],
  totalAmount: {
    type:Number,
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
    index: true,
  },
  shippindAddress:{
    type: String,
    required: true,
  },
  paymentMethod:{
    type: String,
    enum: ['m-pesa'],
    default: 'm-pesa',
  },
  paymentStatus:{
    type: String,
    enum: ['pending', 'processing', 'failed', 'completed'],
    default: 'pending',
    index: true,
  },

  mpesaCheckoutRequestID:{ type: String }, // returned by m-pesa STK
  mpesaMerchantRequestId: { type: String },
  mpesaReceiptNumber: { type: String },
  mpesaResultsDescription:{ type: String },

  // On whether the order has been created from this session
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Order',
  },

  expiresAt: {
    type: Date,
  },
}, {timestamps: true });

checkoutSessionSchema.index({ 'items.productId': 1, buyerId: 1, vendorId: 1, paymentStatus: 1}, { expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model( 'CheckoutSession', checkoutSessionSchema);