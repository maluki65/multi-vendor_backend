const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { prepareCheckOut, getCheckoutSession, getAllCheckoutSessions, resumeCheckout, completeCheckout } = require('../controllers/checkoutController');

const router = express.Router();

router.post('/prepare', protect, restrictTo('Buyer'), prepareCheckOut);
router.post('/completed/:sessionId', protect, restrictTo('Buyer'), completeCheckout);

router.get('/session/:sessionId', protect, restrictTo('Buyer'), getCheckoutSession);

router.get('/sessions', protect, restrictTo('Buyer'), getAllCheckoutSessions);

router.patch('/resume/:sessionId', protect, restrictTo('Buyer'), resumeCheckout);

module.exports = router;