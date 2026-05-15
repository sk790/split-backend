const express = require("express");
const {
  userList,
  searchByEmail,
  getUserProfile,
  updateProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", userList);
router.get("/search", protect, searchByEmail);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;
