const express =  require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/middleware');
const crypto = require('crypto');

const router = express.Router();

//On auth routes
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', protect, authController.refreshToken);
router.post('/auth/logout', authController.logOut);

router.get('/auth/profile', protect, authController.getProfile);
router.get('/auth/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,

    secure: false, //process.env.NODE_ENV === 'production',
    sameSite: 'none',
  });

  res.status(200).json({csrfToken});
})

module.exports = router;