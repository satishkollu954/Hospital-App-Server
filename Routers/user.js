const express = require("express");
const router = express.Router();

const { contactus, appointment, login } = require("../Controllers/user");
const { getRescheduleInfo, postReschedule } = require("../Controllers/user");
router.post("/contactus", (req, res) => {
  contactus(req, res);
});

router.post("/appointment", (req, res) => {
  appointment(req, res);
});

router.post("/admin/login", login);
router.get("/reschedule/:token", getRescheduleInfo);
router.post("/reschedule/:token", postReschedule);

module.exports = router;
