const HospitalLocation = require("../Models/HospitalLocation");
const { appointmentModel } = require("../Models/appointment");

// Save location data manually
const addLocation = async (req, res) => {
  try {
    const { State, branches } = req.body;

    // Check if the State already exists
    const existingState = await HospitalLocation.findOne({ State });

    if (existingState) {
      let added = false;

      // Add only new branches (by name)
      branches.forEach((newBranch) => {
        const exists = existingState.branches.some(
          (b) => b.name === newBranch.name
        );
        if (!exists) {
          existingState.branches.push(newBranch);
          added = true;
        }
      });

      if (added) {
        await existingState.save();
        return res.status(200).json({
          message: "New branches added to existing city.",
        });
      } else {
        return res.status(200).json({
          message: "No new branches added. All branches already exist.",
        });
      }
    }

    // City doesn't exist, create new
    const newLocation = new HospitalLocation({ State, branches });
    await newLocation.save();

    res.status(201).json({ message: "City and branches added successfully." });
  } catch (err) {
    console.error("Error saving location:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ────── Translation Setup ────── */
let translateFn;
async function getTranslator() {
  if (!translateFn) {
    const mod = await import("@vitalets/google-translate-api");
    translateFn = mod.translate || mod.default;
    if (typeof translateFn !== "function") {
      throw new Error(
        "Unable to load translate() from @vitalets/google-translate-api"
      );
    }
  }
  return translateFn;
}

const cache = new Map();
async function tx(text = "", lang = "en") {
  lang = normalizeLangCode(lang); // normalize here
  if (!text || lang === "en") return text;
  const key = `${text}|${lang}`;
  if (cache.has(key)) return cache.get(key);
  const { text: out } = await (
    await getTranslator()
  )(text, { from: "en", to: lang });
  cache.set(key, out);
  return out;
}

/* ────── GET /admin/locations?lang=xx ────── */
const getAllLocations = async (req, res) => {
  const lang = (req.query.lang || "en").toLowerCase();

  try {
    const locations = await HospitalLocation.find();

    if (lang === "en") return res.status(200).json(locations);

    const translated = await Promise.all(
      locations.map(async (loc) => ({
        _id: loc._id,
        State: await tx(loc.State, lang),
        branches: await Promise.all(
          (loc.branches || []).map(async (b) => ({
            name: await tx(b.name, lang),
            mapUrl: b.mapUrl,
          }))
        ),
      }))
    );

    res.status(200).json(translated);
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Other endpoints (unchanged)
const getAllAppointment = async (req, res) => {
  try {
    const appointments = await appointmentModel.find().sort({ date: -1 });
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching appointments" });
  }
};

// GET  /api/appointments/by-date/:date   (e.g. /api/appointments/by-date/2025-07-07)
const getAllAppointmentByDate = async (req, res) => {
  try {
    // Accept the date from the route parameter (YYYY‑MM‑DD recommended)
    const { date: dateParam } = req.params;
    if (!dateParam) {
      return res.status(400).json({ message: "Missing date parameter" });
    }

    // Convert to a Date object & build the 24‑hour window for that day
    const start = new Date(dateParam);
    if (isNaN(start.valueOf())) {
      return res
        .status(400)
        .json({ message: "Invalid date format (use YYYY‑MM‑DD)" });
    }
    start.setHours(0, 0, 0, 0); // 00:00:00.000 local time
    const end = new Date(start);
    end.setDate(end.getDate() + 1); // next day 00:00:00.000

    // Query everything between start (inclusive) and end (exclusive)
    const appointments = await appointmentModel
      .find({ date: { $gte: start, $lt: end } })
      .sort({ time: 1 }); // optional secondary sort by 'time' string

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching appointments by date:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching appointments by date" });
  }
};

// Get All Appointments Of a Doctor By Docotor Email
const getAppointmentsByDoctorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const appointments = await appointmentModel
      .find({ doctorEmail: email })
      .sort({ date: -1 });

    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching appointments for doctor:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAppointmentsCountByDoctorEmail = async (req, res) => {
  try {
    const doctorEmail = decodeURIComponent(req.params.doctorEmail);
    const total = await appointmentModel.countDocuments({ doctorEmail });

    const completed = await appointmentModel.countDocuments({
      doctorEmail,
      status: "Completed",
    });
    const pending = total - completed;

    res.json({ total, pending, completed });
  } catch (err) {
    console.error("Count error:", err);
    res.status(500).json({ message: "Error fetching counts" });
  }
};

const DeleteAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await appointmentModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Failed to delete appointment" });
  }
};

const getAllStates = async (req, res) => {
  try {
    const states = await HospitalLocation.find().select("State -_id");
    const uniqueStates = [...new Set(states.map((loc) => loc.State))];
    res.status(200).json(uniqueStates);
  } catch (err) {
    console.error("Error fetching states:", err);
    res.status(500).json({ message: "Failed to fetch states" });
  }
};

const getCitiesByState = async (req, res) => {
  try {
    const { state } = req.query;

    const location = await HospitalLocation.findOne({ State: state });

    if (!location) {
      return res.status(404).json({ message: "State not found" });
    }

    const citys = location.branches.map((b) => b.name);
    res.status(200).json(citys);
  } catch (err) {
    console.error("Error fetching cities:", err);
    res.status(500).json({ message: "Failed to fetch cities" });
  }
};

const updateBranchDetails = async (req, res) => {
  try {
    const { state, branchId, newName, newMapUrl, newPhone } = req.body;

    const location = await HospitalLocation.findOneAndUpdate(
      { State: state, "branches._id": branchId },
      {
        $set: {
          "branches.$.name": newName,
          "branches.$.mapUrl": newMapUrl,
          "branches.$.phone": newPhone,
        },
      },
      { new: true }
    );

    if (!location) {
      return res.status(404).json({ message: "Branch or state not found" });
    }

    res.status(200).json({ message: "Branch updated successfully", location });
  } catch (error) {
    console.error("Error updating branch:", error);
    res.status(500).json({ message: "Failed to update branch" });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const { state, branchName } = req.params;

    const location = await HospitalLocation.findOne({ State: state });
    if (!location) {
      return res.status(404).json({ message: "State not found" });
    }

    const branchExists = location.branches.some((b) => b.name === branchName);
    if (!branchExists) {
      return res.status(404).json({ message: "Branch not found under state" });
    }

    await HospitalLocation.updateOne(
      { State: state },
      { $pull: { branches: { name: branchName } } }
    );

    res.json({ message: "Branch deleted successfully" });
  } catch (err) {
    console.error("Error deleting branch:", err);
    res.status(500).json({ message: "Failed to delete branch" });
  }
};

const deleteState = async (req, res) => {
  try {
    const { state } = req.params;

    const deleted = await HospitalLocation.findOneAndDelete({ State: state });

    if (!deleted) {
      return res.status(404).json({ message: "State not found" });
    }
    res.json({ message: "State deleted successfully" });
  } catch (err) {
    console.error("Error deleting state:", err);
    res.status(500).json({ message: "Failed to delete state" });
  }
};

module.exports = {
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
  getAllAppointmentByDate,
  getAppointmentsCountByDoctorEmail,
};
