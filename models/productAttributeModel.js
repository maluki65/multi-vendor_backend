const mongoose = require('mongoose');

const productAttributeSchema = new mongoose.Schema({

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },

  attributeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoryAttribute',
    required: true,
    index: true
  },

  value: mongoose.Schema.Types.Mixed

}, { timestamps: true });

module.exports = mongoose.model('ProductAttribute', productAttributeSchema);