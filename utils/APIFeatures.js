class APIFeatures { 
  constructor(query, queryString){
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
  
    ['page', 'limit', 'sort', 'search'].forEach(key =>
      delete queryObj[key]
    );
  
    const mongoQuery = {};
  
    // Brand
    if (queryObj.brand) {

      if (typeof queryObj.brand === "object") {
    
          mongoQuery.brand = queryObj.brand;
    
      } else {
    
          mongoQuery.brand = {
              $in: queryObj.brand.split(',')
          };
    
      }
    
    }
  
    // Category
    if (queryObj.category) {

      if (typeof queryObj.category === "object") {
    
          mongoQuery.category = queryObj.category;
    
      } else {
    
          mongoQuery.category = {
              $in: queryObj.category.split(',')
          };
    
      }
    
    }
  
    // Price
    if (queryObj.minPrice || queryObj.maxPrice) {
      mongoQuery.price = {};
  
      if (queryObj.minPrice)
        mongoQuery.price.$gte = Number(queryObj.minPrice);
  
      if (queryObj.maxPrice)
        mongoQuery.price.$lte = Number(queryObj.maxPrice);
    }
  
    // Everything else
    for (const key in queryObj) {
      if (
        [
          'brand',
          'category',
          'minPrice',
          'maxPrice'
        ].includes(key)
      ) continue;
  
      mongoQuery[key] = queryObj[key];
    }
  
    this.query = this.query.find(mongoQuery);
  
    return this;
  }

  search() {
    if (this.queryString.search) {
      const search = this.queryString.search;

      this.query = this.query.find({
        $or: [
          { $text: { $search: search }},
          
          { brand: { $regex: search, $options: 'i'}},

          { name: { $regex: search, $options: 'i'}}
        ]
      });
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      if (this.queryString.sort === 'newest') {
        this.query = this.query.sort('-createdAt');
      } else if (this.queryString.sort === 'oldest') {
        this.query = this.query.sort('createdAt');
      } else {
        this.query = this.query.sort(this.queryString.sort.split(',').join(' '));
      }
    } else {
      this.query = this.query.sort('-createdAt');
    }
  
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 20;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;