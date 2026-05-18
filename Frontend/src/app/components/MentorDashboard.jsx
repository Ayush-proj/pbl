import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import useAuthStore from '../store/authStore';
import {
    Calendar,
    Clock,
    Video,
    Star,
    MessageSquare,
    DollarSign,
    BookOpen,
    Check,
    XCircle,
    Loader2,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    RotateCcw,
    IndianRupee,
    TrendingUp,
    Bell,
    Sun,
    Moon,
Settings,
    LogOut,
    Users,
    HelpCircle,
    User,
    PanelLeftClose,
    PanelLeftOpen,
    Compass,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    getMyBookings,
    getMentorWallet,
    getMentorEarnings,
    getMentorTransactions,
    getMentorProfile,
    updateBookingStatus as updateBookingStatusAPI,
    joinSession as joinSessionAPI,
    getNotificationsAPI,
    submitTicketAPI,
    getMyTicketsAPI
} from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCalendar } from './DashboardCalendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '../context/ThemeContext';
import { ChatButton } from './Chat';

export function MentorDashboard({ onStudentClick, onSettings, onLogout, onNavigate, onStartVerification }) {
    const { user: authUser, mentorProfile, logout, setMentorProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState(null);
    const [earningsData, setEarningsData] = useState(null);
    const [transactionsData, setTransactionsData] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeChat, setActiveChat] = useState(null);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();

    // Skeleton Component
    const Skeleton = ({ className = '' }) => (
        <div className={`animate-pulse bg-muted dark:bg-white/10 rounded-lg ${className}`} />
    );

    // Loading Skeleton Layout
    const LoadingSkeleton = () => (
        <div className="space-y-6">
            {/* Welcome Card Skeleton */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-5 w-64" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Sessions Skeleton */}
            <Card>
                <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                                <Skeleton className="w-12 h-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-8 w-20 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
    const canvasRef = useRef(null);

    // Fetch bookings and wallet data on mount
    useEffect(() => {
        fetchData();
    }, []);

    // Real-time booking notifications
    const handleNewBooking = useCallback(() => {
        fetchData();
    }, []);

    const handlePaymentConfirmed = useCallback(() => {
        fetchData();
    }, []);

    useBookingNotifications({
        onNewBooking: handleNewBooking,
        onPaymentConfirmed: handlePaymentConfirmed
    });

    // Fetch earnings data when tab changes to earnings
    useEffect(() => {
        if (activeTab === 'earnings' && !earningsData) {
            fetchEarnings();
        }
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookingsRes, walletRes, profileRes] = await Promise.all([
                getMyBookings(),
                getMentorWallet(),
                getMentorProfile()
            ]);
            console.log('📋 Mentor fetched bookings:', bookingsRes.data.bookings?.length);
            bookingsRes.data.bookings?.forEach(b => {
                console.log('  - booking:', b._id, 'status:', b.status, 'sessionType:', b.sessionType);
            });
            setBookings(bookingsRes.data.bookings || []);
            setWalletData(walletRes.data);
            if (profileRes.data?.mentor) {
                setMentorProfile(profileRes.data.mentor);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async () => {
        try {
            const [earningsRes, txRes] = await Promise.all([
                getMentorEarnings(),
                getMentorTransactions()
            ]);
            setEarningsData(earningsRes.data);
            setTransactionsData(txRes.data);
        } catch (err) {
            console.error('Failed to fetch earnings:', err);
            toast.error('Failed to load earnings data');
        }
    };

    // -- Help Center state --
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [ticketReason, setTicketReason] = useState('General Support Inquiry');
    const [ticketPriority, setTicketPriority] = useState('medium');
    const [ticketDesc, setTicketDesc] = useState('');

    const fetchTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const res = await getMyTicketsAPI();
            setTickets(res.data.tickets || []);
        } catch (e) {
            console.error('Failed to load tickets:', e);
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'help') {
            fetchTickets();
        }
    }, [activeTab, fetchTickets]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!ticketDesc.trim()) {
            return toast.warning('Please specify your complaint or inquiry in detail.');
        }
        setSubmittingTicket(true);
        try {
            const res = await submitTicketAPI({
                reason: ticketReason,
                priority: ticketPriority,
                description: ticketDesc
            });
            toast.success(res.data.message || 'Support ticket submitted successfully!');
            setTicketDesc('');
            fetchTickets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit ticket');
        } finally {
            setSubmittingTicket(false);
        }
    };

    // Handle accept/reject booking
    const handleBookingAction = async (bookingId, action) => {
        setActionLoading(bookingId);
        try {
            await updateBookingStatusAPI(bookingId, { action });
            toast.success(action === 'accept' ? 'Booking accepted!' : 'Booking rejected');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} booking`);
        } finally {
            setActionLoading(null);
        }
    };

    // Handle join session — opens in-app WebSocket video room
    const handleJoinSession = async (bookingId) => {
        setActionLoading(bookingId);
        try {
            const res = await joinSessionAPI(bookingId);
            const booking = bookings.find(b => b._id === bookingId);
            const meetingLink = res.data.meetingLink;

            if (res.data.isWebSocket && meetingLink) {
                // Use in-app VideoSessionRoom via App.jsx event
                window.dispatchEvent(new CustomEvent('joinSession', {
                    detail: {
                        mentor: booking?.mentorId,
                        session: {
                            ...booking,
                            meetingLink,
                            duration: booking?.duration || 60
                        }
                    }
                }));
                toast.success('Joining session...');
            } else if (meetingLink) {
                window.open(meetingLink, '_blank');
                toast.success('Meeting opened in new tab!');
            } else {
                toast.success('Joined session!');
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join session');
        } finally {
            setActionLoading(null);
        }
    };

    // Canvas particle animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 1,
            });
        }

        let animationId;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 0, 212, 0.2)';
                ctx.fill();

                particles.slice(i + 1).forEach(other => {
                    const dx = p.x - other.x;
                    const dy = p.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(255, 0, 212, ${0.1 * (1 - dist / 100)})`;
                        ctx.stroke();
                    }
                });
            });
            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationId);
        };
    }, []);

    // Filter bookings based on active tab
    const filteredSessions = bookings.filter(booking => {
        if (activeTab === 'upcoming') {
            return ['pending', 'confirmed', 'awaiting-payment', 'in-progress'].includes(booking.status);
        }
        if (activeTab === 'completed') {
            return booking.status === 'completed';
        }
        return false;
    });

    // Dynamic stats from Zustand and API
    const sessionStats = useMemo(() => ({
        completed: bookings.filter(b => b.status === 'completed').length,
        upcoming: bookings.filter(b => ['confirmed', 'in-progress'].includes(b.status)).length,
        pending: bookings.filter(b => ['pending', 'awaiting-payment'].includes(b.status)).length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }), [bookings]);

    const fetchBroadcastNotifications = useCallback(async () => {
        try {
            const res = await getNotificationsAPI();
            const dbNotifs = (res.data.notifications || []).map(n => ({
                id: n._id,
                type: n.type || 'info',
                title: n.title,
                message: n.message,
                time: new Date(n.createdAt),
                read: n.isRead || false
            }));
            return dbNotifs;
        } catch (err) {
            console.error('Failed to fetch broadcasts:', err);
            return [];
        }
    }, []);

    // Generate notifications from bookings - dynamic with Zustand combined with DB broadcasts
    useEffect(() => {
        const notifs = [];
        const now = new Date();
        bookings.forEach(booking => {
            const sessionTime = new Date(booking.date);
            const hoursUntil = (sessionTime - now) / (1000 * 60 * 60);
            if (booking.status === 'confirmed' && hoursUntil > 0 && hoursUntil <= 0.25) notifs.push({ id: `remind-${booking._id}`, title: 'Session soon', message: `With ${booking.candidateId?.name || 'student'} in 15 min`, time: new Date() });
            if (booking.status === 'pending') notifs.push({ id: `new-${booking._id}`, title: 'New booking', message: `${booking.candidateId?.name || 'Student'} wants to book`, time: new Date() });
            if (booking.paymentStatus === 'paid') notifs.push({ id: `paid-${booking._id}`, title: 'Payment', message: `₹${booking.amount} received`, time: new Date() });
        });
        
        fetchBroadcastNotifications().then(dbNotifs => {
            const merged = [...dbNotifs, ...notifs].sort((a, b) => new Date(b.time) - new Date(a.time));
            setNotifications(merged.slice(0, 12));
        });
    }, [bookings, fetchBroadcastNotifications]);

    const upcomingCount = bookings.filter(b => ['pending', 'confirmed', 'awaiting-payment', 'in-progress'].includes(b.status)).length;

    const navItems = [
        { id: 'upcoming', label: 'Sessions', icon: Calendar },
        { id: 'completed', label: 'History', icon: BookOpen },
        { id: 'earnings', label: 'Earnings', icon: Wallet },
        { id: 'students', label: 'Students', icon: Users },
    ];

    // Stats from real data
    const stats = [
        {
            label: 'Wallet Balance',
            value: `₹${walletData?.wallet?.walletBalance || 0}`,
            icon: Wallet,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Total Earnings',
            value: `₹${walletData?.wallet?.totalEarnings || 0}`,
            icon: DollarSign,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Sessions Completed',
            value: walletData?.stats?.completedSessions || 0,
            icon: BookOpen,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10'
        },
        {
            label: 'Student Rating',
            value: walletData?.stats?.averageRating
                ? `${walletData.stats.averageRating.toFixed(1)}/5`
                : 'N/A',
            icon: Star,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10'
        },
    ];

    const renderHelpCenter = () => {
        return (
            <div className="space-y-6">
                {/* Intro Card */}
                <Card className="bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-transparent border-primary/20">
                    <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                <HelpCircle className="w-6 h-6 text-primary" /> GuruConnect Help Center
                            </h2>
                            <p className="text-muted-foreground font-medium max-w-xl">
                                Submit a complaint, ask a billing/session question, or report a technical issue. 
                                Our system automatically routes your inquiry to the admin based on priority levels.
                            </p>
                        </div>
                        <div className="flex gap-4 items-center bg-card border border-border/50 p-4 rounded-xl shadow-sm">
                            <div className="text-center px-3 border-r border-border">
                                <span className="block text-2xl font-black text-primary">
                                    {tickets.filter(t => t.status === 'pending').length}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">Active Tickets</span>
                            </div>
                            <div className="text-center px-3">
                                <span className="block text-2xl font-black text-emerald-500">
                                    {tickets.filter(t => t.status === 'resolved').length}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">Resolved</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Submission Form */}
                    <Card className="md:col-span-2 border-border/60">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold">Submit New Support Ticket</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTicket} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Inquiry Category</label>
                                    <select
                                        value={ticketReason}
                                        onChange={(e) => setTicketReason(e.target.value)}
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <option>Account Security & Login</option>
                                        <option>Session Booking Issue</option>
                                        <option>Payment / Refund Status</option>
                                        <option>Mentor Misconduct</option>
                                        <option>General Support Inquiry</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Priority / Urgency Level</label>
                                    <select
                                        value={ticketPriority}
                                        onChange={(e) => setTicketPriority(e.target.value)}
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <option value="low">Low Importance</option>
                                        <option value="medium">Medium Urgency</option>
                                        <option value="high">High Priority</option>
                                        <option value="critical">Critical (Immediate Help)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Complaint Description</label>
                                    <textarea
                                        value={ticketDesc}
                                        onChange={(e) => setTicketDesc(e.target.value)}
                                        rows={4}
                                        placeholder="Please provide complete details so the administrator can resolve your issue quickly..."
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <Button type="submit" className="w-full h-11" disabled={submittingTicket}>
                                    {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Submit Ticket
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Support Tickets Log */}
                    <Card className="md:col-span-3 border-border/60">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold">Your Support Logs & Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[480px] overflow-y-auto">
                            {ticketsLoading ? (
                                <div className="py-16 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                                    <p className="text-muted-foreground text-sm font-medium">Fetching support logs...</p>
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground">
                                    <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <h4 className="text-base font-bold mb-1">No tickets created</h4>
                                    <p className="text-sm">Create a ticket using the submission form on the left.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {tickets.map((t) => {
                                        const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                        const pStyles = {
                                            critical: 'border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
                                            high: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
                                            medium: 'border-violet-500/30 bg-violet-500/10 text-violet-500',
                                            low: 'border-muted bg-muted/40 text-muted-foreground'
                                        };
                                        const sStyles = {
                                            pending: 'bg-amber-500/10 text-amber-600',
                                            resolved: 'bg-emerald-500/10 text-emerald-600',
                                            dismissed: 'bg-muted/50 text-muted-foreground'
                                        };

                                        return (
                                            <div key={t._id} className="p-5 space-y-3 hover:bg-muted/10 transition-colors">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-foreground">{t.reason}</span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${pStyles[t.priority] || pStyles.medium}`}>
                                                            {t.priority}
                                                        </span>
                                                    </div>
                                                    <Badge variant="outline" className={`text-xs font-bold uppercase ${sStyles[t.status] || sStyles.pending}`}>
                                                        {t.status}
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {t.description}
                                                </p>

                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                                                    <span>Ticket Ref: #{t._id.slice(-6).toUpperCase()}</span>
                                                    <span>Submitted {dateStr}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* COLLAPSIBLE SIDEBAR */}
            <aside className={`h-full border-r border-border bg-card/50 backdrop-blur-md hidden md:flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
                {/* Logo & Toggle */}
                <div className="p-4 flex items-center justify-between">
                    <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center w-full'}`}>
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-foreground font-black text-xl">G</span>
                        </div>
                        {sidebarOpen && <span className="text-xl font-black tracking-tight">Guru<span className="text-primary">Connect</span></span>}
                    </div>
                </div>

                {/* Toggle Button */}
                <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 mx-2 rounded-lg hover:bg-accent text-muted-foreground flex items-center justify-center mb-2"
                >
                    {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>

                {/* Navigation */}
                <nav className="flex-1 px-2 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                                activeTab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Bottom Links */}
                <div className="p-2 space-y-1 border-t border-border">
                    <button 
                        onClick={() => onSettings?.()}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all ${sidebarOpen ? '' : 'justify-center'}`}
                    >
                        <Settings className="w-5 h-5" />
                        {sidebarOpen && <span>Settings</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('help')}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${sidebarOpen ? '' : 'justify-center'} ${
                            activeTab === 'help'
                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <HelpCircle className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span>Help Center</span>}
                    </button>
                </div>
            </aside>

            {/* RIGHT MAIN AREA */}
            <main className="flex flex-col h-full flex-1 overflow-hidden">
                {/* HEADER */}
                <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <PanelLeftOpen className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-black text-foreground">
                                {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {upcomingCount > 0 ? `${upcomingCount} upcoming session${upcomingCount > 1 ? 's' : ''}` : 'No sessions scheduled'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="w-5 h-5" />
                                    {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 cursor-pointer">
                                            <span className="text-sm font-medium">{n.title}</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1">{n.message}</span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={mentorProfile?.profileImage || authUser?.profileImage || ''} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                                            {authUser?.name?.charAt(0) || 'M'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden sm:inline text-sm font-medium">{authUser?.name || 'Mentor'}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span>{authUser?.name || 'User'}</span>
                                        <span className="text-xs text-muted-foreground font-normal">{authUser?.email}</span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onNavigate?.('mentor-profile')}><User className="mr-2 h-4 w-4" />My Profile</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onSettings?.()}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { logout(); onLogout?.(); }}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* SCROLLABLE CONTENT - GRID LAYOUT LIKE STUDENT DASHBOARD */}
                <div className="flex-1 overflow-y-auto bg-background/50">
                    {loading ? (
                        <div className="max-w-7xl mx-auto w-full p-6">
                            <LoadingSkeleton />
                        </div>
                    ) : activeTab === 'help' ? (
                        <div className="max-w-7xl mx-auto w-full p-6">
                            {renderHelpCenter()}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-w-7xl mx-auto w-full p-6">
                        
                        {/* LEFT VIEWPORT PANEL (lg:col-span-2) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* WELCOME CARD */}
                            <Card className="bg-gradient-to-r from-card to-secondary/10">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black text-foreground mb-1">Welcome back, {authUser?.name?.split(' ')[0] || 'Mentor'}!</h2>
                                            <p className="text-muted-foreground">
                                                {upcomingCount > 0 ? `You have ${upcomingCount} upcoming session${upcomingCount > 1 ? 's' : ''}` : 'No sessions scheduled'}
                                            </p>
                                        </div>
                                        <Button onClick={() => setActiveTab('students')}><Users className="w-4 h-4 mr-2" />View Students</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* VERIFICATION STATUS BANNER */}
                            {!mentorProfile?.verified && mentorProfile?.skills?.length > 0 && (
                                <Card className="bg-amber-500/10 border-amber-500/30">
                                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <ShieldCheck className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Complete your verification</p>
                                                <p className="text-sm text-muted-foreground">Take the test to get verified badge and attract more students</p>
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={() => {
                                                setVerificationLoading(true);
                                                onStartVerification?.();
                                            }}
                                            disabled={verificationLoading}
                                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                                        >
                                            {verificationLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                'Take Test'
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* VERIFIED BANNER */}
                            {mentorProfile?.verified && (
                                <Card className="bg-emerald-500/10 border-emerald-500/30">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Verified Mentor</p>
                                                <p className="text-sm text-muted-foreground">Your profile is verified and visible to students</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {stats.map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                                <stat.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">{stat.label}</p>
                                                <p className="text-lg font-black text-foreground">{stat.value}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                {/* CHARTS SECTION - Dynamic with Zustand */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="p-5">
                                <CardHeader className="p-0 mb-4"><div className="h-5 w-32 bg-muted animate-pulse rounded" /></CardHeader>
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-6">
                                        <div className="w-32 h-32 bg-muted animate-pulse rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            {[1, 2, 3].map(j => <div key={j} className="h-4 w-24 bg-muted animate-pulse rounded" />)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SESSION PIE CHART */}
                        <Card className="p-5">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    Session Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {bookings.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No sessions yet</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-32 h-32">
                                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                                                {(() => {
                                                    const total = sessionStats.completed + sessionStats.upcoming + sessionStats.cancelled + sessionStats.pending || 1;
                                                    let offset = 0;
                                                    const calc = (val) => { const percent = (val / total) * 100; const o = offset; offset += percent; return { percent, offset: o }; };
                                                    const c1 = calc(sessionStats.completed), c2 = calc(sessionStats.upcoming), c3 = calc(sessionStats.cancelled), c4 = calc(sessionStats.pending);
                                                    return (
                                                        <>
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${c1.percent} 100`} strokeDashoffset="0" className="text-green-500" />
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${c2.percent} 100`} strokeDashoffset={`${-c1.offset}`} className="text-blue-500" />
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${c3.percent} 100`} strokeDashoffset={`${-(c1.offset + c2.offset)}`} className="text-red-500" />
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${c4.percent} 100`} strokeDashoffset={`${-(c1.offset + c2.offset + c3.offset)}`} className="text-amber-500" />
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-lg font-black">{bookings.length}</span>
                                                <span className="text-[10px] text-muted-foreground">total</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Completed</span></div>
                                                <span className="font-bold">{sessionStats.completed}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Upcoming</span></div>
                                                <span className="font-bold">{sessionStats.upcoming}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>Pending</span></div>
                                                <span className="font-bold">{sessionStats.pending}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Cancelled</span></div>
                                                <span className="font-bold">{sessionStats.cancelled}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* MONTHLY ACTIVITY BAR CHART */}
                        <Card className="p-5">
                            <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Monthly Activity
                                </CardTitle>
                                <span className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{bookings.length}</span> sessions</span>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="flex items-end justify-between gap-2 h-32">
                                    {(() => {
                                        const monthlyData = Array.from({ length: 6 }, (_, i) => {
                                            const month = new Date();
                                            month.setMonth(month.getMonth() - (5 - i));
                                            return { month: month.toLocaleString('default', { month: 'short' }), count: bookings.filter(b => new Date(b.date).getMonth() === month.getMonth() && new Date(b.date).getFullYear() === month.getFullYear()).length };
                                        });
                                        const max = Math.max(...monthlyData.map(d => d.count), 1);
                                        return monthlyData.map((data, i) => {
                                            const height = (data.count / max) * 100;
                                            const isCurrentMonth = data.month === new Date().toLocaleString('default', { month: 'short' });
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="w-full bg-muted/30 rounded-t-lg relative flex-1" style={{ height: '80px' }}>
                                                        <div className={`absolute bottom-0 w-full rounded-t-lg ${data.count > 0 ? 'bg-gradient-to-t from-primary to-primary/50' : 'bg-muted/50'}`} style={{ height: `${Math.max(height, 4)}%` }} />
                                                    </div>
                                                    <span className={`text-xs ${isCurrentMonth ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{data.month}</span>
                                                    <span className="text-sm font-bold">{data.count}</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs Navigation */}
                <div className="flex justify-start sm:justify-center mb-10 sm:mb-16 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                    <div className="inline-flex p-1.5 sm:p-2 bg-muted/50 dark:bg-white/5 backdrop-blur-xl border border-border dark:border-white/10 rounded-xl sm:rounded-[1.5rem] relative shadow-inner flex-shrink-0">
                        {['upcoming', 'completed', 'students', 'earnings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300 z-10 whitespace-nowrap ${activeTab === tab ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTabMentor"
                                        className="absolute inset-0 bg-primary dark:bg-gradient-to-r dark:from-[var(--electric-blue)] dark:to-[var(--cyan)] rounded-2xl -z-10 shadow-lg shadow-primary/20 dark:shadow-[var(--electric-blue)]/20"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Container */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {activeTab === 'earnings' ? (
                            <EarningsTab earningsData={earningsData} transactionsData={transactionsData} />
                        ) : activeTab === 'students' ? (
                            <StudentsTab bookings={bookings} />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">
                                {loading ? (
                                    <div className="col-span-full py-24 flex flex-col items-center text-center">
                                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                                        <p className="text-muted-foreground text-lg font-medium">Loading sessions...</p>
                                    </div>
                                ) : filteredSessions.length > 0 ? (
                                    filteredSessions.map((booking) => (
                                        <StudentSessionCard
                                            key={booking._id}
                                            booking={booking}
                                            onStudentClick={() => onStudentClick?.(booking)}
                                            onAccept={() => handleBookingAction(booking._id, 'accept')}
                                            onReject={() => handleBookingAction(booking._id, 'reject')}
                                            onJoin={() => handleJoinSession(booking._id)}
                                            onChat={() => {
                            const candidate = booking.candidateId;
                            setActiveChat({
                                _id: candidate?.userId?._id || candidate?._id,
                                name: candidate?.userId?.name || candidate?.name || 'Student',
                                profileImage: candidate?.profileImage || candidate?.userId?.profileImage || '',
                                role: 'candidate'
                            });
                        }}
                                            isLoading={actionLoading === booking._id}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-24 flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-[2rem] bg-muted/50 dark:bg-white/5 flex items-center justify-center mb-8 border border-border dark:border-white/5">
                                            <Calendar className="w-10 h-10 text-muted-foreground/30" />
                                        </div>
                                        <h3 className="text-3xl font-black mb-3 tracking-tighter">No sessions found</h3>
                                        <p className="text-muted-foreground text-lg font-medium">Your schedule is currently clear.</p>
                                    </div>
                                )}
</div>
                        )}
                    </motion.div>
                </AnimatePresence>
                        </div>

                        {/* RIGHT VIEWPORT PANEL (lg:col-span-1) */}
                        <div className="lg:col-span-1">
                            <DashboardCalendar bookings={bookings} />
                        </div>
                    </div>
                )}
            </div>
            </main>
        </div>
    );
}

function EarningsTab({ earningsData, transactionsData }) {
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0 || amount > (earningsData.walletBalance || 0)) {
            toast.error('Invalid amount');
            return;
        }
        setWithdrawLoading(true);
        try {
            const { requestMentorPayout } = require('../services/api');
            await requestMentorPayout(amount);
            toast.success('Withdrawal request submitted!');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            window.location.reload();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Withdrawal failed');
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (!earningsData) {
        return (
            <div className="py-24 flex flex-col items-center text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                <p className="text-muted-foreground text-lg font-medium">Loading earnings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Wallet Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 shadow-lg"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Wallet className="w-8 h-8 text-emerald-500" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Wallet Balance</span>
                        </div>
                        {(earningsData.walletBalance || 0) > 0 && (
                            <Button
                                onClick={() => setShowWithdrawModal(true)}
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                            >
                                Withdraw
                            </Button>
                        )}
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-foreground">₹{earningsData.walletBalance || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 shadow-lg"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <TrendingUp className="w-8 h-8 text-blue-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Total Earned</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-foreground">₹{earningsData.totalEarnings || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 shadow-lg"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <BookOpen className="w-8 h-8 text-violet-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Paid Sessions</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-foreground">{earningsData.sessionEarnings?.length || 0}</p>
                </motion.div>
            </div>

            {/* Monthly Summary */}
            {earningsData.monthlySummary?.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Monthly Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {earningsData.monthlySummary.map(m => (
                            <div key={m.month} className="p-6 rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10">
                                <p className="text-sm font-black text-primary mb-3">
                                    {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-medium">Sessions</span>
                                        <span className="font-bold">{m.sessions}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-medium">Revenue</span>
                                        <span className="font-bold">₹{m.totalAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-medium">You Earned</span>
                                        <span className="font-bold text-emerald-500">₹{m.totalEarned}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Session Earnings Table */}
            {earningsData.sessionEarnings?.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Session Earnings</h3>
                    <div className="rounded-2xl border border-border dark:border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/30 dark:bg-white/5">
                                        <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Commission</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Earned</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {earningsData.sessionEarnings.map(s => (
                                        <tr key={s.bookingId} className="border-t border-border dark:border-white/5 hover:bg-muted/10 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-bold text-sm">{s.candidateName}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right font-bold">₹{s.amount}</td>
                                            <td className="px-6 py-4 text-sm text-right text-rose-400">-₹{s.commission}</td>
                                            <td className="px-6 py-4 text-sm text-right font-black text-emerald-500">₹{s.earned}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${s.walletCredited
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                    }`}>
                                                    {s.walletCredited ? 'Credited' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            {transactionsData?.transactions?.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Transaction History</h3>
                    <div className="space-y-3">
                        {transactionsData.transactions.map(tx => (
                            <div key={tx._id} className="flex items-center justify-between p-5 rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'credit'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : tx.type === 'refund'
                                            ? 'bg-amber-500/10 text-amber-500'
                                            : 'bg-rose-500/10 text-rose-500'
                                        }`}>
                                        {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> :
                                            tx.type === 'refund' ? <RotateCcw className="w-5 h-5" /> :
                                                <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold capitalize">{tx.type}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <p className={`text-lg font-black ${tx.type === 'credit' ? 'text-emerald-500' :
                                    tx.type === 'refund' ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state for no earnings */}
            {earningsData.sessionEarnings?.length === 0 && (
                <div className="py-16 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-muted/50 dark:bg-white/5 flex items-center justify-center mb-8 border border-border dark:border-white/5">
                        <IndianRupee className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 tracking-tighter">No earnings yet</h3>
                    <p className="text-muted-foreground text-lg font-medium">Complete paid sessions to start earning!</p>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
                        <div className="p-6">
                            <h3 className="text-2xl font-black mb-2">Withdraw Earnings</h3>
                            <p className="text-muted-foreground mb-6 font-medium">
                                Available balance: ₹{earningsData.walletBalance || 0}
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 text-muted-foreground">Amount</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full h-12 px-4 rounded-xl bg-muted/50 dark:bg-white/5 border border-border focus:border-primary outline-none font-bold"
                                        max={earningsData.walletBalance}
                                    />
                                </div>
                                
                                <div className="flex gap-2">
                                    {[1000, 2000, 5000, earningsData.walletBalance].filter(x => x > 0).map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setWithdrawAmount(amt)}
                                            className="px-3 py-2 rounded-lg bg-muted/50 dark:bg-white/5 text-sm font-bold hover:bg-primary/10"
                                        >
                                            ₹{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleWithdraw}
                                    disabled={withdrawLoading || !withdrawAmount}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                >
                                    {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
</div>
    );
}

function StudentsTab({ bookings }) {
    const [activeChat, setActiveChat] = useState(null);
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const uniqueStudents = completedBookings.reduce((acc, b) => {
        const studentId = b.candidateId?._id || b.candidateId;
        if (!acc[studentId]) {
            acc[studentId] = {
                name: b.candidateId?.name || b.candidateId?.userId?.name || 'Unknown',
                image: b.candidateId?.profileImage || b.candidateId?.userId?.profileImage || '',
                bookings: [],
            };
        }
        acc[studentId].bookings.push(b);
        return acc;
    }, {});

    const students = Object.values(uniqueStudents);

    const getSessionType = (booking) => {
        if (booking.amount === 0 || booking.paymentStatus === 'refunded') return 'demo';
        return 'paid';
    };

    const getFeedback = (booking) => {
        return booking.rating || booking.reviewId?.rating || null;
    };

    const getComment = (booking) => {
        return booking.comment || booking.reviewId?.comment || '';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-foreground">Your Students</h3>
                <Badge variant="secondary" className="text-sm font-bold">{students.length} Students</Badge>
            </div>

            {students.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-muted/50 dark:bg-white/5 flex items-center justify-center mb-8 border border-border dark:border-white/5">
                        <Users className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 tracking-tighter">No students yet</h3>
                    <p className="text-muted-foreground text-lg font-medium">Complete sessions to see your students here!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {students.map((student) => {
                        const totalSessions = student.bookings.length;
                        const totalSpent = student.bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                        const demoSessions = student.bookings.filter(b => getSessionType(b) === 'demo').length;
                        const paidSessions = student.bookings.filter(b => getSessionType(b) === 'paid').length;
                        const latestBooking = student.bookings[0];
                        const feedback = getFeedback(latestBooking);
                        const comment = getComment(latestBooking);

                        return (
                            <Card key={student.name} className="p-5 border-border hover:border-primary/30 transition-all">
                                <CardContent className="p-0">
                                    <div className="flex items-start gap-4">
                                        {student.image ? (
                                            <img src={student.image} alt={student.name} className="w-14 h-14 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <span className="text-xl font-black text-primary">{student.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h4 className="text-lg font-bold text-foreground">{student.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{totalSessions} session{totalSessions > 1 ? 's' : ''} • ₹{totalSpent} total</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {demoSessions > 0 && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Demo: {demoSessions}</Badge>}
                                                    {paidSessions > 0 && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid: {paidSessions}</Badge>}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {student.bookings.slice(0, 3).map((booking, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 dark:bg-white/5 rounded-lg p-3">
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSessionType(booking) === 'demo' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                                {getSessionType(booking).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        {getFeedback(booking) ? (
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                                <span className="font-bold text-amber-600">{booking.rating}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">No feedback</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {student.bookings.length > 3 && (
                                                    <p className="text-xs text-muted-foreground text-center">+ {student.bookings.length - 3} more sessions</p>
                                                )}
                                            </div>

                                            {feedback && (
                                                <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                                    <p className="text-xs font-bold text-amber-600 mb-1">Latest Feedback:</p>
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                        <span className="text-sm font-bold text-amber-600">{feedback}/5</span>
                                                    </div>
                                                    {comment && <p className="text-sm text-foreground italic">"{comment}"</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
            {activeChat && (
                <ChatButton
                    participantId={activeChat._id}
                    participantName={activeChat.name}
                    participantImage={activeChat.profileImage}
                    participantRole={activeChat.role}
                />
            )}
        </div>
    );
}

/* =========================
   STUDENT SESSION CARD
  ========================= */
function StudentSessionCard({ booking, onStudentClick, onAccept, onReject, onJoin, isLoading, onChat }) {
    const candidateUser = booking.candidateId?.userId;
    const studentName = candidateUser?.name || 'Unknown Student';
    const studentImage = candidateUser?.profileImage || booking.candidateId?.profileImage || '';
    const sessionDate = booking.date ? new Date(booking.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : 'N/A';
    const sessionTime = booking.time || 'N/A';
    const duration = booking.duration || 0;
    const status = booking.status;
    const sessionType = booking.sessionType;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20';
            case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20';
            case 'awaiting-payment': return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20';
            case 'in-progress': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20';
            case 'completed': return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-500 border-zinc-500/20';
            case 'cancelled': return 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20';
            default: return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="group relative p-5 sm:p-6 rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/5 shadow-lg dark:shadow-none overflow-hidden transition-all hover:shadow-xl hover:border-primary/20 h-full flex flex-col"
        >
            <div className="flex items-start justify-between mb-4">
                {studentImage ? (
                    <img 
                        src={studentImage} 
                        alt={studentName} 
                        className="w-14 h-14 rounded-xl object-cover border-2 border-border shadow-md"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                ) : null}
                <div 
                    style={{ display: studentImage ? 'none' : 'flex' }}
                    className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center shrink-0 border-2 border-border shadow-md"
                >
                    <span className="text-xl font-black text-primary">{studentName.charAt(0)}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(status)}`}>
                        {status === 'awaiting-payment' ? 'Awaiting Pay' : status}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${sessionType === 'demo'
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : 'bg-violet-500/10 text-violet-500 border border-violet-500/20'
                        }`}>
                        {sessionType}
                    </div>
                </div>
            </div>

            <div className="mb-4 cursor-pointer flex-1" onClick={onStudentClick}>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {studentName}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />{sessionDate}</div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{sessionTime} ({duration} min)</div>
                    {booking.amount > 0 && (
                        <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />₹{booking.amount}</div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 pt-4 mt-auto">
                <button
                    onClick={onChat}
                    className="w-11 h-11 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all flex items-center justify-center shrink-0"
                >
                    <MessageSquare className="w-4 h-4 text-primary" />
                </button>
                {status === 'pending' && (
                    <>
                        <button
                            onClick={onAccept}
                            disabled={isLoading}
                            className="flex-1 h-11 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Accept
                        </button>
                        <button
                            onClick={onReject}
                            disabled={isLoading}
                            className="w-11 h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                            <XCircle className="w-5 h-5 text-rose-500" />
                        </button>
                    </>
                )}
                {status === 'confirmed' && (
                    <button
                        onClick={onJoin}
                        disabled={isLoading}
                        className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        Join
                    </button>
                )}
                {status === 'in-progress' && (
                    <button
                        onClick={onJoin}
                        disabled={isLoading}
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 text-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        Join Now
                    </button>
                )}
                {status === 'awaiting-payment' && (
                    <div className="flex-1 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center justify-center gap-2 text-sm">
                        <Clock className="w-4 h-4" />
                        Waiting
                    </div>
                )}
            </div>
        </motion.div>
    );
}
