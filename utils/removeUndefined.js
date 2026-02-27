function removeUndefined(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      // On handling nested objects
      acc[key] = typeof value === 'object' && !Array.isArray(value)
        ? removeUndefined(value)
        : value;
    }
    return acc;
  }, {});
}

module.exports = removeUndefined;