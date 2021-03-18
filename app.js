//In Express everything is middleware, even routers
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const AppError = require('./utlis/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'))

//1)GLOBAL MIDDLEWARES

//middleware for serving static files
app.use(express.static(`${__dirname}/public`));

//Set security http header
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again later',
});

app.use('/api', limiter);

//BODY PARSER: middleware that can modify incoming request data, we get access to request body
app.use(express.json({ limit: '10kb' }));

//Data sanitization against NoSQL query injection
app.use(mongoSanitize()); //filters out all dollar signs mongo operators

//Data sanitization against xss
app.use(xss());

//Prevent parameter pollution(remove duplicate fields from query string)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

 

//TEST MIDDLEWARE function between request and response, order of middleware functions is important
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

//2) ROUTE HANDLERS(implemented separately in diff files)

//3) ROUTES

// app.get('/api/v1/tours', getAllTours);
//---express does not put body data on the request, so we need to use middleware
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

app.get('/', (req,res) => {
  res.status(200).render('base', {
    tour: 'The Forest Hiker',
    user: 'Lodu'
  });  //looks for the templates in the views folder
})

//mounting the router on a route
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  //we pass error inside the next function, if we ever pass anything in next function it is assumed as an error
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

//ERROR handling middleware
app.use(globalErrorHandler);

//4) START SERVER

module.exports = app;
