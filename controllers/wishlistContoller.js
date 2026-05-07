const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');
const createError = require('../utils/appError');

// On adding to wishList
exports.addToWishlist = async(req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { productId }= req.body;

    if(!productId) return next(new createError('Product ID is required!', 400));

    const product = await Product.findById(productId);

    if(!product){
      return next(new createError('Product not found!', 404));
    }

    let wishlist = await Wishlist.findOne({ buyerId });

    if(!wishlist){
      wishlist = await Wishlist.create({
        buyerId,
        items: [{ productId }],
      });
      
      return res.status(201).json({
        status:'success',
        message: 'Product added to wishlist',
        wishlist,
      });
    }

    const exstingProduct = wishlist.items.some(
      (item) => item.productId.toString() === productId
    );

    if (exstingProduct){
      return next(new createError('Product already in wishlist!', 400));
    }

    wishlist.items.push({ productId });

    await wishlist.save();

    res.status(200).json({
      status: 'success',
      message: 'Product added to wishlist',
      wishlist,
    });
  } catch (error){
    console.error('Error adding product to wishlist')
    next(error)
  }
};

// On getting wishlist
exports.getWishlist = async(req, res, next) => {
  try{
    const buyerId = req.user.id;

    const wishlist = await Wishlist.findOne({ buyerId })
     .populate({
      path: 'items.productId',
      populate: [
        {
          path: 'vendorId',
          model: 'VendorProfile',
        },
        {
          path: 'category',
          model:'Category',
        },
      ],
    });

    if (!wishlist) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        wishlist: [],
      });
    }

    const validProducts = wishlist.items.filter(
      (item) => item.productId !== null
    );

    res.status(200).json({
      status: 'success',
      results: validProducts.length,
      wishlist: validProducts,
    });
  } catch (error) {
    console.error('Error getting wishlist', error);
    next(error);
  }
}

// On removing product from wishlist
exports.removeFromWishlist = async(req, res, next) => {
  try{
    const buyerId = req.user.id;
    const { productId } = req.params;

    if (!productId){
      return next(new createError('Product ID is required!', 400));
    }

    const wishlist = await Wishlist.findOne({ buyerId });

    if (!wishlist) {
      return next(new createError('Wishlist not found!', 404));
    }

    const productExists = wishlist.items.some(
      (item) => item.productId.toString() === productId
    );

    if (!productExists) {
      return next(new createError('Product not found in wishlist!', 404));
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await wishlist.save();

    res.status(200).json({
      status: 'success',
      message: 'Product removed from wishlist',
      wishlist,
    });
  } catch (error){
    console.error('Error removing product from wishlist', error);
    next(error);
  }
};

// On clearing wishlist
exports.clearWishlist = async(req, res, next) => {
  try{
    const buyerId = req.user.id;

    const wishlist = await Wishlist.findOne({ buyerId });

    if (!wishlist) {
      return next(new createError('Wishlist bot found!', 404));
    }

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({
      status: 'success',
      message: 'wishlist cleared successfully',
      wishlist,
    });
  } catch(error){
    console.error('Error clearing wishlist', error);
    next(error);
  }
};