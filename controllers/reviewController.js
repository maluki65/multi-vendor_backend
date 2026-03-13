const Product = require('../models/productModel');
const Review = require('../models/reviewsModel');
const createError = require('../utils/appError');

// On creating a review
exports.createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(productId);
    if (!product) return next(new createError('Product not found', 404));

    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview)
      return next(new createError('You already reviewed this product', 400));

    const review = await Review.create({
      productId,
      userId,
      rating,
      comment
    });

    product.reviews.push(review._id);
    await product.save();

    await Product.updateAverageRating(productId);

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
      .populate('userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .lean();

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
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, userId },
      {
        rating: req.body.rating,
        comment: req.body.comment
      },
      { new: true }
    );

    if (!review)
      return next(new createError('Review not found', 404));

    await Product.updateAverageRating(review.productId);

    res.status(200).json({
      status: 'success',
      review
    });

  } catch (error) {
    next(error);
  }
};

// On deleting review
exports.deleteReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      userId
    });

    if (!review)
      return next(new createError('Review not found', 404));

    await Product.updateAverageRating(review.productId);

    res.status(200).json({
      status: 'success',
      message: 'Review deleted'
    });

  } catch (error) {
    next(error);
  }
};