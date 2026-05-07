const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  productId:{
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },  
}, { _id: false});

const wishListSchema = new mongoose.Schema({
  buyerId:{
    type: mongoose.Schema.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  items: [wishlistItemSchema],

}, { timestamps: true });


module.exports = mongoose.model('wishlist', wishListSchema);