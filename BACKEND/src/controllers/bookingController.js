const Booking = require("../models/booking");
const Mentor = require("../models/Mentor");
const Transaction = require("../models/Transaction");
const razorpay = require("../config/razorpay");
const { emitToUser } = require("../socket");

/* =========================
   CREATE BOOKING
========================= */
exports.createBooking = async (req, res) => {
  try {
    const { mentorId, date, time, duration, sessionType = "demo" } = req.body;

    // ✅ Look up the Candidate document first
    const Candidate = require("../models/candidate");
    let candidate = await Candidate.findOne({ userId: req.user._id });

    // If candidate profile doesn't exist, auto-create a basic one
    if (!candidate) {
      candidate = await Candidate.create({
        userId: req.user._id,
        interests: [],
        bio: "",
        location: {
          type: "Point",
          coordinates: [72.8777, 19.0760] // defaults to Mumbai
        }
      });
    }

    const mentor = await Mentor.findById(mentorId);
    if (!mentor)
      return res.status(400).json({ success: false, message: "Mentor unavailable" });

    // REMOVED: Demo requirement for paid sessions - can book directly

    const existingBooking = await Booking.findOne({
      mentorId,
      date,
      time,
      status: { $in: ["pending", "confirmed", "awaiting-payment", "in-progress"] }
    });

    if (existingBooking)
      return res.status(400).json({
        success: false,
        message: "Slot already booked"
      });

    let amount = 0;
    let commissionAmount = 0;
    let mentorEarning = 0;

    if (sessionType === "paid") {
      const hourlyRate = Number(mentor.hourlyRate) || 0;
      const durationHours = (duration || 60) / 60;
      amount = Math.round(hourlyRate * durationHours * 100) / 100;
      commissionAmount = Math.round(amount * 0.10 * 100) / 100;
      mentorEarning = Math.round((amount - commissionAmount) * 100) / 100;
    }

    const booking = await Booking.create({
      mentorId,
      candidateId: candidate._id,
      date,
      time,
      duration,
      sessionType,
      amount,
      commissionAmount,
      mentorEarning,
      status: "pending",
      paymentStatus: sessionType === "paid" ? "unpaid" : "not-required",
      expiresAt:
        sessionType === "paid"
          ? new Date(Date.now() + 10 * 60 * 1000)
          : null
    });

    // Notify the mentor in real-time
    emitToUser(mentor.userId.toString(), 'new_booking', {
      bookingId: booking._id,
      candidateName: req.user.name,
      date,
      time,
      sessionType
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("Booking failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* =========================
   MENTOR ACCEPT / REJECT
========================= */
exports.updateBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { action } = req.body;

  const booking = await Booking.findById(bookingId).populate("mentorId").populate("candidateId");

  if (!booking)
    return res.status(404).json({ success: false });

  if (booking.mentorId.userId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false });

  if (action === "accept") {
    booking.status =
      booking.sessionType === "paid"
        ? "awaiting-payment"
        : "confirmed";
  }

  if (action === "reject") {
    booking.status = "cancelled";
  }

  await booking.save();

  // Notify the candidate in real-time
  emitToUser(booking.candidateId.userId.toString(), 'booking_status_update', {
    bookingId: booking._id,
    status: booking.status,
    action
  });

  res.json({ success: true, booking });
};

/* =========================
   JOIN SESSION (WebSocket)
========================= */
exports.joinSession = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking || !["confirmed", "in-progress"].includes(booking.status))
      return res.status(400).json({ success: false, message: "Booking not ready to join" });

    const now = new Date();
    booking.attendance = booking.attendance || {};

    if (req.user.role === "mentor")
      booking.attendance.mentorJoinedAt = now;
    else
      booking.attendance.candidateJoinedAt = now;

    // Generate WebSocket room ID (instead of Zoom/Jitsi link)
    if (!booking.meetingLink) {
      // Create a unique room ID for WebSocket
      booking.meetingLink = `room_${booking._id}`;
    }

    booking.status = "in-progress";
    await booking.save();

    res.json({
      success: true,
      meetingLink: booking.meetingLink,
      isWebSocket: true // Flag to indicate WebSocket-based video
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   COMPLETE SESSION (Mentor Only)
========================= */
exports.completeSession = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("mentorId");

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    // Only mentor can complete the session
    if (booking.mentorId.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Only mentor can complete the session" });

    // Mark as completed
    booking.status = "completed";
    await booking.save();

    // If paid session, credit mentor's wallet
    if (booking.sessionType === "paid" && booking.paymentStatus === "paid" && !booking.walletCredited) {
      const mentor = booking.mentorId;
      mentor.walletBalance += booking.mentorEarning;
      mentor.totalEarnings += booking.mentorEarning;
      await mentor.save();

      // Create transaction record
      const Transaction = require("../models/Transaction");
      await Transaction.create({
        mentorId: mentor._id,
        bookingId: booking._id,
        type: "credit",
        amount: booking.mentorEarning
      });

      booking.walletCredited = true;
      await booking.save();
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   AUTO CLOSE + EXPIRY
========================= */
exports.autoCloseSessions = async () => {
  const now = new Date();

  // Expire unpaid bookings
  const expired = await Booking.find({
    status: "awaiting-payment",
    paymentStatus: "unpaid",
    expiresAt: { $lte: now }
  });

  for (const booking of expired) {
    booking.status = "cancelled";
    await booking.save();
  }

  // Close completed sessions
  const sessions = await Booking.find({
    status: "in-progress"
  }).populate("mentorId");

  for (const booking of sessions) {
    const start = new Date(
      `${booking.date.toISOString().split("T")[0]}T${booking.time}`
    );
    const end = new Date(start.getTime() + booking.duration * 60000);

    if (now > end) {
      const mentorJoined = booking.attendance?.mentorJoinedAt;
      const candidateJoined = booking.attendance?.candidateJoinedAt;

      if (mentorJoined && candidateJoined) {
        booking.status = "completed";

        if (
          booking.sessionType === "paid" &&
          booking.paymentStatus === "paid" &&
          !booking.walletCredited
        ) {
          const mentor = booking.mentorId;

          mentor.walletBalance += booking.mentorEarning;
          mentor.totalEarnings += booking.mentorEarning;

          await mentor.save();

          await Transaction.create({
            mentorId: mentor._id,
            bookingId: booking._id,
            type: "credit",
            amount: booking.mentorEarning
          });

          booking.walletCredited = true;
        }
      } else {
        booking.status = "cancelled";
      }

      await booking.save();
    }
  }
};

/* =========================
   GET MY BOOKINGS
========================= */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    let bookings;

    if (role === "candidate") {
      const Candidate = require("../models/candidate");
      const candidate = await Candidate.findOne({ userId });
      if (!candidate) {
        return res.json({ success: true, bookings: [] });
      }

      bookings = await Booking.find({ candidateId: candidate._id })
        .populate({
          path: "mentorId",
          populate: { path: "userId", select: "name email profileImage" }
        })
        .sort({ createdAt: -1 });
    } else if (role === "mentor") {
      const mentor = await Mentor.findOne({ userId });
      if (!mentor) {
        return res.json({ success: true, bookings: [] });
      }

      bookings = await Booking.find({ mentorId: mentor._id })
        .populate({
          path: "candidateId",
          populate: { path: "userId", select: "name email profileImage" }
        })
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ success: false });
    }

    const bookingsWithReviews = await Promise.all(bookings.map(async (booking) => {
      const bookingObj = booking.toObject();
      
      try {
        const Review = require("../models/review");
        const review = await Review.findOne({ bookingId: bookingObj._id });
        if (review) {
          bookingObj.rating = review.rating;
          bookingObj.comment = review.comment;
        }
      } catch (e) {
        // Skip review lookup if error
      }
      
      return bookingObj;
    }));

    res.json({ success: true, bookings: bookingsWithReviews });
  } catch (err) {
    console.error('getMyBookings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


