class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; //shallow copy
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    //1B)Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b{gte|gt|lte|lt|et}\b/g,
      (match) => `$${match}`
    );
    console.log(JSON.parse(queryStr));

    //manual mongodb query: {difficulty: 'easy', duration: { $gte: 5}}
    //result of req.query: {duration: { gte: '5'}, difficulty: 'easy' }

    //---first way of writing queries for filtering
    // let query = Tour.find(JSON.parse(queryStr)); //find returns a Query object.

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      console.log(this.queryString.sort);
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      // sort('price ratingsAverage') in mongoose for second sorting criteria
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;

    const skip = (page - 1) * limit;

    //ex: ?page=2&limit=10  i.e 1-10 on page 1, 11-20 on page 2,...
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
