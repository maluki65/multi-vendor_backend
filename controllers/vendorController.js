const VendorProfile = require('../models/vendorProfileModel');
const Orders = require('../models/orderModel');
const User = require('../models/userModel');
const createError = require('../utils/appError');
const slugify = require('../utils/slugify');

// On getting user info
exports.getUserInfo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    .select('-password')
    .populate('buyerProfile')
    .populate('vendorProfile');

    if(!user) return next(new createError('User not found', 404));

    res.status(200).json({
      status: 'success',
      user,
      profile:
      user.role === 'Buyer'
       ? user.buyerProfile
       : user.vendorProfile,
    });
  } catch (error){
    next(error);
  }
};

// On creating vendor profile
exports.createVendorProfile = async(req, res, next) => {
  try{
    const userId = req.user.id;
    const { businessInfo, store, payout,  socialLinks, logo, logoId, banner, bannerId } = req.body

    const user = await User.findById(userId);
    if (!user) return next(new createError('User not found!', 404));

    if (user.role !== 'Vendor'){
      return next(new createError('Only vendors can create this profile', 403));
    }

    const existingProfile = await VendorProfile.findOne({
      vendorId: userId
    });
    if (existingProfile) {
      return next(new createError('Vendor profile already exists', 400));
    }

    const profile = await VendorProfile.create({
      vendorId: userId,
      businessInfo,
      store,
      payout,
      socialLinks,
      logo,
      logoId,
      banner,
      bannerId,
    });

    user.vendorProfile = profile._id;
    await user.save();

    res.status(201).json({
      status: 'success',
      profile,
    })
  } catch(error) {
    console.error('Failed to add profile!', error);
    next(error);
  }
};

// On getting vendor profile (Public)
exports.getVendorProfile = async(req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
    .select('-password')
    .populate('vendorProfile');

    if(!user) {
      return next(new createError('Only vendors can access this profile', 403));
    }

    res.status(200).json({
      status: 'success',
      user,
      profile: user.vendorProfile || null,
    });
  } catch(error){
    console.error('Error getting vendor profile!', error);
    next(error);
  }
};

// On updating vendor profile
exports.updateVendorProfile = async(req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if(!user) return next(new createError('User not found!', 404));

    if (user.role !== 'Vendor') {
      return next(new createError('Only vendors can update this profile', 403));
    }

    // on flattening nested objects
    const flattenObject = (obj, parent = '', res = {}) => {
      for (let key in obj) {
        const propName = parent ? `${parent}.${key}` : key;

        if (
          obj[key] !== null && 
          typeof obj[key] === 'object' &&
          !Array.isArray(obj[key])
        ) {
          flattenObject(obj[key], propName, res);
        } else {
          res[propName] = obj[key];
        }
      }
      return res;
    };

    const allowedProfileFields = [
      'businessInfo',
      'store',
      'payout',
      'socialLinks'
    ];


    const profileUpdatedData = {};

    /*if (req.body.store?.storeName) {
      profileUpdatedData['store.storeSlug'] = slugify(req.body.storeName);
    }*/

    for (let key of allowedProfileFields){
      if (req.body[key] !== undefined){
        if (typeof req.body[key] === 'object' && req.body[key] !== null) {
          Object.assign(profileUpdatedData, flattenObject(req.body[key], key));
        } else {
          profileUpdatedData[key] = req.body[key];
        }
      }
    }

    if (Object.keys(profileUpdatedData).length === 0) {
      return next(new createError('No valid fields provided', 403));
    }

    const profile = await VendorProfile.findOneAndUpdate(
      { vendorId: userId },
      { $set: profileUpdatedData },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      profile,
    });
  } catch (error){
    console.error('Failed to update vendor profile', error);
    next(error);
  }
};

// On updating vendor media
exports.updateVendorMedia = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { logo, logoId, banner, bannerId} = req.body;

    const user = await User.findById(userId);
    if(!user) return next(new createError('User not found!', 404));

    if(user.role !== 'Vendor') {
      return next(new createError('Only vendors can update this profile media', 403));
    }

    const updateFields = {};

    if (logo !== undefined) updateFields.logo = logo;
    if (logoId !== undefined) updateFields.logoId = logoId;

    if (banner !== undefined) updateFields.banner = banner;
    if (bannerId !== undefined) updateFields.bannerId = bannerId;

    if (Object.keys(updateFields).length === 0){
      return next(new createError('No valid field provided for update', 400));
    }

    const profile = await VendorProfile.findOneAndUpdate(
      { vendorId: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!profile) {
      return next(new createError('Vendor profile not found!', 404));
    }

    res.stats(200).json({
      status: 'success',
      profile,
    });
  } catch(error) {
    console.error('Failed to update profile media!', error);
    next(error);
  };
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
    
    const orders = await Orders.find({
      vendorId,
      orderStatus: 'cancelled'
    })
    .populate('buyerId', 'username email')
    .populate('products.productId', 'name MainIMg price')
    .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      orders,
    });

  } catch (error) {
    next(error);
  }
};