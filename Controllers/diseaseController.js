// controllers/diseaseController.js (CommonJS + dynamic ESM import)

const Disease = require("../Models/Disease");

/* ───────────────────────── 1. Lazy‑load translator (v8 & v9+) ─────────────────── */
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

/* ───────────────────────── 2. Normalize lang like 'en-us' → 'en' ──────────────── */
function normalizeLangCode(lang) {
  const map = {
    "en-us": "en",
    en_in: "en",
    "hi-in": "hi",
    "te-in": "te",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

/* ───────────────────────── 3. Tiny in‑memory cache ───────────────────────────── */
const cache = new Map();

async function translateText(text = "", lang = "en") {
  lang = normalizeLangCode(lang); // ✅ FIXED here

  if (!text || lang === "en") return text;

  const key = `${text}|${lang}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const translate = await getTranslator();
    const { text: out } = await translate(text, { from: "en", to: lang });
    cache.set(key, out);
    return out;
  } catch (err) {
    console.error("Translation error:", err);
    return text; // fallback
  }
}

/* ───────────────────────── 4. Add a new disease ──────────────────────────────── */
exports.addDisease = async (req, res) => {
  try {
    const { disease, description, learnmore } = req.body;

    const newDisease = new Disease({ disease, description, learnmore });
    await newDisease.save();

    res.status(201).json({ success: true, message: "Disease added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add disease" });
  }
};

/* ───────────────────────── 5. Get all diseases (with lang) ───────────────────── */
exports.getDiseases = async (req, res) => {
  let lang = (req.query.lang || "en").toLowerCase();
  lang = normalizeLangCode(lang); // ✅ FIXED here

  try {
    const diseases = await Disease.find(); // fetch all

    if (lang === "en") return res.status(200).json(diseases);

    // translate each document concurrently
    const translated = await Promise.all(
      diseases.map(async (d) => ({
        _id: d._id,
        disease: await translateText(d.disease, lang),
        description: await translateText(d.description, lang),
        learnmore: await translateText(d.learnmore, lang),
      }))
    );

    res.status(200).json(translated);
  } catch (err) {
    console.error("Failed to fetch/translate diseases:", err);
    res.status(500).json({ error: "Failed to fetch diseases" });
  }
};

/* ───────────────────────── 6. Delete disease by ID ───────────────────────────── */
exports.deleteDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Disease.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Disease not found" });
    }

    res.status(200).json({ message: "Disease deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete disease" });
  }
};

/* ───────────────────────── 7. Update disease by ID ───────────────────────────── */
exports.updateDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const { disease, description, learnmore } = req.body;

    const updated = await Disease.findByIdAndUpdate(
      id,
      { disease, description, learnmore },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Disease not found" });
    }

    res.status(200).json({ message: "Disease updated", data: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update disease" });
  }
};
