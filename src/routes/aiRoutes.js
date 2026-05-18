const express = require("express");
const router = express.Router();
const { aiChat } = require("../controllers/aiController.js");
const { protect } = require("../middleware/authMiddleware.js");

router.use(protect); // All AI routes require authentication

router.post("/chat", aiChat);

module.exports = router;
