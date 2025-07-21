/**
 * Reschedule every “pending / started / in‑progress” appointment
 * that falls on the given date for a particular doctor.
 *
 * ‑ Adds a 24‑h one‑time token to each appointment.
 * ‑ Sends an e‑mail to every patient with a “Reschedule” link.
 * ‑ Returns the number of notifications sent.
 */

const { v4: uuid } = require("uuid");
const { appointmentModel } = require("../Models/appointment");
const sendEmail = require("../Controllers/email"); // same wrapper you already use
async function rescheduleDay({ doctor, dateISO, cutoff }) {
  console.log("Inside reshedule method");
  // build a 24‑hour window for that calendar day (IST not required here)
  cutoff = cutoff || new Date();
  const cutoffHHMM = cutoff.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }); // e.g. "11:00"

  // ── 2. build start/end of that calendar day ───────────────────────
  const start = new Date(dateISO);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // ── 3. fetch only slots today AND starting after the cutoff ───────
  const appts = await appointmentModel.find({
    doctorEmail: doctor.Email,
    date: { $gte: start, $lt: end },
    status: { $nin: ["Completed"] }, // ignore finished visits
    time: { $gte: cutoffHHMM }, // slot on/after 11:00
  });

  if (!appts.length) return 0;

  // ── 4. generate token + send e‑mail per appointment ───────────────
  await Promise.all(
    appts.map(async (a) => {
      a.rescheduleToken = uuid();
      a.rescheduleExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await a.save();

      const link = `http://localhost:3000/reschedule/${a.rescheduleToken}`;

      await sendEmail(
        a.email,
        "Doctor unavailable – please reschedule",
        `
  <div style="
    font-family: Arial, sans-serif;
    background: url('https://cdn.pixabay.com/photo/2016/03/31/20/11/doctor-1295581_1280.png') no-repeat center;
    background-size: cover;
    padding: 40px;
    color: #ffffff;
    text-shadow: 1px 1px 2px #000;
    border-radius: 12px;
  ">
    <div style="background-color: rgba(0, 0, 0, 0.6); padding: 20px; border-radius: 10px;">
      <h2 style="color: #4fd1c5;"> <p>Dear ${a.fullName || "patient"},</p></h2>

      <p style="font-size: 16px;">
        Thank you for scheduling your appointment with us! But Doctor is Unavailable due to some Emergency Problem
      </p>
      <ul style="line-height: 1.8; font-size: 16px;">
          <p> ${doctor.Name} became unavailable today.</p>
        <p>Your slot at <strong>${a.time}</strong> needs to be re‑scheduled.</p>
        <p><a href="${link}">Click here to pick a new time</a> (link valid 24 h)</p>
        <p>— RaagviCare Team</p>
      </ul>

      <p>
        Please arrive 10-15 minutes early and carry any necessary documents. If you need assistance, our team is just a call away.
      </p>

      <p style="font-style: italic;">We're here to care for you every step of the way.</p>

      <br />
      <p>Warm regards,<br/><strong>RaagviCare Team</strong></p>
    </div>
  </div>
  `
      );
    })
  );

  return appts.length;
}

module.exports = {
  rescheduleDay,
};
