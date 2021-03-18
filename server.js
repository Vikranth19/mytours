//this file is where we do setup of our application, also configure mongodb
const mongoose = require('mongoose');
const dotenv = require('dotenv');

//handle uncaught exceptions(any where)
process.on('uncaughtException', (err) => {
  console.log('Uncaught exception, shutting down');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((connection) => {
    // console.log(connection.connections);
    console.log('DB connection succesful');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`listening on port ${port}..`);
});

//unhandled rejections handler(globally)
process.on('unhandledRejection', (err) => {
  console.log('Unhandled rejection, shutting down');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
