const Review = require("../models/review");
const Booking = require("../models/booking");
const Mentor = require("../models/Mentor");

/* =========================
   GET REVIEWS FOR MENTOR
======================== */
exports.getMentorReviews = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ mentorId })
        .populate('candidateId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ mentorId })
    ]);

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      author: r.candidateId?.name || 'Anonymous',
      rating: r.rating,
      text: r.comment,
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: 'paid'
    }));

    res.json({
      success: true,
      reviews: formattedReviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    // ✅ Look up the Candidate document first
    const Candidate = require("../models/candidate");
    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: "Candidate profile not found"
      });
    }
    // 1️⃣ Booking must exist
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    // 2️⃣ Only booking candidate can review (compare Candidate IDs)
    if (booking.candidateId.toString() !== candidate._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // 3️⃣ Only completed sessions
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can review only completed sessions"
      });
    }

    // 4️⃣ Prevent duplicate review
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Review already submitted"
      });
    }

    // 5️⃣ Create review
    const review = await Review.create({
      bookingId,
      mentorId: booking.mentorId,
      candidateId: candidate._id,
      rating,
      comment
    });

    // 6️⃣ Update mentor rating
    const mentor = await Mentor.findById(booking.mentorId);
    
    if (mentor) {
        const currentRating = mentor.averageRating || 0;
        const currentCount = mentor.totalReviews || 0;
        const totalReviews = currentCount + 1;
        const newAverage = totalReviews === 1 
            ? rating 
            : (currentRating * currentCount + rating) / totalReviews;

        mentor.totalReviews = totalReviews;
        mentor.averageRating = Number(newAverage.toFixed(2));

        await mentor.save();
    }

    res.status(201).json({
      success: true,
      review
    });

  } catch (error) {
    next(error);
  }
};
