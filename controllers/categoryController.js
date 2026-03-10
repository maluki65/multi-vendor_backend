const Category = require('../models/CategoryModel');
const Products = require('../models/productModel');
const createError = require('../utils/appError');

exports.AddCategory = async(req, res, next) => {
  try{
    const userId = req.user.id;
    const username = req.user.username;

    if(req.user.role !== 'Admin') {
      return next(
        new createError('Only Admins can add category', 403)
      );
    }

    let { name, commissionRate, parent = null, attributes = [] } = req.body;

    if (!name || commissionRate === undefined){
      return next(
        new createError('Name and commission are required', 400)
      )
    }

    commissionRate = Number(commissionRate);

    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return next(new createError('Commission must be a number between 0 and 100', 400));
    }

    const commission = commissionRate / 100;

    const existingCategory = await Category.findOne({
      name: name.trim()
    });

    if (existingCategory) {
      return next(
        new createError('Category already exists',409)
      );
    }

    const category = await Category.create({
      name: name.trim(),
      parent,
      commissionRate: commission,
      attributes,
      createdBy: username,
      createdById: userId
    });

    res.status(201).json({
      status:'success',
      message: 'Category created successfully',
      category,
    })
  } catch (error){
    console.error('Error createing category', error);
    next(error);
  }
}

exports.getAllCategories = async(req, res, next) => {
  try{
    const categories = await Category.find()
     .select('name commissionRate parent attributes isActive slug');

    res.status(200).json({
      status: 'success',
      categories
    });
  } catch (error) {
    console.error('Error getting commission', error);
    next(error);
  }
}

exports.getAllActiveCategories = async(req, res, next) => {
  try{
    const categories = await Category.find({ isActive: true })
     .select('name commissionRate parent attributes isActive slug');

    res.status(200).json({
      status: 'success',
      categories
    });
  } catch (error) {
    console.error('Error getting commission', error);
    next(error);
  }
}

exports.updateCategory = async(req, res, next) => {
  try{ 
    const userRole = req.user.role;
    const  { id } = req.params;

    if( userRole !== 'Admin'){
      return next(new createError('Only admins can update category list', 403))
    };

    let { name, commissionRate, parent = null, attributes } = req.body;

    const category = await Category.findById(id)

    if (!category) {
      return next(new createError('Category not found', 404));
    }

    const updateData = {};

    if (name) {
      const existingCategory = await Category.findOne({ name: name.trim() });

      if (existingCategory && existingCategory._id.toString() !== id) {
        return next(new createError('Category name already exists', 409));
      }

      updateData.name = name.trim();
    }

    if (commissionRate !== undefined) {
      commissionRate = Number(commissionRate);

      if (isNaN(commissionRate)) {
        return next(new createError('Commission rate must be a valid number'));
      }

      updateData.commissionRate = commissionRate / 100;
    }

    if (parent !== undefined) updateData.parent = parent;
    if (attributes !== undefined) updateData.attributes = attributes;

    const updatedCategory = await Category.findOneAndUpdate(
      id, 
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch(error){
    console.error('Error updating category:', error);
    next(error);
  }
};

exports.deleteCategory = async(req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'Admin') {
      return next(new createError('Only admins can delete a category', 403));
    }

    const category = await Category.findById(id);

    if(!category) {
      return next(new createError('Category not found', 404));
    }

    const productUsingCategory = await Products.countDocuments({
      category: id
    });

    if (productUsingCategory > 0){
      return next(
        new createError('Caanot delete category because products are assigned to it', 400)
      );
    }

    //await Category.findByIdAndDelete(id);
    category.isActive = false;
    await category.save();

    res.status(200).json({
      status: 'success',
      message: 'Category deactivated successfully'
    });
  } catch(error){
    console.error('Error deactivating category', error);
    next(error);
  }
};