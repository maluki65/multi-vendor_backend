const createError = require('../utils/appError');

exports.restrictTo = (...roles) => {
  return (req, res, next ) => {
    if (!req.user) {
      return next(new createError('You are not logged in', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new createError('You do not have permission to perform this action', 403));
    }

    next();
  };
};