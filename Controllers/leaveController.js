const DoctorLeave = require("../Models/DoctorLeave");
const staffs = require("../Models/staffs");

// 🩺 Doctor submits a leave request
// controllers/doctorLeave.js
const requestLeave = async (req, res) => {
  const { doctorEmail, fromDate, toDate, reason } = req.body;

  /* ─────────────────── validations ─────────────────── */
  if (!doctorEmail || !fromDate || !toDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const cleanFromDate = new Date(
    new Date(fromDate).toISOString().split("T")[0]
  );
  const cleanToDate = new Date(new Date(toDate).toISOString().split("T")[0]);

  if (cleanFromDate > cleanToDate) {
    return res
      .status(400)
      .json({ message: "'From' date cannot be after 'To' date" });
  }

  try {
    /* ───── ensure the doctor exists ───── */
    const doctorExists = await staffs.exists({ Email: doctorEmail });
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: "Doctor not found in staff records" });
    }

    /* ───── check for an overlapping request ─────
       Overlap logic:  new.from ≤ old.to   &&   new.to ≥ old.from
       (Pending or Approved only; Rejected requests don’t block)         */
    const clash = await DoctorLeave.findOne({
      doctorEmail,
      status: { $in: ["Pending", "Approved"] },
      fromDate: { $lte: cleanToDate },
      toDate: { $gte: cleanFromDate },
    });

    if (clash) {
      return res.status(409).json({
        message:
          `You already have a ${clash.status.toLowerCase()} leave ` +
          `from ${clash.fromDate.toISOString().split("T")[0]} ` +
          `to ${clash.toDate.toISOString().split("T")[0]}.`,
      });
    }

    /* ───── save the new leave ───── */
    const leave = new DoctorLeave({
      doctorEmail,
      fromDate: cleanFromDate,
      toDate: cleanToDate,
      reason,
    });

    await leave.save();

    return res.status(201).json({
      message: "Leave request submitted successfully",
      leave,
    });
  } catch (err) {
    console.error("Leave request error:", err);
    return res.status(500).json({ message: "Failed to request leave" });
  }
};

// 👨‍⚕️ Admin fetches all leave requests
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await DoctorLeave.find().sort({ requestedAt: -1 });
    res.status(200).json(leaves);
  } catch (err) {
    console.error("Error fetching leaves:", err);
    res.status(500).json({ message: "Error fetching leave requests" });
  }
};

const getAllLeavesByEmail = async (req, res) => {
  try {
    // 1️⃣ route param ➜ 2️⃣ query ➜ 3️⃣ cookie
    const rawEmail = req.params.email || req.query.email || req.cookies?.email;

    if (!rawEmail) {
      return res.status(400).json({ message: "Doctor email is required" });
    }

    // decode jenaashu301%40gmail.com ➜ jenaashu301@gmail.com
    const doctorEmail = decodeURIComponent(rawEmail);

    /* optional, but nice to fail fast if the email
       isn’t even in your Staff collection              */
    const doctorExists = await staffs.exists({ Email: doctorEmail });
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: "Doctor not found in staff records" });
    }

    const leaves = await DoctorLeave.find({ doctorEmail }).sort({
      requestedAt: -1,
    });

    return res.status(200).json(leaves);
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    return res.status(500).json({ message: "Error fetching leave requests" });
  }
};

// ✅ Admin updates leave status (Approved or Rejected)
const updateLeaveStatus = async (req, res) => {
  const { leaveId } = req.params;
  const { status } = req.body;

  if (!["Approved", "Rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status. Use 'Approved' or 'Rejected'" });
  }

  try {
    const updatedLeave = await DoctorLeave.findByIdAndUpdate(
      leaveId,
      { status },
      { new: true }
    );

    if (!updatedLeave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.status(200).json({
      message: "Leave status updated successfully",
      leave: updatedLeave,
    });
  } catch (err) {
    console.error("Error updating leave status:", err);
    res.status(500).json({ message: "Failed to update leave status" });
  }
};

// 👀 Utility to check if doctor is on leave for a given date (used in appointments)
const isDoctorOnLeave = async (doctorEmail, appointmentDate) => {
  try {
    const date = new Date(appointmentDate);
    const onLeave = await DoctorLeave.findOne({
      doctorEmail,
      status: "Approved",
      fromDate: { $lte: date },
      toDate: { $gte: date },
    });

    return !!onLeave;
  } catch (err) {
    console.error("Error checking doctor leave:", err);
    return false;
  }
};

module.exports = {
  requestLeave,
  getAllLeaves,
  updateLeaveStatus,
  isDoctorOnLeave,
  getAllLeavesByEmail, // Exported for use in appointment controller
};
