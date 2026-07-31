const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');
const createError = require('../utils/appError');

// On adding to wishList
exports.addToWishlist = async(req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { productId, selectedAttributes = {} }= req.body;

    if(!productId) return next(new createError('Product ID is required!', 400));

    const product = await Product.findById(productId);

    if(!product){
      return next(new createError('Product not found!', 404));
    }

    let wishlist = await Wishlist.findOne({ buyerId });

    if(!wishlist){
      wishlist = await Wishlist.create({
        buyerId,
        items: [{ 
          productId,
          selectedAttributes,
        }],
      });
      
      return res.status(201).json({
        status:'success',
        message: 'Product added to wishlist',
        wishlist,
      });
    }

    //console.log("Incoming:", selectedAttributes);

    /*console.log(
        wishlist.items.map(item => ({
            attrs: item.selectedAttributes,
            product: item.productId.toString()
        }))
    );*/

    const exstingProduct = wishlist.items.some((item) => {
      if (item.productId.toString() !== productId.toString()) {
        return false;
      }

      const savedAttributes = item.selectedAttributes instanceof Map
       ? Object.fromEntries(item.selectedAttributes)
       : item.selectedAttributes  || {};

      const savedKeys = Object.keys(savedAttributes).sort();
      const incomingKeys = Object.keys(selectedAttributes).sort();

      if (savedKeys.length !== incomingKeys.length) return false;

      return savedKeys.every(
        (key) => savedAttributes[key] === selectedAttributes[key]
      );
    });

    if (exstingProduct){
      return next(new createError('Product already in wishlist!', 400));
    }

    wishlist.items.push({ 
      productId,
      selectedAttributes,
    });

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

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const [result] = await Wishlist.aggregate([
      {
        $match: {
          buyerId,
        },
      },
    
      {
        $unwind: '$items',
      },
    
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productId',
        },
      },
    
      {
        $unwind: '$productId',
      },
    
      {
        $lookup: {
          from: 'vendorprofiles',
          localField: 'productId.vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
    
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },
    
      {
        $lookup: {
          from: 'categories',
          localField: 'productId.category',
          foreignField: '_id',
          as: 'category',
        },
      },
    
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
    
      {
        $addFields: {
          'productId.vendorId': '$vendor',
          'productId.category': '$category',
        },
      },
    
      {
        $project: {
          _id: '$items._id',
          productId: 1,
          selectedAttributes: '$items.selectedAttributes',
          addedAt: '$items.addedAt',
        },
      },
    
      {
        $facet: {
          metadata: [
            {
              $count: 'totalItems',
            },
          ],
    
          wishlist: [
            {
              $sort: {
                addedAt: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
        },
      },
    ]);

    if (!result) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        wishlist: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    const totalItems = result.metadata[0]?.totalItems || 0;
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      status: 'success',
      results: result.wishlist.length,
      wishlist: result.wishlist,

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
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
    const { wishlistItemId } = req.params;

    if (!wishlistItemId){
      return next(new createError('wishlistItem ID is required!', 400));
    }

    const wishlist = await Wishlist.findOne({ buyerId });

    if (!wishlist) {
      return next(new createError('Wishlist not found!', 404));
    }

    const productExists = wishlist.items.some(
      (item) => item._id.toString() === wishlistItemId
    );

    if (!productExists) {
      return next(new createError('Product not found in wishlist!', 404));
    }

    wishlist.items = wishlist.items.filter(
      (item) => item._id.toString() !== wishlistItemId
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