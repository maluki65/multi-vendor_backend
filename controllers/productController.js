const Products = require('../models/productModel');
//const Reviews = require('../models/reviewsModel');
const Orders = require('../models/orderModel');
const mongoose = require('mongoose');
const VendorProfiles = require('../models/vendorProfileModel');
const createError = require('../utils/appError');
const imageKit = require('../config/imgKit');
const ImageValidation = require('../utils/ImgValidation');
const getImageMeta = require('../utils/getImgMetaData');
const deleteImage = require('../utils/delOrphanImgs');
const validateImages = require('../utils/ImgValidation');
const ProductAttribute = require('../models/productAttributeModel');
const APIFeatures = require('../utils/APIFeatures');
const Category = require('../models/CategoryModel');

// On ensuring that only approved vendors can add products
exports.vendorGuard = (req, res, next) => {
  if (req.user.role !== 'Vendor') return next();

  if (req.user.status === 'pending') {
    return next(
      new createError(
        'Your account is still under review. Please submit verification documents.',
        403
      )
    );
  }

  if (req.user.status === 'rejected') {
    return next(
      new createError(
        'Your vendor account was rejected. Please request re-approval.',
        403
      )
    );
  }

  next();
}

// On creating  product
exports.createProduct = async (req, res, next ) => {
  const uploadedFileIds = [];
  
  try {
    const vendorId = req.user.id;

    const vendor = await VendorProfiles.findOne({ vendorId });
    if(!vendor) return next(new createError('Vendor profile not found', 404));

    const { 
      name, 
      category, 
      description, 
      tags, 
      price, 
      MainIMg, 
      MainIMgId,  
      supportImgs = [],
      supportImgsId = [], 
      quantity,
      brand,
      discount,
      featured,
      attributes = [],
    } = req.body;

    uploadedFileIds.push(MainIMgId, ...supportImgsId);

    const MainMeta = await getImageMeta(MainIMgId);
    const MainValidation = ImageValidation(MainMeta);

    const supportMetaData = [];
    const supportValidations = [];

    for (const id of supportImgsId) {
      const meta = await getImageMeta(id);
      supportMetaData.push(meta);

      const validation = validateImages(meta);
      supportValidations.push(validation);
    }

    if (discount < 0 || discount > 100) {
      return next(new createError('Discount must be between 0 and 100', 400));
    };

    const priceInCents = Math.round(Number(price) * 100);
    const discountPercentage = Math.round((discount)) || 0;

    const discountAmount = Math.round((discountPercentage / 100) * priceInCents);
    const finalPriceInCents = priceInCents - discountAmount;

    const discountPriceInCents = finalPriceInCents;

    const product = await Products.create({
      vendorId: vendor._id,
      name,
      category,
      description,
      tags,
      price:priceInCents,
      discount,
      quantity,
      attributes,
      brand,
      featured,
      discountPrice: discountPriceInCents,

      MainIMg,
      MainIMgId,

      supportImgs,
      supportImgsId,

      mainImageMeta: {
        width: MainValidation.width,
        height: MainValidation.height,
        aspectRatio: MainValidation.aspectRatio
      },

      imageCompliance: {
        resolutionCheck: MainValidation.resolutionCheck,
        aspectRatioCheck: MainValidation.aspectRatioCheck,
        backgroundCheck: false,
        manuallyReviewed: false
      },

      moderationStatus: 'pending',
      visibility: 'unpublished'
    });

    if (attributes?.length) {
      const attributeDocs = attributes.map(attr => ({
        productId: product._id,
        attributeId: attr.attributeId,
        value: attr.value
      }));

      await ProductAttribute.insertMany(attributeDocs);
    }

    res.status(201).json({ 
      status: 'Success', 
      product 
    });
  } catch (error) {
    console.error('Failed to add product:', error);

    for (const fileId of uploadedFileIds) {
      try {
        await deleteImage(fileId);
      } catch (error) {
        console.error('Image cleanup failed', fileId, error)
      }
    }

    next(error);
  }
};


// On getting all products for all vendors (Buyer)
exports.getAllProducts = async (req, res, next) => {
  try {
    const isLatest = req.query.limit && !req.query.page;

    if (req.query.category) {
      const categoryIds = req.query.category.split(',');

      const childCategories = await Category.find({
        parent: { $in: categoryIds }
      });

      const allCategoryIds = [
        ...categoryIds,
        ...childCategories.map(c => c._id.toString())
      ];

      req.query.category = { $in: allCategoryIds };
    }

    if (req.query.search) {
      const search = req.query.search;

      const matchedCategories = await Category.find({
        name: { $regex: search, $options: 'i' }
      });

      if (matchedCategories.length > 0) {
        const categoryIds = matchedCategories.map(c => c._id.toString());

        if (req.query.category) {
          const existing = req.query.category.split(',');
          req.query.category = {
            $in: [...existing, ...categoryIds]
          };
        } else {
          req.query.category = {
            $in: categoryIds
          };
        }
      }
    }

    const features = new APIFeatures(
      Products.find({ visibility: 'published' })
      .populate('vendorId', 'storeName logo'),
      req.query
    )
      .filter()
      .search()
      .sort()
      .paginate();
    
    const products = await features.query;

    const productIds = products.map(p => p._id);

    const allAttributes = await ProductAttribute
     .find({ productId: { $in: productIds }})
     .populate('attributeId', 'name type');

    const groupedAttributes = {};
    allAttributes.forEach(attr => {
      const id = attr.productId.toString();
      if(!groupedAttributes[id]) groupedAttributes[id] = [];
      groupedAttributes[id].push(attr);
    });

    const productWithAttributes = products.map(product => ({
      ...product.toObject(),
      attributes: groupedAttributes[product._id] || []
    }));

    let total = null;
    if(!isLatest) {
      const totalQuery = new APIFeatures(
        Products.find({ visibility: 'published' }),
        req.query
      )
      .filter()
      .search();

      total = await totalQuery.query.countDocuments();
    }

    res.status(200).json({
      status: 'success',
      results: productWithAttributes.length,
      total,
      page: req.query.page || 1,
      products: productWithAttributes
    });
  } catch (error) {
    console.error('Failed to get products', error);
    next(error);
  }
};

// On getting products by brands
exports.getAllBrands = async (req, res, next) => {
  try {
    const brands = await Products.distinct('brand', {
      visibility: 'published'
    });

    res.status(200).json({
      status: 'success',
      results: brands.length,
      brands
    });
  } catch {
    console.error('Failed to fetch brands', error);
    next(error);
  }
};

// On getting products by a specific vendor
exports.getVendorProducts = async (req, res, next) => {
  try {
    const vendorId = req.params.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = { vendorId };
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await Products.countDocuments(query);

    const products = await Products.find(query)
      .skip(skip)
      .limit(limit)
      .sort('-createdAt')
      .populate('vendorId', 'storeName logo')
      .populate('category', 'name')
      .populate('attributes.attributeId', 'name')
      .lean();

    const productsWithAttributes = await Promise.all(
      products.map(async (product) => {
        const attributes = await ProductAttribute.find({ productId: product._id })
          .populate('attributeId', 'name type');
        return { ...product, attributes };
      })
    );

    const statusAggregation = await Products.aggregate([
      {
        $match: {
          $expr: { $eq: ['$vendorId', { $toObjectId: vendorId }] } 
        }
      },
      { $group: { _id: '$moderationStatus', count: { $sum: 1 } } }
    ]);

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    statusAggregation.forEach((item) => {
      counts[item._id] = item.count;
      counts.all += item.count;
    });

    res.status(200).json({
      status: 'success',
      page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      counts,
      products: productsWithAttributes
    });

  } catch (error) {
    console.error('Failed to get vendor products:', error);
    next(error);
  }
};

// On getting product by id (buyer & vendor )
exports.getProductById =  async (req, res, next ) => {
  try {
    const { id } = req.params;

    const product = await Products
     .findById(id)
     .populate('vendorId', 'storeName logo')
     .populate({ 
       path: 'reviews', 
       populate: { 
        path:'userId', 
        select: 'name profileImage'
       }
      });

    if(!product) return next(new createError('Product not found!', 404));

    const attributes = await ProductAttribute
     .find({ productId: product._id })
     .populate('attributeId', 'name type');

    res.status(200).json({ 
      status: 'Success', 
      product,
      attributes
    });
  } catch (error) {
    console.error('Failed to get product', error);
    next(error);
  }
};

// On getting pendingProducts
exports.getPendingProducts = async (req, res, next) => {
  try {
    const products = await Products.find({
      moderationStatus: 'pending'
    })
     .populate('vendorId', 'businessInfo.legalName')
     .sort({ createdAt: -1 });

     res.status(200).json({
      status: 'success',
      results: products.length,
      products
     });
  } catch(error) {
    console.error('Failed to get pending products'),
    next(error);
  }
};

// On approving products
exports.approveProducts = async (req, res, next) => {
  try {
    const product = await Products.findByIdAndUpdate(
      req.params.id,
      {
        moderationStatus: 'approved',
        visibility: 'published'
      },
      { new: true }
    );

    if (!product) {
      return next(new createError('Product not found!', 404));
    }

    res.status(200).json({
      status: 'success',
      product
    });
  } catch(error){
    console.error('Failed to approve product', error);
    next(error);
  }
};

// On rejecting products
exports.rejectProducts = async (req, res, next) => {
  try{
    const { reason } = req.body;

    const product = await Products.findByIdAndUpdate(
      req.params.id,
      {
        moderationStatus: 'rejected',
        visibility: 'unpublished',
        rejectionReason: reason
      },
      { new: true }
    );

    if (!product) {
      return next(new createError('Products not found', 404));
    }
    res.status(200).json({
      status: 'success',
      product
    });
  } catch (error){
    console.error('Failed to reject product', error);
    next(error);
  }
};

// On updating a product
exports.updateProduct = async (req, res, next ) => {
  try { 
    const { id } = req.params;
    const vendorId = req.user.id;

    // on finding a product and verifying ownership
    const vendorProfile = await VendorProfiles.findOne({ vendorId });
    if (!vendorProfile) 
      return next(new createError('Vendor profile not found!', 404));

    const allowedFields = [
      'name',
      'category',
      'description',
      'price',
      'quantity',
      'tags',
      'MainIMg',
      'MainIMgId',
      'supportImgs',
      'supportImgsId'
    ];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    if(updates.MainIMg || (updates.supportImgs && updates.supportImgs.length > 0)) {
      updates.moderationStatus = 'pending';
      updates.visibility = 'unpublished';
      updates.rejectionReason = '';
    }

    const product = await Products.findOne({ _id: id, vendorId: vendorProfile._id});   

    const oldImages = {
      MainIMgId: product.MainIMgId,
      supportImgsId: product.supportImgsId || []
    };

    Object.assign(product, updates);
    const updatedProduct = await product.save();

    try {
      if (updates.MainIMg && oldImages.MainIMgId){
        await imageKit.deleteFile(oldImages.MainIMgId);
      }
      if (updates.supportImgsId && oldImages.supportImgsId.length > 0){
        for (const imgId of oldImages.supportImgsId){
          await imageKit.deleteFile(imgId);
        }
      }
    } catch (imgeDeleteError){
      console.error('Failed to delete old images from ImageKit:', imgeDeleteError);
      //next(imgeDeleteError);
    }

    /*if(!product)
      return next(new createError('Product ot found or not authorized',  404));*/

    res.status(200).json({
      status: 'success',
      message: 'Product update successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Failed  to update product', error);
    next(error);
  }
};

// On deleting a product
exports.deleteProduct = async (req, res, next) => {
  try{
    const vendorId = req.user.id;
    const { id } = req.params;

    const vendorProfile = await VendorProfiles.findOne({ vendorId });
    if(!vendorProfile) return next(new createError('Vendor profile not found', 404));
    
    const product = await Products.findOne({
      _id: id,
      vendorId: vendorProfile._id
    });

    if (!product) return next(new createError('Product not found or not authorized', 404));

    /*if (product.vendorId.toString() !== vendorProfile._id.toString()){
      return next(new createError('Not authorized to delete this product', 403));
    }*/

    if (product.MainIMgId){
      try {
        await imageKit.deleteFile(product.MainIMgId)
      } catch (error){
        console.warn('Failed to delete main Image from ImageKit:', error.message);
      }
    }

    if (Array.isArray(product.supportImgsId) && product.supportImgsId.length > 0 ){
      try {
        await imageKit.bulkDeleteFiles(product.supportImgsId);
      } catch (error) {
        console.warn('Failed to delete support images from imageKit:', error.message);
      }
    }

    await product.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete product', error);
    next(error);
  }
}

// On posting a review for a product (Buyer)
/*exports.postReview = async (req, res, next ) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { rating, comment } = req.body;

    const product = await Products.findById(productId);
    if(!product) return next( new createError('Product not found!', 404));

    const review = await Reviews.create({ 
      productId, 
      userId, 
      rating, 
      comment 
    });

    product.reviews.push(review._id);
    await product.save();

    await Products.updateAverageRating(productId);

    res.status(201).json({ 
      status: 'success', 
      review 
    });
  } catch (error) {
    console.error('Failed to add review', error);
    next(error);
  }
};

// On getting a review for product (Buyer)
exports.getProductReviews = async (req, res, next ) => {
  try {
    const { productId } = req.params;

    const reviews = await Reviews
     .find({ productId })
     .populate('userId', 'name profileImage')
     .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: reviews.length, 
      reviews
    });
  } catch (error) {
    console.error('Failed to get product review', error);
    next(error);
  }
};*/

// On updating product quantity after complete order
exports.updateProductQuantity = async (productId, quantityOrdered) => {
  const product = await Products.findByIdAndUpdate(
    productId,
    { $inc: { quantity: -quantityOrdered }},
    { new: true }
  );
  if(!product) return;

  if(product.quantity < 5 ){
    console.log(`Low stock alert for product: ${product.name} (Qty: ${product.quantity})`);
  }
}

// On smart recommendation with trending and top-rated products
exports.getSmartRecomendations = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { vendorId, page = 1, limit = 10, period = 'week' } = req.query;

    const skip = (page - 1) * limit;

    const query = vendorId
      ? { visibility: 'published', vendorId }
      : { visibility: 'published' };

    const topRated = await Products.find(query)
      .sort({ averageRating: -1, totalReviews: -1 })
      .skip(skip)
      .limit(limit);

    let startDate = new Date();

    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else startDate.setDate(startDate.getDate() - 7);

    const trending = await Orders.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.productId', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    let alsoBought = [];

    if (productId) {
      alsoBought = await Orders.aggregate([
        { $match: { 'products.productId': mongoose.Types.ObjectId(productId) } },
        { $unwind: '$products' },
        {
          $match: {
            'products.productId': {
              $ne: mongoose.Types.ObjectId(productId)
            }
          }
        },
        { $group: { _id: '$products.productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' }
      ]);
    }

    res.status(200).json({
      status: 'success',
      recommendations: {
        topRated,
        trending,
        alsoBought
      }
    });

  } catch (error) {
    console.log('Failed to get product recommedations:', error),
    next(error);
  }
};