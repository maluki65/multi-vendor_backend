const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const CheckoutSession = require('../models/checkoutSessionModel');
const createError = require('../utils/appError');
const Category = require('../models/CategoryModel');

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
      _id: { $in: productIds }
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
    let subtotal = 0;
    let totalCommission = 0;

    for (const item of cart.items) {
      const product = productMap[item.productId.toString()];

      if (!product) {
        throw new createError(`${item.name} no longer exists`, 400);
      }

      if (product.quantity < item.quantity) {
        throw new createError(`${product.name} is out of stock`, 400)
      }

      if (product.visibility !== 'published') {
        throw new createError(`${product.name} is unavailable`, 400)
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

      const itemTotal = finalPrice * item.quantity;

      subtotal += itemTotal
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

    const tax = Math.round(subtotal * 0.16);
    const shipping = 0; // add location later
    const total = subtotal + tax + shipping;

    const session = await CheckoutSession.create({
      buyerId,
      items: snapShotItems,
      vendors,
      shippingAddress:{
        county,
        area,
      },
      pricing: {
        subtotal,
        tax,
        shipping,
        total,
      },
      commissionSummary: {
        totalCommission,
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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

    const session = await CheckoutSession.findById(sessionId);

    if (!session || session.expiresAt < new Date()) {
      return next(new createError('Checkout session expired or not found', 404));
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
      const session = await CheckoutSession.create({
        buyerId,
        vendorId,
        shippingAddress,
        items: snapshotItems,
        totalAmount,
        paymentStatus: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 10mins
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
};
