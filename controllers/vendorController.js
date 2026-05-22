const VendorProfile = require('../models/vendorProfileModel');
const Orders = require('../models/orderModel');
const User = require('../models/userModel');
const createError = require('../utils/appError');
const slugify = require('../utils/slugify');
const ImageKit = require('../config/imgKit');
const Product = require('../models/productModel');

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

    const profile = user.vendorProfile || null
    const normalizedProfile = profile ? {
      ...profile.toObject(),
      avatar: profile.logo,
    }
    : null;

    res.status(200).json({
      status: 'success',
      user,
      profile: normalizedProfile,
    });
  } catch(error){
    console.error('Error getting vendor profile!', error);
    next(error);
  }
};

// On getting vendor profile by id
exports.getVendorProfileById = async(req, res, next) => {
  try{
    const { id } = req.params;

    if (req.user.role !== 'Admin') {
      return next(new createError('Unauthorized access!', 403));
    }
    
    const user = await User.findById(id)
     .select('-password')
     .populate('vendorProfile');

    if (!user) {
      return next(new createError('User not found!', 404));
    }

    if (user.role !== 'Vendor') {
      return next(new createError('This user is not a vendor!', 400));
    }

    if (!user.vendorProfile) {
      return res.status(200).json({
        status: 'success',
        message: 'This vendor does not have a profile yet',
        profile: null,
      })
    }

    res.status(200).json({
      status: 'success',
      user,

      profile: user.vendorProfile,
    });
  } catch(error) {
    console.error('Error getting vendor profile:', error);
    next(error);
  }
};

// On updating vendor profile
exports.updateVendorProfile = async(req, res, next) => {
  try{
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return next(new createError('User not found!', 404));
    }

    if (user.role !== 'Vendor'){
      return next(new createError('Only vendors can update this profile', 403));
    }

    const profile = await VendorProfile.findOne({ vendorId: userId });

    if (!profile) {
      return next(new createError('Vendor profile not found!', 404));
    }

    // On flattening the objects
    const flattenObjects = ( 
      obj, 
      parent = '', 
      res = {} 
    ) => {
      for (let key in obj) {
        const propName = parent
         ? `${parent}.${key}`
         : key;

        if (
          obj[key] !== null &&
          typeof obj[key] === 'object' && !Array.isArray(obj[key])
        ) {
          flattenObjects(
            obj[key],
            propName,
            res
          );
        } else {
          res[propName] = obj[key];
        }
      }

      return res;
    };

    const profileUpdateData = {};
    const userUpdateData = {};

    if (req.body.legalName) {
      userUpdateData.storeName = req.body.legalName;

      profileUpdateData['businessInfo.legalName'] = req.body.legalName;

      /*profileUpdateData['store.storeSlug'] = slugify(req.body.legalName, {
        lower: true,
        strict: true,
      });*/
    }

    if (req.body.description !== undefined) {
      profileUpdateData[
        'store.description'
      ] = req.body.description;
    }

    if (req.body.phone !== undefined) {
      profileUpdateData[
        'store.contactPhone'
      ] = req.body.phone;
    }

    if (req.body.addresses) {
      const flattenedAddresses = flattenObjects(
        req.body.addresses,
        'store.addresses'
      );

      Object.assign(
        profileUpdateData,
        flattenedAddresses
      );
    }

    if (req.body.payout) {
      const flattenedPayout =
        flattenObjects(
          req.body.payout,
          'payout'
        );

      Object.assign(
        profileUpdateData,
        flattenedPayout
      );
    }

    /*if (req.body.socialLinks) {

      const flattenedSocials =
        flattenObjects(
          req.body.socialLinks,
          'socialLinks'
        );

      Object.assign(
        profileUpdateData,
        flattenedSocials
      );
    }*/

    if (req.body.logo) {
      if (profile.logoId){
        try {
          await ImageKit.deleteFile(
            profile.logoId
          )
        }catch (error) {
          console.error('Failed to delete old logo', error.message);
        }
      }

      profileUpdateData['logo'] = req.body.logo;
      profileUpdateData['logoId'] = req.body.logoId;
    }

    if (req.body.banner) {
      if (profile.banner){
        try {
          await ImageKit.deleteFile(
            profile.bannerId
          )
        }catch (error) {
          console.error('Failed to delete old banner', error.message);
        }
      }

      profileUpdateData['banner'] = req.body.banner;
      profileUpdateData['bannerId'] = req.body.bannerId;
    }

    if (
      Object.keys(profileUpdateData).length === 0 &&
      Object.keys(userUpdateData).length === 0
    ) {
      return next (new createError('No valid fields provided!', 400));
    }

    if (Object.keys(userUpdateData).length > 0){
      await User.findByIdAndUpdate(
        userId,
        {
          $set: userUpdateData,
        }
      );
    }

    const updatedProfile = await VendorProfile.findOneAndUpdate(
      { vendorId: userId },
      {
        $set: profileUpdateData,
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      status: 'success',
      profile: updatedProfile
    });
  }catch (error){
    console.error('Failed to update vendor profile', error);
    next(error);
  }
};

// On vendor analytics
exports.getVendorAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vendorProfile = await VendorProfile.findOne({ vendorId: userId });
    if(!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    };

    const vendorId = vendorProfile._id;

    const totalOrders = await Orders.countDocuments({
      vendorId,
      orderStatus: 'completed'
    });

    const pendingOrders = await Orders.countDocuments({
      vendorId,
      orderStatus: 'pending',
    });

    const revenueResult = await Orders.aggregate([
      {
        $match: {
          vendorId,
          orderStatus: 'completed',
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: '$vendorEarnings',
          },
          totalCommission: {
            $sum: '$platformCommission'
          },
        },
      },
    ]);

    const totalProducts = await Product.countDocuments({ vendorId });

    const now = new Date();

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const previousDate = new Date(
      currentYear,
      now.getMonth() -1,
    );

    const previousMonth = previousDate.getMonth() + 1;
    const previousYear = previousDate.getFullYear();

    const monthlyRevenue = await Orders.aggregate([
      {
        $match: {
          vendorId,
          orderStatus: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: {
              $year: '$createdAt'
            },
            month: {
              $month: '$createdAt',
            },
          },
          income: {
            $sum: '$vendorEarnings',
          },
          expenses: {
            $sum: '$platformCommission',
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          monthNumber: '$_id.month',
          month: {
            $arrayElemAt: [
              [
                '',
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ],
              '$_id.month',
            ],
          },
          income: 1,
          expenses: 1,
        },
      },
      {
        $sort: {
          year: 1,
          monthNumber: 1,
        },
      },
    ]);

    const currentMonthData = monthlyRevenue.find(
      item =>
        item.monthNumber === currentMonth &&
        item.year === currentYear
    );
    
    const previousMonthData = monthlyRevenue.find(
      item =>
        item.monthNumber === previousMonth &&
        item.year === previousYear
    );    

    const currentRevenue = currentMonthData?.income || 0;
    const previousRevenue = previousMonthData?.income || 0;

    const currentCommission = currentMonthData?.expenses || 0;
    const previousCommission = previousMonthData?.expenses || 0;

    const calculatedTrend = (current, previous) => {
      if (previous === 0 && current > 0) {
        return 100;
      }

      if (previous === 0 && current === 0){
        return 0;
      }

      const percentage = ((current - previous) / previous) * 100;

      return Number((percentage.toFixed(1)));
    };

    const hasCurrentRevenue = currentRevenue > 0;
    const hasCurrentCommission = currentCommission > 0;

    const revenueTrend = calculatedTrend(currentRevenue, previousRevenue);
    const commissionTrend = calculatedTrend(currentCommission, previousCommission);

    res.status(200).json({
      success: true,
      analytics: {
        totalOrders,
        pendingOrders,
        totalProducts,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        totalCommission: revenueResult[0]?.totalCommission || 0,
        monthlyRevenue,
        revenueTrend,
        commissionTrend,
        hasCurrentRevenue,
        hasCurrentCommission,
      },
    });
  } catch (error) {
    console.error('Failed to get vendor analytics', error);
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
/*exports.getVendorOrders = async (req, res, next ) => {
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
*/

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