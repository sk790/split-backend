const mongoose = require("mongoose");
const crypto = require("crypto");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      // required: true,
    },
    inviteCodeExpiry: {
      type: Date,
      default: null, // null means never expires
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});


// Generate unique invite code before saving
groupSchema.pre("save", async function (next) {
  if (!this.inviteCode) {
    let uniqueCode = "";
    let isUnique = false;
    while (!isUnique) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingGroup = await mongoose.models.Group.findOne({ inviteCode: code });
      if (!existingGroup) {
        uniqueCode = code;
        isUnique = true;
      }
    }
    this.inviteCode = uniqueCode;
  }
  next();
});

// Method to regenerate invite code
groupSchema.methods.regenerateInviteCode = async function () {
  let uniqueCode = "";
  let isUnique = false;
  while (!isUnique) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existingGroup = await mongoose.models.Group.findOne({ inviteCode: code });
    if (!existingGroup) {
      uniqueCode = code;
      isUnique = true;
    }
  }
  this.inviteCode = uniqueCode;
  return this.save();
};

// Method to check if invite code is valid
groupSchema.methods.isInviteCodeValid = function () {
  if (!this.inviteCodeExpiry) return true;
  return this.inviteCodeExpiry > new Date();
};

module.exports = mongoose.model("Group", groupSchema);
