const express = require('express');
const { startCheckout, cancelCheckoutSession } = require('../controllers/checkoutController');
const { createReview, getProductReviews, updateReview, deleteReview  } = require('../controllers/reviewController');
const { getUserInfo, updateUserSettings, getAllProducts, getProductsByVendor, getProductsByCategory, getRecommendedProducts,searchProduct } = require('../controllers/buyerController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

// On POST routes
router.post('/checkout/start', protect, restrictTo('Buyer'), startCheckout);
router.post('/checkout/cancel/:id', protect, restrictTo('Buyer'), cancelCheckoutSession);
router.post('/reviews/:productId', protect, restrictTo('Buyer'), createReview);

// On GET routes
router.get('/user/info', protect, restrictTo('Buyer'), getUserInfo);
router.get('/products', protect, restrictTo('Buyer'), getAllProducts);
router.get('/products/vendor/:vendorId', protect, restrictTo('Buyer'), getProductsByVendor);
router.get('/products/category/:categoryId', protect, restrictTo('Buyer'), getProductsByCategory);
router.get('/reviews/product/:productId', protect, restrictTo('Buyer'), getProductReviews);
router.get('/products/search', protect, restrictTo('Buyer'), searchProduct);
router.get('/products/:productId/recommeded', protect, restrictTo('Buyer'), getRecommendedProducts);

// On PUT routes
router.put('/settings', protect, restrictTo('Buyer'), updateUserSettings);
router.put('/reviews/:reviewId', protect, restrictTo('Buyer'), updateReview);

// On PATCH routes

// On DELETE routes
router.delete('/reviews/:reviewId', protect, restrictTo('Buyer', 'Admin'), deleteReview);

module.exports = router;