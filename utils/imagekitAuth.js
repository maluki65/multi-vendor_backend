const express = require('express');
const ImageKit = require('imagekit');

const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

router.get('/Upload-auth', (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.json(result);
})

module.export = router