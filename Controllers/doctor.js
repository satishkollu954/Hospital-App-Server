const Doctor = require("../Models/Doctor");
const Staff = require("../Models/staffs");
const { rescheduleDay } = require("./rescheduleDay");

// Add a new doctor
const addDoctors = async (req, res) => {
  try {
    const {
      Name,
      About,
      Email,
      Designation,
      Specialization,
      Age,
      State,
      City,
      From,
      To,
      Availability,
      Learnmore,
      Qualification,
      Experience,
      BriefProfile,
      Address,
    } = req.body;

    const Languages = JSON.parse(req.body.Languages || "[]");
    const Education = JSON.parse(req.body.Education || "[]");
    const image = req.file?.filename || null;

    const doctorExists = await Doctor.findOne({ Email });
    if (doctorExists) {
      return res
        .status(400)
        .json({ message: "Doctor with this email already exists" });
    }

    const staffExists = await Staff.findOne({ Email });
    if (staffExists) {
      return res
        .status(400)
        .json({ message: "Email already exists in staff records" });
    }

    const newDoctor = new Doctor({
      image,
      Name,
      About,
      Email,
      Designation,
      Specialization,
      Age,
      State,
      City,
      From,
      To,
      Availability,
      Learnmore,
      Qualification,
      Experience,
      BriefProfile,
      Address,
      Languages,
      Education,
    });

    await newDoctor.save();
    await Staff.create({ Email, Password: "", Otp: "" });

    res.status(201).json({ message: "Doctor added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ───────────────────────── 1. Lazy‑load translator ───────────────────────── */
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

/* ───────────────────────── 2. Normalize language code ───────────────────── */
function normalizeLangCode(lang) {
  const map = {
    "en-us": "en",
    en_in: "en",
    "hi-in": "hi",
    "te-in": "te",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

/* ───────────────────────── 3. In‑memory cache ───────────────────────────── */
const cache = new Map();
async function tx(text = "", lang = "en") {
  lang = normalizeLangCode(lang);
  if (!text || lang === "en") return text;
  const key = `${text}|${lang}`;
  if (cache.has(key)) return cache.get(key);
  const { text: out } = await (
    await getTranslator()
  )(text, { from: "en", to: lang });
  cache.set(key, out);
  return out;
}

/* ───────────────────────── 4. GET /admin/doctors?lang=xx ────────────────── */
const getAllDoctors = async (req, res) => {
  const lang = normalizeLangCode(req.query.lang || "en");

  try {
    const doctors = await Doctor.find();
    if (lang === "en") return res.status(200).json(doctors);

    const translated = await Promise.all(
      doctors.map(async (d) => ({
        _id: d._id,
        image: d.image,
        Email: d.Email,
        Availability: d.Availability,
        Languages: d.Languages,
        Education: d.Education,
        Age: d.Age,
        From: d.From,
        To: d.To,
        Name: await tx(d.Name, lang),
        About: await tx(d.About, lang),
        Designation: await tx(d.Designation, lang),
        Specialization: await tx(d.Specialization, lang),
        State: await tx(d.State, lang),
        City: await tx(d.City, lang),
        Learnmore: d.Learnmore,
        Qualification: await tx(d.Qualification, lang),
        Experience: await tx(d.Experience, lang),
        BriefProfile: await tx(d.BriefProfile, lang),
        Address: await tx(d.Address, lang),
      }))
    );

    res.status(200).json(translated);
  } catch (err) {
    console.error("Failed to fetch/translate doctors:", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  //console.log("inside updateDoctor");
  try {
    const { email } = req.params;

    const current = await Doctor.findOne({ Email: email });
    if (!current) return res.status(404).json({ message: "Doctor not found" });

    let parsedLanguages = [];
    let parsedEducation = [];

    try {
      parsedLanguages = JSON.parse(req.body.Languages || "[]");
    } catch {}
    try {
      parsedEducation = JSON.parse(req.body.Education || "[]");
    } catch {}

    const updatedFields = {
      Name: req.body.Name,
      About: req.body.About,
      Designation: req.body.Designation,
      Specialization: req.body.Specialization,
      Age: req.body.Age,
      State: req.body.State,
      City: req.body.City,
      From: req.body.From,
      To: req.body.To,
      Password: req.body.Password,
      Learnmore: req.body.Learnmore,
      Availability:
        req.body.Availability === "true" || req.body.Availability === true,
      Qualification: req.body.Qualification,
      Experience: req.body.Experience,
      BriefProfile: req.body.BriefProfile,
      Address: req.body.Address,
      Languages: parsedLanguages,
      Education: parsedEducation,
    };

    if (req.file?.filename) {
      updatedFields.image = req.file.filename;
    }

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { Email: email },
      updatedFields,
      { new: true }
    );
    // console.log("inside updateDoctor ==> ", updatedDoctor);
    const stafffs = await Staff.findOneAndUpdate(
      { Email: email },
      { Password: req.body.Password }
    );
    // console.log("inside updateDoctor stafffs==> ", stafffs);
    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    /* ④  If Availability flipped from true → false, trigger reschedule */
    console.log(
      "current.Availability",
      current.Availability,
      "updatedDoctor.Availability",
      updatedDoctor.Availability
    );

    let notified = 0;
    if (current.Availability === true && updatedDoctor.Availability === false) {
      // Date to cancel: UI may send unavailableDate else default today in IST
      updatedDoctor.unavailableSince = new Date();
      const dateISO =
        req.body.unavailableDate ||
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      console.log("dateISO", dateISO);
      notified = await rescheduleDay({
        doctor: updatedDoctor,
        dateISO,
        cutoff: updatedDoctor.unavailableSince, // pass the toggle moment
      });
    }
    console.log("inside update doctor ", notified);
    const msg = notified
      ? `Doctor updated – ${notified} patient(s) asked to reschedule`
      : "Doctor updated successfully";

    res.status(200).json({ message: msg, updatedDoctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const { email } = req.params;
    const deletedDoctor = await Doctor.findOneAndDelete({ Email: email });

    if (!deletedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    await Staff.findOneAndDelete({ Email: email });
    res
      .status(200)
      .json({ message: "Doctor and associated staff deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get one doctor
const oneDoctor = async (req, res) => {
  try {
    const { email } = req.params;
    const doctor = await Doctor.findOne({ Email: email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.status(200).json(doctor);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch doctor", details: err.message });
  }
};
module.exports = {
  addDoctors,
  getAllDoctors,
  updateDoctor,
  deleteDoctor,
  oneDoctor,
};
