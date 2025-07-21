// controllers/faqController.js (CommonJS + dynamic ESM import)

const FAQ = require("../Models/faqModel");

/* ───────────────────────── 1. Lazy‑load translator (v8 & v9+) ───────────────────── */
let translateFn; // cached translator function

async function getTranslator() {
  if (!translateFn) {
    const mod = await import("@vitalets/google-translate-api"); // dynamic ESM import
    translateFn = mod.translate || mod.default;
    if (typeof translateFn !== "function") {
      throw new Error(
        "Unable to load translate() from @vitalets/google-translate-api"
      );
    }
  }
  return translateFn;
}

/* ───────────────────────── 2. Normalize lang like 'en-us' → 'en' ────────────────── */
function normalizeLangCode(lang) {
  const map = {
    "en-us": "en",
    "en_in": "en",
    "hi-in": "hi",
    "te-in": "te",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

/* ───────────────────────── 3. Simple in‑memory cache ────────────────────────────── */
const cache = new Map();

async function translateText(text = "", lang = "en") {
  lang = normalizeLangCode(lang); // ✅ apply normalization

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
    return text; // graceful fallback
  }
}

/* ───────────────────────── 4. GET /admin/faq?lang=xx ────────────────────────────── */
const getFAQs = async (req, res) => {
  let lang = req.query.lang || "en";
  lang = normalizeLangCode(lang); // ✅ normalize here

  try {
    const faqs = await FAQ.find(); // fetch all

    if (lang === "en") return res.json(faqs);

    const translatedFaqs = await Promise.all(
      faqs.map(async (f) => ({
        _id: f._id,
        question: await translateText(f.question, lang),
        answer: await translateText(f.answer, lang),
      }))
    );

    res.json(translatedFaqs);
  } catch (err) {
    console.error("Failed to fetch/translate FAQs:", err);
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
};

/* ───────────────────────────── 5. CRUD (unchanged) ─────────────────────────────── */

const addFAQ = async (req, res) => {
  const { question, answer } = req.body;
  try {
    await new FAQ({ question, answer }).save();
    res.status(201).json({ message: "FAQ added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add FAQ" });
  }
};

const updateFAQ = async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;
  try {
    await FAQ.findByIdAndUpdate(id, { question, answer });
    res.json({ message: "FAQ updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update FAQ" });
  }
};

const deleteFAQ = async (req, res) => {
  const { id } = req.params;
  try {
    await FAQ.findByIdAndDelete(id);
    res.json({ message: "FAQ deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
};

module.exports = { getFAQs, addFAQ, updateFAQ, deleteFAQ };
