import axios from 'axios';

const ADMIN_TOKEN_KEY = 'guruconnect-admin-token';
const ADMIN_USER_KEY = 'guruconnect-admin-user';

const adminAPI = axios.create({ baseURL: '/api/admin' });

adminAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminAPI.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const adminLogin = (email, password) =>
  adminAPI.post('/login', { email, password });

// ── Dashboard stats ─────────────────────────────────────────────────────────
export const fetchAdminStats = (params = {}) =>
  adminAPI.get('/stats', { params });

// ── Users (mentors + candidates) ────────────────────────────────────────────
export const fetchAdminUsers = (params = {}) =>
  adminAPI.get('/users', { params });

// ── Recent activity feed ─────────────────────────────────────────────────────
export const fetchAdminActivity = () =>
  adminAPI.get('/activity');

// ── Bookings ─────────────────────────────────────────────────────────────────
export const fetchAdminBookings = (params = {}) =>
  adminAPI.get('/bookings', { params });

export const toggleUserStatus = (id) =>
  adminAPI.put(`/users/${id}/toggle-status`);

export const verifyMentor = (id) =>
  adminAPI.put(`/mentors/${id}/verify`);

export const fetchPendingMentors = () =>
  adminAPI.get('/mentors/pending');

export const fetchAdminPayments = () =>
  adminAPI.get('/payments');

export const fetchAdminReports = () =>
  adminAPI.get('/reports');

export const resolveReportStatus = (id) =>
  adminAPI.put(`/reports/${id}/resolve`);

export const fetchAdminNotifications = () =>
  adminAPI.get('/notifications');

export const createAdminNotification = (data) =>
  adminAPI.post('/notifications', data);

export const deleteAdminNotification = (id) =>
  adminAPI.delete(`/notifications/${id}`);

export const createAdminUser = (data) =>
  adminAPI.post('/users', data);

export const deleteAdminUser = (id) =>
  adminAPI.delete(`/users/${id}`);

// ── Token helpers ─────────────────────────────────────────────────────────────
export const saveAdminSession = (token, user) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const getAdminUser = () => {
  try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY)); } catch { return null; }
};

export const isAdminLoggedIn = () => !!localStorage.getItem(ADMIN_TOKEN_KEY);

// Payout Management
export const getAdminPayouts = () => adminAPI.get('/payouts');
export const approvePayoutAPI = (mentorId) => adminAPI.post(`/payouts/${mentorId}/approve`);
export const rejectPayoutAPI = (mentorId, reason) => adminAPI.post(`/payouts/${mentorId}/reject`, { reason });

export default adminAPI;
