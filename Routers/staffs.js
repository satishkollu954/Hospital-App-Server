const express = require("express");
const router = express.Router();
const staffController = require("../Controllers/staffs");
const {
  requestLeave,
  getAllLeavesByEmail,
} = require("../Controllers/leaveController");

router.post("/login", staffController.login);
router.post("/send-otp", staffController.sendOtp);
router.post("/verify-otp", staffController.verifyOtp);
router.post("/update-password", staffController.updatePassword);

router.get("/finddoctors", staffController.doctorsBasedOnCityAndDiseas);
router.post("/leave", requestLeave);
router.get("/leave/:email", getAllLeavesByEmail);
module.exports = router;
