const mongoose = require('mongoose');

const checkoutItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
    index: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },

  name: String,
  image: String,

  discount: Number,
  basePrice: Number,
  finalPrice: Number,
  quantity: Number,

  commissionRate: Number,
  commissionAmount: Number,
}, {_id: false });

const vendorBreakDownSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
  },

  subtotal: Number,
  commission: Number,
  payout: Number,
}, { _id: false });

const checkoutSessionSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },

  pricing: {
    subtotal: Number,
    tax:Number,
    shipping: Number,
    total: Number,
  },

  commissionSummary: {
    totalCommission: Number,
  },

  shippingAddress: {
    county: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
  },

  paymentMethod: {
    type: String,
    enum: ['m-pesa','visa'],
    default: 'm-pesa',
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'failed', 'completed'],
    default: 'pending',
    index: true,
  },

  status: {
    type: String,
    enum: ['active', 'expired', 'completed', 'cancelled'],
    default: 'active',
    index: true,
  },

  orderIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }
  ],

  paymentReference: String,

  expiresAt: {
    type: Date,
    required: true,
  },

  items: [checkoutItemSchema],
  vendors: [vendorBreakDownSchema],
}, { timestamps: true });

checkoutSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);