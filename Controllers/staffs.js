const Staff = require("../Models/staffs");
const Doctor = require("../Models/Doctor");
const nodemailer = require("nodemailer");

// Helper: OTP generator
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// SEND OTP (Forgot Password)
exports.sendOtp = async (req, res) => {
  const { Email } = req.body;
  try {
    const staff = await Staff.findOne({ Email });
    if (!staff) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    staff.Otp = otp;
    await staff.save();

    // Send OTP email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "ashutosh.jena@raagvitech.com",
        pass: "qsmq ehnu maxg rzcs", // App password
      },
    });

    await transporter.sendMail({
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
          <h1 style="font-size: 36px; color: #ffc107; text-align: center; letter-spacing: 4px;">${otp}</h1>
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

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { Email, Otp } = req.body;

  try {
    const staff = await Staff.findOne({ Email });
    if (!staff) return res.status(404).json({ message: "User not found" });

    if (staff.Otp !== Otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ error: "Error verifying OTP" });
  }
};

// UPDATE PASSWORD USING OTP
exports.updatePassword = async (req, res) => {
  const { Email, Otp, newPassword } = req.body;

  try {
    // Find staff by email
    const staff = await Staff.findOne({ Email });
    if (!staff)
      return res.status(404).json({ message: "Staff user not found" });

    // Check OTP
    if (staff.Otp !== Otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Save plain text password (⚠️ not secure)
    staff.Password = newPassword;
    staff.Otp = null;
    await staff.save();

    // Also update Doctor's password if exists
    const doctor = await Doctor.findOne({ Email });
    if (doctor) {
      doctor.Password = newPassword;
      await doctor.save();
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Password update failed" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { Email, Password } = req.body;

  try {
    const staff = await Staff.findOne({ Email });
    if (!staff) return res.status(404).json({ message: "User not found" });

    if (staff.Password != Password)
      return res.status(401).json({ message: "Invalid credentials" });

    res.status(200).json({ success: true, message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
};

exports.doctorsBasedOnCityAndDiseas = async (req, res) => {
  try {
    let { city, Specialization } = req.query;

    // 💡 Extract actual city from input if it contains a comma
    if (city && city.includes(",")) {
      const parts = city.split(",");
      city = parts[1].trim(); // Get the part after the comma
    }

    // 🔍 Build filter dynamically
    const filter = {};
    if (city) filter.City = city;
    if (Specialization) filter.Specialization = Specialization;

    console.log("filter", filter);

    const doctors = await Doctor.find(filter);
    console.log(doctors);

    if (doctors.length === 0) {
      return res
        .status(404)
        .json({ message: "No doctors found for given filters" });
    }

    res.status(200).json({ doctors });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
};
