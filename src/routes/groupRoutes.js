const express = require("express");
const router = express.Router();
const {
  createGroup,
  getUserGroups,
  getGroup,
  joinGroupByInvite,
  regenerateInviteCode,
  getGroupByInvite,
  addUserToGroup,
  removeMember,
} = require("../controllers/groupController");
const { protect } = require("../middleware/authMiddleware.js"); // Your auth middleware

// Protected routes (requires authentication)
router.post("/", protect, createGroup);
router.get("/", protect, getUserGroups);
router.get("/:id", protect, getGroup);
router.post("/join/:inviteCode", protect, joinGroupByInvite);
router.post("/:id/regenerate-invite", protect, regenerateInviteCode);
router.get("/invite/:inviteCode/preview", protect, getGroupByInvite);
router.post("/:groupId/members", protect, addUserToGroup);
router.delete("/:groupId/members", protect, removeMember);

module.exports = router;
