const { promisify } = require('util');
const crypto = require('crypto');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('./../utlis/catchAsync');
const AppError = require('./../utlis/appError');
const sendEmail = require('../utlis/sendEmail');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  //remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  //we login users who has just signed up
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  //2) check if user exits and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) if everything is ok, send token to client(in our case user._id is the payload)
  createSendToken(user, 200, res);
});

//middleware for protecting unauthorized routes
exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in!, please login to get access', 401)
    );
  }
  //2) verification of token(verify if someone manipulated our data or web token has already expired)
  //all we need to call is promisify(jwt.verify)() which returns a promise
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) check if still user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401)
    );
  }

  //4)check if user changed password after the token was issued(iat: issued at)
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password, please login again', 401)
    );
  }

  //Grant access to protected route
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  //since we cannot pass parameters to middleware function, we return function which is a middleware and we have access to roles, bcoz of closure property
  return (req, res, next) => {
    //roles is an array ['admin', 'lead-guide'], so in above protect middleware at the end we are storing current user in req.user
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token(we need to compare with the encrypted token in database)
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) if token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) update the changedpasswordat property for the user

  //4)log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)get user from collection(only for logged in user, so we already have current user on req.user from protect route controller)
  const user = await User.findById(req.user.id).select('+password');

  //2) check if POSTed current password is correct
  if (
    !user ||
    !(await user.correctPassword(req.body.passwordCurrent, user.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) if so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //User.findByIdAndUpdate will not work coz validators for passwordConfirm won't run and the encryption middleware in userModel also won't run, i.e password won't be saved in encrypted form in DB

  //4) log user in, send JWT
  createSendToken(user, 200, res);
});
