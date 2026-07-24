const User = require("../models/User");
const Friendship = require("../models/Friendship");

// Search registered users and include friendship status with current user
exports.searchUsers = async (req, res) => {
  try {
    let { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(200).json({ success: true, users: [] });
    }

    query = query.trim();
    if (query.startsWith("@")) {
      query = query.substring(1);
    }

    const currentUserId = req.user._id;

    // Search users matching name, username, or email
    const users = await User.find({
      _id: { $ne: currentUserId },
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("name username email avatar")
      .limit(20);

    if (users.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    // Get all friendship records between current user and found users
    const userIds = users.map((u) => u._id);
    const friendships = await Friendship.find({
      $or: [
        { requester: currentUserId, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: currentUserId },
      ],
    });

    // Map friendship status for each user
    const usersWithStatus = users.map((u) => {
      const friendship = friendships.find(
        (f) =>
          (f.requester.toString() === currentUserId.toString() &&
            f.recipient.toString() === u._id.toString()) ||
          (f.recipient.toString() === currentUserId.toString() &&
            f.requester.toString() === u._id.toString())
      );

      let friendshipStatus = "none";
      let requestId = null;

      if (friendship) {
        requestId = friendship._id;
        if (friendship.status === "accepted") {
          friendshipStatus = "friends";
        } else if (friendship.status === "pending") {
          if (friendship.requester.toString() === currentUserId.toString()) {
            friendshipStatus = "pending_sent";
          } else {
            friendshipStatus = "pending_received";
          }
        }
      }

      return {
        _id: u._id,
        name: u.name,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        friendshipStatus,
        requestId,
      };
    });

    return res.status(200).json({ success: true, users: usersWithStatus });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    });
  }
};

// Send a friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user._id;

    if (!recipientId) {
      return res
        .status(400)
        .json({ success: false, message: "Recipient ID is required" });
    }

    if (recipientId.toString() === requesterId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a friend request to yourself",
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check existing friendship
    let friendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (friendship) {
      if (friendship.status === "accepted") {
        return res
          .status(400)
          .json({ success: false, message: "You are already friends" });
      }
      if (
        friendship.status === "pending" &&
        friendship.requester.toString() === requesterId.toString()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Friend request already sent" });
      }
      if (
        friendship.status === "pending" &&
        friendship.recipient.toString() === requesterId.toString()
      ) {
        // Automatically accept if the other person already requested
        friendship.status = "accepted";
        await friendship.save();
        return res.status(200).json({
          success: true,
          message: "Friend request accepted!",
          friendship,
        });
      }

      // If previously rejected, re-open as pending
      friendship.requester = requesterId;
      friendship.recipient = recipientId;
      friendship.status = "pending";
      await friendship.save();
      return res.status(200).json({
        success: true,
        message: "Friend request sent",
        friendship,
      });
    }

    // Create new request
    friendship = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
      friendship,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error sending friend request",
      error: error.message,
    });
  }
};

// Get pending incoming and outgoing friend requests
exports.getFriendRequests = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Incoming pending requests
    const incoming = await Friendship.find({
      recipient: currentUserId,
      status: "pending",
    })
      .populate("requester", "name username email avatar")
      .sort({ createdAt: -1 });

    // Outgoing pending requests
    const outgoing = await Friendship.find({
      requester: currentUserId,
      status: "pending",
    })
      .populate("recipient", "name username email avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      incoming,
      outgoing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching friend requests",
      error: error.message,
    });
  }
};

// Respond to friend request (accept / reject / cancel)
exports.respondFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accepted', 'rejected', or 'cancel'
    const currentUserId = req.user._id;

    const friendship = await Friendship.findById(id);
    if (!friendship) {
      return res
        .status(404)
        .json({ success: false, message: "Friend request not found" });
    }

    if (action === "accepted") {
      if (friendship.recipient.toString() !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to accept this request",
        });
      }
      friendship.status = "accepted";
      await friendship.save();
      return res.status(200).json({
        success: true,
        message: "Friend request accepted",
        friendship,
      });
    }

    if (action === "rejected" || action === "cancel") {
      await Friendship.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: action === "cancel" ? "Friend request cancelled" : "Friend request rejected",
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid action type" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error responding to friend request",
      error: error.message,
    });
  }
};

// Get current user's accepted friends list
exports.getFriends = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    })
      .populate("requester", "name username email avatar")
      .populate("recipient", "name username email avatar")
      .sort({ updatedAt: -1 });

    const friends = friendships.map((f) => {
      const isRequester = f.requester._id.toString() === currentUserId.toString();
      const friendUser = isRequester ? f.recipient : f.requester;
      return {
        friendshipId: f._id,
        _id: friendUser._id,
        name: friendUser.name,
        username: friendUser.username,
        email: friendUser.email,
        avatar: friendUser.avatar,
        since: f.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: friends.length,
      friends,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching friends",
      error: error.message,
    });
  }
};

// Remove a friend
exports.removeFriend = async (req, res) => {
  try {
    const { id } = req.params; // Target friend User ID
    const currentUserId = req.user._id;

    const friendship = await Friendship.findOneAndDelete({
      status: "accepted",
      $or: [
        { requester: currentUserId, recipient: id },
        { requester: id, recipient: currentUserId },
      ],
    });

    if (!friendship) {
      return res
        .status(404)
        .json({ success: false, message: "Friendship not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error removing friend",
      error: error.message,
    });
  }
};
