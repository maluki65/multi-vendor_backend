const express = require('express');
const { AddToCart, getCart, updateCartQuantity, removeFromCart, clearCart } = require('../controllers/cartController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

// On POST routes
router.post('/add', protect, restrictTo('Buyer'), AddToCart);


// On GET routes
router.get('/', protect, restrictTo('Buyer'), getCart);

// On PUT routes
router.put('/update', protect, restrictTo('Buyer'), updateCartQuantity);
router.put('/clear', protect, restrictTo('Buyer'), clearCart);

// On DELETE routes
router.delete('/delete/:productId', protect, restrictTo('Buyer'), removeFromCart);

module.exports = router;