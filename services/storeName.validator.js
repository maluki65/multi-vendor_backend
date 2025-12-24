const createError = require('../utils/appError');
const User = require('../models/userModel');
const VendorProfile = require('../models/vendorProfileModel');
const slugify = require('../utils/slugify');

async function assertStoreNameAvailable(storeName, vendorId){
  const slug = slugify(storeName);

  const existing =await Promise.all([
    User.findOne({ storeSlug: slug, _id: { $ne: vendorId }}),
    VendorProfile.findOne({ storeSlug: slug, vendorId: { $ne: vendorId }})
  ]);

  if (existing.some(Boolean)) {
    throw new createError('Store name is already taken', 400);
  }

  return slug;
}

module.exports = { assertStoreNameAvailable };