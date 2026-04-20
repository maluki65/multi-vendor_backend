const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { prepareCheckOut, getCheckoutSession } = require('../controllers/checkoutController');

const router = express.Router();

router.post('/prepare', protect, restrictTo('Buyer'), prepareCheckOut);

router.get('/session/:sessionId', protect, restrictTo('Buyer'), getCheckoutSession);

module.exports = router;