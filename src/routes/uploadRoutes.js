const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadToCloudinary } = require("../utils/cloudinaryHelper");

const router = express.Router();

router.post("/", protect, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file under the 'image' field.",
      });
    }

    // Determine folder from query parameter or default to 'splitmate'
    const folder = req.query.folder || "splitmate";

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, folder);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
