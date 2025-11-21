const express = require('express');
const { AddToCart, getCart, updateCartQuantity, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

// On POST routes
router.post('/cart/add', protect, restrictTo('Buyer'), AddToCart);


// On GET routes
router.get('/cart', protect, restrictTo('Buyer'), getCart);

// On PUT routes
router.put('/cart/updateQuantity', protect, restrictTo('Buyer'), updateCartQuantity);

// On DELETE routes
router.delete('/cart/deleteProduct/:productId', protect, restrictTo('Buyer'), removeFromCart);

module.exports = router;