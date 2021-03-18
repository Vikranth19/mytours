const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router(); //we use this tourRouter as a middleware/sub application

// const reviewController = require('./../controllers/reviewController');

// POST /tour/234rad4/reviews nested route
// GET /tour/234rad4/reviews nested route
// GET /tour/234rad4/reviews/94887da nested route

router.use('/:tourId/reviews', reviewRouter); //mounted reviewRouter on this URL, we use mergeParams: true in reviewRouter to get access to this URL params

//---param middleware---
// router.param('id', tourController.checkID);

//--create a checkBody middleware function---
//1)check if body contains the name and price property, if not send 400, bad request
//2)add it to post handler stack
//we've chained checkbody and createtour middlewares, BUT WE DO NOT REQUIRE ANYMORE BECAUSE WE'LL BE CHECKING IN MONGOOSE MODEL ITSELF

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlong/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within/233/center/-40,45/unit/mi

router.route('/distances/:latlong/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );
// .post(tourController.checkBody, tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
