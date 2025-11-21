const Cart = require('../models/cartModel');
const createError = require('../utils/appError');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');

// On creating a cart 
exports.AddToCart = async (req, res, next) => {
  try{
    const buyerId = req.user.id;
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if(!product) return next(new createError('product not found', 404));

    // On snapshop info
    const snapshop = {
      productId,
      quantity,
      name: product.name,
      price: product.price,
      image: product.MainIMg,
      vendorId: product.vendorId
    };

    let cart = await Cart.findOne({ buyerId });

    // if no cart create one
    if(!cart) {
      cart = await Cart.create({
        buyerId,
        items: [ snapshop ]
      });
    } else {
      const item = cart.items.find(i => i.productId.toString() === productId);

      if (item) {
        item.quantity += quantity;
      } else {
        cart.items.push(snapshop);
      }

      cart.updatedAt = Date.now();
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
    const buyerId = req.user.id;

    const cart = await Cart.findOne({ buyerId });

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
    const buyerId = req.user.id;
    const { productId, quantity } = req.body;

    if (quantity < 0) {
      return next(new createError('Quantity cannot be negative', 400));
    }

    const cart =  await Cart.findOne({ buyerId });
    if (!cart) return next(new createError('Cart not found', 404));

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) return next(new createError('Product not in cart', 404));

    // If quantity is 0, reove item from cart
    if (quantity === 0) {
      cart.items = cart.items.filter( i => i.productId.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    cart.updatedAt = Date.now();
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
    const buyerId = req.user.id;
    const { productId } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { buyerId },
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

/* On starting checkout
exports.startCheckout = async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ buyerId })
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
};*/
