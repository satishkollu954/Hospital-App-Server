const express = require("express");
const router = express.Router();
const chatController = require("../Controllers/chatbot");

// Public
router.get("/chatbot", chatController.getAllChatQuestions);
router.get("/chatbot/answer", chatController.getAnswerByQuestion);

// Admin CRUD
router.post("/chatbot", chatController.addChatQuestion);
router.put("/chatbot/:id", chatController.updateChatQuestion);
router.delete("/chatbot/:id", chatController.deleteChatQuestion);

module.exports = router;
