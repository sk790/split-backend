const mongoose = require("mongoose");

const groupInvitationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

groupInvitationSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Ensure a user doesn't get multiple pending invitations to the same group
groupInvitationSchema.index({ group: 1, invitee: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

module.exports = mongoose.model("GroupInvitation", groupInvitationSchema);
