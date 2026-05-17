const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paidTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Please provide an amount"],
      min: [0, "Amount must be positive"],
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

paymentSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
