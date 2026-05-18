const Category = require("../models/Category.js");

const defaultCategories = [
  { name: "Food & Dining", icon: "fast-food-outline", color: "#FF6584" },
  { name: "Travel & Transit", icon: "car-outline", color: "#FB8C00" },
  { name: "Rent & Bills", icon: "home-outline", color: "#6C63FF" },
  { name: "Entertainment", icon: "film-outline", color: "#8E24AA" },
  { name: "Shopping", icon: "cart-outline", color: "#00ACC1" },
  { name: "Others", icon: "receipt-outline", color: "#00897B" }
];

// @desc    Get all categories (system default + user custom ones)
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    // Check if system default categories exist in DB, if not seed them
    const systemCategoriesCount = await Category.countDocuments({ createdBy: null });
    if (systemCategoriesCount === 0) {
      await Category.insertMany(defaultCategories.map(cat => ({ ...cat, createdBy: null })));
    }

    // Fetch default categories + user's custom categories
    const categories = await Category.find({
      $or: [
        { createdBy: null },
        { createdBy: userId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, icon, color } = req.body;
    const userId = req.user.id || req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category name"
      });
    }

    // Check for duplicate custom category for this user
    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      createdBy: userId
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists"
      });
    }

    const category = await Category.create({
      name: name.trim(),
      icon: icon || "receipt-outline",
      color: color || "#6C63FF",
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};
