const SHIPPING_RATE = {
  Nairobi: {
    default: 25000,
    areas: {
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
    areas: {
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

const getShippingFee = (location = {}) => {
  const county = location.county?.trim();
  const area = location.area?.trim();

  if (!county) return 0;

  const countyRates = SHIPPING_RATE[county];

  if (!countyRates) {
    return 400;
  }

  if (
    area && countyRates.area && countyRates.area[area] !== undefined
  ) {
    return countyRates.area[area];
  }

  return countyRates.default;
};

module.exports = { getShippingFee };