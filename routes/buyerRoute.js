const express = require('express');
const { startCheckout, cancelCheckoutSession } = require('../controllers/checkoutController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

// On POST routes
router.post('/checkout/start', protect, restrictTo('Buyer'), startCheckout);

router.post('/checkout/cancel/:id', protect, restrictTo('Buyer'), cancelCheckoutSession);
// On GET routes
// On PATCH routes

module.exports = router;