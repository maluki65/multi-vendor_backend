const mongoose = require('mongoose');

const categoryAttributeSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ['text', 'number', 'boolean', 'select'],
    default: 'text'
  },

  options: [String],

  required: {
    type: Boolean,
    default: false
  },

  filterable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });


module.exports = mongoose.model('CategoryAttribute', categoryAttributeSchema);