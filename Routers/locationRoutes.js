const express = require("express");
const router = express.Router();

const Doctor = require("../Models/Doctor");
const upload = require("../middlewares/upload");

const sendOTP = require("../Controllers/sendotp");
const verifyOTP = require("../Controllers/verifyOTP");
const diseaseController = require("../Controllers/diseaseController");
const { getSlotsForDoctor } = require("../Controllers/slotsController");

const {
  addDoctors,
  getAllDoctors,
  oneDoctor,
  updateDoctor,
  deleteDoctor,
} = require("../Controllers/doctor");
const {
  getFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ,
} = require("../Controllers/faqController");

const {
  appointmentChange,
  AllQueries,
  deleteQuery,
} = require("../Controllers/user");

const {
  getAllLeaves,
  updateLeaveStatus,
} = require("../Controllers/leaveController");

const {
  addLocation,
  getAllLocations,
  getAllAppointment,
  DeleteAppointment,
  getAllStates,
  getCitiesByState,
  deleteState,
  deleteBranch,
  updateBranchDetails,
  getAppointmentsByDoctorEmail,
  getAppointmentsCountByDoctorEmail,
  getAllAppointmentByDate,
} = require("../Controllers/locationController");

// routes/doctorRoutes.js
const { cancelDay } = require("../Controllers/doctorDayOff");
// routes/appointmentRoutes.js

// Faq Management
//-----------------------

router.post("/faq", addFAQ); // Admin adds FAQ
router.get("/faq", getFAQs); //get All FAQ
router.put("/faq/:id", updateFAQ); // Route: PUT (update) FAQ
router.delete("/faq/:id", deleteFAQ); // Route: DELETE FAQ

// -------------------------------------
// Doctor Management
// -------------------------------------
router.post("/adddoctors", upload.single("image"), addDoctors);
router.get("/alldoctors", getAllDoctors);
router.get("/doctor/:email", oneDoctor);
router.put("/updatedoctor/:email", upload.single("image"), updateDoctor);
router.delete("/deletedoctor/:email", deleteDoctor);
router.post("/cancel-day", cancelDay);
// -------------------------------------
// Appointment Management
// -------------------------------------
router.get("/appointments", getAllAppointment);
router.patch("/appointments/:id", appointmentChange);
router.delete("/appointments/:id", DeleteAppointment);
router.get("/appointments/doctor-email/:email", getAppointmentsByDoctorEmail);
router.get("/slots", getSlotsForDoctor);
router.get(
  "/appointments/count/:doctorEmail",
  getAppointmentsCountByDoctorEmail
);
router.get("/appointments/by-date/:date", getAllAppointmentByDate);

// -------------------------------------
// OTP Handling
// -------------------------------------
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// -------------------------------------
// Disease Management
// -------------------------------------
router.post("/adddisease", diseaseController.addDisease);
router.get("/getdisease", diseaseController.getDiseases);
router.delete("/deletedisease/:id", diseaseController.deleteDisease);
router.put("/updatedisease/:id", diseaseController.updateDisease);

// -------------------------------------
// User Queries
// -------------------------------------
router.get("/Allqueries", AllQueries);
router.delete("/deletequery/:id", deleteQuery);
// -------------------------------------

// Hospital Location Management
// -------------------------------------
router.post("/locations", addLocation); // Add a new state with branches
router.get("/locations", getAllLocations); // Get all states and branches
router.get("/states", getAllStates); // Get only state names
router.get("/cities", getCitiesByState); // Get cities by state

// Branch and State Management
router.put("/update-branch", updateBranchDetails); // Update name/mapUrl of branch
router.delete("/locations/:state/branches/:branchName", deleteBranch); // Delete a specific branch
router.delete("/locations/:state", deleteState); // Delete entire state with all branches

//Leave Management
router.get("/leave", getAllLeaves);
router.put("/leave/:leaveId", updateLeaveStatus);

module.exports = router;
