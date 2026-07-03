const SHIPPING_RATE = {
  Nairobi: {
    default: 25000,
    area: {
      'Nyayo highrise': 15000,
      SouthB: 18000,
      SouthC: 20000,
      Westlands: 25000,
      Kilimani: 22000,
      Karen: 40000,
      Embakasi: 30000,
    },
  },

  Kiambu: {
    default: 35000,
    area: {
      Ruiru: 30000,
      Thika: 40000,
      Kikuyu: 35000,
    },
  },

  Mombasa: {
    default: 45000,
  },

  Nakuru: {
    default: 40000,
  },
};

const normalize = (text = '') => 
  text
  .toLowerCase()
  .replace(/[\s-]/g, '')
  .trim();

  const getShippingFee = (location = {}) => {
    const county = location.county.trim();

    if (!county) return 0;

    const countyRates = SHIPPING_RATE[county];

    if (!countyRates) {
      return 45000;
    }

    const area = normalize(location.area);

    if (area && countyRates.area) {
      for (const [configuredArea, fee] of Object.entries(countyRates.area)) {
        const normalizedConfigured = normalize(configuredArea);

        if (
          area.includes(normalizedConfigured) ||
          normalizedConfigured.includes(area)
        ) {
          return fee;
        }
      }
    }

    return countyRates.default;
  };
 
module.exports = { getShippingFee };