const express = require("express");
const {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  respondFriendRequest,
  getFriends,
  removeFriend,
} = require("../controllers/friendController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/search", searchUsers);
router.post("/request", sendFriendRequest);
router.get("/requests", getFriendRequests);
router.put("/request/:id", respondFriendRequest);
router.get("/", getFriends);
router.delete("/:id", removeFriend);

module.exports = router;
