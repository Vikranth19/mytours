module.exports = (fn) => {
  //the return function gets assigned to createTour
  return (req, res, next) => {
    //fn is the async function and it returns a promise which has catch method
    fn(req, res, next).catch((err) => next(err));
  };
};
