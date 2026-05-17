import { useState, useEffect, useCallback } from 'react';
import { searchMentors as searchMentorsAPI, getMyBookings, cancelBooking as cancelBookingAPI, joinSession as joinSessionAPI, createRazorpayOrder, verifyRazorpayPayment, getNotificationsAPI, submitTicketAPI, getMyTicketsAPI, getCandidateProfile } from '../services/api';
import { useBookingNotifications } from '../hooks/useBookingNotifications';
import useAuthStore from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
    Calendar,
    Clock,
    Video,
    Star,
    Search,
    X,
    Sparkles,
    Loader2,
    XCircle,
    IndianRupee,
    History,
    Compass,
    Settings,
    LogOut,
    User,
    Bell,
    HelpCircle,
    Menu,
    Sun,
    Moon,
    PanelLeftClose,
    PanelLeftOpen,
    TrendingUp,
    Users,
    Award,
    Zap,
} from 'lucide-react';
import { MentorCard } from './MentorShowcase';
import { getPopularSkills } from '../services/api';
import { RatingModal } from './RatingModal';
import { DashboardCalendar } from './DashboardCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '../context/ThemeContext';

export function CandidateDashboard({ initialTab = 'upcoming', onMentorClick, onBookDemo, onProfileClick, onLogout, onExploreFullPage, onSettings }) {
    const { user: authUser, candidateProfile, logout, setCandidateProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [apiMentors, setApiMentors] = useState([]);
    const [mentorsLoading, setMentorsLoading] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [popularSkills, setPopularSkills] = useState(['React', 'Figma', 'Python', 'AWS', 'System Design']);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const fetchAll = async () => {
            await fetchBookings();
            try {
                const profileRes = await getCandidateProfile();
                if (profileRes.data?.candidate) {
                    setCandidateProfile(profileRes.data.candidate);
                }
            } catch (e) {
                console.error('Failed to fetch candidate profile:', e);
            }
        };
        fetchAll();
    }, []);

    useEffect(() => {
        const handler = () => fetchBookings();
        window.addEventListener('bookingCompleted', handler);
        return () => window.removeEventListener('bookingCompleted', handler);
    }, []);

    const handleBookingStatusUpdate = useCallback(() => {
        fetchBookings();
    }, []);

    useBookingNotifications({
        onBookingStatusUpdate: handleBookingStatusUpdate
    });

    const fetchBookings = async () => {
        setBookingsLoading(true);
        try {
            const res = await getMyBookings();
            setBookings(res.data.bookings || []);
        } catch (err) {
            console.error('Failed to fetch bookings:', err);
            toast.error('Failed to load your sessions');
        } finally {
            setBookingsLoading(false);
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

    // Generate notifications from bookings combined with DB broadcasts
    useEffect(() => {
        const notifs = [];
        const now = new Date();
        
        bookings.forEach(booking => {
            const sessionTime = new Date(booking.date);
            const timeDiff = sessionTime - now;
            const hoursUntil = timeDiff / (1000 * 60 * 60);
            
            // Session starting in 15 minutes
            if (booking.status === 'confirmed' && hoursUntil > 0 && hoursUntil <= 0.25) {
                notifs.push({
                    id: `remind-${booking._id}`,
                    type: 'reminder',
                    title: 'Session starting soon',
                    message: `Your session with ${booking.mentorId?.userId?.name || 'mentor'} starts in 15 minutes`,
                    time: new Date(),
                    read: false,
                    booking
                });
            }
            
            // Session completed - needs rating
            if (booking.status === 'completed' && !booking.rated) {
                notifs.push({
                    id: `rate-${booking._id}`,
                    type: 'rating',
                    title: 'Rate your session',
                    message: `Rate your session with ${booking.mentorId?.userId?.name || 'mentor'}`,
                    time: new Date(booking.date),
                    read: false,
                    booking
                });
            }
            
            // Payment successful
            if (booking.paymentStatus === 'paid' && booking.status === 'confirmed') {
                notifs.push({
                    id: `confirm-${booking._id}`,
                    type: 'confirmation',
                    title: 'Booking confirmed',
                    message: `Your session with ${booking.mentorId?.userId?.name || 'mentor'} is confirmed`,
                    time: new Date(booking.date),
                    read: true,
                    booking
                });
            }
        });
        
        fetchBroadcastNotifications().then(dbNotifs => {
            const merged = [...dbNotifs, ...notifs].sort((a, b) => new Date(b.time) - new Date(a.time));
            setNotifications(merged.slice(0, 15));
        });
    }, [bookings, fetchBroadcastNotifications]);

    // Calculate stats from bookings - dynamic based on actual status
    const stats = {
        completed: bookings.filter(b => b.status === 'completed').length,
        upcoming: bookings.filter(b => b.status === 'confirmed' || b.status === 'in-progress').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        pending: bookings.filter(b => b.status === 'pending' || b.status === 'awaiting-payment').length,
    };
    const totalSpent = bookings.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);

    // Skill distribution from booked mentors
    const skillDistribution = bookings.reduce((acc, b) => {
        const skills = b.mentorId?.skills || [];
        skills.forEach(skill => {
            acc[skill] = (acc[skill] || 0) + 1;
        });
        return acc;
    }, {});
    const topSkills = Object.entries(skillDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    // Monthly activity (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (5 - i));
        const monthKey = month.toLocaleString('default', { month: 'short' });
        const count = bookings.filter(b => {
            const bookingDate = new Date(b.date);
            return bookingDate.getMonth() === month.getMonth() && bookingDate.getFullYear() === month.getFullYear();
        }).length;
        return { month: monthKey, count };
    });

    useEffect(() => {
        if (activeTab !== 'discovery') return;
        setMentorsLoading(true);
        const params = { lat: 19.076, lng: 72.8777, radius: 50000 };
        searchMentorsAPI(params)
            .then(res => {
                const formatted = (res.data.mentors || []).map(m => ({
                    _id: m._id,
                    name: m.userId?.name || 'Mentor',
                    title: m.title || 'Expert Mentor',
                    company: m.company || '',
                    image: m.profileImage || '',
                    rating: m.averageRating || 0,
                    sessions: m.completedSessions || 0,
                    rate: m.hourlyRate || 500,
                    skills: m.skills || [],
                    isVerified: m.verified || false,
                }));
                setApiMentors(formatted);
            })
            .catch(err => {
                console.error('Mentor search failed:', err.message);
                toast.error('Failed to load mentors');
                setApiMentors([]);
            })
            .finally(() => setMentorsLoading(false));
    }, [activeTab, searchQuery]);

    useEffect(() => {
        getPopularSkills()
            .then(res => {
                if (res.data.skills?.length > 0) setPopularSkills(res.data.skills);
            })
            .catch(() => {});
    }, []);

    const handleCancel = async (bookingId) => {
        setActionLoading(bookingId);
        try {
            const res = await cancelBookingAPI(bookingId);
            const refund = res.data.refundAmount;
            toast.success(refund > 0 ? `Cancelled. Refund: ₹${refund}` : 'Booking cancelled');
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        } finally {
            setActionLoading(null);
        }
    };

    const handleJoinSession = async (bookingId) => {
        if (!bookingId) {
            toast.error('Invalid booking');
            return;
        }
        setActionLoading(bookingId);
        try {
            const res = await joinSessionAPI(bookingId);
            const booking = bookings.find(b => b._id === bookingId);
            
            if (!booking) {
                toast.error('Booking not found');
                return;
            }
            
            const meetingLink = res.data?.meetingLink;
            if (res.data?.isWebSocket && meetingLink) {
                window.dispatchEvent(new CustomEvent('joinSession', {
                    detail: { 
                        mentor: booking?.mentorId, 
                        session: { 
                            ...booking, 
                            meetingLink, 
                            duration: booking?.duration || 60,
                            _id: booking._id 
                        } 
                    }
                }));
                toast.success('Joining session...');
            } else if (meetingLink) {
                window.open(meetingLink, '_blank');
            } else {
                toast.error('No meeting link available');
            }
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join session');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePayment = async (booking) => {
        setActionLoading(booking._id);
        try {
            const res = await createRazorpayOrder(booking._id);
            if (!res.data.success) throw new Error(res.data.message);
            const order = res.data.order;
            const options = {
                key: 'rzp_test_SIMv7P6qTeyOXd',
                amount: order.amount,
                currency: 'INR',
                name: 'GuruConnect',
                description: `Session with ${booking.mentorId?.userId?.name || 'Mentor'}`,
                order_id: order.id,
                handler: async (response) => {
                    setActionLoading(booking._id);
                    try {
                        const verifyRes = await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        if (verifyRes.data.success) toast.success('Payment successful!');
                    } catch { toast.error('Verification failed'); }
                    finally { setActionLoading(null); fetchBookings(); }
                },
                theme: { color: '#6366f1' }
            };
            new window.Razorpay(options).open();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Payment failed');
            setActionLoading(null);
        }
    };

    const filteredSessions = bookings.filter(booking => {
        if (activeTab === 'upcoming') return ['pending', 'confirmed', 'awaiting-payment', 'in-progress'].includes(booking.status);
        if (activeTab === 'completed') return booking.status === 'completed';
        if (activeTab === 'cancelled') return booking.status === 'cancelled';
        return false;
    });

    const filteredMentors = apiMentors.filter(mentor =>
        searchQuery === '' || mentor.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const upcomingCount = bookings.filter(b => ['pending', 'confirmed', 'awaiting-payment', 'in-progress'].includes(b.status)).length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;

    const navItems = [
        { id: 'upcoming', label: 'Sessions', icon: Calendar },
        { id: 'completed', label: 'History', icon: History },
        { id: 'mentors', label: 'Mentors', icon: Compass },
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
            {/* LEFT SIDEBAR - w-64 */}
            <aside className="w-64 h-full border-r border-border bg-card/50 backdrop-blur-md hidden md:flex flex-col">
                {/* Logo */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-black text-xl">G</span>
                        </div>
                        <span className="text-xl font-black tracking-tight">Guru<span className="text-primary">Connect</span></span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => item.id === 'mentors' ? onExploreFullPage?.() : setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                                activeTab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Bottom Links */}
                <div className="p-4 space-y-1 border-t border-border">
                    <button 
                        onClick={() => onSettings?.()}
                        className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        <Settings className="w-5 h-5" />
                        Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('help')}
                        className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                            activeTab === 'help'
                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <HelpCircle className="w-5 h-5" />
                        Help Center
                    </button>
                </div>
            </aside>

            {/* RIGHT MAIN AREA - flex-1 */}
            <main className={`flex flex-col h-full flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? '' : 'ml-0'}`}>
                {/* TOP HEADER - h-16 */}
                <header className="h-16 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-card/30">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            <Menu className="w-5 h-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-foreground">
                            My Sessions
                        </h1>
                        <Badge variant="secondary" className="hidden sm:inline-flex">{upcomingCount} upcoming</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="w-5 h-5" />
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Notifications</span>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={() => setNotifications(n => n.map(n => ({ ...n, read: true })))}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(notif => (
                                        <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                                            <div className="flex items-center gap-2 w-full">
                                                {notif.type === 'reminder' && <Clock className="w-4 h-4 text-amber-500" />}
                                                {notif.type === 'rating' && <Star className="w-4 h-4 text-primary" />}
                                                {notif.type === 'confirmation' && <Sparkles className="w-4 h-4 text-green-500" />}
                                                <span className={`text-sm font-medium ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {notif.title}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {notif.message}
                                            </span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={candidateProfile?.profileImage || authUser?.profileImage || ''} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                                            {authUser?.name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden sm:inline text-sm font-medium">{authUser?.name || 'Student'}</span>
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
                                <DropdownMenuItem onClick={onProfileClick}>
                                    <User className="mr-2 h-4 w-4" />
                                    My Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onSettings?.()}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { logout(); onLogout?.(); }}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* SCROLLABLE CONTENT - ASYMMETRICAL GRID LAYOUT */}
                <div className="flex-1 overflow-y-auto bg-background/50">
                    {activeTab === 'help' ? (
                        <div className="max-w-7xl mx-auto w-full p-6">
                            {renderHelpCenter()}
                        </div>
                    ) : activeTab === 'mentors' ? (
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
                                            <h2 className="text-2xl font-black text-foreground mb-1">Welcome back, {authUser?.name?.split(' ')[0] || 'Student'}!</h2>
                                            <p className="text-muted-foreground">
                                                {upcomingCount > 0 ? `You have ${upcomingCount} upcoming session${upcomingCount > 1 ? 's' : ''}` : 'Book a session to get started'}
                                            </p>
                                        </div>
                                        <Button onClick={onExploreFullPage || (() => setActiveTab('discovery'))}><Compass className="w-4 h-4 mr-2" />Explore Mentors</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CHARTS SECTION */}
                            {bookingsLoading ? (
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
                                                    <p className="text-xs mt-1">Book your first session to see stats</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-6">
                                                    {/* PIE CHART */}
                                                    <div className="relative w-32 h-32">
                                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                                                            {(() => {
                                                                const total = stats.completed + stats.upcoming + stats.cancelled + stats.pending || 1;
                                                                let offset = 0;
                                                                const calc = (val) => {
                                                                    const percent = (val / total) * 100;
                                                                    const o = offset;
                                                                    offset += percent;
                                                                    return { percent, offset: o };
                                                                };
                                                                const c1 = calc(stats.completed);
                                                                const c2 = calc(stats.upcoming);
                                                                const c3 = calc(stats.cancelled);
                                                                const c4 = calc(stats.pending);
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
                                                    {/* LEGEND */}
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Completed</span></div>
                                                            <span className="font-bold">{stats.completed}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Upcoming</span></div>
                                                            <span className="font-bold">{stats.upcoming}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>Pending</span></div>
                                                            <span className="font-bold">{stats.pending}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Cancelled</span></div>
                                                            <span className="font-bold">{stats.cancelled}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* SKILLS PIE CHART */}
                                    <Card className="p-5">
                                        <CardHeader className="p-0 mb-4">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-primary" />
                                                Top Skills Learned
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {topSkills.length > 0 ? (
                                                <div className="flex items-center gap-6">
                                                    <div className="relative w-32 h-32">
                                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                                                            {topSkills.map(([_, count], i) => {
                                                                const total = topSkills.reduce((s, [,c]) => s + c, 0);
                                                                const percent = (count / (total || 1)) * 100;
                                                                const colors = ['text-primary', 'text-purple-500', 'text-amber-500', 'text-cyan-500', 'text-pink-500'];
                                                                const offset = topSkills.slice(0, i).reduce((s, [,c]) => s + (c / (total || 1) * 100), 0);
                                                                return <circle key={i} cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${percent} 100`} strokeDashoffset={`-${offset}`} className={colors[i % colors.length]} />;
                                                            })}
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Award className="w-6 h-6 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        {topSkills.map(([skill, count], i) => {
                                                            const colors = ['bg-primary', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500'];
                                                            return (
                                                                <div key={skill} className="flex items-center justify-between text-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                                                        <span className="truncate max-w-[100px]">{skill}</span>
                                                                    </div>
                                                                    <span className="font-bold">{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Book sessions to see skill breakdown</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* MONTHLY ACTIVITY BAR CHART */}
                                    <Card className="p-5 lg:col-span-2">
                                        <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                Monthly Activity
                                            </CardTitle>
                                            <span className="text-sm text-muted-foreground">
                                                Total: <span className="font-bold text-foreground">{bookings.length}</span> sessions
                                            </span>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="flex items-end justify-between gap-2 h-40">
                                                {monthlyData.map((data, i) => {
                                                    const max = Math.max(...monthlyData.map(d => d.count), 1);
                                                    const height = (data.count / max) * 100;
                                                    const isCurrentMonth = data.month === new Date().toLocaleString('default', { month: 'short' });
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                            <div className="w-full bg-muted/30 rounded-t-lg relative flex-1 flex items-end group" style={{ height: '100px' }}>
                                                                <div 
                                                                    className={`w-full rounded-t-lg transition-all duration-500 ${data.count > 0 ? 'bg-gradient-to-t from-primary to-primary/50' : 'bg-muted/50'} ${isCurrentMonth ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                                                    style={{ height: `${Math.max(height, 4)}%` }}
                                                                />
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                    {data.count} session{data.count !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs ${isCurrentMonth ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{data.month}</span>
                                                            <span className={`text-sm font-bold ${data.count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{data.count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* TABS */}
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger><TabsTrigger value="cancelled">Cancelled</TabsTrigger></TabsList>

                            
                            <TabsContent value="upcoming" className="mt-6">
                                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">
                                    {bookingsLoading ? (
                                        <div className="col-span-full py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading...</p></div>
                                    ) : filteredSessions.length > 0 ? (
                                        filteredSessions.map(booking => (
                                            <SessionCard key={booking._id} booking={booking} onMentorClick={() => onMentorClick?.(booking.mentorId)} onJoinSession={() => handleJoinSession(booking._id)} onCancel={() => handleCancel(booking._id)} onPayment={() => handlePayment(booking)} onRateSession={() => { setSelectedBooking(booking); setRatingModalOpen(true); }} isLoading={actionLoading === booking._id} />
                                        ))
                                    ) : (
                                        <EmptyState onExploreFullPage={onExploreFullPage} />
                                    )}
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="completed" className="mt-6">
                                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">
                                    {bookingsLoading ? (
                                        <div className="col-span-full py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading...</p></div>
                                    ) : filteredSessions.length > 0 ? (
                                        filteredSessions.map(booking => (
                                            <SessionCard key={booking._id} booking={booking} onMentorClick={() => onMentorClick?.(booking.mentorId)} onJoinSession={() => handleJoinSession(booking._id)} onCancel={() => handleCancel(booking._id)} onPayment={() => handlePayment(booking)} onRateSession={() => { setSelectedBooking(booking); setRatingModalOpen(true); }} isLoading={actionLoading === booking._id} />
                                        ))
                                    ) : (
                                        <EmptyState onExploreFullPage={onExploreFullPage} message="No completed sessions" />
                                    )}
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="cancelled" className="mt-6">
                                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">
                                    {bookingsLoading ? (
                                        <div className="col-span-full py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading...</p></div>
                                    ) : filteredSessions.length > 0 ? (
                                        filteredSessions.map(booking => (
                                            <SessionCard key={booking._id} booking={booking} onMentorClick={() => onMentorClick?.(booking.mentorId)} onJoinSession={() => handleJoinSession(booking._id)} onCancel={() => handleCancel(booking._id)} onPayment={() => handlePayment(booking)} onRateSession={() => { setSelectedBooking(booking); setRatingModalOpen(true); }} isLoading={actionLoading === booking._id} />
                                        ))
                                    ) : (
                                        <EmptyState onExploreFullPage={onExploreFullPage} message="No cancelled sessions" />
                                    )}
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                        </div>

                        {/* RIGHT VIEWPORT PANEL (lg:col-span-1) */}
                        <div className="lg:col-span-1">
                            <DashboardCalendar bookings={bookings} />
                        </div>
                    </div>
                )}
            </div>
            </main>

            <RatingModal isOpen={ratingModalOpen} onClose={() => { setRatingModalOpen(false); setSelectedBooking(null); }} booking={selectedBooking} onReviewSubmit={fetchBookings} />
        </div>
    );
}

function SessionCard({ booking, onMentorClick, onJoinSession, onCancel, onPayment, onRateSession, isLoading }) {
    const mentorName = booking.mentorId?.userId?.name || 'Unknown';
    const mentorImage = booking.mentorId?.profileImage || booking.mentorId?.userId?.profileImage || '';
    const sessionDate = booking.date ? new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const status = booking.status;
    const statusStyles = { completed: 'bg-emerald-500/10 text-emerald-600', cancelled: 'bg-rose-500/10 text-rose-600', 'awaiting-payment': 'bg-amber-500/10 text-amber-600', confirmed: 'bg-blue-500/10 text-blue-600', pending: 'bg-amber-500/10 text-amber-600', 'in-progress': 'bg-green-500/10 text-green-600' };

    return (
        <motion.div whileHover={{ y: -4 }}>
            <Card className="p-6 border-border hover:border-primary/30 transition-all h-full flex flex-col">
                <CardContent className="p-0 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                        {mentorImage ? (
                            <img src={mentorImage} alt={mentorName} className="w-14 h-14 rounded-xl object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                        ) : null}
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" style={{ display: mentorImage ? 'none' : 'flex' }}>
                            <span className="text-lg font-black text-primary">{mentorName.charAt(0)}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs font-bold uppercase ${statusStyles[status] || statusStyles.pending}`}>{status}</Badge>
                    </div>
                    <div className="mb-4 cursor-pointer" onClick={onMentorClick}>
                        <h3 className="text-lg font-bold mb-3 hover:text-primary transition-colors">{mentorName}</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{sessionDate}</div>
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{booking.time} ({booking.duration} min)</div>
                            {booking.amount > 0 && <div className="flex items-center gap-2"><IndianRupee className="w-4 h-4" />₹{booking.amount}</div>}
                        </div>
                    </div>
                    <div className="mt-auto pt-4">
                        {status === 'pending' && (
                            <div className="flex gap-2">
                                <div className="flex-1 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-sm">Waiting</div>
                                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onCancel} disabled={isLoading}><XCircle className="w-5 h-5 text-rose-500" /></Button>
                            </div>
                        )}
                        {status === 'confirmed' && (
                            <div className="flex gap-2">
                                <Button className="flex-1 h-11" onClick={onJoinSession} disabled={isLoading}><Video className="w-4 h-4 mr-2" />Join</Button>
                                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onCancel} disabled={isLoading}><XCircle className="w-5 h-5 text-rose-500" /></Button>
                            </div>
                        )}
                        {status === 'in-progress' && (
                            <Button className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600" onClick={onJoinSession} disabled={isLoading}><Video className="w-4 h-4 mr-2" />Join Now</Button>
                        )}
                        {status === 'awaiting-payment' && (
                            <Button className="w-full h-11 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600" onClick={() => onPayment(booking)} disabled={isLoading}><IndianRupee className="w-4 h-4 mr-2" />Pay ₹{booking.amount}</Button>
                        )}
                        {status === 'completed' && (
                            <Button variant="outline" className="w-full h-11" onClick={onRateSession}><Star className="w-4 h-4 mr-2" />Rate Session</Button>
                        )}
                        {status === 'cancelled' && (
                            <div className="h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center font-bold text-sm">Cancelled</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function EmptyState({ onExplore, onExploreFullPage, message = "No sessions yet" }) {
    return (
        <div className="col-span-full py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-card border flex items-center justify-center mx-auto mb-6"><Calendar className="w-10 h-10 text-muted-foreground" /></div>
            <h3 className="text-xl font-bold mb-2">{message}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Start your learning journey by booking a session.</p>
            <Button onClick={onExploreFullPage || onExplore}><Compass className="w-4 h-4 mr-2" />Explore Mentors</Button>
        </div>
    );
}