const express = require("express");
const {
  userList,
  searchByEmail,
  getUserProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", userList);
router.get("/search", searchByEmail);
router.get("/profile", protect, getUserProfile);

module.exports = router;
