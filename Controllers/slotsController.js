const Doctor = require("../Models/Doctor");
const { appointmentModel } = require("../Models/appointment");
const DoctorLeave = require("../Models/DoctorLeave"); // ✅ Import leave model

function generateSlots(
  workStart,
  workEnd,
  slotLength,
  lunchStart,
  lunchLength
) {
  const toMinutes = (str) => {
    const m = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) throw new Error(`Invalid time format: ${str}`);
    let [, hh, mm, ampm] = m;
    hh = parseInt(hh);
    mm = parseInt(mm);
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hh < 12) hh += 12;
      if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
    }
    return hh * 60 + mm;
  };

  const toHHMM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const startMin = toMinutes(workStart);
  const endMin = toMinutes(workEnd);
  const lunchMin = toMinutes(lunchStart);
  const breakEnd = lunchMin + lunchLength;

  const slots = [];
  let cursor = startMin;

  while (cursor + slotLength <= endMin) {
    const slotStart = cursor;
    const slotEnd = cursor + slotLength;

    // Skip lunch time
    if (slotStart < breakEnd && slotEnd > lunchMin) {
      cursor += slotLength;
      continue;
    }

    slots.push({
      start: toHHMM(slotStart),
      end: toHHMM(slotEnd),
      booked: false,
    });

    cursor += slotLength;
  }

  return slots;
}

const getSlotsForDoctor = async (req, res) => {
  try {
    const { doctorEmail, date } = req.query;
    if (!doctorEmail || !date) {
      return res
        .status(400)
        .json({ message: "doctorEmail & date are required" });
    }

    const doctor = await Doctor.findOne({ Email: doctorEmail });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const queryDate = new Date(date);

    /* ---------- 1️⃣  Leave check ---------- */
    const onLeave = await DoctorLeave.findOne({
      doctorEmail,
      status: "Approved",
      fromDate: { $lte: queryDate },
      toDate: { $gte: queryDate },
    });
    if (onLeave)
      return res.status(200).json({
        date,
        doctorEmail,
        availableSlots: [],
        message: "Doctor is unavailable on this date due to approved leave.",
      });

    /* ---------- 2️⃣  Today / availability check ---------- */
    const todayISO = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const queryISO = queryDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    if (doctor.Availability === false && queryISO === todayISO)
      return res.status(200).json({
        date,
        doctorEmail,
        availableSlots: [],
        message: "Doctor is unavailable today.",
      });

    /* ---------- 3️⃣  Build slots & mark booked ---------- */
    const appointments = await appointmentModel.find({
      doctorEmail,
      date: queryDate,
    });
    const bookedTimes = appointments.map((a) => a.time); // ["11:00", …]

    let slots = generateSlots(doctor.From, doctor.To, 15, "13:00", 45).map(
      (slot) => ({ ...slot, booked: bookedTimes.includes(slot.start) })
    );

    /* ---------- 4️⃣  Hide / disable past slots if date == today ---------- */
    if (queryISO === todayISO) {
      const nowHHMM = new Date().toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }); // e.g. "12:07"

      // OPTION A – remove past slots entirely:
      // slots = slots.filter((s) => s.start >= nowHHMM);

      // OPTION B – keep them but grey‑out (send extra flag):
      slots = slots.map((s) =>
        s.start < nowHHMM ? { ...s, past: true, booked: true } : s
      );
    }

    return res.status(200).json({
      date,
      doctorEmail,
      availableSlots: slots,
    });
  } catch (err) {
    console.error("Slot generation error:", err);
    res.status(500).json({ message: "Failed to generate slots" });
  }
};

module.exports = {
  generateSlots,
  getSlotsForDoctor,
};
