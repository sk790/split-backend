const express = require("express");
const router = express.Router();
const { getCategories, createCategory } = require("../controllers/categoryController.js");
const { protect } = require("../middleware/authMiddleware.js");

router.use(protect); // All routes require authentication

router.route("/")
  .get(getCategories)
  .post(createCategory);

module.exports = router;
