const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { deleteReview } = require('../controllers/reviewController');
const { getProductById } = require('../controllers/productController');
const { getCategoryAttributes, getAllActiveCategories } = require('../controllers/categoryController');

const router = express.Router();

router.get('/product/:id', protect, restrictTo('Admin', 'Vendor', 'Buyer'), getProductById);
router.get('/category-Attributes/:categoryId', protect, restrictTo('Admin','Vendor', 'Buyer'), getCategoryAttributes);
router.get('/categories', protect, restrictTo('Vendor', 'Admin', 'Buyer'), getAllActiveCategories);

router.delete('/reviews/:reviewId', protect, restrictTo('Buyer', 'Admin'), deleteReview);

module.exports = router;