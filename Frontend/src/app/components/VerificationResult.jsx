import { motion } from 'motion/react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    TrendingUp,
    Award,
    RotateCcw
} from 'lucide-react';

export function VerificationResult({ score, passed, onActivateProfile, onRetake, attempt = 0, maxAttempts = 3, status, totalQuestions = 0, correctCount = 0 }) {
    const percentage = Math.round(score);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center"
        >
            <div className="max-w-2xl w-full">
                {/* Result Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card/50 dark:bg-black/30 backdrop-blur-xl border border-border dark:border-white/5 rounded-3xl p-8 sm:p-12 shadow-2xl text-center"
                >
                    {/* Attempt Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 flex justify-center"
                    >
                        <span className="px-4 py-1.5 rounded-full bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {maxAttempts === Infinity ? `Attempt ${attempt}` : `Attempt ${attempt} of ${maxAttempts}`}
                        </span>
                    </motion.div>

                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                        className="mb-6"
                    >
                        {passed ? (
                            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center">
                                <XCircle className="w-12 h-12 text-red-500" />
                            </div>
                        )}
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`text-4xl sm:text-5xl font-black mb-4 ${passed ? 'text-emerald-500' : 'text-red-500'
                            }`}
                    >
                        {passed ? 'Congratulations!' : status === 'permanently-rejected' ? 'Ineligible' : 'Not Passed'}
                    </motion.h1>

                    {/* Score */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mb-8"
                    >
                        <div className={`inline-flex items-baseline gap-2 px-8 py-4 rounded-2xl ${passed
                            ? 'bg-emerald-500/10 border-2 border-emerald-500/20'
                            : 'bg-red-500/10 border-2 border-red-500/20'
                            }`}>
                            <span className={`text-6xl font-black ${passed ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                {percentage}
                            </span>
                            <span className={`text-3xl font-bold ${passed ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                %
                            </span>
                        </div>
                        <p className="text-muted-foreground font-medium mt-3">
                            {passed ? 'You passed the verification test!' : 'Passing score: 70%'}
                        </p>
                    </motion.div>

                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mb-8"
                    >
                        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl ${passed
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                            }`}>
                            {passed ? (
                                <>
                                    <Award className="w-5 h-5 text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-500">Verified Mentor</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-5 h-5 text-red-500" />
                                    <span className="text-sm font-bold text-red-500">
                                        {status === 'permanently-rejected' ? 'No Retries Left' : 'Retest Required'}
                                    </span>
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mb-8"
                    >
                        {passed ? (
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                <p className="text-foreground font-medium mb-2">
                                    You have successfully completed the skill verification test.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Your mentor profile is now ready to be activated. Start connecting with students today!
                                </p>
                            </div>
                        ) : status === 'permanently-rejected' ? (
                            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                                <p className="text-foreground font-medium mb-2 text-red-500">
                                    You have exhausted all available attempts.
                                </p>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Based on the test results, you are currently not eligible to join GuruConnect as a mentor. Thank you for your interest.
                                </p>
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                                <p className="text-foreground font-medium mb-2">
                                    You did not meet the minimum passing score of 70%.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {maxAttempts === Infinity 
                                        ? "You can retake the test anytime. Please review the material and try again to activate your profile."
                                        : `You have ${maxAttempts - attempt} attempt${maxAttempts - attempt !== 1 ? 's' : ''} remaining. Please review the material and try again to activate your profile.`
                                    }
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        {passed ? (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onActivateProfile}
                                className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all mx-auto"
                            >
                                <TrendingUp className="w-5 h-5" />
                                Activate Profile
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onRetake}
                                className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border dark:border-white/5 font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted dark:hover:bg-white/10"
                            >
                                <RotateCcw className="w-5 h-5" />
                                {status === 'permanently-rejected' ? 'Return to Home' : 'Back to Dashboard'}
                            </motion.button>
                        )}
                    </motion.div>

                    {/* Stats (Optional) */}
                    {passed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="mt-8 pt-8 border-t border-border dark:border-white/5"
                        >
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-primary">{percentage}%</p>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">Score</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-primary">{totalQuestions}</p>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">Questions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-primary">{correctCount}</p>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">Correct</p>
                                    </div>
                                </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
