const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  verificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  verificationImg: { 
    type: [ String ], 
    required: true, 
    index: true,
    trim: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: 'At least one verification image is required'
    }
  },

  verificationImgIds: {
    type: [ String ],
    required: true,
    trim: true,
    index: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: 'At leat one verification Id is required'
    }
  },

  termsConditions: { type: Boolean, required: true },    
}, { timestamps: true });

verificationSchema.index({ verificationId: 1, verificationImg: 1, verificationImgIds: 1, createdAt: -1 });

module.exports = mongoose.model('verificationDocs', verificationSchema);