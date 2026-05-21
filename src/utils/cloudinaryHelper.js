const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} Cloudinary upload response object
 */
const uploadToCloudinary = (buffer, folder = "splitmate") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve(result);
      },
    );

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
};

/**
 * Deletes an asset from Cloudinary using its public ID.
 * @param {string} publicId - Public ID of the asset to delete
 * @returns {Promise<object>} Cloudinary deletion result
 */
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Cloudinary delete error:", error);
        return reject(error);
      }
      resolve(result);
    });
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
