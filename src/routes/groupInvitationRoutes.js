const express = require("express");
const router = express.Router();
const {
  sendInvitation,
  getMyInvitations,
  respondToInvitation,
  cancelInvitation,
} = require("../controllers/groupInvitationController");
const { protect } = require("../middleware/authMiddleware");

router.post("/send", protect, sendInvitation);
router.get("/my-invitations", protect, getMyInvitations);
router.post("/respond", protect, respondToInvitation);
router.post("/cancel", protect, cancelInvitation);

module.exports = router;
