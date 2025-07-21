const otpverification = require("../Models/otpverifiaction");

const verifyOTP = async (req, res) => {
  const { Email, Otp } = req.body;

  try {
    const record = await otpverification.findOne({ Email });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "No OTP found for this email" });
    }

    if (record.Otp !== Otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // ✅ Valid OTP
    // Optionally delete the OTP after successful verification
    await otpverification.deleteOne({ Email });

    return res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = verifyOTP;
