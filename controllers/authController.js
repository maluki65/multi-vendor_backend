const User = require('../models/userModel');
const createError = require('../utils/appError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// On creating jwt
const signAccessToken = (id) => {
  return jwt.sign(
    {id, type: 'access'}, 
    process.env.JWT_SECRET || 'secretkey123', 
    {expiresIn: '15m'}
  );
};

const signRefreshToken = (id) => {
  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'refreshsecret123',
    { expiresIn: '7d' }
  );
};

//On creating helper fxn to send token to cookies
const createSendToken = (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id); // for current user
  const refreshToken = signRefreshToken(user._id);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // On setting cookie options
  /*const cookieOptions = {
    httpOnly: true,
    secure: true, //process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };*/

  // On access token cookie (short-lived)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000,
  });

  // On refresh token cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  /*res.cookie('jwt', token, cookieOptions);

  res.cookie('csrfToken', csrfToken, {
    secure: true, //process.env.NODE_ENV === 'production',
    sameSite: 'none',
  });*/

  res.status(statusCode).json({
    status: 'success',
    message: statusCode === 201 ? 'User registered successfully' : 'User logged in successfully',
    user: {
      _id: user._id,
      username: user.username,
      storename: user.storename,
      role: user.role,
      email: user.email
    },
    csrfToken,
  });
};

// On registering new user
exports.signup = async (req, res, next) => {
  const { username, email, password, role } = req.body;

  if (!username|| !email || !password || !role ) return res.status(400).json({
    message: 'All fiels are required!'
  })

  try {
    const userExists = await User.findOne({
      email: req.body.email
    });
    if(userExists) {
      return next(new createError('User with email already exists!', 400));
    }

    if(!req.body.email) {
      return next( new createError('Email is required!', 400));
    }

    // On preventing user from registering as admin directly
    let assignedRole = role;
    if (role === 'Admin') {
      assignedRole = 'Buyer'
    }

    // Force 'pendin'status for vendors
    const userRole = role = 'Vendor' ? 'Vendor' : 'Buyer';
    const userStatus = role === 'Vendor' ? 'pending' : 'approved';

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const newUser = await User.create({
      ...req.body,
      password: hashedPassword,
      role: userRole,
      status: userStatus,
    });

    createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

//On creating admin 
exports.admin = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username|| !email || !password  ) return res.status(400).json({
    message: 'All fiels are required!'
  })

  try {
    const userExists = await User.findOne({
      email: req.body.email
    });
    if(userExists) {
      return next(new createError('User with email already exists!', 400));
    }

    if(!req.body.email) {
      return next( new createError('Email is required!', 400));
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const newAdmin = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'Admin',
    })

    createSendToken(newAdmin, 201, res);
  } catch (error) {
    next(error);
  }
};

// On user login
exports.login =  async(req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({email}).select('+password');
    if(!user) return next(new createError("User doesn't exist!", 404));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next (new createError('Invalid password or email', 401));
    }

    // On handling vendor approval states
    if (user.role === 'Vendor') {
      if (user.status === 'pending') {
        return res.status(403).json({
          status: 'error',
          message: 'Your vendor account is still under review.please wait for admin approval.'
        });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({
          status: 'error',
          message: 'Your vendor application was rejected. Please request re-approval.'
        });
      }
    }

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// On refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookie.refreshToken;
    if(!refreshToken) {
      return next(new createError('No refresh token', 401));
    }

    // On verifying refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refreshsecret123'
    );

    if (decoded.type !== 'refresh') {
      return next(new createError('Invalid token type', 403));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new createError('User not found', 404));
    }

    // On rotating tokens
    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    const newCsrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 *  1000,
    });

    res.status(200).json({
      status: 'success',
      csrfToken: newCsrfToken,
    });
  } catch (error) {
    return next(new createError('Refresh token expired or invalid', 401));
  }
};

// On logging out
exports.logOut = (req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: true, //process.env.NODE_ENV === 'production',
    sameSite:'none',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite:'none',
  });

  res.status(200).json({ status: 'success' });
};

// On creating session
exports.getProfile = async(req, res, next) => {
  try{
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return next(new createError('User not found', 404));
    }

    res.status(200).json({
      status: 'Success',
      user,
    });
  } catch (error) {
    next(error);
  }
};