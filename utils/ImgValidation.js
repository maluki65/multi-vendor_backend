const validateImages = (meta) => {
  const width = meta.width;
  const height = meta.height;

  const resolutionCheck = width >= 1000 && height >= 1000;

  const aspectRatioCheck = Math.abs(width / height -1) < 0.1;

  return { 
    width,
    height,
    resolutionCheck,
    aspectRatioCheck
  };
};

module.exports = validateImages