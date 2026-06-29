const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const createError = require('../utils/appError');
const VendorProfile = require('../models/vendorProfileModel');
const BuyerProfile = require('../models/buyerModel');
const { creditPendingBalance } = require('../services/walletService');

// On vendor getting their orders for the store
exports.getVendorOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    
    const vendorProfile = await VendorProfile.findOne({
      vendorId: userId,
    });

    if(!vendorProfile) {
      return next(new createError('Vendor profile not found!', 404));
    }

    const query = {
      vendorId: vendorProfile._id,
    };

    if (search) {
      query.orderNumber = {
        $regex: search,
        $options: 'i',
      };
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
     .populate({
      path: 'buyerId',
      select:'username email',
      populate: {
        path: 'buyerProfile',
        select: 'phone'
      }
     })
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit)
     .lean();

    const buyerIds = orders.map((order) => order.buyerId?._id);

    const buyerProfiles = await BuyerProfile.find({
      buyerId: { $in: buyerIds },
    })
     .select('buyerId phone')
     .lean();

     //console.log('Buyer profiles:', buyerProfiles);
     //console.log('BuyerIds', buyerIds)
    const buyerProfileMap = {};

    buyerProfiles.forEach((profile) => {
      buyerProfileMap[profile.buyerId.toString()] = profile;
    });

    const formattedOrders = orders.map((order) => {
      const buyerProfile = buyerProfileMap[order.buyerId?._id?.toString()];

      return {
        ...order,
        buyer: {
          username: order.buyerId?.username || null,
          email: order.buyerId?.email || null,
          phone: buyerProfile?.phone || null,
        },
      };
    });

    res.status(200).json({
      status: 'success',
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      results: formattedOrders.length,
      orders: formattedOrders,
    })
  } catch (error) {
    console.error('Failed to get vendor orders', error);
    next(error);
  }
};

// On admin getting all orders
exports.getAllOrders = async(req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};

    if (search) {
      query.$or = [
        {
          orderNumber: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    };

    const totalOrders = await Order.countDocuments(query);
    
    const orders = await Order.find(query)
     .populate({
      path: 'buyerId',
      select:'username email',
      populate: {
        path: 'buyerProfile',
        select: 'phone'
      }
     })
     .populate({
      path:'vendorId',
      select: 'businessInfo.legalName store.contactPhone store.contactEmail'
     })
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit)
     .lean();

    res.status(200).json({ 
      status: 'success',
      results: orders.length, 
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      orders
    });
  } catch (error) {
    console.error('Failed to get orders', error);
    next(error);
  }
};

// On Buyer getting their orders
exports.getBuyerOrders = async ( req, res, next ) => {
  try {
    const buyerId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const status = req.query.status || 'all';
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {
      buyerId
    }

    if (status != 'all') {
      switch (status) {
        case 'processing':
          query.orderStatus = {
            $in: ['pending', 'processing', 'shipped'],
          };
          break;

        case 'cancelled':
          query.orderStatus = 'cancelled';
          break;

        case 'completed':
          query.orderStatus = 'completed';
          break;
      }
    }

    if (search) {
      query.$or = [
        {
          orderNumber: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    };
     
    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
     .populate({
      path: 'vendorId',
      select: 'businessInfo.legalName',
     })
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit)
     .lean();

    const orderProducts = orders.map(order => ({
      ...order,
      productCount: order.products?.reduce(
        (total, product) => total + product.quantity, 0
      ),
    }));

    res.status(200).json({
      status: 'success',
      results: orderProducts.length, 
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      orders: orderProducts
    });
  } catch (error) {
    console.error('Failed to get buyer orders', error);
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

// On updating order status for Buyer, Vendor and Buyer
exports.updateOrderStatus = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user.id;
    const role = req.user.role;

    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'pending', 
      'processing', 
      'shipped', 
      'completed',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new createError('Invalid order status', 400);
    }

    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new createError('Order not found', 404);
    }

    if (order.orderStatus === status) {
      await session.commitTransaction();

      return res.status(200).json({
        status: 'success',
        message: `Order already ${status}`,
        order,
      });
    }

    const vendorTransitions = {
      pending: ['processing'],
      processing: ['shipped'],
      shipped: [],
      completed: [],
    };

    const buyerTransitions = {
      shipped: ['completed'],
      pending: ['cancelled'],
      processing: ['cancelled'],
    };

    const adminTransitions = {
      pending: ['processing'],
      processing: ['shipped'],
      shipped: [],
      completed: [],
    };

    const currentStatus = order.orderStatus;

    let allowedTransitions = [];

    if (role === 'Vendor') {
      const vendorProfile = await VendorProfile.findOne({
        vendorId: userId,
      }).session(session);

      if (!vendorProfile) {
        throw new createError('Vendor profile not found', 404);
      }

      if (order.vendorId.toString() !== vendorProfile._id.toString()) {
        throw new createError('You are not allowed to update this order!', 403);
      }

      allowedTransitions = vendorTransitions[currentStatus] || [];
    }

    else if (role === 'Buyer') {
      if (order.buyerId.toString() !== userId.toString()) {
        throw new createError('You are not allowed to update this order!', 403);
      }

      allowedTransitions = buyerTransitions[currentStatus] || [];
    }

    else if (role === 'Admin') {
      allowedTransitions = adminTransitions[currentStatus] || [];
    }

    else {
      throw new createError('Unauthorized access!', 403);
    }

    if (!allowedTransitions.includes(status)) {
      throw new createError(
        `${role} cannot change order from ${currentStatus} to ${status}`,
        400
      );
    }

    order.statusHistory.push({
      from: currentStatus,
      to: status,
      changedBy: userId,
      role,
      date: new Date(),
    });

    const updateData = {
      orderStatus: status,
      statusHistory: order.statusHistory,
    };

    if (status === 'processing') {
      updateData.processingAt = new Date();
    }

    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    
      updateData.settlementStatus = 'cancelled';
    }

    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    }

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: updateData },
      { session }
    );

    if (status === 'completed' && !order.earningsCredited) {
      await creditPendingBalance(order._id, session);
    }

    const updatedOrder = await Order.findById(order._id).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      status: 'success',
      message: `Order updated to ${status}`,
      order: updatedOrder,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to update order status', error);
    next(error);
  } finally {
    session.endSession();
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

// On cancelling orders
exports.cancelOrder  = async (req, res, next) => {
  try{
    const { id } = req.params;

    const order = await Order.findById(id);
    if(!order) return next(new createError('Order not found', 404));

    // On checking buyer permission
    if (req.user.role === 'Buyer') {
      if (order.buyerId.toString() !== req.user.id)
        return next(new createError('Not authorized to cancel this order', 403))

      if (order.orderStatus === 'shipped' || order.orderStatus == 'completed')
        return next(new createError("You can't cancel this order anymore", 400));
    }

    // On making sure vendor cannot cancel order
    if (req.user.role === 'Vendor') {
      return next(new createError('Vendor cannot cancel orders', 403));
    }

    const oldStatus = order.orderStatus;

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'failed';

    order.statusHistory.push({
      from: oldStatus,
      to: 'cancelled',
      changedBy: req.user.id,
      role: req.user.role,
    });

    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      order
    });

  } catch(error){
    next(error);
  }
};
