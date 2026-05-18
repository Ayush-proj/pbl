import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import useAuthStore from '../store/authStore';
import { getCandidateProfile, createCandidateProfile, uploadCandidateProfileImage } from '../services/api';
import { toast } from 'sonner';
import {
    User,
    Mail,
    BookOpen,
    Save,
    Edit3,
    X,
    Camera,
    GraduationCap,
    Target,
    Loader2,
    ChevronLeft,
    CheckCircle2
} from 'lucide-react';

export function CandidateProfile({ onBack }) {
    const { user: authUser, candidateProfile: storeCandidateProfile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [viewMode, setViewMode] = useState(false);

    const [form, setForm] = useState({
        name: authUser?.name || '',
        email: authUser?.email || '',
        profileImage: '',
        interests: [],
        goals: '',
        education: '',
        experienceLevel: 'beginner'
    });

    const [newInterest, setNewInterest] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            if (storeCandidateProfile && (storeCandidateProfile.name || storeCandidateProfile.interests?.length)) {
                setForm({
                    name: storeCandidateProfile.name || storeCandidateProfile.userId?.name || authUser?.name || '',
                    email: storeCandidateProfile.email || storeCandidateProfile.userId?.email || authUser?.email || '',
                    profileImage: storeCandidateProfile.profileImage || '',
                    interests: storeCandidateProfile.interests || [],
                    goals: storeCandidateProfile.goals || '',
                    education: storeCandidateProfile.education || '',
                    experienceLevel: storeCandidateProfile.experienceLevel || 'beginner'
                });
                if (storeCandidateProfile.interests?.length || storeCandidateProfile.goals || storeCandidateProfile.education) {
                    setViewMode(true);
                    setSaved(true);
                }
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const res = await getCandidateProfile();
                const p = res.data.candidate;
                const loaded = {
                    name: p.userId?.name || authUser?.name || '',
                    email: p.userId?.email || authUser?.email || '',
                    profileImage: p.profileImage || '',
                    interests: p.interests || [],
                    goals: p.goals || '',
                    education: p.education || '',
                    experienceLevel: p.experienceLevel || 'beginner'
                };
                setForm(loaded);
                useAuthStore.getState().setCandidateProfile(loaded);
                if (p.interests?.length || p.goals || p.education) {
                    setViewMode(true);
                    setSaved(true);
                }
            } catch {
                // Silent fail - keep empty form
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => setForm(prev => ({ ...prev, profileImage: reader.result }));
        reader.readAsDataURL(file);
        
        const formData = new FormData();
        formData.append('profileImage', file);
        
        try {
            const res = await uploadCandidateProfileImage(formData);
            if (res.data.profileImage) {
                setForm(prev => ({ ...prev, profileImage: res.data.profileImage }));
                useAuthStore.getState().setCandidateProfile({ ...useAuthStore.getState().candidateProfile, profileImage: res.data.profileImage });
            }
        } catch (err) {
            toast.error('Failed to upload image');
        }
    };

    const addInterest = () => {
        const val = newInterest.trim();
        if (val && !form.interests.includes(val)) {
            setForm(prev => ({ ...prev, interests: [...prev.interests, val] }));
        }
        setNewInterest('');
    };

    const removeInterest = (i) => {
        setForm(prev => ({ ...prev, interests: prev.interests.filter((_, idx) => idx !== i) }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }
        setSaving(true);

        // Optimistic: immediately save to Zustand store for persistence
        const profileToSave = {
            name: form.name,
            email: form.email,
            profileImage: form.profileImage,
            interests: form.interests,
            goals: form.goals,
            education: form.education,
            experienceLevel: form.experienceLevel
        };
        useAuthStore.getState().setCandidateProfile(profileToSave);
        useAuthStore.getState().setUser({ ...authUser, name: form.name });

        try {
            const payload = {
                name: form.name,
                interests: form.interests,
                goals: form.goals,
                education: form.education,
                experienceLevel: form.experienceLevel,
                profileImage: form.profileImage || undefined,
                location: { type: 'Point', coordinates: [72.8777, 19.076] }
            };
            await createCandidateProfile(payload);
            toast.success('Profile saved successfully');
        } catch (err) {
            // Data already saved optimistically in Zustand, just warn
            console.warn('API save failed, using local data');
        } finally {
            setSaving(false);
            setSaved(true);
            setViewMode(true);
        }
    };

    if (loading) {
        return (
            <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen bg-background">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Profile Image Skeleton */}
                    <div className="flex justify-center">
                        <div className="w-24 h-24 rounded-full bg-muted dark:bg-white/10 animate-pulse" />
                    </div>
                    
                    {/* Basic Info Skeleton */}
                    <div className="bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-3xl p-8 space-y-4">
                        <div className="space-y-3">
                            <div className="h-4 w-16 bg-muted dark:bg-white/10 rounded animate-pulse" />
                            <div className="h-10 w-full bg-muted dark:bg-white/10 rounded-xl animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-20 bg-muted dark:bg-white/10 rounded animate-pulse" />
                            <div className="h-10 w-full bg-muted dark:bg-white/10 rounded-xl animate-pulse" />
                        </div>
                    </div>

                    {/* Skills/Interests Skeleton */}
                    <div className="bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-3xl p-8">
                        <div className="h-6 w-28 bg-muted dark:bg-white/10 rounded animate-pulse mb-4" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-8 w-20 bg-muted dark:bg-white/10 rounded-full animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode && saved) {
        return (
            <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen bg-background">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-xl"
                    >
                        <div className="text-center mb-10">
                            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-muted relative overflow-hidden border-4 border-border">
                                {form.profileImage ? (
                                    <img src={form.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-10 h-10 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">Student Profile</h1>
                            <p className="text-muted-foreground font-medium mt-1 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Profile complete
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                                    <p className="font-bold">{form.name}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                                    <p className="font-bold">{form.email}</p>
                                </div>
                            </div>

                            {form.education && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Education</p>
                                    <p className="font-bold">{form.education}</p>
                                </div>
                            )}

                            {form.experienceLevel && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Experience Level</p>
                                    <p className="font-bold capitalize">{form.experienceLevel}</p>
                                </div>
                            )}

                            {form.goals && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Learning Goals</p>
                                    <p className="font-medium">{form.goals}</p>
                                </div>
                            )}

                            {form.interests.length > 0 && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Interests / Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {form.interests.map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={onBack}
                                className="flex-1 h-14 rounded-xl border-2 border-border font-bold text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => setViewMode(false)}
                                className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                            >
                                <Edit3 className="w-5 h-5" />
                                Edit Profile
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen bg-background">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back</span>
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-xl"
                >
                    <div className="text-center mb-10">
                        <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-muted relative overflow-hidden border-4 border-border">
                            {form.profileImage ? (
                                <img src={form.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-10 h-10 text-muted-foreground" />
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Student Profile</h1>
                        <p className="text-muted-foreground font-medium mt-1">Fill in your details to get started</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                                <div className="w-full h-12 px-4 rounded-xl bg-muted/50 border border-border flex items-center gap-2 text-muted-foreground italic">
                                    <Mail className="w-4 h-4" />
                                    {form.email}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <GraduationCap className="w-3.5 h-3.5 inline mr-1" />
                                Education
                            </label>
                            <select
                                value={form.education}
                                onChange={(e) => setForm(prev => ({ ...prev, education: e.target.value }))}
                                className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                            >
                                <option value="">Select education</option>
                                <option value="High School">High School</option>
                                <option value="Bachelor's">Bachelor's</option>
                                <option value="Master's">Master's</option>
                                <option value="PhD">PhD</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Experience Level</label>
                            <div className="flex gap-3">
                                {['beginner', 'intermediate', 'advanced'].map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, experienceLevel: level }))}
                                        className={`flex-1 h-12 rounded-xl border-2 font-bold capitalize transition-all ${
                                            form.experienceLevel === level
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:border-primary/30'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Target className="w-3.5 h-3.5 inline mr-1" />
                                Learning Goals
                            </label>
                            <textarea
                                value={form.goals}
                                onChange={(e) => setForm(prev => ({ ...prev, goals: e.target.value }))}
                                className="w-full h-28 px-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors resize-none"
                                placeholder="What do you want to learn or achieve?"
                                maxLength={500}
                            />
                            <p className="text-right text-xs text-muted-foreground mt-1">{form.goals.length}/500</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                                Interests / Skills
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {form.interests.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                                        {s}
                                        <button onClick={() => removeInterest(i)} className="hover:text-rose-500 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newInterest}
                                    onChange={(e) => setNewInterest(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
                                    className="flex-1 h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="Add an interest and press Enter"
                                />
                                <button
                                    onClick={addInterest}
                                    className="px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold hover:bg-primary/20 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-10">
                        <button
                            onClick={onBack}
                            className="flex-1 h-14 rounded-xl border-2 border-border font-bold text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all"
                        >
                            {saved ? 'Go to Dashboard' : 'Skip'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
