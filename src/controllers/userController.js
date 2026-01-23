const User = require("../models/User");

exports.userList = async (req, res) => {
  console.log("hello");

  try {
    const users = await User.find();
    return res.status(200).json({ message: "User get succesfully", users });
  } catch (error) {}
};

exports.searchByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    console.log(email);

    if (!email) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    const user = await User.findOne({
      $or: [
        { username: { $regex: email, $options: "i" } },
        { email: { $regex: email, $options: "i" } },
      ],
    });
    console.log(user, "user");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User found successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
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
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Username or email is required" });
    }

    const user = await User.findOne({
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
