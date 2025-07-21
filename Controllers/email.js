const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "ashutosh.jena@raagvitech.com",
    pass: "qsmq ehnu maxg rzcs",
  },
});

const sendEmail = async (to, subject, html) => {
  return await transporter.sendMail({
    from: '"RaagviCare Team 👨‍⚕️" <ashutosh.jena@raagvitech.com>',
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
