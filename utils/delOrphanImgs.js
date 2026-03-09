const axios = require('axios');

const deleteImage = async (fileId) => {
  await axios.delete(
    `https://api.imagekit.io/v1/files/${fileId}`,
    {
      auth: {
        username: process.env.IMAGEKIT_PRIVATE_KEY,
        password: process.env.IMAGEKIT_PASS
      }
    }
  );
};

module.exports = deleteImage;