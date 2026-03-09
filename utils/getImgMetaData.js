const axios = require('axios');

const getImageMeta = async (fileId) => {
  const res = await axios.get(`https://api.imagekit.io/v1/files/${fileId}/details`,
  {
    auth: {
      username: process.env.IMAGEKIT_PRIVATE_KEY,
      password: process.env.IMAGEKIT_PASS
    }
  });

  return res.data;
};

module.exports = getImageMeta;