const { mongoose } = require('mongoose');
const VendorProfile = require('../models/vendorProfileModel');
const Orders = require('../models/orderModel');
const User = require('../models/userModel');
const createError = require('../utils/appError');

// On creating or updating vendor Profile
exports.createUpdateVendorProfile = async (req, res, next) => {
  try{
    const vendorId = req.user.id;
    const data = req.body;

    const user = await User.findById(vendorId);
    if(!user) return next(new createError('User not found', 404));
    
    const storeName = data.storeName || user.storeName;

    const profile = await VendorProfile.findOneAndUpdate(
      { vendorId },
      { ...data, vendorId },
      { upsert: true, new: true, setDefaultsOnInsert: true }  // if doc doesn't exist create it
    );

    // On keeping the storeName in sync with user model
    if (data.storeName && data.storeName !== user.storeName){
      user.storeName = data.storeName;
      await user.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Vendor profile saved successfully.',
      profile,
      storeName,
    });
  } catch (error) {
    next(error);
  }
};

// On getting vendor profile (Public)
exports.getVendorProfile = async(req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await VendorProfile.findOne({ vendorId: id }).populate('vendorId', 'storeName email');

    if (!profile) return next(new createError('Vendor profile not found', 404));

    res.status(200).json({
      status: 'success',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// On getting vendor stats
exports.getVendorStats = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const totalOrders = await Orders.countDocuments({ vendorId });
    const totalRevenue = await Orders.aggregate([
      { $match: { vendorId, orderStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ])

    const completedOrders = await Orders.countDocuments({
      vendorId,
      orderStatus: 'completed',
    });

    res.status(200).json({
      status: 'success',
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        completedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// On getting vendor orders
exports.getVendorOrders = async (req, res, next ) => {
  try {
    const vendorId = req.user.id;
    const orders = await Orders.find( { vendorId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// On vendor getting all cancelled orders
exports.getVendorCancelledOrders = async(req, res, next) => {
  try{
    const vendorId = req.user.id;

    const vendorProfile = await VendorProfile.findOne({ vendorId});
    if(!vendorProfile) return next(new createError('Vendor nt found', 404));

    const orders = await Orders.find({
      vendorId: vendorProfile._id,
      orderStatus: 'cancelled'
    })
    .populate('buyerId', 'username email')
    .populate('product.productId', 'name MainIMg price')
    .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      orders
    });

  } catch (error) {
    next(error);
  }
};