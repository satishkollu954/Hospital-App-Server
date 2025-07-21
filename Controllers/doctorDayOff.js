// controllers/doctorDayOff.js
const { v4: uuid } = require("uuid");
const Doctor = require("../Models/Doctor");
const { appointmentModel } = require("../Models/appointment");
const sendEmail = require("../Controllers/email");

exports.cancelDay = async (req, res) => {
  try {
    const { doctorEmail, date } = req.body; // date = "YYYY-MM-DD"
    if (!doctorEmail || !date)
      return res.status(400).json({ message: "doctorEmail & date required" });

    /* 1️⃣  toggle availability for TODAY ONLY */
    await Doctor.updateOne(
      { Email: doctorEmail },
      { $set: { Availability: false } }
    );

    /* 2️⃣  fetch still‑pending appointments for that day */
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const appts = await appointmentModel.find({
      doctorEmail,
      date: { $gte: start, $lt: end },
      status: { $in: ["Pending", "Started", "In Progress"] },
    });

    if (!appts.length)
      return res.json({ message: "No appointments to cancel" });

    /* 3️⃣  send reschedule links */
    const CLIENT = process.env.CLIENT_BASE || "http://localhost:3000";

    await Promise.all(
      appts.map(async (a) => {
        a.rescheduleToken = uuid();
        a.rescheduleExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await a.save();

        const link = `${CLIENT}/reschedule/${a.rescheduleToken}`;
        await sendEmail(
          a.email,
          "Doctor unavailable – please reschedule",
          `
          <p>Dear ${a.fullName || "patient"},</p>
          <p>Dr ${a.doctor} will be unavailable on <strong>${date}</strong>.</p>
          <p>Please pick a new date &amp; time within 24 hours:</p>
          <p><a href="${link}" style="
             display:inline-block;padding:10px 15px;background:#2296f3;color:#fff;
             text-decoration:none;border-radius:4px">Reschedule Now</a></p>`
        );
      })
    );

    res.json({ message: `Notified ${appts.length} patients` });
  } catch (err) {
    console.error("cancelDay:", err);
    res.status(500).json({ message: "Server error" });
  }
};
