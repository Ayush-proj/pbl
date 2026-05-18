const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const {
  login,
  getDashboardStats,
  getUsers,
  getRecentActivity,
  getBookings,
  toggleUserStatus,
  verifyMentor,
  getPendingMentors,
  getPayments,
  getReports,
  resolveReport,
  getNotifications,
  createNotification,
  deleteNotification,
  createUser,
  deleteUser,
  getAllPayouts,
  approvePayout,
  rejectPayout,
} = require('../controllers/adminController');

// Public
router.post('/login', login);

// Protected — admin only
router.use(protect, adminOnly);
router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/activity', getRecentActivity);
router.get('/bookings', getBookings);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/mentors/:id/verify', verifyMentor);
router.get('/mentors/pending', getPendingMentors);
router.get('/payments', getPayments);
router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.delete('/notifications/:id', deleteNotification);
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);

// Payout Management
router.get('/payouts', getAllPayouts);
router.post('/payouts/:mentorId/approve', approvePayout);
router.post('/payouts/:mentorId/reject', rejectPayout);

module.exports = router;
