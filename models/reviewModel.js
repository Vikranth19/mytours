//review / rating/ createdAt/ ref to tour/ ref to user
const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    tour: {
      //parent referencing(not in an array)
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      //parent referencing
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//avoid duplicate review from same user(COMPOUND INDEX)
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //this points to the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  //this points to current review(using this.constructor instead of Review because still Review have not been defined yet)
  this.constructor.calcAverageRatings(this.tour);
});

//---updating avg rating upon update or delete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //this points to current query but we need current document
  this.r = await this.findOne(); // r is the document, but we can't update here because data wouldn't have been updated, so we do it in post
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // this.r = await this.findOne(); does NOT work here because the query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
