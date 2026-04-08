require('dotenv').config();
const mongoose = require('mongoose');
const Products = require('./models/productModel');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Products.find();

  for (const product of products) {
    if (product.price > 1000) continue;

    product.price = Math.round(product.price * 100);

    if (!product.brand) {
      product.brand = 'Generic';
    }

    await product.save();
  }

  console.log('Price migration complete');
  process.exit();
};

migrate();