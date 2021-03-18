const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

// POST /tour/234rad4/reviews nested route
// GET /tour/234rad4/reviews nested route
// GET /tour/234rad4/reviews/94887da nested route

//protect all routes below this
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.postReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
