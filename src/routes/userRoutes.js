const express = require("express");
const {
  userList,
  searchByEmail,
  getUserProfile,
  updateProfile,
  savePushToken,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", userList);
router.get("/search", protect, searchByEmail);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateProfile);
router.post("/push-token", protect, savePushToken);

module.exports = router;
