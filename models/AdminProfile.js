const mongoose = require('mongoose');

const adminProfileShema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  addresses: {
    city: { type: String, required: true },
    postal: { type: String, required: true },
    street: { type: String, required: true },
    country: { type: String, required: true },
  },

  phoneNo: { type: String, required: true },
  fullNames: { type:String, required: true, index: true },
  IDPassport: { type: String, required: true, unique: true, index: true },
  nextOfKin: {
    names: { type: String, reqired: true },
    phone: { type: String, required: true },
  },
  avatar: { type: String, default: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg?semt=ais_wordcount_boost&w=740&q=80' },
  avatarId: String,  
},
 { timeStamps: true }
)

module.exports = mongoose.model('adminProfile', adminProfileShema);