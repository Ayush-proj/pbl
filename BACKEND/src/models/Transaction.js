const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor"
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },

    type: {
      type: String,
      enum: ["credit", "debit", "refund"],
      required: true
    },

    amount: Number,

    description: String,

    paymentMethod: {
      type: String,
      default: "razorpay"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "not-required"],
      default: "pending"
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);