const Orders = require('../models/orderModel');
const User = require('../models/userModel');
const BuyerProfile = require('../models/buyerModel');
const Product = require('../models/productModel');
const createError = require('../utils/appError');
const APIFeatures = require('../utils/APIFeatures');

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

// On getting Buyer profile
exports.getBuyerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
    .select('-password')
    .populate('buyerProfile');

    if(!user) {
      return next(new createError('User not found', 404));
    }

    if (user.role !== 'Buyer') {
      return next(new createError('Only buyers can access this profile', 403));
    }

    res.status(200).json({
      status: 'success',
      user,
      profile: user.buyerProfile || null,
    });
  } catch(error){
    console.error('Error getting buyer profile!', error);
    next(error);
  }
};

// On creating buyer profile
exports.createBuyerProfile = async(req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullname, phone, gender, addresses, preferences, avatar, avatarId } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(new createError('User not found!', 404));

    if (user.role !== 'Buyer') {
      return next(new createError('Only buyers can create this profile', 403));
    }

    const existingProfile = await BuyerProfile.findOne({ buyerId: userId });
    if (existingProfile) {
      return next(new createError('Buyer profile already exists', 400));
    }

    const profile = await BuyerProfile.create({
      buyerId: userId,
      fullname,
      phone,
      gender,
      addresses,
      preferences,
      avatar,
      avatarId,
    });

    user.buyerProfile = profile._id;
    await user.save();

    res.status(201).json({
      status: 'success',
      profile,
    }) 
  } catch(error){
    console.error('Failed to add profile!', error);
    next(error);
  }
};

// On updating user profile
exports.updateBuyerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, phone, addresses, username, storeName } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(new createError('User not found', 404));

    const updateData = { email }; 

    if (user.role === 'Buyer' && username) {
      updateData.username = username;
    }

    if (user.role === 'Vendor' && storeName) {
      updateData.storeName = storeName; 
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    
    const profile = await BuyerProfile.findOneAndUpdate(
      { buyerId: userId },
      { phone, addresses },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: 'success',
      user: updatedUser,
      profile, 
    });
  } catch (error) {
    console.error('failed to update buyer profile', error);
    next(error);
  }
};

// On updating avatar
exports.updateBuyerAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { avatar, avatarId } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(new createError('User not found', 404));

    if (user.role !== 'Buyer') {
      return next(new createError('Only buyers can update avatar', 403));
    }

    const profile = await BuyerProfile.findOneAndUpdate(
      { buyerId: userId },
      { avatar, avatarId },
      { new: true }
    );

    if (!profile) {
      return next(new createError('Buyer profile not found', 404));
    }

    res.status(200).json({
      status: 'success',
      profile,
    });
  } catch(error){
    console.error('Failed to update avatar!', error);
    next(error);
  }
};
// On updating user settings
exports.updateUserSettings = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { email, fullname, phone, /*address,*/ avatar, avatarId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { email , fullname },
      { new: true, runValidators: true }
    );

    if (!user) return next(new createError('User not found', 404));

    // On updating or  creating buyer profile
    const profile = await BuyerProfile.findOneAndUpdate(
      { buyerId: userId },
      { phone, /*address,*/ avatar, avatarId },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: 'success',
      user,
      profile
    });

  } catch(error){
    console.error('Error updating/creating buyer profile!', error);
    next(error);
  }
};

// On getting all products by different vendors
exports.getAllProducts = async (req, res, next) => {
  try{
    const features = new APIFeatures(
      Product.find().populate('vendorId', 'storeName'),
      req.query
    )
    .filter()
    .search()
    .sort()
    .paginate();

    const products = await features.query;

    const total = await Product.countDocuments();

    res.status(200).json({
      status: 'success',
      results: products.length,
      total,
      page: req.query.page || 1,
      products
    });
    
  } catch (error) {
    next(error);
  }
};

// On getting products by specific vendor
exports.getProductsByVendor = async (req, res, next) => {
  try{
    const { vendorId } = req.params;

    const features = new APIFeatures(
      Product.find({ vendorId }),
      req.query
    )
    .filter()
    .sort()
    .paginate();

    const products = await features.query;

    const total = await Product.countDocuments({ vendorId });

    res.status(200).json({
      status: 'success',
      total,
      results: products.length,
      products,
    });

  } catch (error) {
    next(error);
  }
};

// On getting product by category
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const features = new APIFeatures(
      Product.find({ categoryId }),
      req.query
    )
    .filter()
    .sort()
    .paginate();

    const products = await features.query;

    const total = await Product.countDocuments({ category: categoryId });

    res.status(200).json({
      status: 'success',
      total,
      results: products.length,
      products
    });

  } catch (error) {
    next(error);
  }
};

// On getting buyer cancelled orders
exports.getBuyerCancelledOrders = async (req, res, next) => {
  try{
    const buyerId = req.user.id;

    const orders = await Orders .find({
      buyerId,
      orderStatus: 'cancelled'
    })
    .populate('vendorId', 'storeName')
    .populate('products.productId', 'name price MainIMg')
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

// On searching product with pagination
exports.searchProduct = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const results  = await Product.find(
      { $text: { $search: q }},
      { score: { $meta: 'textScore' }}
    )
    .sort({
      score: { $meta: 'textScore '}
    })
    .skip(Number(skip))
    .limit(Number(limit));

    const total = await Product.countDocuments({ $text: { $search: q }});

    res.status(200).json({
      success: 'success',
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalResult: total,
      results,
    });

  } catch (error) {
    next(error);
  }
};

// On getting similar products
exports.getRecommendedProducts = async (req, res, next) => {
  try{
    const { productId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // on getting the current product first
    const currentProduct = await Product.findById(productId);
    if (!currentProduct) {
      return next(new createError('Product not found', 404));
    }

    // On building a similar query and excluding current product
    const query = {
      _id: {$ne: productId },
      status: 'active',
      category: currentProduct.category,
    };
    
    // On using tags to get similar products
    if (currentProduct.tags && currentProduct.tags.length > 0) {
      query.tags = { $in: currentProduct.tags };
    }

    // On fetching similar product
    const products  = await Product.find(query)
    .populate('vendorId', 'storeName')
    .select('name price MainIMg averageRating totalReviews tags vendorId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // On counting pagination
    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      count: products.length,
      products,
    });

  } catch(error){
    next(error);
  }
};