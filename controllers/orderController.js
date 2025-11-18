const Order = require('../models/orderModel');
const createError = require('../utils/appError');
const VendorProfile = require('../models/vendorProfileModel');

// On vendor getting their orders for the store
exports.getVendorOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vendorProfile = await VendorProfile.findOne({ vendorId: userId });
    if (!vendorProfile)
      return next (new createError('Vendor profile not found', 404));

    const vendorId = vendorProfile._id;
    
    const orders = await Order.find({ vendorId }).populate('buyerId', 'username email').populate('products.productId', 'name MainIMg price');

    res.status(200).json({ status: 'success', results: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// On admin getting all orders
exports.getAllOrders = async(req, res, next) => {
  try {
    const orders = await Order.find()
    .populate('buyerId', 'username email')
    .populate('vendorId', 'storeName email')
    .populate('products.productId', 'name MainIMg price');

    res.status(200).json({ 
      status: 'success',
      results: orders.length, orders
    });
  } catch (error) {
    next(error);
  }
};

// On Buyer getting their orders
exports.getBuyerOrders = async ( req, res, next ) => {
  try {
    const buyerId = req.user.id;
    const orders = await Order.find({ buyerId })
    .populate('vendorId', 'storeName email')
    .populate('products.productId', 'name MainIMg price');

    res.status(200).json({
      status: 'success',
      results: orders.length, orders
    });
  } catch (error) {
    next(error);
  }
};

// On getting order by id
exports.getOrderbyId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
    .populate('buyerId', 'username email')
    .populate('vendorId', 'storeName email')
    .populate('products.productId', 'name MainIMg price');

    if (!order) return next(new createError('Order not found', 404));

    // On authorization check
    if(req.user.role === 'Vendor') {
      const vendorProfile = await VendorProfile.findOne({ vendorId: req.user.id });
      if (!vendorProfile)
        return next(new createError('Vendor profile not found', 404));

      if (order.vendorId.toString() !== vendorProfile._id.toString())
        return next(new createError('Not authorized to view this order', 403));
    }

    res.status(200).json({
      status: 'success',
      order,
    });
  } catch (error) {
    next(error);
  }
};

//On updating order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params; // orderId
    const { status } = req.body;

    const order = await Order.findById(id);
    if(!order) return next (new createError('Order not found!', 404));

    const oldStatus = order.orderStatus;
    const statusOrder = ['pending', 'processing', 'shipped', 'completed'];
    const currentIndex = statusOrder.indexOf(oldStatus);
    const newIndex = statusOrder.indexOf(status);

    // On ensuring forward-only progression
    if (newIndex < currentIndex)
      return next(new createError('Cannot revert to a previous status', 400));

    // On vendor logic
    if (req.user.role === 'Vendor') {
      const vendorProfile = await VendorProfile.findOne({ vendorId: req.user.id });
      if(!vendorProfile)
        return next(new createError('Vendor profile not found', 404));

      if (order.vendorId.toString() !== vendorProfile._id.toString())
        return next(new createError('Not authorized to update order', 403));

      // vendor can only move from processing to shipped
      if (oldStatus !== 'processing' || status !== 'shipped')
        return next(new createError('Vendor can only mark order as shipped after processing', 400));

      order.orderStatus = 'shipped';
    }

    // On buyer logic
    else if (req.user.role === 'Buyer') {
      if (order.buyerId.toString() !== req.user.id)
        return next(new createError('Not authorized to update this order', 403));

      // Buyer can only move from shipped to completed
      if (oldStatus !== 'shipped' || status !== 'completed')
        return next(new createError('Buyers can only mark shipped order as complete', 400));

      order.orderStatus = 'completed';
    }

    // Admin logic
    else if (req.user.role === 'Admin') {
      const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status))
        return next(new createError('Invalid status', 400));

      order.orderStatus = status;
    }

    // other logic
    else {
      return next(new createError('Unathorized role', 403));
    }

    // On recording history entry incase of dispute
    order.statusHistory.push({
      from: oldStatus,
      to: status,
      changedBy: req.user.id,
      role: req.user.role,
      date: new Date(),
    });

    await order.save();

    res.status(200).json({
      status: 'success',
      message: `Order status updated to ${order.orderStatus}`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// On creating order (triggered after successful payment)
exports.createOrder = async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { vendorId, products, totalAmount, shippingAddress } = req.body;

    const order = await Order.create({
      buyerId,
      vendorId,
      products,
      totalAmount,
      shippingAddress,
      paymentStatus: 'completed',
      orderStatus: 'processing',
    });

    res.status(201).json({
      status: 'success',
      order,
    })
  } catch (error) {
    next(error);
  }
};