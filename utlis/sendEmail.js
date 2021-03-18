const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1) create a transporter
  const transporter = nodemailer.createTransport({
    //we are using mailtrap as email service for testing
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  console.log(options.email);

  //2) define email options
  const mailOptions = {
    from: 'noreply@gmail.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  //3) actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
