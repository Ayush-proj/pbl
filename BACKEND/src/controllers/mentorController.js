const Mentor = require("../models/Mentor");
const User = require("../models/User");

// CREATE MENTOR PROFILE
exports.createMentorProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, experience, ...mentorData } = req.body;

    // Update User model if name is provided
    if (name) {
      await User.findByIdAndUpdate(userId, { name });
    }

    // Convert experience to number if it's a string like "12+ years"
    let experienceNum = experience;
    if (typeof experience === 'string') {
      experienceNum = parseInt(experience.replace(/\D/g, '')) || 0;
    }

    // Check if profile already exists
    const existingProfile = await Mentor.findOne({ userId });

    if (existingProfile) {
      // UPDATE existing profile
      Object.assign(existingProfile, { ...mentorData, experience: experienceNum });
      if (!existingProfile.location?.coordinates) {
        existingProfile.location = { type: "Point", coordinates: [0, 0] };
      }
      await existingProfile.save();

      return res.status(200).json({
        success: true,
        message: "Mentor profile updated successfully",
        mentor: existingProfile
      });
    }

    // CREATE new profile
    const mentor = await Mentor.create({
      userId,
      ...mentorData,
      experience: experienceNum,
      location: { type: "Point", coordinates: [0, 0] },
      profileImage: mentorData.profileImage || ''
    });

    res.status(201).json({
      success: true,
      message: "Mentor profile created successfully",
      mentor
    });
  } catch (error) {
    next(error);
  }
};

exports.getMentorProfile = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id })
      .populate("userId", "name email");

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor profile not found"
      });
    }

    res.status(200).json({
      success: true,
      mentor
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadMentorProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/profile/${req.file.filename}`;
    
    const mentor = await Mentor.findOneAndUpdate(
      { userId: req.user._id },
      { profileImage: fileUrl },
      { new: true }
    );

    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile image uploaded",
      profileImage: fileUrl,
      mentor
    });
  } catch (error) {
    next(error);
  }
};
exports.searchMentors = async (req, res, next) => {
  try {
    const { lat, lng, skill, radius = 50000 } = req.query;

    let query = { verified: true };

    if (skill) {
      query.skills = { $regex: skill, $options: 'i' };
    }

    let mentors;
    try {
      const geoQuery = { ...query };
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        geoQuery.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)]
            },
            $maxDistance: Number(radius) * 1000
          }
        };
      }
      mentors = await Mentor.find(geoQuery)
        .populate("userId", "name email")
        .select("-__v");
    } catch (geoErr) {
      // Fallback: if geo query fails (missing index, etc.), search without location filter
      mentors = await Mentor.find(query)
        .populate("userId", "name email")
        .select("-__v");
    }

    res.status(200).json({
      success: true,
      count: mentors.length,
      mentors
    });
  } catch (error) {
    next(error);
  }
};


/* =========================
   GET MENTOR WALLET
========================= */
exports.getWallet = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor profile not found"
      });
    }

    const Booking = require("../models/booking");
    const completedSessions = await Booking.countDocuments({
      mentorId: mentor._id,
      status: "completed"
    });

    res.json({
      success: true,
      wallet: {
        walletBalance: mentor.walletBalance,
        totalEarnings: mentor.totalEarnings,
        totalWithdrawn: mentor.totalWithdrawn,
        payoutRequests: mentor.payoutRequests
      },
      stats: {
        completedSessions,
        averageRating: mentor.averageRating,
        totalReviews: mentor.totalReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   GET MENTOR EARNINGS
========================= */
exports.getEarnings = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id });
    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor profile not found" });
    }

    const Booking = require("../models/booking");

    // Get all completed paid bookings for this mentor
    const paidBookings = await Booking.find({
      mentorId: mentor._id,
      status: "completed",
      sessionType: "paid"
    })
      .populate({
        path: "candidateId",
        populate: { path: "userId", select: "name email" }
      })
      .sort({ createdAt: -1 });

    // Per-session earnings
    const sessionEarnings = paidBookings.map(b => ({
      bookingId: b._id,
      candidateName: b.candidateId?.userId?.name || "Unknown",
      date: b.date,
      time: b.time,
      duration: b.duration,
      amount: b.amount,
      commission: b.commissionAmount,
      earned: b.mentorEarning,
      walletCredited: b.walletCredited
    }));

    // Monthly summary
    const monthlySummary = {};
    paidBookings.forEach(b => {
      const monthKey = new Date(b.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlySummary[monthKey]) {
        monthlySummary[monthKey] = { month: monthKey, sessions: 0, totalAmount: 0, totalEarned: 0 };
      }
      monthlySummary[monthKey].sessions++;
      monthlySummary[monthKey].totalAmount += b.amount;
      monthlySummary[monthKey].totalEarned += b.mentorEarning;
    });

    res.json({
      success: true,
      totalEarnings: mentor.totalEarnings,
      walletBalance: mentor.walletBalance,
      sessionEarnings,
      monthlySummary: Object.values(monthlySummary).sort((a, b) => b.month.localeCompare(a.month))
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   GET MENTOR TRANSACTIONS
========================= */
exports.getTransactions = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id });
    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor profile not found" });
    }

    const Transaction = require("../models/Transaction");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ mentorId: mentor._id })
        .populate({ path: "bookingId", select: "date time duration amount sessionType" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments({ mentorId: mentor._id })
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   GET POPULAR SKILLS
======================== */
exports.getPopularSkills = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const skillsAggregation = await Mentor.aggregate([
      { $match: { skills: { $exists: true, $ne: [] } } },
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, skill: "$_id", count: 1 } }
    ]);

    const skills = skillsAggregation.map(s => s.skill);

    res.json({
      success: true,
      skills
    });
  } catch (error) {
    next(error);
  }
};
