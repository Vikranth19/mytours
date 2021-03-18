const mongoose = require('mongoose'); //layer of abstraction over regular mongodb driver software to connect our hosted database with node code
const slugify = require('slugify');
const User = require('./userModel');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minlength: [
        10,
        'A tour name must have more than or equal to 10 characters',
      ],
      maxlength: [
        40,
        'A tour name must have less than or equal to 40 characters',
      ],
      // validate: [validator.isAlpha, 'Tour name should only contain alphabets'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty should be valid',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      //custom validator
      type: Number,
      validate: {
        // this only points to current document on NEW document creation
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON  nested schema options unlike others above
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      //embedded documents/ array of objects
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        //child referencing, user documents are not stored in the database, we use populate to display users whenever we query for a tour
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    // reviews: [
    //   {
    //     //---child referencing, but we do not want to use this coz array might grow indefinitely, indtead we'll implement virtual populate
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review'
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//imporves performance during queries
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//---virtual properties doesn't get stored in DB
//we use normal function because this points to the current document and arrow funciton doesn't get it's own this keyword
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//---virtual populate instead of using child referencing for
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//---DOCUMENT pre middleware: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//---Embedding the user documents to tour based on ids before saving(but we use referencing in our case)
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id)); //array of promises
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//QUERY MIDDLEWARE('this' here is an query object, not an document)
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

//for populating guides in tours document whenever there is a query
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  next();
});

//---AGGREGATION middleware('this' points to aggregation object)
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //adding one more match stage to remove secret tours in aggregation results
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

//---(TESTING PURPOSE)testTour document is an instance of our tour model
// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 900,
// });

// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log('ERROR: ', err);
//   });
