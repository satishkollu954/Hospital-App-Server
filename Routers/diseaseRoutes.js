const express = require("express");
const router = express.Router();
const diseaseController = require("../Controllers/diseaseController");

router.post("/add", diseaseController.addDisease);
router.get("/", diseaseController.getDiseases);

module.exports = router;
