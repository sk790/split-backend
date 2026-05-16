const express = require("express");
const router = express.Router();
const { getWalletStats } = require("../controllers/walletController");
const { protect } = require("../middleware/authMiddleware");

router.get("/stats", protect, getWalletStats);

module.exports = router;
