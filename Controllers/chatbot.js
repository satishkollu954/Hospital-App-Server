const chatQuestion = require("../Models/chatbot");

// GET all chat questions
exports.getAllChatQuestions = async (req, res) => {
  try {
    const questions = await chatQuestion.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch chat questions" });
  }
};

// GET answer by matching question
exports.getAnswerByQuestion = async (req, res) => {
  try {
    const { question } = req.query;

    const result = await chatQuestion.findOne({
      question: { $regex: new RegExp(question, "i") },
    });

    if (result) {
      return res.json({ answer: result.answer });
    }

    res.status(404).json({ message: "No answer found." });
  } catch (err) {
    console.error("Error in getAnswerByQuestion:", err);
    res.status(500).json({ message: "Error processing question." });
  }
};

// POST - Add a new chat question
exports.addChatQuestion = async (req, res) => {
  try {
    console.log("Adding chat question:", req.body);
    const { question, answer } = req.body;

    const existing = await chatQuestion.findOne({ question });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Chat question with this question already exists" });
    }

    const newChatQuestion = new chatQuestion({ question, answer });
    await newChatQuestion.save();
    res.status(201).json({
      message: "Chat question added successfully",
      chatQuestion: newChatQuestion,
    });
  } catch (err) {
    res.status(500).json({ message: "Error adding chat question" });
  }
};

// PUT - Update chat question by ID
exports.updateChatQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    const updated = await chatQuestion.findByIdAndUpdate(
      id,
      { question, answer },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Chat question not found" });

    res.json({
      message: "Chat question updated successfully",
      chatQuestion: updated,
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating chat question" });
  }
};

// DELETE - Remove chat question by ID
exports.deleteChatQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await chatQuestion.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Chat question not found" });

    res.json({ message: "Chat question deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting chat question" });
  }
};
