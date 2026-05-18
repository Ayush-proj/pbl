import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('guruconnect-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    console.error('API Error:', status, message);

    if (status === 401) {
      localStorage.removeItem('guruconnect-token');
      localStorage.removeItem('guruconnect-user');
      localStorage.removeItem('guruconnect-mentor-profile');
      localStorage.removeItem('guruconnect-candidate-profile');
      try {
        const stored = JSON.parse(localStorage.getItem('guruconnect-auth'));
        if (stored?.state) {
          stored.state.token = null;
          stored.state.user = null;
          stored.state.mentorProfile = null;
          stored.state.candidateProfile = null;
          localStorage.setItem('guruconnect-auth', JSON.stringify(stored));
        }
      } catch {}
      if (window.location.pathname !== '/') {
        window.location.reload();
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const loginAPI = (data) => API.post('/auth/login', data);
export const registerAPI = (data) => API.post('/auth/register', data);
export const getNotificationsAPI = () => API.get('/auth/notifications');

// ============ MENTOR ============
export const createMentorProfile = (data) => API.post('/mentor/profile', data);
export const uploadMentorProfileImage = (formData) => API.post('/mentor/profile/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getMentorProfile = () => API.get('/mentor/profile');
export const searchMentors = (params) => API.get('/mentor/search', { params });
export const getMentorSlots = (mentorId, params) => API.get(`/mentor/${mentorId}/slots`, { params });
export const getMentorTest = () => API.get('/mentor/test');
export const submitMentorTest = (data) => API.post('/mentor/test/submit', data);
export const getMentorWallet = () => API.get('/mentor/wallet');
export const requestMentorPayout = (amount) => API.post('/mentor/wallet/withdraw', { amount });
export const getMentorEarnings = () => API.get('/mentor/earnings');
export const getMentorTransactions = (page = 1) => API.get(`/mentor/transactions?page=${page}`);
export const getPopularSkills = () => API.get('/mentor/skills/popular');

// ============ CANDIDATE ============
export const createCandidateProfile = (data) => API.post('/candidate/profile', data);
export const uploadCandidateProfileImage = (formData) => API.post('/candidate/profile/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getCandidateProfile = () => API.get('/candidate/profile');

// ============ BOOKING ============
export const createBooking = (data) => API.post('/booking', data);
export const getMyBookings = () => API.get('/booking/my');
export const updateBookingStatus = (bookingId, data) => API.patch(`/booking/${bookingId}/status`, data);
export const cancelBooking = (bookingId, data) => API.patch(`/booking/${bookingId}/cancel`, data);
export const joinSession = (bookingId) => API.post(`/booking/${bookingId}/join`);
export const completeSession = (bookingId) => API.patch(`/booking/${bookingId}/complete`);

// ============ PAYMENT (RAZORPAY) ============
export const createRazorpayOrder = (bookingId) => API.post(`/payment/order/${bookingId}`);
export const verifyRazorpayPayment = (data) => API.post('/payment/verify', data);

// ============ REVIEW ============
export const createReview = (data) => API.post('/review', data);
export const getMentorReviews = (mentorId, page = 1) => API.get(`/review/mentor/${mentorId}?page=${page}`);

// ============ CHAT ============
export const getOrCreateConversation = (participantId) => API.post('/chat/conversation', { participantId });
export const getConversations = () => API.get('/chat/conversations');
export const getMessages = (conversationId, page = 1) => API.get(`/chat/messages/${conversationId}?page=${page}`);
export const sendMessage = (data) => API.post('/chat/message', data);
export const getUnreadCount = () => API.get('/chat/unread-count');
export const markMessagesRead = (conversationId) => API.put(`/chat/read/${conversationId}`);

// ============ TICKETS (HELP CENTER) ============
export const submitTicketAPI = (data) => API.post('/auth/tickets', data);
export const getMyTicketsAPI = () => API.get('/auth/tickets');

// ============ ADMIN PAYOUTS ============
export const getAdminPayouts = () => API.get('/admin/payouts');
export const approvePayoutAPI = (mentorId) => API.post(`/admin/payouts/${mentorId}/approve`);
export const rejectPayoutAPI = (mentorId, reason) => API.post(`/admin/payouts/${mentorId}/reject`, { reason });

export default API;
