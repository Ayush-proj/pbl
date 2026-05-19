import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createBooking, getMentorSlots } from '../services/api';
import useMentorStore from '../store/mentorStore';
import {
    X,
    Calendar as CalendarIcon,
    Clock,
    Zap,
    Video,
    ShieldCheck,
    CheckCircle2,
    Info,
    ArrowRight,
    ChevronRight,
    Loader2,
    Lock,
    IndianRupee,
    Timer,
    ChevronDown
} from 'lucide-react';
import { Calendar } from './ui/calendar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from './ui/utils';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from './ui/drawer';
import { useIsMobile } from './ui/use-mobile';

export function BookingModal({ mentor, isOpen, onClose, onBookingComplete, initialType = 'paid' }) {
    const isMobile = useIsMobile();
    const isDesktop = !isMobile;
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [sessionType, setSessionType] = useState(initialType); // 'demo' or 'paid'
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasExistingDemo, setHasExistingDemo] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showScrollTopShadow, setShowScrollTopShadow] = useState(false);
    const [showScrollBottomShadow, setShowScrollBottomShadow] = useState(true);
    const [serverMessage, setServerMessage] = useState(null);
    
    // Full mentor data with availability
    const [fullMentor, setFullMentor] = useState(null);
    const { setMentor, getMentor } = useMentorStore();

    const contentRef = useRef(null);
    const slotsRef = useRef(null);
    const errorRef = useRef(null);

    // Sync session type with prop when modal opens
    useEffect(() => {
        if (isOpen) {
            setSessionType(initialType);
            setSelectedSlot(null);
            setSuccess(false);
            setError(null);
            setServerMessage(null);
            setHasExistingDemo(false);
            setAvailableSlots([]);
            setIsLoadingSlots(true);
            setIsSubmitting(false);
            setShowScrollTopShadow(false);
            setShowScrollBottomShadow(true);
        }
    }, [isOpen, initialType]);

    // Handle scroll for shadow indicators
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setShowScrollTopShadow(scrollTop > 10);
        setShowScrollBottomShadow(scrollHeight - scrollTop - clientHeight > 10);
    };

    // Auto-scroll to error
    useEffect(() => {
        if (error && contentRef.current) {
            const errorElement = errorRef.current || slotsRef.current;
            if (errorElement) {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [error]);

    const [availableSlots, setAvailableSlots] = useState([]);
    const [dayAvailability, setDayAvailability] = useState(null);
    const [currentDay, setCurrentDay] = useState(null);
    const [allSlotsCount, setAllSlotsCount] = useState(0);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isToday, setIsToday] = useState(false);
    const [isPastDate, setIsPastDate] = useState(false);

    // Fetch FULL mentor profile with availability EVERY time modal opens
    useEffect(() => {
        if (!isOpen || !mentor?._id) {
            setFullMentor(null);
            return;
        }
        
        const mentorId = mentor._id || mentor.id;
        
        // ALWAYS fetch fresh data when modal opens - no cache
        const fetchMentorProfile = async () => {
            setIsLoadingSlots(true);
            try {
                const { getMentorProfile } = await import('../services/api');
                const res = await getMentorProfile();
                if (res.data?.mentor) {
                    const fullData = res.data.mentor;
                    setFullMentor(fullData);
                    // Update cache
                    setMentor(mentorId, fullData);
                } else {
                    setFullMentor(mentor);
                }
            } catch (err) {
                console.log('Using passed mentor data');
                setFullMentor(mentor);
            }
        };
        
        fetchMentorProfile();
    }, [isOpen, mentor?._id, mentor?.id]);

    useEffect(() => {
        if (!isOpen || !mentor?._id) return;

        const abortController = new AbortController();
        setIsLoadingSlots(true);
        setSelectedSlot(null);
        setError(null);
        setServerMessage(null);
        setStatusMessage(null);

        const dateStr = selectedDate.toISOString().split('T')[0];
        const mentorId = mentor._id || mentor.id;
        
        console.log('📡 Fetching slots for mentor:', mentorId, 'date:', dateStr, 'sessionType:', sessionType);
        console.log('📡 Mentor full data:', JSON.stringify(fullMentor?.availability));

        getMentorSlots(mentorId, { date: dateStr, sessionType })
            .then(res => {
                if (abortController.signal.aborted) return;
                console.log('📥 Slots API response:', res.data);
                
                const slots = (res.data.slots || []).map(time24 => {
                    const [h, m] = time24.split(':').map(Number);
                    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return {
                        id: time24,
                        time: `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`,
                        time24,
                        available: true,
                        status: 'available'
                    };
                });
                
                if (!abortController.signal.aborted) {
                    setAvailableSlots(slots);
                    setDayAvailability(res.data.availability || null);
                    setCurrentDay(res.data.day || null);
                    setHasExistingDemo(res.data.hasExistingDemo || false);
                    setAllSlotsCount(res.data.allSlotsCount || 0);
                    setIsToday(res.data.isToday || false);
                    setIsPastDate(res.data.isPastDate || false);
                    
                    // Set appropriate message
                    if (res.data.message) {
                        setStatusMessage(res.data.message);
                        setServerMessage(res.data.message);
                    }
                    
                    if (res.data.hasExistingDemo && sessionType === 'demo') {
                        const msg = 'Demo session already used with this mentor. Please select a paid session.';
                        setStatusMessage(msg);
                        setServerMessage(msg);
                        setSessionType('paid');
                    }
                }
            })
            .catch(err => {
                if (abortController.signal.aborted) return;
                console.error('Failed to fetch slots:', err);
                setAvailableSlots([]);
                setError('Failed to load available slots');
            })
            .finally(() => {
                if (!abortController.signal.aborted) setIsLoadingSlots(false);
            });

        return () => abortController.abort();
    }, [isOpen, selectedDate, sessionType, mentor?._id, mentor?.id, fullMentor]);


    // hasExistingDemo is fetched from server and tracked in state


    const handleBookSession = async () => {
        if (!selectedSlot) return;
        setIsSubmitting(true);
        setError(null);
        setServerMessage(null);

        try {
            const slot = availableSlots.find(s => s.time === selectedSlot);
            const time24 = slot?.time24 || '09:00';

            const dateStr = selectedDate.toISOString().split('T')[0];
            const mentorId = mentor?._id || mentor?.id;
            if (!mentorId) {
                setError('Invalid mentor data. Please try again.');
                setIsSubmitting(false);
                return;
            }

            const response = await createBooking({
                mentorId,
                date: dateStr,
                time: time24,
                duration: sessionType === 'demo' ? 15 : 60,
                sessionType
            });

            setIsSubmitting(false);
            setSuccess(true);
            if (response.data.message) {
                setServerMessage(response.data.message);
            }
            setTimeout(() => {
                onBookingComplete?.({
                    mentor,
                    date: selectedDate,
                    slot: selectedSlot,
                    type: sessionType
                });
                onClose();
            }, 3000);
        } catch (err) {
            const message = err.response?.data?.message || 'Booking failed. Please try again.';
            setError(message);
            setIsSubmitting(false);
        }
    };


    const modalContent = (
        <div className="flex flex-col h-full overflow-hidden relative bg-card dark:bg-background/40">
            {/* Sticky Header */}
            <div className="shrink-0 p-6 md:p-8 border-b border-border dark:border-white/5 bg-background/80 dark:bg-background/60 backdrop-blur-2xl z-30 relative">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-[var(--electric-blue)] to-[var(--cyan)]">
                            <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                                <ImageWithFallback src={mentor?.image} alt={mentor?.name} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Book a Session</h2>
                            <p className="text-sm text-muted-foreground font-medium">with <span className="text-[var(--electric-blue)] font-bold">{mentor?.name}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close booking modal"
                        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-foreground/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none shrink-0"
                    >
                        <X className="w-6 h-6 text-foreground/40" />
                    </button>
                </div>
            </div>

            {/* Scroll indicators - top shadow */}
            <div className={cn(
                "absolute top-[105px] md:top-[121px] left-0 right-0 h-12 bg-gradient-to-b from-black/5 dark:from-black/20 to-transparent pointer-events-none z-20 transition-opacity duration-300",
                showScrollTopShadow ? "opacity-100" : "opacity-0"
            )} />

            {/* Scrollable Content Area */}
            <div
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-10 scroll-smooth relative bg-background/30 dark:bg-transparent"
            >
                {/* Step 1: Date Selection */}
                <section>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        1. Select Date
                    </h3>
                    <div className="bg-card dark:bg-white/5 border border-border dark:border-white/5 rounded-3xl p-4 flex justify-center shadow-sm">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) {
                                    setSelectedDate(date);
                                }
                            }}
                            disabled={(date) => {
                                // Only block past dates - show all future days including weekends
                                // Backend will handle mentor's availability for each day
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                            }}
                            defaultMonth={new Date()}
                            className="bg-transparent border-none text-foreground"
                            classNames={{
                                day_selected: "bg-[var(--electric-blue)] text-white dark:text-black font-bold shadow-[0_4px_12px_rgba(0,186,226,0.3)] dark:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
                                day_today: "text-[var(--electric-blue)] font-bold border border-[var(--electric-blue)]/20",
                            }}
                        />
                    </div>
                    {/* Date Info Banner */}
                    <div className="mt-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {selectedDate.toDateString() === new Date().toDateString() && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                    TODAY
                                </span>
                            )}
                        </div>
                        {selectedDate.toDateString() === new Date().toDateString() && (
                            <div className="text-xs text-muted-foreground/70">
                                Current time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Step 2: Time Slots */}
                <section ref={slotsRef}>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        2. Available Slots
                        {currentDay && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {currentDay}
                            </span>
                        )}
                    </h3>
                    {statusMessage && (
                        <div className={cn(
                            "mb-3 px-3 py-2 rounded-lg border text-xs font-medium",
                            statusMessage.includes('booked') || statusMessage.includes('used')
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        )}>
                            <Info className="w-3.5 h-3.5 inline mr-1.5" />
                            {statusMessage}
                        </div>
                    )}
                    {isToday && availableSlots.length > 0 && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400">
                            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                            Showing future slots for today. Past slots are hidden.
                        </div>
                    )}
                    {dayAvailability && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                            Mentor Available: {dayAvailability.startTime} - {dayAvailability.endTime}
                            {allSlotsCount > 0 && (
                                <span className="ml-2 opacity-70">({allSlotsCount} total slots)</span>
                            )}
                        </div>
                    )}
                    {isLoadingSlots ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-12 rounded-xl bg-muted dark:bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground font-medium text-sm bg-muted/30 dark:bg-white/5 rounded-2xl border border-border dark:border-white/5 p-6 mb-3">
                                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No available slots for this date.
                            </div>
                            <p className="text-xs text-muted-foreground/70">Try selecting another date or changing session type.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {availableSlots.map(slot => (
                                <motion.button
                                    key={slot.id}
                                    whileHover={slot.available ? { scale: 1.05, y: -2 } : {}}
                                    whileTap={slot.available ? { scale: 0.95 } : {}}
                                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                                    className={cn(
                                        "h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all border",
                                        !slot.available
                                            ? "bg-muted/30 dark:bg-white/5 border-border dark:border-white/5 text-muted-foreground/30 cursor-not-allowed"
                                            : selectedSlot === slot.time
                                                ? "bg-[var(--electric-blue)]/10 dark:bg-[var(--electric-blue)]/20 border-[var(--electric-blue)] text-[var(--electric-blue)] shadow-sm"
                                                : "bg-card dark:bg-white/5 border-border dark:border-white/5 text-muted-foreground hover:border-[var(--electric-blue)] hover:text-[var(--electric-blue)] shadow-sm hover:shadow-md"
                                    )}
                                >
                                    {!slot.available && <Lock className="w-3 h-3 mr-1.5" />}
                                    {slot.time}
                                </motion.button>
                            ))}
                        </div>
                    )}
                    {error && (
                        <motion.div
                            ref={errorRef}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-destructive text-xs font-medium mt-3 flex items-center gap-1.5 bg-destructive/5 dark:bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-shake"
                        >
                            <Info className="w-3.5 h-3.5" />
                            {error}
                        </motion.div>
                    )}
                </section>

                {/* Step 3: Session Type */}
                <section>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        3. Session Type
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.button
                            whileHover={!hasExistingDemo ? { y: -4 } : {}}
                            onClick={() => !hasExistingDemo && setSessionType('demo')}
                            className={cn(
                                "relative p-4 rounded-[1.5rem] border text-left transition-all group overflow-hidden shadow-sm",
                                hasExistingDemo
                                    ? "bg-muted/30 dark:bg-white/5 border-border dark:border-white/5 opacity-50 cursor-not-allowed"
                                    : sessionType === 'demo'
                                        ? "bg-card dark:bg-[var(--electric-blue)]/10 border-[var(--electric-blue)] shadow-md"
                                        : "bg-card dark:bg-white/5 border-border dark:border-white/5 hover:border-[var(--electric-blue)]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    sessionType === 'demo' ? "bg-[var(--electric-blue)]/10 dark:bg-[var(--electric-blue)]/20" : "bg-muted dark:bg-white/5"
                                )}>
                                    <Video className={cn(
                                        "w-5 h-5",
                                        sessionType === 'demo' ? "text-[var(--electric-blue)]" : "text-muted-foreground"
                                    )} />
                                </div>
                                {hasExistingDemo ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted dark:bg-white/10 text-muted-foreground">ALREADY TAKEN</span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500">ONE-TIME ONLY</span>
                                )}
                            </div>
                            <h4 className="font-bold mb-1 text-foreground">Intro Session</h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> 15 MINS</span>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-500">FREE</span>
                            </div>
                            {sessionType === 'demo' && !hasExistingDemo && (
                                <motion.div layoutId="sessionHighlight" className="absolute inset-0 border-2 border-[var(--electric-blue)] rounded-[1.5rem]" />
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ y: -4 }}
                            onClick={() => setSessionType('paid')}
                            className={cn(
                                "relative p-4 rounded-[1.5rem] border text-left transition-all group overflow-hidden shadow-sm",
                                sessionType === 'paid'
                                    ? "bg-card dark:bg-[var(--electric-blue)]/10 border-[var(--electric-blue)] shadow-md"
                                    : "bg-card dark:bg-white/5 border-border dark:border-white/5 hover:border-[var(--electric-blue)]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    sessionType === 'paid' ? "bg-[var(--electric-blue)]/10 dark:bg-[var(--electric-blue)]/20" : "bg-muted dark:bg-white/5"
                                )}>
                                    <Video className={cn(
                                        "w-5 h-5",
                                        sessionType === 'paid' ? "text-[var(--electric-blue)]" : "text-muted-foreground"
                                    )} />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--electric-blue)]/10 dark:bg-[var(--electric-blue)]/20 text-[var(--electric-blue)]">BEST VALUE</span>
                            </div>
                            <h4 className="font-bold mb-1 text-foreground">Deep Dive Session</h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> 60 MINS</span>
                                <span>•</span>
                                <span className="text-foreground">₹{Number(mentor?.hourlyRate) || Number(mentor?.rate) || 500}</span>
                            </div>
                            {sessionType === 'paid' && (
                                <motion.div layoutId="sessionHighlight" className="absolute inset-0 border-2 border-[var(--electric-blue)] rounded-[1.5rem]" />
                            )}
                        </motion.button>
                    </div>
                </section>

                {/* Step 4: Summary Preview */}
                <section className="pb-8">
                    <div className="p-5 rounded-[2rem] border border-[var(--electric-blue)]/20 bg-muted/30 dark:bg-gradient-to-br dark:from-[var(--electric-blue)]/5 dark:to-[var(--cyan)]/5 relative overflow-hidden group shadow-inner">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <ShieldCheck className="w-16 h-16 text-[var(--electric-blue)]" />
                        </div>
                        <h3 className="text-[10px] font-black text-[var(--electric-blue)] uppercase tracking-[0.3em] mb-4">Summary Preview</h3>
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-medium">Mentor</span>
                                <span className="font-bold text-foreground">{mentor?.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-medium">Session</span>
                                <span className="font-bold text-foreground">{sessionType === 'demo' ? "15 Min Intro" : "60 Min Deep Dive"}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-medium">Schedule</span>
                                <span className="font-bold text-[var(--electric-blue)]">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ {selectedSlot || '--:--'}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-border dark:border-white/5 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Amount</span>
                                <span className="text-xl font-black text-foreground dark:text-white">
                                    {sessionType === 'demo' ? "FREE" : `₹${Number(mentor?.hourlyRate) || Number(mentor?.rate) || 500}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Scroll indicators - bottom shadow */}
            <div className={cn(
                "absolute bottom-[105px] md:bottom-[121px] left-0 right-0 h-12 bg-gradient-to-t from-black/5 dark:from-black/20 to-transparent pointer-events-none z-20 transition-opacity duration-300",
                showScrollBottomShadow ? "opacity-100" : "opacity-0"
            )} />

            {/* Sticky Footer */}
            <div className="shrink-0 p-6 md:p-8 border-t border-border dark:border-white/5 bg-background/80 dark:bg-background/60 backdrop-blur-2xl z-30 relative shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <motion.button
                    disabled={!selectedSlot || isSubmitting || success}
                    onClick={handleBookSession}
                    whileHover={selectedSlot && !isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={selectedSlot && !isSubmitting ? { scale: 0.98 } : {}}
                    className={cn(
                        "w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all relative overflow-hidden group/cta",
                        !selectedSlot || isSubmitting || success
                            ? "bg-muted border border-border text-muted-foreground/30 cursor-not-allowed"
                            : "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/30"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing Booking...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-white dark:text-black" />
                            Booking Confirmed!
                        </>
                    ) : (
                        <>
                            {selectedSlot ? "Confirm & Book Session" : "Select a time slot"}
                            <ArrowRight className="w-5 h-5 group-hover/cta:translate-x-1 transition-transform" />
                        </>
                    )}

                    {selectedSlot && !isSubmitting && !success && (
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/cta:opacity-100 transition-opacity" />
                    )}
                </motion.button>
            </div>

            {/* Success Animation Overlay */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 12 }}
                            className="w-24 h-24 rounded-full bg-[var(--electric-blue)] flex items-center justify-center mb-6 shadow-xl"
                        >
                            <CheckCircle2 className="w-12 h-12 text-white dark:text-black stroke-[3px]" />
                        </motion.div>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-black mb-2 text-foreground"
                        >
                            Successfully Booked!
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-muted-foreground max-w-xs font-medium"
                        >
                            Your session with {mentor?.name} has been confirmed. Check your email for details.
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (isDesktop) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/20 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-2xl h-full max-h-[90vh] bg-card dark:bg-background/80 border border-border dark:border-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {modalContent}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <Drawer open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-white dark:bg-background/95 backdrop-blur-3xl border-border dark:border-white/10 h-[92vh] rounded-t-[3rem] p-0 overflow-hidden flex flex-col">
                <div className="shrink-0 w-12 h-1.5 bg-muted dark:bg-white/10 rounded-full mx-auto mt-4 mb-2 z-40" />
                <div className="flex-1 overflow-hidden relative">
                    {modalContent}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

<style>{`
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    .animate-shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
`}</style>
