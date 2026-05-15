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

// Generate unique referral code
const generateReferralCode = async () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let referralCode;
  let exists = true;

  while (exists) {
    referralCode = "";
    for (let i = 0; i < 8; i++) {
      referralCode += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    exists = await User.findOne({ referralCode });
  }

  return referralCode;
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

    // Generate unique referral code
    const myReferralCode = await generateReferralCode();

    // Check for referral
    let referredByUser = null;
    if (req.body.referralCode) {
      console.log(`Checking referral code: "${req.body.referralCode}"`);
      referredByUser = await User.findOne({
        referralCode: req.body.referralCode.toUpperCase().trim(),
      });
      console.log(
        `Referred by user: ${referredByUser ? referredByUser.name : "NOT FOUND"}`,
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      username,
      referralCode: myReferralCode,
      referredBy: referredByUser ? referredByUser._id : null,
    });

    // If referred, give 10 rs to referrer
    if (referredByUser) {
      console.log(
        `Crediting 10 rs to ${referredByUser.name} (ID: ${referredByUser._id})`,
      );
      referredByUser.walletBalance = (referredByUser.walletBalance || 0) + 10;
      await referredByUser.save();
      console.log(
        `New balance for ${referredByUser.name}: ${referredByUser.walletBalance}`,
      );
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
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
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }],
    }).select("+password");

    console.log(
      `Login attempt for: ${loginIdentifier}, User found: ${user ? "Yes" : "No"}`,
    );

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

    // Lazy migration: if user doesn't have a referral code, generate one
    if (!user.referralCode) {
      user.referralCode = await generateReferralCode();
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
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
