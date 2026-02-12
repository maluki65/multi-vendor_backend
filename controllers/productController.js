const Products = require('../models/productModel');
const Reviews = require('../models/reviewsModel');
const Orders = require('../models/orderModel');
const mongoose = require('mongoose');
const VendorProfiles = require('../models/vendorProfileModel');
const createError = require('../utils/appError');
const imageKit = require('../config/imgKit');

// On creating  product
exports.createProduct = async (req, res, next ) => {
  try {
    const vendorId = req.user.id;

    const vendor = await VendorProfiles.findOne({ vendorId });
    if(!vendor) return next(new createError('Vendor profile not found', 404));

    const { name, description, tags, price, MainIMg, MainIMgId, supportImgs, supportImgsId, quantity } = req.body;

    const product = await Products.create({
      vendorId: vendor._id,
      name,
      description,
      tags,
      price,
      MainIMg,
      MainIMgId,
      supportImgs,
      supportImgsId,
      quantity,
    });

    res.status(201).json({ status: 'Success', product });
  } catch (error) {
    next(error);
  }
};

// On ensuring that only approved vendors can add products
exports.vendorGuard = (req, res, next) => {
  if (req.user.role !== 'Vendor') return next();

  if (req.user.status === 'pending') {
    return next(
      new createError(
        'Your account is still under review. Please submit verification documents.',
        403
      )
    );
  }

  if (req.user.status === 'rejected') {
    return next(
      new createError(
        'Your vendor account was rejected. Please request re-approval.',
        403
      )
    );
  }

  next();
}

// On getting all products for all vendors (Buyer)
exports.getAllProducts = async (req, res, next ) => {
  try {
    const product = await Products.find().populate('vendorId', 'storeName logo');
    res.status(200).json({ status: 'success', results: product.length, product });
  } catch (error) {
    next(error);
  }
};

// On getting products by a specific vendor
exports.getVendorProducts = async (req, res, next ) => {
  try{
    const { vendorId } = req.params;
    const product = await Products.find({ vendorId }).populate('vendorId', 'storeName logo');
    res.status(200).json({ status: 'success', results: product.length, product });
  } catch (error) {
    next(error);
  }
};

// On getting product by id (buyer & vendor )
exports.getProductById =  async (req, res, next ) => {
  try {
    const { id } = req.params;
    const product = await Products.findById(id).populate('vendorId', 'storeName logo').populate({ path: 'reviews', populate: { path:'userId', select: 'name profileImage'}});
    if(!product) return next(new createError('Product not found!', 404));
    res.status(200).json({ status: 'Success', product });
  } catch (error) {
    next(error);
  }
};

// On updating a product
exports.updateProduct = async (req, res, next ) => {
  try { 
    const vendorId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // on finding a product and verifying ownership
    const product = await Products.findById(id);
    if(!product) return next(new createError('Product not found:', 404));

    const vendorProfile = await VendorProfiles.findOne({ vendorId });
    if(!vendorProfile || product.vendorId.toString() !== vendorProfile._id.toString()) {
      return next(new createError('Not authorized to edit this product', 403));
    }

    const allowedFields = ['name', 'description', 'price', 'quantity', 'tags'];
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) product[key] = updates[key];
    });

    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Product update successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// On deleting a product
exports.deleteProduct = async (req, res, next) => {
  try{
    const vendorId = req.user.id;
    const { id } = req.params;

    const vendorProfile = await VendorProfiles.findOne({ vendorId });
    if(!vendorProfile) return next(new createError('Vendor profile not found', 404));
    
    const product = await Products.findById(id);
    if (!product) return next(new createError('Product not found', 404));

    if (product.vendorId.toString() !== vendorProfile._id.toString()){
      return next(new createError('Not authorized to delete this product', 403));
    }

    if (product.MainIMgId){
      try {
        await imageKit.deleteFile(product.MainIMgId)
      } catch (error){
        console.warn('Failed to delete main Image from ImageKit:', error.message);
      }
    }

    if (Array.isArray(product.supportImgsId) && product.supportImgsId.length > 0 ){
      try {
        await imageKit.bulkDeleteFiles(product.supportImgsId);
      } catch (error) {
        console.warn('Failed to delete support images from imageKit:', error.message);
      }
    }

    await Products.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// On posting a review for a product (Buyer)
exports.postReview = async (req, res, next ) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { rating, comment } = req.body;

    const product = await Products.findById(productId);
    if(!product) return next( new createError('Product not found!', 404));

    const review = await Reviews.create({ productId, userId, rating, comment });

    product.reviews.push(review._id);
    await product.save();

    res.status(201).json({ status: 'success', review });
  } catch (error) {
    next(error);
  }
};

// On getting a review for product (Buyer)
exports.getProductReviews = async (req, res, next ) => {
  try {
    const { productId } = req.params;
    const reviews = await Reviews.find({ productId }).populate('userId', 'name profileImage');
    res.status(200).json({
      status: 'success',
      results: reviews.length, reviews
    });
  } catch (error) {
    next(error);
  }
};

// On updating product quantity after complete order
exports.updateProductQuantity = async (productId, quantityOrdered) => {
  const product = await Products.findById(productId);
  if(!product) return;

  product.quantity -= quantityOrdered;
  if(product.quantity < 5 ){
    console.log(`Low stock alert for product: ${product.name} (Qty: ${product.quantity})`);
  }
}

// On smart recommendation with trending and top-rated products
exports.getSmartRecomendations = async (req, res, next) => {
  try{
    const { productId } = req.params;
    const { vendorId, page = 1, limit = 10, period = 'week' } = req.query;

    const skip = (page - 1)* limit;
    

    // On getting top-rated products
    const topRated = await Products.find( vendorId ? { status: 'active', vendorId } : { status: 'active'})
    .sort({ averageRating: -1, totalReviews: -1 })
    .skip(skip)
    .limit(10);

    // On getting trending products based on orders
    let startDate = new Date();
    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else startDate.setDate(startDate.getDate() - 7);

    const trending = await Orders.aggregate([
      { $match: { createdAt: { $gte: startDate }}},
      { $unwind: '$products' },
      { $group: { _id: '$products.productId', orders: { $sum: 1 }}},
      { $sort: { orders: -1 }},
      { $limit: 10 },
      { $lookup: {from: 'products', localField: '_id', foreignField: '_id', as: 'product'}},
      { $unwind: '$product'}
    ]);

    // On customer also bought
    let alsoBought = [];
    if (productId) {
      alsoBought = await Orders.aggregate([
        { $match: { 'products.productId': mongoose.Types.ObjectId(productId)}},
        { $unwind: '$products'},
        { $match: { 'products.productId': { $ne: mongoose.Types.ObjectId(productId)}}},
        { $group: { _id: '$products.productId', count: {$sum: 1}}},
        { $sort: { count: -1 }},
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product'}},
        { $unwind: '$product'}
      ]);
    }

    res.status(200).json({
      status: 'success',
      recommdations: {
        topRated,
        trending,
        alsoBought
      }
    });

  } catch(error){
    next(error);
  }
};