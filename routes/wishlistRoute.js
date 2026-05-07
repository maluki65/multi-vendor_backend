const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { addToWishlist, getWishlist, removeFromWishlist, clearWishlist } = require('../controllers/wishlistContoller');

const router = express.Router();

router.post('/add', protect, restrictTo('Buyer'), addToWishlist);

router.get('/', protect, restrictTo('Buyer'), getWishlist);

router.delete('/remove/:productId', protect, restrictTo('Buyer'), removeFromWishlist);

router.delete('/clear', protect, restrictTo('Buyer'), clearWishlist);

module.exports = router;