const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Booking = require('../models/booking');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const Candidate = require('../models/candidate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Seed default admin if none exists ───────────────────────────────────────
exports.ensureAdminExists = async () => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@guruconnect.com',
        password: hashed,
        role: 'admin',
      });
      console.log('✅ Default admin created: admin@guruconnect.com / admin123');
    }
  } catch (err) {
    console.error('❌ Failed to ensure admin exists:', err.message);
  }
};

// ─── POST /api/admin/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate)   dateFilter.$lte = new Date(endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const userDateQuery = hasDateFilter ? { createdAt: dateFilter } : {};
    const bookingDateQuery = hasDateFilter ? { createdAt: dateFilter } : {};

    const [
      totalMentors,
      totalCandidates,
      pendingMentors,
      totalSessions,
      completedSessions,
      cancelledSessions,
      activeSessions,
      revenueResult,
      monthlyBookings,
      userGrowth,
      topMentors,
      globalRatingData,
    ] = await Promise.all([
      User.countDocuments({ role: 'mentor', ...userDateQuery }),
      User.countDocuments({ role: 'candidate', ...userDateQuery }),
      Mentor.countDocuments({ verified: false }),
      Booking.countDocuments(bookingDateQuery),
      Booking.countDocuments({ status: 'completed', ...bookingDateQuery }),
      Booking.countDocuments({ status: 'cancelled', ...bookingDateQuery }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'in-progress'] }, ...bookingDateQuery }),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', ...bookingDateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' }, platformEarnings: { $sum: '$commissionAmount' }, totalPaidSessions: { $sum: 1 } } },
      ]),
      // Monthly sessions for chart (last 7 months)
      Booking.aggregate([
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            sessions: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] } },
            platformEarnings: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$commissionAmount', 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 7 },
      ]),
      // User growth per month (last 7 months)
      User.aggregate([
        { $match: { role: { $in: ['mentor', 'candidate'] } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, role: '$role' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      // Top 5 Mentors by earnings
      Mentor.aggregate([
        { $sort: { totalEarnings: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 1, name: '$user.name', profileImage: '$user.profileImage', title: 1, totalEarnings: 1, averageRating: 1 } }
      ]),
      // Global average mentor rating
      Mentor.aggregate([
        { $match: { totalReviews: { $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: '$averageRating' } } }
      ])
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const platformEarnings = revenueResult[0]?.platformEarnings || 0;
    const totalPaidSessions = revenueResult[0]?.totalPaidSessions || 0;

    const averageTicketSize = totalPaidSessions > 0 ? (revenue / totalPaidSessions).toFixed(0) : 0;
    
    // Success rate = (Completed / (Completed + Cancelled)) * 100
    const finishedSessions = completedSessions + cancelledSessions;
    const successRate = finishedSessions > 0 ? ((completedSessions / finishedSessions) * 100).toFixed(1) : 0;

    const averageRating = globalRatingData[0]?.avgRating ? globalRatingData[0].avgRating.toFixed(1) : 0;

    // Format month names
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyData = monthlyBookings.map((d) => ({
      name: MONTHS[d._id.month - 1],
      sessions: d.sessions,
      revenue: d.revenue,
      platformEarnings: d.platformEarnings,
    }));

    // User distribution
    const userDistribution = [
      { name: 'Candidates', value: totalCandidates, color: '#00CFE8' },
      { name: 'Mentors', value: totalMentors, color: '#8B5CF6' },
    ];

    // Session status distribution
    const sessionStatus = [
      { name: 'Completed', value: completedSessions, color: '#10B981' },
      { name: 'Cancelled', value: cancelledSessions, color: '#EF4444' },
      { name: 'Active', value: activeSessions, color: '#00CFE8' },
      { name: 'Pending', value: totalSessions - completedSessions - cancelledSessions - activeSessions, color: '#F59E0B' },
    ];

    res.json({
      success: true,
      data: {
        stats: {
          totalMentors,
          totalCandidates,
          pendingMentors,
          totalSessions,
          completedSessions,
          cancelledSessions,
          activeSessions,
          revenue,
          platformEarnings,
          averageTicketSize,
          successRate,
          averageRating,
        },
        topMentors,
        monthlyData,
        userDistribution,
        sessionStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { type, search, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type === 'Mentors') query.role = 'mentor';
    else if (type === 'Candidates') query.role = 'candidate';
    else query.role = { $in: ['mentor', 'candidate'] };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'Active') query.isActive = true;
    else if (status === 'Inactive') query.isActive = false;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: { users, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/activity ──────────────────────────────────────────────────
exports.getRecentActivity = async (req, res) => {
  try {
    const [recentUsers, recentBookings] = await Promise.all([
      User.find({ role: { $in: ['mentor', 'candidate'] } })
        .select('name role createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Booking.find()
        .populate({ path: 'candidateId', select: 'userId', populate: { path: 'userId', select: 'name' } })
        .populate({ path: 'mentorId', select: 'userId', populate: { path: 'userId', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const activity = [
      ...recentUsers.map((u) => ({
        id: u._id,
        user: u.name,
        action: 'registered as a',
        target: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        time: u.createdAt,
        type: 'registration',
      })),
      ...recentBookings.map((b) => ({
        id: b._id,
        user: b.candidateId?.userId?.name || 'A candidate',
        action: b.status === 'cancelled' ? 'cancelled session with' : 'booked a session with',
        target: b.mentorId?.userId?.name || 'a mentor',
        time: b.createdAt,
        type: b.status === 'cancelled' ? 'cancellation' : 'booking',
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    res.json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/bookings ──────────────────────────────────────────────────
exports.getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status.toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate({ path: 'candidateId', select: 'userId', populate: { path: 'userId', select: 'name email' } })
        .populate({ path: 'mentorId', select: 'userId', populate: { path: 'userId', select: 'name email' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ]);

    res.json({ success: true, data: { bookings, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/users/:id/toggle-status ───────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/mentors/:id/verify ─────────────────────────────────────────
exports.verifyMentor = async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id);
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor profile not found' });
    mentor.verified = !mentor.verified;
    await mentor.save();
    res.json({ success: true, message: `Mentor verification status updated to ${mentor.verified ? 'Verified' : 'Unverified'}`, verified: mentor.verified });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/mentors/pending ────────────────────────────────────────────
exports.getPendingMentors = async (req, res) => {
  try {
    const mentors = await Mentor.find({ verified: false }).populate('userId', 'name email');
    res.json({ success: true, data: mentors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/payments ──────────────────────────────────────────────────
exports.getPayments = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({ path: 'mentorId', select: 'userId', populate: { path: 'userId', select: 'name email' } })
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/reports ───────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporterId', 'name email')
      .populate('reportedId', 'name email')
      .populate('bookingId');

    const priorityWeight = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    reports.sort((a, b) => {
      // 1. Pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      // 2. Priority weight second
      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      if (weightA !== weightB) return weightB - weightA;

      // 3. Newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/reports/:id/resolve ───────────────────────────────────────
exports.resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    report.status = report.status === 'resolved' ? 'pending' : 'resolved';
    await report.save();
    res.json({ success: true, message: `Report status updated to ${report.status}`, status: report.status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/notifications ─────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/notifications ────────────────────────────────────────────
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, userId } = req.body;
    if (!title || !message)
      return res.status(400).json({ success: false, message: 'Title and message are required' });

    const notification = await Notification.create({ title, message, type, userId });
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/notifications/:id ──────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/users ────────────────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password, role) are required' });
    }

    if (!['mentor', 'candidate'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be mentor or candidate' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    if (role === 'mentor') {
      await Mentor.create({
        userId: user._id,
        verified: true,
        skills: ['General Development'],
        experience: 1,
        location: { type: 'Point', coordinates: [0, 0] }
      });
    } else if (role === 'candidate') {
      await Candidate.create({
        userId: user._id,
        location: { type: 'Point', coordinates: [0, 0] }
      });
    }

    res.json({ success: true, message: `${role === 'mentor' ? 'Mentor' : 'Candidate'} created successfully`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'mentor') {
      await Mentor.findOneAndDelete({ userId: user._id });
    } else if (user.role === 'candidate') {
      await Candidate.findOneAndDelete({ userId: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User permanently deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/payouts - Get all pending payout requests ───────────────────────
exports.getAllPayouts = async (req, res) => {
  try {
    const mentors = await Mentor.find({
      'payoutRequests.status': 'pending'
    }).select('name email userId payoutRequests walletBalance');

    const payouts = [];
    for (const mentor of mentors) {
      const user = await User.findById(mentor.userId);
      for (const req of mentor.payoutRequests) {
        if (req.status === 'pending') {
          payouts.push({
            id: req._id,
            mentorId: mentor._id,
            mentorName: user?.name || 'Unknown',
            mentorEmail: user?.email || 'Unknown',
            amount: req.amount,
            requestedAt: req.requestedAt,
            currentBalance: mentor.walletBalance
          });
        }
      }
    }

    res.json({ success: true, payouts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/payouts/:mentorId/approve - Approve payout request ───────────────
exports.approvePayout = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { payoutIndex } = req.body;

    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    if (!mentor.payoutRequests || mentor.payoutRequests.length === 0) {
      return res.status(400).json({ success: false, message: 'No payout requests found' });
    }

    const pendingRequest = mentor.payoutRequests.find(r => r.status === 'pending');
    if (!pendingRequest) {
      return res.status(400).json({ success: false, message: 'No pending payout request' });
    }

    // Update request status to approved
    pendingRequest.status = 'approved';

    // Update total withdrawn
    mentor.totalWithdrawn = (mentor.totalWithdrawn || 0) + pendingRequest.amount;
    await mentor.save();

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { mentorId: mentor._id, type: 'debit', amount: pendingRequest.amount, status: 'pending' },
      { status: 'completed', description: `Payout approved - ₹${pendingRequest.amount}` }
    );

    res.json({ success: true, message: 'Payout approved successfully', amount: pendingRequest.amount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/payouts/:mentorId/reject - Reject payout request ──────────────────
exports.rejectPayout = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { reason } = req.body;

    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    const pendingRequest = mentor.payoutRequests.find(r => r.status === 'pending');
    if (!pendingRequest) {
      return res.status(400).json({ success: false, message: 'No pending payout request' });
    }

    // Refund the amount back to wallet
    mentor.walletBalance += pendingRequest.amount;
    pendingRequest.status = 'rejected';
    await mentor.save();

    // Update transaction
    await Transaction.findOneAndUpdate(
      { mentorId: mentor._id, type: 'debit', amount: pendingRequest.amount, status: 'pending' },
      { status: 'failed', description: `Payout rejected${reason ? `: ${reason}` : ''}` }
    );

    res.json({ success: true, message: 'Payout rejected and amount refunded to wallet' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


