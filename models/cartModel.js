const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId:{
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    require: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    index: true,
  },

  //snapshot at time of adding to cart
  name: String,
  price: Number,
  image: String,
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    index: true,
  }
});

const cartSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

cartSchema.index({'items.productId': 1, 'items.vendorId': 1, 'items.quantity': 1, createdAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);

