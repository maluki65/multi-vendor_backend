const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const checkoutSession = require('../models/checkoutSessionModel');
const createError = require('../utils/appError');

// On checkout sessions
exports.startCheckout = async (req, res, next) => {
  try{
    const buyerId =req.user.id;
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ buyerId })
    .populate('items.productId', 'name price vendorId MainImg quantity');

    if (!cart || cart.items.length === 0)
      return next(new createError('Cart is empty', 400));

    // On grouping items by vendor
    const vendorGroups = {};
    cart.items.forEach((item) => {
      const vendorId = item.productId.vendorId.toString();
      if (!vendorGroups[vendorId]) vendorGroups[vendorId] = [];
      vendorGroups[vendorId].push(item);
    });

    const sessions = [];

    for (const vendorId of Object.keys(vendorGroups)) {
      const items = vendorGroups[vendorId];

      let totalAmount = 0;
      const snapshotItems = [];

      for (const item of items) {
        const product = item.productId;

        snapshotItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          vendorId,
          image: product.MainIMg
        });

        totalAmount += product.price * item.quantity;
      }

      // On creating checkout session
      const session = await checkoutSession.create({
        buyerId,
        vendorId,
        shippingAddress,
        items: snapshotItems,
        totalAmount,
        paymentStatus: 'pending',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10mins
      });

      sessions.push(session);
    }

    res.status(200).json({
      status: 'success',
      message: 'Checkout session(s) created. Proceed to payment.',
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// On cancelling checkout sessions
exports.cancelCheckoutSession = async (req, res, next) => {
  try{
    const buyerId = req.user.id;
    const { sessionId } = req.params;

    const session = await checkoutSession.findOne({
      _id: sessionId,
      buyerId
    });

    if (!session) return next(new createError('Session not found', 400));

    if (session.paymentStatus !== 'pending') return next(new createError('Cannot cancel this session', 400));

    session.paymentStatus = 'cancelled';
    await session.save();

    res.status(200).json({
      status: 'success',
      message: 'Checkout session cancelled',
      session
    });

  } catch(error) {
    next(error);
  }
};
