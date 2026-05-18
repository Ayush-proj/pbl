import { useState } from 'react';
import { motion } from 'motion/react';
import {
    CheckCircle2,
    Clock,
    FileText,
    AlertCircle,
    Loader2,
    XCircle,
    PlayCircle
} from 'lucide-react';

export function VerificationEntry({ onStartTest, verificationStatus = 'not-started', attempts = 0, maxAttempts = 3, questionCount = 5, timeMinutes = 10 }) {
    const getStatusConfig = () => {
        switch (verificationStatus) {
            case 'not-started':
                return {
                    icon: FileText,
                    text: 'Not Started',
                    color: 'text-muted-foreground',
                    bgColor: 'bg-muted/30 dark:bg-white/5',
                    borderColor: 'border-border dark:border-white/5'
                };
            case 'in-progress':
                return {
                    icon: Clock,
                    text: 'In Progress',
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/20'
                };
            case 'submitted':
                return {
                    icon: Loader2,
                    text: 'Submitted',
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/20',
                    animate: true
                };
            case 'under-review':
                return {
                    icon: AlertCircle,
                    text: 'Under Review',
                    color: 'text-orange-500',
                    bgColor: 'bg-orange-500/10',
                    borderColor: 'border-orange-500/20'
                };
            case 'approved':
                return {
                    icon: CheckCircle2,
                    text: 'Approved',
                    color: 'text-emerald-500',
                    bgColor: 'bg-emerald-500/10',
                    borderColor: 'border-emerald-500/20'
                };
            case 'rejected':
                return {
                    icon: XCircle,
                    text: 'Failed Attempt',
                    color: 'text-orange-500',
                    bgColor: 'bg-orange-500/10',
                    borderColor: 'border-orange-500/20'
                };
            case 'permanently-rejected':
                return {
                    icon: XCircle,
                    text: 'Ineligible',
                    color: 'text-red-500',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/20'
                };
            default:
                return {
                    icon: FileText,
                    text: 'Not Started',
                    color: 'text-muted-foreground',
                    bgColor: 'bg-muted/30 dark:bg-white/5',
                    borderColor: 'border-border dark:border-white/5'
                };
        }
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    const remainingAttempts = maxAttempts === Infinity ? Infinity : maxAttempts - attempts;
    const canStartTest = (verificationStatus === 'not-started' || verificationStatus === 'in-progress' || verificationStatus === 'rejected') && (remainingAttempts === Infinity || remainingAttempts > 0);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8"
        >
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
                    >
                        Mentor Skill Verification
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground font-medium"
                    >
                        Complete this assessment to activate your mentor profile
                    </motion.p>

                    {/* Status Badge */}
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-card/50 dark:bg-black/30 backdrop-blur-xl border border-border dark:border-white/5"
                        >
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                                <StatusIcon className={`w-5 h-5 ${statusConfig.color} ${statusConfig.animate ? 'animate-spin' : ''}`} />
                                <span className={`text-sm font-bold ${statusConfig.color}`}>
                                    {statusConfig.text}
                                </span>
                            </div>
                        </motion.div>

                        {remainingAttempts > 0 && verificationStatus !== 'approved' && verificationStatus !== 'permanently-rejected' && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-sm font-bold text-muted-foreground"
                            >
                                {maxAttempts === Infinity ? (
                                    <span className="text-primary">Unlimited attempts</span>
                                ) : (
                                    <><span className="text-primary">{remainingAttempts}</span> of <span className="text-primary">{maxAttempts}</span> attempts remaining</>
                                )}
                            </motion.p>
                        )}
                    </div>
                </div>

                {/* Main Content Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card/50 dark:bg-black/30 backdrop-blur-xl border border-border dark:border-white/5 rounded-3xl p-8 sm:p-12 shadow-2xl"
                >
                    {/* Test Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    <div className="p-6 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 text-center">
                                <Clock className="w-8 h-8 mx-auto mb-3 text-primary" />
                                <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                                <p className="text-2xl font-black">{timeMinutes} min</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 text-center">
                                <FileText className="w-8 h-8 mx-auto mb-3 text-primary" />
                                <p className="text-sm font-medium text-muted-foreground mb-1">Questions</p>
                                <p className="text-2xl font-black">{questionCount}</p>
                            </div>
                        <div className="p-6 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 text-center">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-primary" />
                            <p className="text-sm font-medium text-muted-foreground mb-1">Passing Score</p>
                            <p className="text-2xl font-black">70%</p>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mb-8">
                        <h3 className="text-xl font-black mb-4">Instructions</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-primary">1</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Read each question carefully before selecting your answer
                                </p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-primary">2</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    You can navigate between questions using the Previous and Next buttons
                                </p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-primary">3</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Mark questions for review if you want to revisit them later
                                </p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-primary">4</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Submit your test before the timer runs out
                                </p>
                            </li>
                        </ul>
                    </div>

                    {/* Rules */}
                    <div className="mb-10 p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Important Rules
                        </h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Do not refresh the page during the test
                                </p>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Do not switch tabs or minimize the browser
                                </p>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                <p className="text-sm font-medium text-muted-foreground">
                                    The test will auto-submit when time expires
                                </p>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Ensure stable internet connection throughout the test
                                </p>
                            </li>
                        </ul>
                    </div>

                    {/* CTA */}
                    {canStartTest && (
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onStartTest}
                            className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all"
                        >
                            <PlayCircle className="w-6 h-6" />
                            {verificationStatus === 'in-progress' ? 'Resume Test' : attempts > 0 ? 'Retake Test' : 'Start Test'}
                        </motion.button>
                    )}

                    {verificationStatus === 'approved' && (
                        <div className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                            <p className="text-lg font-bold text-emerald-500">
                                Verification Complete! Your mentor profile is active.
                            </p>
                        </div>
                    )}

                    {verificationStatus === 'rejected' && remainingAttempts === 0 && (
                        <div className="text-center p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                            <p className="text-lg font-bold text-red-500 mb-2">
                                Verification Not Passed
                            </p>
                            <p className="text-sm text-muted-foreground">
                                No attempts remaining.
                            </p>
                        </div>
                    )}

                    {verificationStatus === 'permanently-rejected' && (
                        <div className="text-center p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                            <p className="text-lg font-bold text-red-500 mb-2">
                                Ineligible for GuruConnect
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">
                                Unfortunately, you have exhausted all your verification attempts. You are no longer eligible to join as a mentor.
                            </p>
                        </div>
                    )}

                    {(verificationStatus === 'submitted' || verificationStatus === 'under-review') && (
                        <div className="text-center p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
                            <p className="text-lg font-bold text-blue-500 mb-2">
                                Test Submitted Successfully
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Your test is under review. Results will be available within 24-48 hours.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
