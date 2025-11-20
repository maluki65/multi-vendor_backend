const Orders = require('../models/orderModel');


// On getting buyer cancelled orders
exports.getBuyerCancelledOrders = async (req, res, next) => {
  try{
    const buyerId = req.user.id;

    const orders = await Orders .find({
      buyerId,
      orderStatus: 'cancelled'
    })
    .populate('vendorId', 'storeName')
    .populate('products.productId', 'name price MainIMg')
    .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: order.length,
      orders
    });

  } catch (error) {
    next(error);
  }
};