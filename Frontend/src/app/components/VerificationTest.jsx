import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import {
    X,
    Clock,
    ChevronLeft,
    ChevronRight,
    Flag,
    CheckCircle2,
    Circle,
    AlertTriangle,
    Grid,
    Menu,
    PlayCircle
} from 'lucide-react';

export function VerificationTest({ questions, duration, onSubmit, onExit }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState(new Map());
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeRemaining, setTimeRemaining] = useState(duration);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // Fullscreen logic
    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    // NOTE: Fullscreen can only be triggered by a direct user gesture (browser security policy).
    // We do NOT auto-request fullscreen on mount. Instead it is triggered on the
    // "Restore Fullscreen" button click inside the OverlayWarning.

    // Timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 5 * 60 && prev % 60 === 0 && prev > 0) {
                    toast.warning(`${Math.floor(prev / 60)} minutes remaining!`);
                }
                if (prev <= 0) {
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleWarning = (type) => {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);

        let message = '';
        switch (type) {
            case 'visibility':
                message = 'Tab switching is strictly prohibited!';
                break;
            case 'blur':
                message = 'Distraction detected: Please keep focus on the test window!';
                break;
            case 'fullscreen-exit':
                message = 'Fullscreen mode exited! Fullscreen is mandatory for this test.';
                break;
            default:
                message = 'Unnecessary activity detected!';
        }

        if (newCount === 1) {
            toast.warning(`Warning 1: ${message}`, {
                description: 'Please stay on this page. Next violation will be your final warning.',
                duration: 5000
            });
        } else if (newCount === 2) {
            toast.error(`FINAL WARNING 2: ${message}`, {
                description: 'Any further violations will result in immediate test termination and submission.',
                duration: 8000
            });
        } else if (newCount >= 3) {
            toast.error('TEST TERMINATED', {
                description: 'Violation limit exceeded. Your test is being submitted automatically.',
                duration: 5000
            });
            // Delay auto-submit slightly so they see the toast
            setTimeout(() => {
                handleAutoSubmit();
            }, 2000);
        }

        // Attempt to re-force fullscreen if it was a fullscreen-exit
        if (type === 'fullscreen-exit' && newCount < 3) {
            enterFullscreen();
        }
    };

    // Tab visibility, window blur, and fullscreen detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleWarning('visibility');
            }
        };

        const handleBlur = () => {
            handleWarning('blur');
        };

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
            setIsFullscreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen) {
                // If they exiting fullscreen voluntarily or via ESC
                handleWarning('fullscreen-exit');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [tabSwitchCount]);

    // Prevent refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Prevent copy/paste and right-click
    const handleCopy = (e) => {
        e.preventDefault();
        toast.error("Copying is disabled during the test");
    };
    const handlePaste = (e) => {
        e.preventDefault();
        toast.error("Pasting is disabled during the test");
    };
    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft' && currentQuestion > 0) {
                handlePrevious();
            } else if (e.key === 'ArrowRight' && currentQuestion < questions.length - 1) {
                handleNext();
            } else if (e.key === 'Escape' && !isFullscreen) {
                // User explicitly wants to re-enter via ESC
                enterFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentQuestion, questions.length]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (questionId, optionId) => {
        setAnswers(new Map(answers.set(questionId, optionId)));
    };

    const handleMarkForReview = () => {
        const newMarked = new Set(markedForReview);
        const isMarking = !newMarked.has(questions[currentQuestion].id);

        if (isMarking) {
            newMarked.add(questions[currentQuestion].id);
            toast.info("Question marked for review");
        } else {
            newMarked.delete(questions[currentQuestion].id);
            toast.success("Question unmarked");
        }
        setMarkedForReview(newMarked);
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setDirection(-1);
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setDirection(1);
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handleQuestionNavigate = (index) => {
        setDirection(index > currentQuestion ? 1 : -1);
        setCurrentQuestion(index);
        setIsDrawerOpen(false);
    };

    const handleAutoSubmit = () => {
        exitFullscreen();
        stopCamera();
        const results = {
            answers: Object.fromEntries(answers),
            markedForReview: Array.from(markedForReview),
            tabSwitchCount,
            timeUsed: duration - timeRemaining
        };
        onSubmit(results);
    };

    const handleSubmitClick = () => {
        setShowSubmitModal(true);
    };

    const handleConfirmSubmit = () => {
        handleAutoSubmit();
    };

    const getQuestionStatus = (index) => {
        const question = questions[index];
        if (index === currentQuestion) return 'current';
        if (markedForReview.has(question.id)) return 'review';
        if (answers.has(question.id)) return 'answered';
        return 'not-visited';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'current':
                return 'bg-primary text-primary-foreground border-primary';
            case 'answered':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'review':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default:
                return 'bg-muted/30 dark:bg-white/5 text-muted-foreground border-border dark:border-white/5';
        }
    };

    const answeredCount = answers.size;
    const unansweredCount = questions.length - answeredCount;
    const isWarningTime = timeRemaining <= 300; // 5 minutes

    const currentQ = questions[currentQuestion];

    if (!currentQ) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Loading Test...</h2>
                    <p className="text-muted-foreground">Preparing questions based on your skills.</p>
                </div>
            </div>
        );
    }

    const selectedAnswer = answers.get(currentQ.id);

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    const NavigatorGrid = () => (
        <div className="grid grid-cols-5 gap-2">
            {questions.map((q, index) => {
                const status = getQuestionStatus(index);
                return (
                    <button
                        key={q.id}
                        onClick={() => handleQuestionNavigate(index)}
                        className={`aspect-square rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all hover:scale-105 ${getStatusColor(status)}`}
                    >
                        {index + 1}
                    </button>
                );
            })}
        </div>
    );

    // Camera for proctoring
    const videoRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const cameraStreamRef = useRef(null);

    const stopCamera = () => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop());
            cameraStreamRef.current = null;
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            cameraStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error("Camera access denied:", err);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const OverlayWarning = () => (
        <AnimatePresence>
            {(!isFullscreen && tabSwitchCount > 0) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-red-500/40 backdrop-blur-md z-[60] flex items-center justify-center p-4"
                    onClick={enterFullscreen}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-background border-2 border-red-500 text-red-500 rounded-3xl p-8 max-w-lg text-center shadow-2xl shadow-red-500/20 relative cursor-pointer"
                    >
                        <AlertTriangle className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Fullscreen Required</h2>
                        <p className="font-bold text-lg mb-4">You have exited the mandatory fullscreen mode.</p>

                        <div className="space-y-4">
                            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                <p className="text-sm font-medium text-muted-foreground">
                                    This test requires focused attention. Exiting fullscreen is considered a violation.
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    enterFullscreen();
                                }}
                                className="w-full py-4 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-500/20"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Restore Fullscreen
                            </motion.button>

                            <p className="text-[10px] uppercase tracking-widest font-black opacity-50">
                                Or press <span className="text-red-500 underline">Escape</span> to resume
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const ProctoringWidget = () => (
        <div className="fixed top-20 right-4 z-40">
            <div className="relative group">
                <div className="w-24 h-20 rounded-lg bg-black overflow-hidden border-2 border-primary/20 shadow-lg">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <div className="w-6 h-6 rounded-full border-2 border-t-primary animate-spin" />
                        </div>
                    )}
                    <div className="absolute top-1 right-1 flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );

    const Legend = () => (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary border-2 border-primary" />
                <span className="text-sm font-medium text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/20" />
                <span className="text-sm font-medium text-muted-foreground">Answered</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border-2 border-yellow-500/20" />
                <span className="text-sm font-medium text-muted-foreground">Marked</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/30 dark:bg-white/5 border-2 border-border dark:border-white/5" />
                <span className="text-sm font-medium text-muted-foreground">Not Visited</span>
            </div>
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-background z-50 overflow-y-auto"
            onCopy={handleCopy}
            onPaste={handlePaste}
            onContextMenu={handleContextMenu}
        >
            {/* Proctoring Elements */}
            <OverlayWarning />
            <ProctoringWidget />

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-20 px-4 sm:px-6 flex items-center justify-between bg-card/50 dark:bg-black/30 backdrop-blur-xl border-b border-border dark:border-white/5 z-30">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-black tracking-tight">GuruConnect</h1>
                    <div className="hidden sm:block h-6 w-px bg-border dark:bg-white/10" />
                    <span className="hidden sm:inline text-sm font-bold text-muted-foreground">
                        Skill Verification
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Progress (Desktop) */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5">
                        <span className="text-sm font-bold">
                            Question {currentQuestion + 1} of {questions.length}
                        </span>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all ${isWarningTime
                        ? 'bg-orange-500/10 border-orange-500/20 animate-pulse'
                        : 'bg-muted/30 dark:bg-white/5 border-border dark:border-white/5'
                        }`}>
                        <Clock className={`w-4 h-4 ${isWarningTime ? 'text-orange-500' : 'text-primary'}`} />
                        <span className={`text-sm font-bold tabular-nums ${isWarningTime ? 'text-orange-500' : ''}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>

                    {/* Mobile Navigator Trigger */}
                    <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <Drawer.Trigger asChild>
                            <button
                                className="lg:hidden w-10 h-10 rounded-xl bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/5 flex items-center justify-center transition-all"
                                aria-label="Open navigator"
                            >
                                <Grid className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </Drawer.Trigger>
                        <Drawer.Portal>
                            <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                            <Drawer.Content className="bg-background dark:bg-zinc-900 border-t border-border dark:border-white/10 flex flex-col rounded-t-[10px] fixed bottom-0 left-0 right-0 max-h-[85vh] z-50 focus:outline-none">
                                <div className="p-4 bg-background dark:bg-zinc-900 rounded-t-[10px] flex-1">
                                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border dark:bg-white/20 mb-6" />
                                    <div className="max-w-md mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-black tracking-tight">Question Navigator</h3>
                                            <span className="text-sm font-bold text-muted-foreground">
                                                {answeredCount}/{questions.length} Answered
                                            </span>
                                        </div>
                                        <div className="overflow-y-auto max-h-[60vh] pb-8">
                                            <NavigatorGrid />
                                            <div className="my-6 h-px bg-border dark:bg-white/5" />
                                            <Legend />
                                        </div>
                                    </div>
                                </div>
                            </Drawer.Content>
                        </Drawer.Portal>
                    </Drawer.Root>
                </div>
            </header>

            {/* Main Content */}
            <div className="absolute inset-0 pt-20 flex">
                {/* Question Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-12 pb-24 lg:pb-12">
                    <div className="max-w-3xl mx-auto">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentQuestion}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.2 }}
                            >
                                {/* Question Header */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-bold text-primary">
                                            Question {currentQuestion + 1}
                                        </span>
                                        <button
                                            onClick={handleMarkForReview}
                                            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all ${markedForReview.has(currentQ.id)
                                                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                                : 'bg-muted/30 dark:bg-white/5 border-border dark:border-white/5 text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            <Flag className="w-4 h-4" />
                                            <span className="hidden sm:inline text-sm font-bold">
                                                {markedForReview.has(currentQ.id) ? 'Marked' : 'Mark for Review'}
                                            </span>
                                        </button>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black mb-3 leading-tight">{currentQ.title}</h2>
                                    <p className="text-sm sm:text-base text-muted-foreground font-medium">{currentQ.description}</p>
                                </div>

                                {/* Options */}
                                <div className="space-y-3 sm:space-y-4">
                                    {currentQ.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleAnswer(currentQ.id, option.id)}
                                            className={`w-full p-4 sm:p-6 rounded-2xl border-2 text-left transition-all ${selectedAnswer === option.id
                                                ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10'
                                                : 'bg-card/50 dark:bg-black/20 border-border dark:border-white/5 hover:border-primary/30 hover:bg-card dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selectedAnswer === option.id
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                                    }`}>
                                                    {selectedAnswer === option.id && (
                                                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-xs sm:text-sm font-bold text-muted-foreground mb-1 block">
                                                        Option {option.label}
                                                    </span>
                                                    <p className="text-sm sm:text-base font-medium">{option.text}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Desktop Question Navigator Panel */}
                <aside className="hidden lg:flex w-80 bg-card/50 dark:bg-black/30 backdrop-blur-xl border-l border-border dark:border-white/5 flex-col overflow-y-auto">
                    <div className="p-6 border-b border-border dark:border-white/5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                            Question Navigator
                        </h3>
                        <NavigatorGrid />
                    </div>

                    {/* Legend */}
                    <div className="p-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                            Legend
                        </h4>
                        <Legend />
                    </div>
                </aside>
            </div>

            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 h-20 px-4 sm:px-6 flex items-center justify-between bg-card/50 dark:bg-black/30 backdrop-blur-xl border-t border-border dark:border-white/5 z-30">
                <button
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted dark:hover:bg-white/10 transition-all text-sm sm:text-base"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="text-center">
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                        {answeredCount} answered • {unansweredCount} <span className="hidden sm:inline">unanswered</span>
                    </p>
                </div>

                {currentQuestion === questions.length - 1 ? (
                    <button
                        onClick={handleSubmitClick}
                        className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 text-sm sm:text-base"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Submit<span className="hidden sm:inline"> Test</span>
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 font-bold hover:bg-muted dark:hover:bg-white/10 transition-all text-sm sm:text-base"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSubmitModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card dark:bg-black/90 backdrop-blur-xl border border-border dark:border-white/10 rounded-3xl p-8 max-w-md w-full"
                        >
                            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h3 className="text-2xl font-black text-center mb-3">Submit Test?</h3>
                            <div className="mb-6 p-4 rounded-xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Answered:</span>
                                    <span className="text-sm font-bold text-emerald-500">{answeredCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">Unanswered:</span>
                                    <span className="text-sm font-bold text-orange-500">{unansweredCount}</span>
                                </div>
                            </div>
                            {unansweredCount > 0 && (
                                <p className="text-center text-sm text-orange-500 mb-6">
                                    You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 px-6 py-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 font-bold hover:bg-muted dark:hover:bg-white/10 transition-all"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={handleConfirmSubmit}
                                    className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                >
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
