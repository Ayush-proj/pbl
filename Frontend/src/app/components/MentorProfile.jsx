import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
    User,
    Mail,
    Award,
    Globe,
    Zap,
    Clock,
    Save,
    X,
    Camera,
    Loader2,
    ChevronLeft,
    DollarSign,
    Info,
    ShieldCheck
} from 'lucide-react';
import { getMentorProfile, uploadMentorProfileImage } from '../services/api';
import useAuthStore from '../store/authStore';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function MentorProfile({ mentor, onBack, isOwnProfile, onSaveProfile, startEditing, onTakeVerification }) {
    const { user: authUser, mentorProfile: storeMentorProfile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        profileImage: '',
        title: '',
        company: '',
        bio: '',
        skills: [],
        experience: '',
        languages: ['English'],
        hourlyRate: 500,
        availability: [],
        verified: false
    });

    const [newSkill, setNewSkill] = useState('');
    const [newLang, setNewLang] = useState('');

    const populateForm = (data) => {
        setForm({
            name: data.name || data.userId?.name || authUser?.name || '',
            email: data.email || data.userId?.email || authUser?.email || '',
            profileImage: data.profileImage || '',
            title: data.title || '',
            company: data.company || '',
            bio: data.bio || '',
            skills: data.skills || [],
            experience: data.experience ? String(data.experience) : '',
            languages: data.languages || ['English'],
            hourlyRate: data.hourlyRate || 500,
            availability: data.availability || [],
            verified: data.verified || false
        });
    };

    useEffect(() => {
        if (isOwnProfile) {
            if (storeMentorProfile && storeMentorProfile.name) {
                populateForm(storeMentorProfile);
                setLoading(false);
                return;
            }
            setLoading(true);
            getMentorProfile()
                .then(res => populateForm(res.data.mentor))
                .catch(() => {
                    if (storeMentorProfile) {
                        populateForm(storeMentorProfile);
                    }
                })
                .finally(() => setLoading(false));
        } else if (mentor) {
            populateForm(mentor);
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [isOwnProfile, mentor, storeMentorProfile]);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => setForm(prev => ({ ...prev, profileImage: reader.result }));
        reader.readAsDataURL(file);
        
        const formData = new FormData();
        formData.append('profileImage', file);
        
        try {
            const res = await uploadMentorProfileImage(formData);
            if (res.data.profileImage) {
                setForm(prev => ({ ...prev, profileImage: res.data.profileImage }));
                useAuthStore.getState().setMentorProfile({ ...useAuthStore.getState().mentorProfile, profileImage: res.data.profileImage });
            }
        } catch (err) {
            toast.error('Failed to upload image');
        }
    };

    const addSkill = () => {
        const val = newSkill.trim();
        if (val && !form.skills.includes(val)) {
            setForm(prev => ({ ...prev, skills: [...prev.skills, val] }));
        }
        setNewSkill('');
    };

    const removeSkill = (i) => {
        setForm(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }));
    };

    const addLang = () => {
        const val = newLang.trim();
        if (val && !form.languages.includes(val)) {
            setForm(prev => ({ ...prev, languages: [...prev.languages, val] }));
        }
        setNewLang('');
    };

    const removeLang = (i) => {
        setForm(prev => ({ ...prev, languages: prev.languages.filter((_, idx) => idx !== i) }));
    };

    const toggleDay = (day) => {
        const exists = form.availability.find(a => a.day === day);
        if (exists) {
            setForm(prev => ({ ...prev, availability: prev.availability.filter(a => a.day !== day) }));
        } else {
            setForm(prev => ({
                ...prev,
                availability: [...prev.availability, { day, startTime: '09:00', endTime: '17:00' }]
            }));
        }
    };

    const updateSlot = (day, field, value) => {
        setForm(prev => ({
            ...prev,
            availability: prev.availability.map(a =>
                a.day === day ? { ...a, [field]: value } : a
            )
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }
        setSaving(true);
        try {
            await onSaveProfile(form);
            toast.success('Profile saved successfully');
        } catch (err) {
            toast.error('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="pt-24 pb-20 min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen bg-background">
            <div className="max-w-3xl mx-auto">
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
                        <h1 className="text-3xl font-black tracking-tight">Mentor Profile</h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            {form.verified
                                ? (isOwnProfile ? 'You are a verified mentor!' : 'Verified Mentor')
                                : (isOwnProfile ? 'Set up your mentor profile to get verified' : '')
                            }
                        </p>
                        {form.verified && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold mt-2">
                                <ShieldCheck className="w-4 h-4" />
                                Verified
                            </span>
                        )}
                    </div>

                    {isOwnProfile && !form.verified && (
                        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-sm">
                            <Info className="w-5 h-5 text-amber-500" />
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Fill in your details, add skills, then take the verification test to become a verified mentor.
                            </span>
                        </div>
                    )}

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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Title / Role</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="e.g. Senior Full Stack Developer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Company</label>
                                <input
                                    type="text"
                                    value={form.company}
                                    onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="e.g. Google"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Award className="w-3.5 h-3.5 inline mr-1" />
                                Bio
                            </label>
                            <textarea
                                value={form.bio}
                                onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                                className="w-full h-28 px-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors resize-none"
                                placeholder="Tell students about yourself and your teaching style..."
                                maxLength={500}
                            />
                            <p className="text-right text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Experience</label>
                                <select
                                    value={form.experience}
                                    onChange={(e) => setForm(prev => ({ ...prev, experience: e.target.value }))}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                >
                                    <option value="">Select experience</option>
                                    <option value="1">1 year</option>
                                    <option value="2">2 years</option>
                                    <option value="3">3 years</option>
                                    <option value="4">4 years</option>
                                    <option value="5">5 years</option>
                                    <option value="6">6 years</option>
                                    <option value="7">7 years</option>
                                    <option value="8">8 years</option>
                                    <option value="9">9 years</option>
                                    <option value="10">10+ years</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                                    Hourly Rate (₹)
                                </label>
                                <input
                                    type="number"
                                    value={form.hourlyRate}
                                    onChange={(e) => setForm(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Zap className="w-3.5 h-3.5 inline mr-1" />
                                Skills
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {form.skills.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                                        {s}
                                        <button onClick={() => removeSkill(i)} className="hover:text-rose-500 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                                    className="flex-1 h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="Add a skill and press Enter"
                                />
                                <button
                                    onClick={addSkill}
                                    className="px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold hover:bg-primary/20 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Globe className="w-3.5 h-3.5 inline mr-1" />
                                Languages
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {form.languages.map((l, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        {l}
                                        {form.languages.length > 1 && (
                                            <button onClick={() => removeLang(i)} className="hover:text-rose-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLang}
                                    onChange={(e) => setNewLang(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLang(); } }}
                                    className="flex-1 h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/50 outline-none font-medium transition-colors"
                                    placeholder="Add a language"
                                />
                                <button
                                    onClick={addLang}
                                    className="px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <Clock className="w-3.5 h-3.5 inline mr-1" />
                                Availability
                            </label>
                            <p className="text-xs text-muted-foreground mb-3">Select days and set time ranges when you're available for sessions.</p>
                            <div className="space-y-2">
                                {DAY_OPTIONS.map(day => {
                                    const slot = form.availability.find(a => a.day === day);
                                    return (
                                        <div key={day} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border">
                                            <button
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`w-24 text-left text-sm font-bold capitalize transition-colors ${slot ? 'text-primary' : 'text-muted-foreground'}`}
                                            >
                                                {slot ? `✓ ${day.slice(0, 3)}` : day.slice(0, 3)}
                                            </button>
                                            {slot && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={slot.startTime}
                                                        onChange={(e) => updateSlot(day, 'startTime', e.target.value)}
                                                        className="h-9 px-2 rounded-lg bg-background border border-border text-sm font-medium outline-none focus:border-primary/50"
                                                    />
                                                    <span className="text-muted-foreground text-xs">to</span>
                                                    <input
                                                        type="time"
                                                        value={slot.endTime}
                                                        onChange={(e) => updateSlot(day, 'endTime', e.target.value)}
                                                        className="h-9 px-2 rounded-lg bg-background border border-border text-sm font-medium outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-10">
                        <button
                            onClick={onBack}
                            className="flex-1 h-14 rounded-xl border-2 border-border font-bold text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all"
                        >
                            {isOwnProfile ? 'Skip' : 'Back'}
                        </button>
                        {isOwnProfile && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                        )}
                    </div>

                    {isOwnProfile && !form.skills.length && (
                        <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                Add at least one skill, then save your profile and you'll be able to take the verification test.
                            </p>
                        </div>
                    )}

                    {isOwnProfile && form.skills.length > 0 && !form.verified && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={onTakeVerification}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-[var(--cyan)] text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                Take Verification Test
                            </button>
                        </div>
                    )}

                    {isOwnProfile && form.verified && (
                        <div className="mt-6 text-center">
                            <div className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                                <ShieldCheck className="w-5 h-5" />
                                Verified &#10003;
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
