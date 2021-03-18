const AppError = require('../utlis/appError');
const Review = require('./../models/reviewModel');
const catchAsync = require('./../utlis/catchAsync');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);
// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   //---To allow for nested GET reviews
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

exports.getReview = factory.getOne(Review);

//--middleware for setting userIds for postReview
exports.setTourUserIds = (req, res, next) => {
  //---Allow nested routes
  //if tour or user is not mentioned in the body then, we get tour id from URL and user id from req.user.id from protect middleware
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.postReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
