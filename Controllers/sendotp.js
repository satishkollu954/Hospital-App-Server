const nodemailer = require("nodemailer");
const otpverification = require("../Models/otpverifiaction");

const sendOTP = async (req, res) => {
  const { Email } = req.body;
  console.log("Email ", Email);
  const Otp = Math.floor(100000 + Math.random() * 900000);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "ashutosh.jena@raagvitech.com",
      pass: "qsmq ehnu maxg rzcs", // App password
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"RaagviCare Hospital 👨‍⚕️" <ashutosh.jena@raagvitech.com>',
      to: Email,
      subject: "Your OTP Verification Code - RaagviCare",
      html: `
      <div style="
        font-family: Arial, sans-serif;
        background: url('https://cdn.pixabay.com/photo/2017/08/06/00/04/medical-2585039_1280.jpg') no-repeat center;
        background-size: cover;
        padding: 40px;
        color: #ffffff;
        text-shadow: 1px 1px 2px #000;
        border-radius: 12px;
      ">
        <div style="background-color: rgba(0, 0, 0, 0.6); padding: 20px; border-radius: 10px;">
          <h2 style="color: #4fd1c5;">RaagviCare OTP Verification</h2>
          <p style="font-size: 16px;">Dear User,</p>
          <p style="font-size: 16px;">
            To proceed with your request, please use the OTP (One-Time Password) below:
          </p>
          <h1 style="font-size: 36px; color: #ffc107; text-align: center; letter-spacing: 4px;">${Otp}</h1>
          <p style="font-size: 14px;">
            This OTP is valid for 5 minutes. Do not share it with anyone for security reasons.
          </p>
          <p style="font-style: italic;">If you did not request this, please ignore this message.</p>
          <br />
          <p>Thank you,<br /><strong>RaagviCare Hospital Team</strong></p>
        </div>
      </div>
      `,
    });

    console.log("OTP email sent: %s", info.messageId);

    // Save or update OTP
    await otpverification.findOneAndUpdate(
      { Email },
      { Otp },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: "OTP sent and stored successfully",
      otp: Otp, // ⚠️ remove in production
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OTP send or save failed" });
  }
};

module.exports = sendOTP;
