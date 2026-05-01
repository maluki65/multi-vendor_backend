const zones = [
  {
    name: 'Nairobi',
    counties: ['Nairobi'],
    fee: 10000 // in cents
  },
  {
    name: 'Nairobi',
    counties: ['Kiambu'],
    fee: 20000 // in cents
  },
  {
    name: 'Outside Nairobi',
    counties: ['*'],
    fee: 40000 // in cents
  }
];

const getZone = (location) => {
  if (!location?.county) return null;

  return zones.find(zone => 
    zone.counties.includes(location.county)
  ) || zones.find(z => z.counties.includes('*'));
};

const getShippingFee = (location) => {
  if (!location?.county) {
    return 0;
  }
  
  const zone = getZone(location);
  return zone ? zone.fee : 0;
};

module.exports = {
  getShippingFee,
  getZone
};