const Cart = require('../models/cartModel');
const createError = require('../utils/appError');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');

// On creating a cart 
exports.AddToCart = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if(!cart) {
      cart = await Cart.create({
        userId,
        items: [{ productId, quantity }]
      });
    } else {
      const item = cart.items.find(i => i.productId.toString() === productId);

      if (item) item.quantity += quantity;
      else cart.items.push({ productId, quantity });

      await cart.save();
    }

    res.status(200).json({
      status:'success',
      cart
    });

  } catch (error){
    next(error);
  }
};

// On getting a cart
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate('items.productId', 'name price MainIMg vendorId');

    res.status(200).json({ 
      status: 'success',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// On updating quantity of the cart (PUT)
exports.updateCartQuantity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const cart =  await Cart.findOne({ userId });
    if (!cart) return next(new createError('Cart not found', 404));

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) return next(new createError('Product not in cart', 404));

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({
      status: 'Success',
      cart
    });

  } catch(error) {
    next(error);
  }
};

// On removing cart
exports.removeFromCart = async (req, res, next) => {
  try{
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne(
      { userId },
      { $pull: { items: { productId }}},
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      cart
    });

  } catch(error) {
    next(error);
  }
};

// On starting checkout
exports.startCheckout = async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ userId: buyerId })
      .populate('items.productId', 'name price vendorId category quantity');

    if (!cart || cart.items.length === 0)
      return next(new createError('Cart is empty', 400));

    // On groupping items per vendor
    const vendorGroups = {};
    cart.items.forEach((item) => {
      const vendorId = item.productId.vendorId.toString();
      if (!vendorGroups[vendorId]) vendorGroups[vendorId] = [];
      vendorGroups[vendorId].push(item);
    });

    const createdOrders = [];

    for (const vendorId of Object.keys(vendorGroups)) {
      const items = vendorGroups[vendorId];

      let totalAmount = 0;
      let vendorEarningsSum = 0;

      const processedItems = [];

      for (const item of items) {
        const product = item.productId;

        const commissionRate = product.category.commissionRate || 0;
        const commissionAmount = product.price * (commissionRate / 100);
        const vendorEarn = product.price - commissionAmount;

        processedItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          commissionRate,
          commissionAmount,
          vendorEarnings: vendorEarn,
        });

        totalAmount += product.price * item.quantity;
        vendorEarningsSum += vendorEarn * item.quantity;

        // on auto decrementing stock
        product.quantity -= item.quantity;
        await product.save();
      }

      const order = await Order.create({
        buyerId,
        vendorId,
        products: processedItems,
        shippingAddress,
        totalAmount,
        vendorEarnings: vendorEarningsSum,
        paymentStatus: 'pending',
        orderStatus: 'pending',
      });

      createdOrders.push(order);
    }

    // On clearing cart after checkout
    await Cart.findOneAndUpdate({ userId: buyerId }, { items: [] });

    res.status(200).json({
      status: 'success',
      orders: createdOrders
    });

  } catch (error) {
    next(error);
  }
};
