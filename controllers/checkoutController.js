const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const CheckoutSession = require('../models/checkoutSessionModel');
const createError = require('../utils/appError');
const Category = require('../models/CategoryModel');
const { buildPricing } = require('../utils/pricing/service');
const Order = require('../models/orderModel');
const generateOrderNumber = require('../utils/generateOrderNumber');
const generateTrackingID = require('../utils/generateTrackingID');
const mongoose = require('mongoose');

// On helper function for getting commission (child > parent fallback)
const getCommissionRate = async (categoryMap, categoryId) => {
  let category = categoryMap[categoryId.toString()];

  if(!category) return 0;

  if (category.commissionRate !== undefined && category.commissionRate !== null) {
    return category.commissionRate;
  }

  if (category.parent) {
    const parent = categoryMap[category.parent.toString()];
    return parent?.commissionRate || 0;
  }

  return 0;
};

// On preparing for checkout
exports.prepareCheckOut = async (req, res, next) => {
  try{
    const buyerId = req.user.id;
    const { county, area } = req.body;

    if (!county || !area) {
      return next(new createError('Shipping address is required!', 400));
    }

    // on validating cart
    const cart = await Cart.findOne({ buyerId });

    if (!cart || cart.items.length === 0) {
      return next(new createError('Cart is empty!', 400));
    }

    // on fetching all products in cart
    const productIds = cart.items.map(i => i.productId);

    const products = await Product.find({
      _id: { $in: productIds },
      visibility: 'published',
      //moderationStatus: 'approved',
    }).populate('category');

    const productMap = {};
    products.forEach(p => {
      productMap[p._id.toString()] = p;
    });

    // on getting parent categories
    const categoryIds = products.map(p => p.category?._id).filter(Boolean);

    const categories = await Category.find({
      _id: { $in: categoryIds }
    });

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // on validating and building snapshot
    const snapShotItems = [];
    let totalCommission = 0;
    const normalizedItems = [];

    for (const item of cart.items) {
      const product = productMap[item.productId.toString()];

      if (!product) {
        throw new createError(`${item.name} no longer exists or is unavailable.`, 400);
      }

      if (product.quantity < item.quantity) {
        throw new createError(`${product.name} is out of stock`, 400)
      }

      // on price locking
      const basePrice = product.price;
      const discount = product.discount || 0;

      const finalPrice = discount > 0
       ? product.discountPrice
       : basePrice;

      // on applying commssion
      const commissionRate = await getCommissionRate(
        categoryMap,
        product.category._id
      );

      const commissionAmount = Math.round(finalPrice * commissionRate);

      totalCommission += commissionAmount * item.quantity;

      snapShotItems.push({
        productId: product._id,
        name: product.name,
        image: product.MainIMg,

        basePrice,
        discount,
        finalPrice,

        quantity: item.quantity,

        vendorId: product.vendorId,
        categoryId: product.category?._id,

        commissionRate,
        commissionAmount,
      });

      normalizedItems.push({
        price: basePrice,
        discount,
        discountPrice: finalPrice,
        quantity: item.quantity,
      });
    }

    // on grouping by vendor
    const vendorMap = {};

    for (const item of snapShotItems) {
      const vid = item.vendorId.toString();

      if (!vendorMap[vid]) {
        vendorMap[vid] = {
          vendorId: item.vendorId,
          //items: [],
          subtotal: 0,
          commission: 0,
          payout: 0,
        };
      }

      const itemTotal = item.finalPrice * item.quantity;
      const commissionTotal = item.commissionAmount * item.quantity;

      //vendorMap[vid].items.push(item);
      vendorMap[vid].subtotal += itemTotal;
      vendorMap[vid].commission += commissionTotal;
      vendorMap[vid].payout += itemTotal - commissionTotal;
    }

    const vendors = Object.values(vendorMap);

    const pricing = buildPricing({
      items: normalizedItems,
      location: { county, area },
    });

    const session = await CheckoutSession.create({
      buyerId,
      items: snapShotItems,
      vendors,
      shippingAddress:{
        county,
        area,
      },
      pricing,
      
      commissionSummary: {
        totalCommission,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(200).json({
      status: 'success',
      checkout: {
        id: session._id,
      },
    });
  } catch (error){
    console.error('Failed to initialize checkout', error);
    next(error);
  }
};

exports.getCheckoutSession = async (req, res, next) => {
  try{
    const { sessionId } = req.params;

    const session = await CheckoutSession.findById(sessionId)
      .populate('items.vendorId', 'businessInfo.legalName logo banner')
      .populate('vendors.vendorId', 'businessInfo.legalName logo banner');

    if (!session) {
      return res.status(200).json({
        status: 'success',
        session: null,
      });
    }

    if (session.expiresAt < new Date()) {
      if (session.status !== 'expired') {
        session.status = 'expired';
        await session.save();
      }

      return next(new createError('Checkout session expired!', 400));
    }

    res.status(200).json({
      status: 'succes',
      session,
    });
  } catch (error) {
    console.error('Failed to get checkout session', error);
    next(error);
  }
}

exports.getAllCheckoutSessions = async (req, res, next) => {
  try{
    const buyerId = req.user.id;

    const sessions = await CheckoutSession.find({ buyerId })
      .sort({ createdAt: -1 })
      .select('pricing status paymentStatus expiresAt createdAt');

    res.status(200).json({
      status: 'succes',
      result: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error('Failed to get checkout sessions', error);
    next(error);
  }
}

exports.resumeCheckout = async (req, res, next) => {
  try { 
    const buyerId = req.user.id;
    const { sessionId } = req.params;

    const session = await CheckoutSession.findOne({
      _id: sessionId,
      buyerId,
    });

    if (!session) {
      return next(new createError('Checkout not found', 404));
    }

    if (session.status === 'completed'){
      return next(new createError('Checkout already completed'),400);
    }

    if (session.expiresAt < new Date()) {
      session.status = 'active';
      session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await session.save();
    }

    res.status(200).json({
      status: 'status',
      session,
    });
  } catch (error) {
    console.error('Failed to resume checkout', error);
    next(error);
  }
};

exports.completeCheckout = async (req, res, next) => {
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const { sessionId } = req.params;
    const buyerId = req.user.id;

    const session = await CheckoutSession.findById(sessionId).session(mongoSession);

    if (!session) {
      throw new createError('Checkout session not found!', 404);
    }

    if (session.status === 'completed') {
      throw new createError('Checkout already completed', 400);
    }

    if (session.expiresAt < new Date()) {
      throw new createError('Checkout session has expired.', 400);
    }

    // On simulating payment (add mpesa && card payment  later)  return m-pesa transaction code

    session.paymentStatus = 'completed';
    session.status = 'completed';

    // On verifing stock and reducing inventory
    for (const item of session.items) {
      const updatedProduct = await Product.findOneAndUpdate({
        _id: item.productId,
        visibility: 'published',
        //moderationStatus: 'approved',
        quantity: {
          $gte: item.quantity,
        },
      },
      {
        $inc: {
          quantity: -item.quantity,
        },
      },
      {
        new: true,
        session: mongoSession,
      }
    );

    if (!updatedProduct) {
      throw new createError(
        `${item.name} is unavailable or has insufficient stock.`,
        400
      );
    }
    }

    // On creating orders
    const createdOrders = [];

    for (const vendor of session.vendors) {
      const vendorItems = session.items.filter(
        item => 
          item.vendorId.toString() === vendor.vendorId.toString()
      );

      const products = vendorItems.map(item => ({
        productId: item.productId,

        name: item.name,
        image: item.image,

        originalPrice: item.basePrice,
        price: item.finalPrice,
        discount: item.discount,

        quantity: item.quantity,

        commissionRate: item.commissionRate,
        commissionAmount: item.commissionAmount,        
      }));

      const orderNumber = await generateOrderNumber(Order);
      const trackingID = await generateTrackingID();

      const order = new Order({
        orderNumber,

        buyerId,
        vendorId: vendor.vendorId,
        products,

        checkoutSessionId: session._id,

        totalAmount: vendor.subtotal,
        vendorEarnings: vendor.payout,
        shippingAddress: `${session.shippingAddress.county}, ${session.shippingAddress.area}`,
        
        paymentStatus: 'completed',
        orderStatus: 'processing',
        platformCommission: vendor.commission,

        paymentProvider: 'Simulated',
        paymentReference: `SIM-${Date.now()}`,
        trackingID,
      });

      await order.save({ session: mongoSession });
      createdOrders.push(order);
    }

    session.orderIds = createdOrders.map(order => order._id);

    await session.save({
      session: mongoSession,
    });

    const cart = await Cart.findOneAndUpdate(
      { buyerId },
      { 
        $set: { 
          items: []
        }, //updatedAt: Date.now()
      },
      { new: true,
        session: mongoSession,
      }
    );

    await mongoSession.commitTransaction();

    res.status(200).json({
      status: 'success',
      message: 'Payment successful & order created',
      orders: createdOrders,
      cart,
    });
  } catch (error) {
    await mongoSession.abortTransaction();

    console.log('Failed to complete checkout', error);
    next(error);
  } finally {
    await mongoSession.endSession();
  }
};

exports.updateCheckoutShipping = async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { sessionId } = req.params;
    const { county, area } = req.body;

    const session = await CheckoutSession.findOne({
      _id: sessionId,
      buyerId,
    });

    if (!session) {
      return next(new createError('Checkout session not found', 404));
    }

    if (session.status !== 'active') {
      return next(new createError('Checkout can no longer be updated', 400));
    }

    const normalizedItems = session.items.map(item => ({
      price: item.basePrice,
      discount: item.discount,
      discountPrice: item.finalPrice,
      quantity: item.quantity,
    }));

    const pricing = buildPricing({
      items: normalizedItems,
      location: {
        county,
        area,
      },
    });

    session.shippingAddress = {
      county,
      area,
    };

    session.pricing = pricing;

    await session.save();

    res.status(200).json({
      status: 'success',
      session,
    });

  } catch (error) {
    console.error('Failed to update shipping', error);
    next(error);
  }
};

/*
// On checkout sessions
exports.startCheckout = async (req, res, next) => {
  try{
    const buyerId = req.user.id;
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
      const session = await CheckoutSession.create({
        buyerId,
        vendorId,
        shippingAddress,
        items: snapshotItems,
        totalAmount,
        paymentStatus: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
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

    const session = await CheckoutSession.findOne({
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
};*/
