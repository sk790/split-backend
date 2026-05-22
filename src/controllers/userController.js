const User = require("../models/User");
const GroupInvitation = require("../models/GroupInvitation");

exports.userList = async (req, res) => {
  console.log("hello");

  try {
    const users = await User.find();
    return res.status(200).json({ message: "User get succesfully", users });
  } catch (error) { }
};

exports.searchByEmail = async (req, res) => {
  try {
    let { email } = req.query;
    // console.log(email);

    if (!email) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    // Strip leading @ if present
    if (email.startsWith("@")) {
      email = email.substring(1);
    }

    const user = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: email, $options: "i" } },
        { email: { $regex: email, $options: "i" } },
      ],
    });
    // console.log(user, "user");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for pending invitation if groupId is provided
    let invitationStatus = null;
    const { groupId } = req.query;
    if (groupId) {
      const pendingInvite = await GroupInvitation.findOne({
        group: groupId,
        invitee: user._id,
        status: "pending",
      });
      if (pendingInvite) {
        invitationStatus = "pending";
      }
    }

    return res.status(200).json({
      message: "User found successfully",
      invitationStatus,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error searching user", error: error.message });
  }
};

exports.findByUsernameOrEmail = async (req, res) => {
  try {
    let { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Username or email is required" });
    }

    // Strip leading @ if present
    if (query.startsWith("@")) {
      query = query.substring(1);
    }

    const user = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [{ username: query.toLowerCase() }, { email: query.toLowerCase() }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User found successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error searching user", error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { name, username, avatar } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    if (username && username !== user.username) {
      // Clean username
      const cleanUsername = username
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_]/g, "");

      if (!cleanUsername) {
        return res.status(400).json({ message: "Invalid username" });
      }

      // Check uniqueness
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = cleanUsername;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
};

exports.savePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const user = await User.findById(req.user._id);
    user.expoPushToken = token;
    await user.save();

    return res.status(200).json({ message: "Push token saved successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error saving push token", error: error.message });
  }
};
