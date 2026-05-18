const razorpay = require("../config/razorpay");
const Booking = require("../models/booking");
const crypto = require("crypto");
const { emitToUser } = require("../socket");
const Transaction = require("../models/Transaction");

// Platform wallet ID (stored in config or use a fixed identifier)
const PLATFORM_WALLET_ID = "platform_admin";

/* =========================
   CREATE ORDER
========================= */
exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.sessionType !== "paid")
      return res.status(400).json({ success: false, message: "Not a paid session" });

    if (booking.status !== "awaiting-payment")
      return res.status(400).json({ success: false, message: "Mentor must accept first" });

    if (!razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay not configured" });
    }

    const orderAmount = Math.round(booking.amount * 100);
    console.log('Creating order for amount:', orderAmount, 'paise = ₹' + booking.amount);

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: "INR",
      receipt: booking._id.toString(),
      notes: { booking_id: bookingId }
    });

    booking.razorpayOrderId = order.id;
    booking.paymentStatus = "pending";

    await booking.save();

    res.json({ success: true, order });

  } catch (err) {
    const errorMsg = err.error ? err.error.description : err.message || JSON.stringify(err);
    console.error('Create order error:', errorMsg);
    res.status(500).json({ success: false, message: errorMsg });
  }
};

/* =========================
   VERIFY PAYMENT
========================= */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature)
      return res.status(400).json({ success: false });

    const booking = await Booking.findOne({
      razorpayOrderId: razorpay_order_id
    });

    if (!booking) return res.status(404).json({ success: false });

    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.razorpayPaymentId = razorpay_payment_id;

    await booking.save();

    // Credit 10% commission to platform wallet (recorded in transactions)
    if (booking.commissionAmount > 0) {
      await Transaction.create({
        bookingId: booking._id,
        type: "credit",
        amount: booking.commissionAmount,
        description: `Platform commission - Booking ${booking._id}`,
        paymentMethod: "razorpay",
        paymentStatus: "completed",
        createdAt: new Date()
      });
    }

    // Notify mentor that payment is confirmed
    emitToUser(booking.mentorId?.toString(), 'payment_confirmed', {
      bookingId: booking._id,
      amount: booking.amount
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};