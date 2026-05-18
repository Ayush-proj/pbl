import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, GraduationCap, Calendar,
  CheckCircle, BarChart2, CreditCard, FileText,
  Bell, Settings, LogOut, Search, Menu, Filter,
  MoreVertical, User, RefreshCw, AlertTriangle, ShieldCheck, Check, X,
  Trash2, Plus, Flag, AlertCircle, Sun, Moon, DollarSign,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StatCard, SkeletonCard } from './StatCard';
import { ActivityFeed } from './ActivityFeed';
import { UsersTable } from './UsersTable';
import {
  fetchAdminStats, fetchAdminUsers, fetchAdminActivity,
  clearAdminSession, getAdminUser, fetchPendingMentors,
  verifyMentor, toggleUserStatus, fetchAdminBookings,
  fetchAdminPayments, fetchAdminReports, resolveReportStatus,
  fetchAdminNotifications, createAdminNotification, deleteAdminNotification,
  createAdminUser, deleteAdminUser,
  getAdminPayouts, approvePayoutAPI, rejectPayoutAPI,
} from '../../services/adminApi';

// ─── Sidebar config ──────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'mentors',       label: 'Mentors',        icon: Users },
  { id: 'candidates',    label: 'Candidates',     icon: GraduationCap },
  { id: 'sessions',      label: 'Sessions',       icon: Calendar },
  { id: 'approvals',     label: 'Approvals',      icon: CheckCircle },
  { id: 'payments',      label: 'Payments',       icon: CreditCard },
  { id: 'payouts',      label: 'Payouts',        icon: DollarSign },
  { id: 'reports',       label: 'Reports',        icon: Flag },
];
const BOTTOM_ITEMS = [
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'settings',      label: 'Settings',       icon: Settings },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
  return String(n);
}
function fmtRupees(n) {
  if (!n) return '₹0';
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const USER_DISTRIBUTION_COLORS = ['#00CFE8', '#8B5CF6', '#10B981', '#F59E0B'];

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 text-xs hover:text-white transition-colors">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminDashboard({ onLogout }) {
  const adminUser = getAdminUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [userFilter, setUserFilter]       = useState('All');
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');

  // ── data state ──
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingStats, setLoadingStats]       = useState(true);
  const [loadingUsers, setLoadingUsers]       = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [usersError, setUsersError] = useState('');

  // ── custom lists ──
  const [pendingMentors, setPendingMentors] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('All');

  // ── new connected data lists ──
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // ── notification broadcaster state ──
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');

  // ── user CRUD state ──
  const [showAddModal, setShowAddModal]   = useState(null); // 'Mentors' | 'Candidates' | null
  const [addName, setAddName]             = useState('');
  const [addEmail, setAddEmail]           = useState('');
  const [addPassword, setAddPassword]     = useState('');
  const [addingUser, setAddingUser]       = useState(false);

  // ── routing hash sync ──
  useEffect(() => {
    const handleHashTab = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/admin/')) {
        const tab = hash.substring(8);
        const validItem = SIDEBAR_ITEMS.find((item) => item.id === tab) || BOTTOM_ITEMS.find((item) => item.id === tab);
        if (validItem) {
          setActiveTab(validItem.id);
        }
      }
    };
    window.addEventListener('hashchange', handleHashTab);
    handleHashTab();
    return () => window.removeEventListener('hashchange', handleHashTab);
  }, []);

  useEffect(() => {
    if (activeTab) {
      window.location.hash = `#/admin/${activeTab}`;
    }
  }, [activeTab]);

  // ── sync filter with tab ──
  useEffect(() => {
    if (activeTab === 'mentors') setUserFilter('Mentors');
    else if (activeTab === 'candidates') setUserFilter('Candidates');
    else setUserFilter('All');
  }, [activeTab]);

  // ── debounce search ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── fetch stats ──
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const res = await fetchAdminStats({ startDate, endDate });
      setStats(res.data.data);
    } catch (e) {
      setStatsError(e.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }, [startDate, endDate]);

  // ── fetch users ──
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await fetchAdminUsers({ type: userFilter, search: debouncedSearch, startDate, endDate });
      setUsers(res.data.data.users);
    } catch (e) {
      setUsersError(e.response?.data?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userFilter, debouncedSearch, startDate, endDate]);

  // ── fetch activity ──
  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetchAdminActivity();
      setActivity(res.data.data);
    } catch { /* silent */ }
    finally { setLoadingActivity(false); }
  }, []);

  // ── fetch approvals ──
  const loadApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const res = await fetchPendingMentors();
      setPendingMentors(res.data.data);
    } catch (e) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

  // ── fetch bookings ──
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetchAdminBookings({ status: bookingFilter });
      setBookings(res.data.data.bookings);
    } catch (e) {
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  }, [bookingFilter]);

  // ── fetch payments ──
  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await fetchAdminPayments();
      setPayments(res.data.data);
    } catch (e) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // ── fetch reports ──
  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetchAdminReports();
      setReports(res.data.data);
    } catch (e) {
      toast.error('Failed to load complaints log');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // ── fetch payouts ──
  const loadPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const res = await getAdminPayouts();
      setPayouts(res.data.payouts || []);
    } catch (e) {
      toast.error('Failed to load payout requests');
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  // ── approve payout ──
  const handleApprovePayout = async (mentorId) => {
    try {
      await approvePayoutAPI(mentorId);
      toast.success('Payout approved!');
      loadPayouts();
    } catch (e) {
      toast.error('Failed to approve payout');
    }
  };

  // ── reject payout ──
  const handleRejectPayout = async (mentorId) => {
    try {
      await rejectPayoutAPI(mentorId, 'Rejected by admin');
      toast.success('Payout rejected');
      loadPayouts();
    } catch (e) {
      toast.error('Failed to reject payout');
    }
  };

  // ── fetch notifications ──
  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetchAdminNotifications();
      setNotifications(res.data.data);
    } catch (e) {
      toast.error('Failed to load system notifications');
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // ── computed & filtered lists ──
  const getFilteredUsers = () => {
    return users; // Backend already filters search, type, and dates for getUsers!
  };

  const getFilteredBookings = () => {
    let result = [...bookings];
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(b => 
        (b.candidateId?.userId?.name || '').toLowerCase().includes(term) ||
        (b.mentorId?.userId?.name || '').toLowerCase().includes(term) ||
        (b.status || '').toLowerCase().includes(term) ||
        (b.sessionType || '').toLowerCase().includes(term)
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(b => new Date(b.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(b => new Date(b.date) <= end);
    }
    if (userFilter === 'Mentors') {
      result = result.filter(b => b.mentorId);
    } else if (userFilter === 'Candidates') {
      result = result.filter(b => b.candidateId);
    }
    return result;
  };

  const getFilteredPayments = () => {
    let result = [...payments];
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(p => 
        (p.mentorId?.userId?.name || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.type || '').toLowerCase().includes(term)
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(p => new Date(p.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(p => new Date(p.createdAt) <= end);
    }
    if (userFilter === 'Mentors') {
      result = result.filter(p => p.mentorId);
    }
    return result;
  };

  const getFilteredReports = () => {
    let result = [...reports];
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(r => 
        (r.reporterId?.name || '').toLowerCase().includes(term) ||
        (r.reportedId?.name || '').toLowerCase().includes(term) ||
        (r.reason || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term)
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(r => new Date(r.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.createdAt) <= end);
    }
    if (userFilter === 'Mentors') {
      result = result.filter(r => r.reportedId?.role === 'mentor');
    } else if (userFilter === 'Candidates') {
      result = result.filter(r => r.reportedId?.role === 'candidate');
    }
    return result;
  };

  // ── triggers ──
  useEffect(() => { loadStats(); loadActivity(); }, [loadStats, loadActivity]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (activeTab === 'approvals') loadApprovals();
    if (activeTab === 'sessions') loadBookings();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'payouts') loadPayouts();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'notifications') loadNotifications();
  }, [activeTab, loadApprovals, loadBookings, loadPayments, loadPayouts, loadReports, loadNotifications, bookingFilter]);

  // ── actions ──
  const handleToggleActive = async (userId) => {
    try {
      const res = await toggleUserStatus(userId);
      toast.success(res.data.message);
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This will also remove their profiles.')) return;
    try {
      const res = await deleteAdminUser(userId);
      toast.success(res.data.message);
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addName || !addEmail || !addPassword) {
      return toast.warning('All fields are required');
    }
    const role = showAddModal === 'Mentors' ? 'mentor' : 'candidate';
    setAddingUser(true);
    try {
      const res = await createAdminUser({ name: addName, email: addEmail, password: addPassword, role });
      toast.success(res.data.message);
      setShowAddModal(null);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleVerify = async (mentorId) => {
    try {
      const res = await verifyMentor(mentorId);
      toast.success(res.data.message);
      loadApprovals();
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error('Failed to verify mentor');
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const res = await resolveReportStatus(reportId);
      toast.success(res.data.message);
      loadReports();
    } catch (e) {
      toast.error('Failed to update complaint status');
    }
  };

  const handleBroadcastNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) {
      return toast.warning('Title and Message are required');
    }
    try {
      await createAdminNotification({ title: notifTitle, message: notifMessage, type: notifType });
      toast.success('System broadcast sent successfully!');
      setNotifTitle('');
      setNotifMessage('');
      loadNotifications();
    } catch (e) {
      toast.error('Failed to broadcast alert');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteAdminNotification(id);
      toast.success('Notification cleared');
      loadNotifications();
    } catch (e) {
      toast.error('Failed to delete alert');
    }
  };

  // ── logout ──
  const handleLogout = () => {
    clearAdminSession();
    onLogout();
  };

  // ── build stat cards ──
  const statCards = stats ? [
    { label: 'Total Mentors',       value: fmt(stats.stats.totalMentors),      icon: Users,          isPositive: true  },
    { label: 'Total Candidates',    value: fmt(stats.stats.totalCandidates),   icon: GraduationCap,  isPositive: true  },
    { label: 'Active Sessions',     value: fmt(stats.stats.activeSessions),    icon: Calendar,       isPositive: true  },
    { label: 'Pending Approvals',   value: fmt(stats.stats.pendingMentors),    icon: CheckCircle,    isPositive: false },
    { label: 'Total Sessions',      value: fmt(stats.stats.totalSessions),     icon: LayoutDashboard,isPositive: true  },
    { label: 'Completed Sessions',  value: fmt(stats.stats.completedSessions), icon: CheckCircle,    isPositive: true  },
    { label: 'Cancelled Sessions',  value: fmt(stats.stats.cancelledSessions), icon: FileText,       isPositive: false },
    { label: 'Platform Earnings',   value: fmtRupees(stats.stats.platformEarnings), icon: CreditCard,     isPositive: true  },
    { label: 'Global Mentor Rating', value: `${stats.stats.averageRating} ★`, icon: Users,          isPositive: true  },
  ] : [];

  const monthlyData = stats?.monthlyData || [];
  const userDistribution = stats?.userDistribution || [];
  const sessionStatus    = stats?.sessionStatus    || [];

  // ─── Sub-View Renderers ────────────────────────────────────────────────────

  // Mini Glass Calendar Widget
  const handleCalendarDayClick = (dayNum) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (startDate === dateStr && endDate === dateStr) {
      setStartDate('');
      setEndDate('');
      toast.info('Cleared calendar date filter');
    } else {
      setStartDate(dateStr);
      setEndDate(dateStr);
      toast.success(`Filtered analytics by: ${targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    }
  };

  const renderCalendar = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const startDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-[#00CFE8] uppercase tracking-wider font-mono">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 font-bold mb-2">
          {dayNames.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold font-mono">
          {[...Array(startDay)].map((_, i) => <div key={i} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === today.getDate();
            const targetDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            const isSelected = startDate === dateStr && endDate === dateStr;

            return (
              <div
                key={i}
                onClick={() => handleCalendarDayClick(dayNum)}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-[0_0_10px_rgba(139,92,246,0.5)] border border-purple-400/30'
                    : isToday
                    ? 'bg-[#00CFE8] text-black font-black shadow-[0_0_10px_rgba(0,207,232,0.3)]'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 1. Dashboard View with Right-Side Panel
  const renderDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Dynamic Content Columns */}
      <div className="xl:col-span-3 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingStats
            ? [...Array(9)].map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((s, i) => <StatCard key={s.label} {...s} index={i} />)
          }
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area chart */}
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-lg">Platform Earnings & Sessions</h3>
                <p className="text-sm text-gray-400">Monthly platform net earnings</p>
              </div>
              <button onClick={loadStats} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {loadingStats ? (
              <div className="h-[280px] animate-pulse bg-white/5 rounded-xl" />
            ) : monthlyData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">No data yet</div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00CFE8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00CFE8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="#00CFE8" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8B5CF6" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Area yAxisId="left" type="monotone" dataKey="platformEarnings" name="Earnings" stroke="#00CFE8" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    <Area yAxisId="right" type="monotone" dataKey="sessions" name="Sessions" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorSess)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut chart */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">User Distribution</h3>
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </div>
            {loadingStats ? (
              <div className="flex-1 animate-pulse bg-white/5 rounded-xl min-h-[200px]" />
            ) : (
              <>
                <div className="flex-1 min-h-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={userDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                        {userDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color || USER_DISTRIBUTION_COLORS[i % USER_DISTRIBUTION_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-2xl font-bold">
                      {(stats?.stats.totalMentors + stats?.stats.totalCandidates || 0).toLocaleString()}
                    </span>
                    <span className="block text-xs text-gray-400">Users</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {userDistribution.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || USER_DISTRIBUTION_COLORS[i] }} />
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Advanced Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Earnings Bar Chart */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
            <h3 className="font-semibold text-base mb-4 text-[#00CFE8] font-mono">Monthly Platform Earnings</h3>
            <div className="h-[250px]">
              {loadingStats ? (
                <div className="w-full h-full animate-pulse bg-white/5 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <defs>
                      <linearGradient id="barRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00CFE8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" axisLine={false} tickLine={false} />
                    <YAxis stroke="#ffffff40" axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="platformEarnings" fill="url(#barRev)" name="Platform Earnings" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Session Status Distribution */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
            <h3 className="font-semibold text-base mb-4 text-purple-400 font-mono">Session Engagement Distribution</h3>
            <div className="h-[250px]">
              {loadingStats ? (
                <div className="w-full h-full animate-pulse bg-white/5 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sessionStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {sessionStatus.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Tables and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Recent Users</h3>
              <Button variant="ghost" size="sm" onClick={loadUsers} className="text-[#00CFE8] hover:bg-[#00CFE8]/10 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>
            {usersError && <div className="px-6 pt-3"><ErrorBanner message={usersError} onRetry={loadUsers} /></div>}
            <UsersTable users={getFilteredUsers().slice(0, 5)} loading={loadingUsers} />
          </div>

          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Activity Feed</h3>
              <button onClick={loadActivity} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <ActivityFeed items={activity} loading={loadingActivity} />
          </div>
        </div>
      </div>

      {/* Right Side Activity Panel */}
      <div className="space-y-6">
        {/* Calendar widget */}
        {renderCalendar()}

        {/* Top Mentors Leaderboard */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-lg">Top Mentors</h3>
            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Leaderboard</span>
          </div>
          {loadingStats ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
            </div>
          ) : stats?.topMentors?.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No mentor earnings yet.</div>
          ) : (
            <div className="space-y-4">
              {stats?.topMentors?.map((mentor, idx) => (
                <div key={mentor._id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden border border-white/10 shrink-0 relative flex items-center justify-center font-bold text-xs text-gray-400">
                      {idx === 0 ? <span className="absolute inset-0 bg-amber-500/20 text-amber-500 flex items-center justify-center">1</span> :
                       idx === 1 ? <span className="absolute inset-0 bg-gray-300/20 text-gray-300 flex items-center justify-center">2</span> :
                       idx === 2 ? <span className="absolute inset-0 bg-amber-700/20 text-amber-700 flex items-center justify-center">3</span> :
                       idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate max-w-[100px] sm:max-w-[120px]">{mentor.name}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="text-yellow-500">★</span> {mentor.averageRating ? mentor.averageRating.toFixed(1) : '0.0'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#00CFE8]">{fmtRupees(mentor.totalEarnings)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Approvals inside Right Panel */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center justify-between">
            <span>Pending Approvals</span>
            <span className="bg-white/5 text-[#00CFE8] px-2 py-0.5 text-xs rounded-full">
              {pendingMentors.length}
            </span>
          </h3>
          {loadingApprovals ? (
            <div className="animate-pulse space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : pendingMentors.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No pending profile requests</p>
          ) : (
            <div className="space-y-2">
              {pendingMentors.slice(0, 3).map((m) => (
                <div key={m._id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId?.name}`} alt="" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-white truncate max-w-[100px]">{m.userId?.name}</span>
                      <span className="text-[10px] text-gray-400 capitalize truncate max-w-[100px] block">{m.title}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVerify(m._id)}
                    className="p-1 hover:bg-[#00CFE8] hover:text-black rounded-lg text-[#00CFE8] transition-all"
                    title="Verify"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Notifications Alert Feed inside Right Panel */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00CFE8]" /> Broadcast alerts
          </h3>
          {loadingNotifications ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-white/5 rounded-lg" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No broadcast alerts active</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto hide-scrollbar">
              {notifications.slice(0, 4).map((n) => (
                <div key={n._id} className="p-2.5 rounded-xl border border-white/5 bg-white/5 flex gap-2">
                  <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    n.type === 'error' ? 'text-red-400' :
                    n.type === 'warning' ? 'text-amber-400' :
                    'text-sky-400'
                  }`} />
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">{n.title}</span>
                    <span className="text-[10px] text-gray-400 mt-1 block leading-normal">{n.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 2. Mentors / Candidates List View
  const renderUsersList = (roleName) => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-lg">{roleName} List</h3>
          <p className="text-sm text-gray-400">Total {users.length} profiles registered</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAddModal(roleName)}
            className="bg-[#00CFE8] hover:bg-[#00b5cc] text-black font-semibold text-xs px-4 py-2"
          >
            + Add {roleName === 'Mentors' ? 'Mentor' : 'Candidate'}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadUsers} className="text-[#00CFE8] hover:bg-[#00CFE8]/10 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reload
          </Button>
        </div>
      </div>

      {loadingUsers ? (
        <div className="animate-pulse p-6 divide-y divide-white/5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-3 items-center">
              <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-1/4" />
                <div className="h-2 bg-white/5 rounded w-1/3" />
              </div>
              <div className="w-20 h-8 bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No {roleName.toLowerCase()} profiles found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3 font-medium text-white">
                    <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" className="w-full h-full" />
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{u.email}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(u._id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        u.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(u._id)}
                      className="text-[#00CFE8] hover:text-[#00CFE8]/80 text-xs font-semibold"
                      title={u.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      Toggle Status
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      className="text-red-400 hover:text-red-500 text-xs font-semibold"
                      title="Permanently Delete User"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 3. Sessions List View
  const renderSessions = () => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-lg">All Bookings</h3>
          <p className="text-sm text-gray-400">Manage all paid and demo video sessions</p>
        </div>
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
          {['All', 'Confirmed', 'Completed', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setBookingFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                bookingFilter === f ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loadingBookings ? (
        <div className="animate-pulse p-6 divide-y divide-white/5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-3 items-center">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-1/4" />
                <div className="h-2 bg-white/5 rounded w-1/3" />
              </div>
              <div className="w-16 h-8 bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
      ) : getFilteredBookings().length === 0 ? (
        <div className="text-center py-20 text-gray-500">No sessions found for this status.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Mentor</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {getFilteredBookings().map((b) => (
                <tr key={b._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white">
                    <span className="font-medium">{new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="block text-xs text-gray-400">{b.time} ({b.duration} mins)</span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    {b.candidateId?.userId?.name || 'Deleted Candidate'}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    {b.mentorId?.userId?.name || 'Deleted Mentor'}
                  </td>
                  <td className="px-6 py-4 capitalize text-gray-400">
                    {b.sessionType}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    {fmtRupees(b.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                      b.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 4. Verification Approvals View
  const renderApprovals = () => (
    <div className="space-y-6">
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold text-lg mb-2">Pending Mentor Verifications</h3>
        <p className="text-sm text-gray-400">Approve profiles to allow them to accept bookings from candidates</p>
      </div>

      {loadingApprovals ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : pendingMentors.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-12 text-center text-gray-500">
          <ShieldCheck className="w-12 h-12 text-emerald-500/40 mx-auto mb-4" />
          <p className="font-medium text-white">All Clear!</p>
          <p className="text-sm mt-1">No mentor profiles are currently awaiting verification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingMentors.map((m) => (
            <motion.div
              layout
              key={m._id}
              className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-md relative"
            >
              <div>
                <div className="flex gap-3 items-start mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden shrink-0 border border-white/10">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId?.name || 'Mentor'}`} alt="" className="w-full h-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base">{m.userId?.name || 'Anonymous Mentor'}</h4>
                    <p className="text-xs text-gray-400 font-medium capitalize">{m.title} at <span className="text-[#00CFE8]">{m.company || 'Self-Employed'}</span></p>
                  </div>
                </div>

                <p className="text-sm text-gray-300 line-clamp-3 mb-4">{m.bio || 'No bio provided.'}</p>

                <div className="flex gap-1.5 flex-wrap mb-4">
                  {m.skills?.map((sk) => (
                    <span key={sk} className="bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-xs text-gray-300">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/5">
                <Button
                  onClick={() => handleVerify(m._id)}
                  className="flex-1 bg-[#00CFE8] hover:bg-[#00b5cc] text-black text-xs font-semibold py-4"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Verify Profile
                </Button>
                <Button
                  variant="ghost"
                  className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-4 py-4"
                >
                  View Details
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // 5. Analytics View
  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold text-lg">System-wide Analytics</h3>
        <p className="text-sm text-gray-400">Aggregated database telemetry and analytics logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
          <h4 className="font-semibold text-base mb-4 text-[#00CFE8]">Monthly Revenue Earnings</h4>
          <div className="h-[250px]">
            {loadingStats ? (
              <div className="w-full h-full animate-pulse bg-white/5 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" tickLine={false} />
                  <YAxis stroke="#ffffff40" tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#00CFE8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Session Status Pie Chart */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
          <h4 className="font-semibold text-base mb-4 text-purple-400">Session Status distribution</h4>
          <div className="h-[250px]">
            {loadingStats ? (
              <div className="w-full h-full animate-pulse bg-white/5 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sessionStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {sessionStatus.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 6. Payments History View
  const renderPayments = () => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Transaction History</h3>
          <p className="text-sm text-gray-400">Overview of mentor payouts and platform transactions</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPayments} className="text-[#00CFE8] hover:bg-[#00CFE8]/10 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {loadingPayments ? (
        <div className="animate-pulse p-6 divide-y divide-white/5 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : getFilteredPayments().length === 0 ? (
        <div className="text-center py-20 text-gray-500">No payment transaction logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4">Transaction Date</th>
                <th className="px-6 py-4">Mentor ID / Profile</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {getFilteredPayments().map((p) => (
                <tr key={p._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">
                    {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {p.mentorId?.userId?.name || 'Platform Account'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {fmtRupees(p.amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{p.description || 'Session payout'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 7. Payouts View
  const renderPayouts = () => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Payout Requests</h3>
          <p className="text-sm text-gray-400">Approve or reject mentor withdrawal requests</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPayouts} className="text-[#00CFE8] hover:bg-[#00CFE8]/10 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {loadingPayouts ? (
        <div className="animate-pulse p-6 divide-y divide-white/5 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <DollarSign className="w-12 h-12 text-emerald-500/40 mx-auto mb-4" />
          <p className="font-medium text-white">No Payout Requests</p>
          <p className="text-xs mt-1">All mentor withdrawal requests have been processed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4">Mentor</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Current Balance</th>
                <th className="px-6 py-4">Requested</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{p.mentorName}</td>
                  <td className="px-6 py-4 text-gray-300">{p.mentorEmail}</td>
                  <td className="px-6 py-4 font-bold text-emerald-400">₹{p.amount}</td>
                  <td className="px-6 py-4 text-gray-300">₹{p.currentBalance}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprovePayout(p.mentorId)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectPayout(p.mentorId)}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 8. Reports / Complaints View
  const renderReports = () => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Complaints & Reports</h3>
          <p className="text-sm text-gray-400">Review moderation requests and conflict tickets</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadReports} className="text-[#00CFE8] hover:bg-[#00CFE8]/10 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {loadingReports ? (
        <div className="animate-pulse p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : getFilteredReports().length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ShieldCheck className="w-12 h-12 text-emerald-500/40 mx-auto mb-4" />
          <p className="font-medium text-white">All Clear!</p>
          <p className="text-xs mt-1">No outstanding complaints or moderation requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4">Reporter</th>
                <th className="px-6 py-4">Reported</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {getFilteredReports().map((r) => (
                <tr key={r._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{r.reporterId?.name || 'Anonymous User'}</td>
                  <td className="px-6 py-4 font-medium text-white">{r.reportedId?.name || 'Platform Member'}</td>
                  <td className="px-6 py-4 text-gray-300">
                    <span className="font-semibold text-rose-400 block">{r.reason}</span>
                    <span className="text-xs text-gray-400 block mt-0.5 truncate max-w-xs">{r.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleResolveReport(r._id)}
                      className="text-xs font-semibold text-[#00CFE8] hover:text-white transition-colors"
                    >
                      {r.status === 'resolved' ? 'Re-open Ticket' : 'Mark Resolved'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 8. Notifications Broadcast View
  const renderNotifications = () => (
    <div className="space-y-6">
      {/* Creation form */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold text-lg mb-4 text-[#00CFE8] flex items-center gap-2">
          <Bell className="w-5 h-5" /> Broadcast New System Notification
        </h3>
        <form onSubmit={handleBroadcastNotification} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notification Title</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Platform Maintenance Scheduled..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Severity/Type</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
              >
                <option value="info">Information (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="error">Error/Danger (Red)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detailed message</label>
            <textarea
              rows={3}
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Enter broadcast description..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
            />
          </div>

          <Button type="submit" className="bg-[#00CFE8] hover:bg-[#00b5cc] text-black font-semibold text-xs py-5 px-6">
            <Plus className="w-4 h-4 mr-1" /> Broadcast Notification
          </Button>
        </form>
      </div>

      {/* Broadcast Log */}
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="font-semibold text-base">Active Broadcast History</h3>
        </div>

        {loadingNotifications ? (
          <div className="animate-pulse p-6 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">No active alerts running</p>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => (
              <div key={n._id} className="p-5 flex items-start gap-4 hover:bg-white/5 transition-colors">
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  n.type === 'error' ? 'text-red-400' :
                  n.type === 'warning' ? 'text-amber-400' :
                  n.type === 'success' ? 'text-emerald-400' :
                  'text-sky-400'
                }`} />
                <div className="flex-1">
                  <span className="font-semibold text-white block text-sm">{n.title}</span>
                  <span className="text-xs text-gray-400 block mt-1 leading-normal">{n.message}</span>
                  <span className="text-[10px] text-gray-500 block mt-2">
                    Broadcasted on {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteNotification(n._id)}
                  className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                  title="Clear Alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 9. Settings View
  const renderSettings = () => (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold text-lg mb-2">Administrator Configuration</h3>
        <p className="text-sm text-gray-400">Configure global app credentials and server integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator profile */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
          <h4 className="font-semibold text-base mb-4 text-[#00CFE8] flex items-center gap-2">
            <User className="w-4 h-4" /> Profile Info
          </h4>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-500 block uppercase font-semibold">Account Identity</span>
              <span className="text-sm text-white font-medium block mt-1">{adminUser?.name || 'Administrator'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase font-semibold">Verification Email</span>
              <span className="text-sm text-white font-medium block mt-1">{adminUser?.email || 'admin@guruconnect.com'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase font-semibold">Assigned Access Role</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full inline-block mt-1">
                {adminUser?.role || 'admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Global configuration */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
          <h4 className="font-semibold text-base mb-4 text-purple-400 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Integrations
          </h4>
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span>Razorpay Payments Gateway</span>
              <span className="text-xs font-bold text-red-400">KEYS MISSING</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span>Zoom Meeting Manager</span>
              <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Google Gemini Client Engine</span>
              <span className="text-xs font-bold text-emerald-400">CONNECTED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':  return renderDashboard();
      case 'mentors':    return renderUsersList('Mentors');
      case 'candidates': return renderUsersList('Candidates');
      case 'sessions':   return renderSessions();
      case 'approvals':  return renderApprovals();
      case 'analytics':  return renderAnalytics();
      case 'payments':   return renderPayments();
      case 'payouts':   return renderPayouts();
      case 'reports':    return renderReports();
      case 'notifications': return renderNotifications();
      case 'settings':   return renderSettings();
      default:           return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full border-r border-white/10 bg-[#0A0A0A] flex flex-col z-20 relative shrink-0"
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-5 border-b border-white/10 gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00CFE8] flex items-center justify-center shrink-0">
            <span className="text-black font-black text-lg">G</span>
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="text-xl font-bold tracking-tight whitespace-nowrap"
              >
                GuruConnect <span className="text-[#00CFE8] text-sm align-top">PRO</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1 hide-scrollbar">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-3 py-3 rounded-xl transition-all group ${
                activeTab === item.id
                  ? 'bg-[#00CFE8] text-black shadow-[0_0_15px_rgba(0,207,232,0.3)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${!isSidebarOpen ? 'mx-auto' : ''}`} />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                    className="ml-3 font-medium whitespace-nowrap overflow-hidden text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>

        {/* Bottom items + logout */}
        <div className="p-3 border-t border-white/10 flex flex-col gap-1">
          {BOTTOM_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-3 py-3 rounded-xl transition-all group ${
                activeTab === item.id
                  ? 'bg-[#00CFE8] text-black shadow-[0_0_15px_rgba(0,207,232,0.3)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${!isSidebarOpen ? 'mx-auto' : ''}`} />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                    className="ml-3 font-medium whitespace-nowrap overflow-hidden text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all mt-1"
          >
            <LogOut className={`w-5 h-5 shrink-0 ${!isSidebarOpen ? 'mx-auto' : ''}`} />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  className="ml-3 font-medium whitespace-nowrap overflow-hidden text-sm"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Navbar */}
        <header className="h-20 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold capitalize hidden sm:block">{activeTab} Overview</h2>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'dashboard' || activeTab === 'mentors' || activeTab === 'candidates' ? 'Search users...' :
                  activeTab === 'sessions' ? 'Search bookings...' :
                  activeTab === 'payments' ? 'Search transactions...' :
                  activeTab === 'reports' ? 'Search complaints...' :
                  'Search...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-[#00CFE8] text-white placeholder:text-gray-500 transition-all"
              />
            </div>

            {/* Date range picker inside Header */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              {['All', 'Mentors', 'Candidates'].map((f) => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    userFilter === f ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Bell */}
            <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#00CFE8] rounded-full" />
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00CFE8] to-purple-500 p-0.5 cursor-pointer">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUser?.name || 'Admin'}`} alt="Admin" className="w-full h-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 hide-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {statsError && <ErrorBanner message={statsError} onRetry={loadStats} />}
            {renderContent()}

            {/* Add User Modal */}
            <AnimatePresence>
              {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                  >
                    <button
                      onClick={() => setShowAddModal(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-lg font-semibold text-white mb-2">
                      Add New {showAddModal === 'Mentors' ? 'Mentor' : 'Candidate'}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Create a new user account with immediate database activation.
                    </p>

                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">Full Name</label>
                        <input
                          type="text"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="e.g. Ayush Gupta"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00CFE8] text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">Email Address</label>
                        <input
                          type="email"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          placeholder="e.g. ayush@guruconnect.com"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00CFE8] text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">Secure Password</label>
                        <input
                          type="password"
                          value={addPassword}
                          onChange={(e) => setAddPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00CFE8] text-white"
                          required
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowAddModal(null)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs py-3 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addingUser}
                          className="flex-1 bg-[#00CFE8] hover:bg-[#00b5cc] text-black font-semibold text-xs py-3 rounded-xl shadow-[0_0_15px_rgba(0,207,232,0.3)] border-none"
                        >
                          {addingUser ? 'Creating...' : `Create Account`}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
