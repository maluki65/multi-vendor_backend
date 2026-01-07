const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const createError = require('../utils/appError');

exports.protect = async(req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if(!accessToken) {
      return next(new createError('You are not logged in!', 401));
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    /*if (decoded.type !== 'access') {
      return next(new createError('Invalid token type', 401))
    }*/

    const user = await User.findById(decoded.id).select('storeName storeSlug email username role status +passwordChangedAt');

    if (!user) {
      return next(new createError('User no longer exists or logged out!', 401));
    }

    // On invalidating tokens issued before password change
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt) {
      return next(new createError('Session expired — please login again', 401));
    }
    
    req.user = {
      id: user._id,
      username: user.username,
      storeName: user.storeName,
      storeSlug: user.storeSlug,
      status: user.status,
      email: user.email,
      role: user.role
    } // On attaching user info to request
    next();
  } catch (error) {
    return next(new createError('Invalid or expired token!', 401));
  }
};

exports.csrfProtection = (req, res, next) => {
  try {
    const csrfCookie = req.cookies.csrfToken;
    const csrfHeader = req.get('X-CSRF-Token');

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return next(new createError('Invalid CSRF token!', 401));
    }

    next()
  } catch (error){
    return next(new createError('CSRF verification failed!', 403));
  }
};