const express =  require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/middleware');
const crypto = require('crypto');

const router = express.Router();

//On auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logOut);

router.get('/profile', protect, authController.getProfile);
router.get('/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', csrfToken, {
    hettpOnly: false,

    secure: true, //process.env.NODE_ENV === 'production',
    sameSite: 'none',
  });

  res.status(200).json({csrfToken});
})

module.exports = router;