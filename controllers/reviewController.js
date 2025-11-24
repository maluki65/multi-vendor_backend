const Product = require('../models/productModel');
const Review = require('../models/reviewsModel');
const BuyerProfile = require('../models/buyerModel');
const createError = require('../utils/appError');

// On creating a review
exports.createReview = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { productId } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(productId);
    if(!product) return next(new createError('Product not found', 404));

    // On preventing duplicate reviews
    const existing = await Review.findOne({ userId, productId });
    if (existing) return next(new createError('You already reviewed this product', 400));

    const review = await Review.create({
      productId,
      userId,
      rating,
      comment,
    });

    res.status(201).json({
      status: 'success',
      review
    });

  } catch (error) {
    next(error);
  }
};

// On getting product review
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId })
    .sort({ createdAt: -1 })
    .populate({
      path: 'UserId',
      select: 'username role'
    })
    .lean();
    
    // On attaching buyer profile image
    for (let review of reviews ) {
      const profile = await BuyerProfile.findOne({ buyerId: review.userId._id })
      .select('avatar username')
      .lean();
      review.BuyerProfile = profile;
    }

    res.status(200).json({
      status: 'success',
      count: reviews.length,
      reviews
    });

  } catch (error) {
    next(error);
  }
};

// On updating review
exports.updateReview = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { reviewId } = req.params;

    const reviews = await Review.findOneAndUpdate(
      { _id: reviewId, userId },
      { rating: req.body.rating, comment: req.body.comment },
      { new: true },
    );

    if(!reviews) return next(new createError('Review not found', 404));

    res.status(200).json({
      status: 'success',
      reviews
    });

  } catch (error) {
    next(error);
  }
};

// On deleting review
exports.deleteReview = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { reviewId } = req.params;

    const reviews = await Review.findOneAndDelete({
      _id: reviewId,
      userId
    });

    if(!reviews) return next(new createError('Review not found', 404));

    res.status(200).json({
      status: 'success',
      message: 'Review deleted'
    });

  } catch(error) {
    next(error);
  }
};