const User = require("../models/User");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate unique username from name
const generateUniqueUsername = async (name) => {
  // Create base username from name (lowercase, remove spaces, keep only alphanumeric)
  let baseUsername = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");

  // If empty after sanitization, use a default base
  if (!baseUsername) {
    baseUsername = "user";
  }

  // Check if base username exists
  let username = baseUsername;
  let counter = 1;
  let exists = await User.findOne({ username });

  // Append number until we find a unique username
  while (exists) {
    username = `${baseUsername}${counter}`;
    exists = await User.findOne({ username });
    counter++;
  }

  return username;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(req.body, "body");

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Generate unique username from name
    const username = await generateUniqueUsername(name);

    const user = await User.create({
      name,
      email,
      password,
      username
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let loginIdentifier = email ? email.trim().toLowerCase() : "";

    // Strip leading @ if present
    if (loginIdentifier.startsWith("@")) {
      loginIdentifier = loginIdentifier.substring(1);
    }

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email/username and password",
      });
    }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    }).select("+password");

    console.log(`Login attempt for: ${loginIdentifier}, User found: ${user ? "Yes" : "No"}`);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Lazy migration: if user doesn't have a username, generate one
    if (!user.username) {
      user.username = await generateUniqueUsername(user.name);
      await user.save();
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
