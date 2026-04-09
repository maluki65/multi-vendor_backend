class APIFeatures { 
  constructor(query, queryString){
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excluded = ['page', 'limit', 'sort', 'search'];
    excluded.forEach(el => delete queryObj[el]);
  
    const mongoQuery = {};
  
    for (let key in queryObj) {
      if (typeof queryObj[key] === 'object') {
        mongoQuery[key] = queryObj[key];
      } else {
        mongoQuery[key] = queryObj[key];
      }
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