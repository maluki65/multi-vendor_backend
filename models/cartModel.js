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
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
  },
  items: [cartItemSchema]
}, { timestamps: true });

cartSchema.index({'items.productId': 1, 'items.quantity': 1, createdAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);

