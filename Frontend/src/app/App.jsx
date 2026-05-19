import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { MentorShowcase } from './components/MentorShowcase';
import { CTASection } from './components/CTASection';
import { AuthModal } from './components/AuthModal';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { CandidateDashboard } from './components/CandidateDashboard';
import { CandidateSettings } from './components/CandidateSettings';
import { MentorDashboard } from './components/MentorDashboard';
import { MentorSettings } from './components/MentorSettings';
import { MentorProfile } from './components/MentorProfile';
import { CandidateProfile } from './components/CandidateProfile';
import { MentorDiscovery } from './components/MentorDiscovery';

import { MentorProfileModal } from './components/MentorProfileModal';
import { CandidateProfileModal } from './components/CandidateProfileModal';
import { BookingModal } from './components/BookingModal';

import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MessagesPage } from './components/MessagesPage';

import { VerificationEntry } from './components/VerificationEntry';
import { VerificationTest } from './components/VerificationTest';
import { VerificationResult } from './components/VerificationResult';
import { getMentorTest, submitMentorTest, createMentorProfile } from './services/api';
import useAuthStore from './store/authStore';
import VideoSessionRoom from './components/VideoSessionRoom';
import { useBookingNotifications } from './hooks/useBookingNotifications';
import { SocketProvider } from '../hooks/useSocket';
import { isAdminLoggedIn } from './services/adminApi';


export default function App() {
  const currentUser = useAuthStore(s => s.user);
  const mentorProfile = useAuthStore(s => s.mentorProfile);
  const storeLogout = useAuthStore(s => s.logout);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => isAdminLoggedIn());

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/admin')) {
      if (hash === '#/admin/login') return 'admin-login';
      return isAdminLoggedIn() ? 'admin-dashboard' : 'admin-login';
    }
    if (hash === '#/messages') return 'messages';
    if (hash === '#/about') return 'about';
    if (hash === '#/contact') return 'contact';
    return 'home';
  }); // 'home', 'about', 'contact', 'dashboard', 'mentor-profile', 'verification-entry', 'verification-test', 'verification-result'
  const [userRole, setUserRole] = useState(currentUser?.role || 'candidate');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [fullMentorData, setFullMentorData] = useState(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState('paid');
  const [isInSession, setIsInSession] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('upcoming');


  // NOTE: useBookingNotifications is handled inside each dashboard (CandidateDashboard/MentorDashboard)
  // Do NOT call it here again to avoid duplicate socket event listeners

  // Routing sync with Hash URL
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/admin')) {
        if (hash === '#/admin/login') {
          setCurrentView('admin-login');
        } else {
          if (isAdminLoggedIn()) {
            setIsAdminAuthenticated(true);
            setCurrentView('admin-dashboard');
          } else {
            window.location.hash = '#/admin/login';
          }
        }
      } else if (hash === '#/messages') {
        setCurrentView('messages');
      } else if (hash === '#/about') {
        setCurrentView('about');
      } else if (hash === '#/contact') {
        setCurrentView('contact');
      } else if (hash === '#/home' || hash === '' || hash === '#/') {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();

    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (currentView === 'home') {
      if (window.location.hash !== '' && window.location.hash !== '#/') {
        window.location.hash = '#/';
      }
    } else if (currentView === 'about') {
      window.location.hash = '#/about';
    } else if (currentView === 'contact') {
      window.location.hash = '#/contact';
    } else if (currentView === 'messages') {
      window.location.hash = '#/messages';
    } else if (currentView === 'admin-login') {
      window.location.hash = '#/admin/login';
    } else if (currentView === 'admin-dashboard') {
      if (!window.location.hash.startsWith('#/admin')) {
        window.location.hash = '#/admin/dashboard';
      }
    }
  }, [currentView]);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState('not-started');
  const [testResults, setTestResults] = useState(null);
  const [testAttempts, setTestAttempts] = useState(0);
  const [testTimeLimit, setTestTimeLimit] = useState(600);
  const MAX_ATTEMPTS = 3;

  const handleAuthSuccess = (role) => {
    setUserRole(role);
    setIsAuthModalOpen(false);
    if (role === 'mentor') {
      setCurrentView('mentor-profile');
    } else {
      setCurrentView('candidate-profile');
    }
  };

  const handleProfileUpdate = async (updatedProfile) => {
    const currentUser = useAuthStore.getState().user;
    const mergedUser = {
      ...currentUser,
      name: updatedProfile.name || currentUser?.name,
    };
    useAuthStore.getState().setUser(mergedUser);

    try {
      console.log('📤 Saving profile with availability:', JSON.stringify(updatedProfile.availability));
      
      const response = await createMentorProfile({
        name: updatedProfile.name,
        title: updatedProfile.title,
        company: updatedProfile.company,
        skills: updatedProfile.skills,
        bio: updatedProfile.bio,
        hourlyRate: updatedProfile.hourlyRate || updatedProfile.rate,
        experience: updatedProfile.experience,
        languages: updatedProfile.languages,
        profileImage: updatedProfile.profileImage || '',
        availability: updatedProfile.availability || [],
      });

      const savedProfile = response.data.mentor;
      console.log('✅ Saved profile from MongoDB:', JSON.stringify(savedProfile.availability));
      
      useAuthStore.getState().setMentorProfile(savedProfile);
      setSelectedMentor(savedProfile);
      setFullMentorData(savedProfile);
      toast.success('Profile saved successfully');
      return savedProfile;
    } catch (error) {
      toast.error('Failed to save profile');
      throw error;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  useEffect(() => {
    const handleJoinSession = (event) => {
      try {
        const { mentor, session } = event.detail || {};
        if (!session || !session._id) {
          console.error('Invalid session data:', session);
          return;
        }
        setSelectedMentor(mentor);
        setActiveSession(session);
        setCurrentView('session-room');
      } catch (err) {
        console.error('Error joining session:', err);
      }
    };

    window.addEventListener('joinSession', handleJoinSession);
    return () => window.removeEventListener('joinSession', handleJoinSession);
  }, []);

  const handleGetStarted = () => {
    setIsAuthModalOpen(true);
  };

  const handleExploreMentors = () => {
    if (currentView !== 'home') {
      setCurrentView('home');
      // Wait for re-render before scrolling
      setTimeout(() => {
        const mentorsSection = document.getElementById('mentors');
        if (mentorsSection) {
          mentorsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const mentorsSection = document.getElementById('mentors');
      if (mentorsSection) {
        mentorsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleNavigateTab = (view, tab) => {
    setDashboardTab(tab);
    setCurrentView(view);
  };

  const handleMentorClick = async (mentor) => {
    setSelectedMentor(mentor);
    // Fetch full mentor data with availability
    try {
      const { getMentorProfile } = await import('./services/api');
      const res = await getMentorProfile();
      if (res.data?.mentor) {
        setFullMentorData(res.data.mentor);
      } else {
        setFullMentorData(mentor);
      }
    } catch {
      setFullMentorData(mentor);
    }
    setIsMentorModalOpen(true);
  };

  const handleBookDemo = async (mentor, type = 'paid') => {
    setSelectedMentor(mentor);
    // Fetch full mentor data with availability
    try {
      const { getMentorProfile } = await import('./services/api');
      const res = await getMentorProfile();
      if (res.data?.mentor) {
        setFullMentorData(res.data.mentor);
      } else {
        setFullMentorData(mentor);
      }
    } catch {
      setFullMentorData(mentor);
    }
    setBookingType(type);
    setIsBookingModalOpen(true);
  };

  const handleLogout = () => {
    storeLogout();  // clears token + user from Zustand & localStorage
    setCurrentView('home');
    setUserRole('candidate');
  };

  // Verification handlers
  const handleStartTest = async () => {
    setTestLoading(true);
    try {
      const res = await getMentorTest();
      const test = res.data.test;

      setTestTimeLimit(test.timeLimit || 600);

      const formattedQuestions = test.mcq.map((q, index) => ({
        id: q.id || `q${index + 1}`,
        title: q.question,
        description: '',
        options: q.options.map((opt, i) => ({
          id: `q${index + 1}_${String.fromCharCode(97 + i)}`,
          label: String.fromCharCode(65 + i),
          text: opt
        }))
      }));

      setCurrentQuestions(formattedQuestions);
      setVerificationStatus('not-started');
      setCurrentView('verification-entry');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load test');
    } finally {
      setTestLoading(false);
    }
  };

  const handleActualTestStart = () => {
    setVerificationStatus('in-progress');
    setCurrentView('verification-test');
  };


  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [testLoading, setTestLoading] = useState(false);


  const handleTestSubmit = async (results) => {
    try {
      const mcqAnswers = [];
      for (const [questionId, optionId] of Object.entries(results.answers)) {
        const question = currentQuestions.find(q => q.id === questionId);
        if (question) {
          const optionIndex = question.options.findIndex(opt => opt.id === optionId);
          mcqAnswers.push({ id: questionId, answer: optionIndex });
        }
      }

      const res = await submitMentorTest({ mcqAnswers });

      const { score, verified, attempts: serverAttempts } = res.data;
      let newAttemptCount = testAttempts + 1;
      if (serverAttempts) newAttemptCount = serverAttempts;
      setTestAttempts(newAttemptCount);
      setTestResults({ score, passed: verified, attempt: newAttemptCount, totalQuestions: currentQuestions.length, correctCount: Math.round((score / 100) * currentQuestions.length) });

      if (verified) {
        setVerificationStatus('approved');
        if (currentUser) {
          const updatedUser = { ...currentUser, isVerified: true, verificationStatus: 'Verified' };
          useAuthStore.getState().setUser(updatedUser);
        }
        // Also update mentorProfile in Zustand so profile page shows verified
        const currentMentorP = useAuthStore.getState().mentorProfile;
        if (currentMentorP) {
          useAuthStore.getState().setMentorProfile({ ...currentMentorP, verified: true });
        }
      } else {
        setVerificationStatus('rejected');
      }

      setCurrentView('verification-result');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit test');
      setCurrentView('verification-entry');
    }
  };


  const handleActivateProfile = () => {
    setCurrentView('mentor-profile');
  };

  const handleRetake = () => {
    if (verificationStatus === 'permanently-rejected') {
      setCurrentView('home');
    } else {
      setVerificationStatus('not-started');
      handleStartTest();
    }
  };

  return (
    <SocketProvider userId={currentUser?.id} userType={currentUser?.role}>
      <ThemeProvider>
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden transition-colors duration-300">
          {/* Show Navbar only on public pages (home, about, contact) */}
          {(currentView === 'home' || currentView === 'about' || currentView === 'contact') ? (
            <Navbar
              onLoginClick={handleGetStarted}
              onNavigate={handleViewChange}
              currentView={currentView}
              userRole={userRole}
              onLogout={handleLogout}
              onNavigateTab={handleNavigateTab}
            />
          ) : null}

        <main className="transition-opacity duration-500">
          {currentView === 'admin-login' ? (
            <AdminLogin
              onLoginSuccess={() => {
                setIsAdminAuthenticated(true);
                setCurrentView('admin-dashboard');
              }}
              onBack={() => setCurrentView('home')}
            />
          ) : currentView === 'admin-dashboard' ? (
            isAdminAuthenticated ? (
              <AdminDashboard onLogout={() => {
                setIsAdminAuthenticated(false);
                setCurrentView('home');
              }} />
            ) : (
              <AdminLogin
                onLoginSuccess={() => {
                  setIsAdminAuthenticated(true);
                  setCurrentView('admin-dashboard');
                }}
                onBack={() => setCurrentView('home')}
              />
            )
          ) : currentView === 'home' ? (
            <>
              <Hero
                onGetStarted={handleGetStarted}
                onExploreMentors={handleExploreMentors}
              />
              <Features />
              <HowItWorks />
              <div id="mentors">
                <MentorShowcase 
                  onBookDemo={(mentor) => {
                    if (!currentUser) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    if (userRole !== 'candidate') {
                      alert('Only candidates can book sessions. Please sign in as a candidate.');
                      return;
                    }
                    handleBookDemo(mentor, 'demo');
                  }} 
                />
              </div>
              <CTASection onCreateAccount={handleGetStarted} />
            </>
          ) : currentView === 'about' ? (
            <About />
          ) : currentView === 'contact' ? (
            <Contact />
          ) : currentView === 'messages' ? (
            <MessagesPage onBack={() => setCurrentView(currentUser?.role === 'mentor' ? 'dashboard' : 'home')} />
          ) : currentView === 'mentor-profile' ? (
            <MentorProfile
              mentor={selectedMentor}
              isOwnProfile={userRole === 'mentor' && (!selectedMentor || selectedMentor.email === currentUser?.email)} // Improved check
              onBack={() => userRole === 'mentor' ? setCurrentView('dashboard') : setCurrentView('home')}
              onBookDemo={handleBookDemo}
              onSaveProfile={handleProfileUpdate}
              startEditing={mentorProfile && (!mentorProfile.skills || mentorProfile.skills.length === 0)}
              onTakeVerification={handleStartTest}
            />

          ) : currentView === 'candidate-profile' ? (
            <CandidateProfile
              onBack={() => setCurrentView(null)}
            />

          ) : currentView === 'candidate-settings' ? (
            <CandidateSettings
              onBack={() => setCurrentView(null)}
            />

          ) : currentView === 'mentor-settings' ? (
            <MentorSettings
              onBack={() => setCurrentView(null)}
            />

          ) : currentView === 'verification-entry' ? (
            <VerificationEntry
              onStartTest={handleActualTestStart}
              verificationStatus={verificationStatus}
              attempts={testAttempts}
              maxAttempts={MAX_ATTEMPTS}
              questionCount={currentQuestions.length || 5}
              timeMinutes={Math.floor((testTimeLimit || 600) / 60)}
            />
          ) : currentView === 'verification-test' ? (
            <VerificationTest
              questions={currentQuestions}
              skills={currentUser?.skills || []}
              duration={testTimeLimit}
              onSubmit={handleTestSubmit}
              onExit={() => setCurrentView('verification-entry')}
            />
          ) : currentView === 'verification-result' ? (
            <VerificationResult
              score={testResults?.score || 0}
              passed={testResults?.passed || false}
              onActivateProfile={handleActivateProfile}
              onRetake={handleRetake}
              attempt={testResults?.attempt || 0}
              maxAttempts={MAX_ATTEMPTS}
              status={verificationStatus}
              totalQuestions={testResults?.totalQuestions || currentQuestions.length}
              correctCount={testResults?.correctCount || 0}
            />
          ) : currentView === 'discovery-full' ? (
            <MentorDiscovery
              onMentorClick={handleMentorClick}
              onBookDemo={(mentor) => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                  return;
                }
                if (userRole !== 'candidate') {
                  alert('Only candidates can book sessions.');
                  return;
                }
                handleBookDemo(mentor, 'demo');
              }}
              onBack={() => setCurrentView(null)}
              onNavigate={(tab) => {
                if (tab === 'dashboard') {
                  setCurrentView(null);
                }
              }}
            />
          ) : userRole === 'candidate' ? (
            <CandidateDashboard 
              key={dashboardTab} 
              initialTab={dashboardTab} 
              onMentorClick={handleMentorClick} 
              onBookDemo={(mentor) => handleBookDemo(mentor, 'demo')}
              onProfileClick={() => setCurrentView('candidate-profile')}
              onSettings={() => setCurrentView('candidate-settings')}
              onLogout={handleLogout}
              onExploreFullPage={() => setCurrentView('discovery-full')}
            />
          ) : (
            <MentorDashboard key={mentorProfile?._id || 'mentor-dashboard'} initialTab={dashboardTab}
              onStudentClick={(student) => {
                setSelectedCandidate(student);
                setIsCandidateModalOpen(true);
              }}
              onSettings={() => setCurrentView('mentor-settings')}
              onLogout={handleLogout}
              onNavigate={(view) => setCurrentView(view)}
              onStartVerification={handleStartTest}
            />
          )}
        </main>

        {/* FULL-SCREEN SESSION ROOM - Renders outside main layout */}
        {currentView === 'session-room' && activeSession?._id && (
          <div className="fixed inset-0 z-50 bg-background">
            <VideoSessionRoom
              booking={activeSession}
              userRole={userRole}
              onEnd={() => {
                setActiveSession(null);
                setCurrentView(null);
              }}
            />
          </div>
        )}

        {/* Footer - only show on public pages */}
        {(currentView === 'home' || currentView === 'about' || currentView === 'contact') && (
          <Footer onNavigate={setCurrentView} />
        )}

        {/* Auth, Profile, and Booking Modals */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />

        <MentorProfileModal
          mentor={fullMentorData || selectedMentor}
          isOpen={isMentorModalOpen}
          onClose={() => {
            setIsMentorModalOpen(false);
            setFullMentorData(null);
          }}
          onBookDemo={async (mentor) => {
            setIsMentorModalOpen(false);
            setSelectedMentor(mentor);
            try {
              const { getMentorProfile } = await import('./services/api');
              const res = await getMentorProfile();
              setFullMentorData(res.data?.mentor || mentor);
            } catch {
              setFullMentorData(mentor);
            }
            setBookingType('demo');
            setIsBookingModalOpen(true);
          }}
          onBookPaid={async (mentor) => {
            setIsMentorModalOpen(false);
            setSelectedMentor(mentor);
            try {
              const { getMentorProfile } = await import('./services/api');
              const res = await getMentorProfile();
              setFullMentorData(res.data?.mentor || mentor);
            } catch {
              setFullMentorData(mentor);
            }
            setBookingType('paid');
            setIsBookingModalOpen(true);
          }}
        />

        <BookingModal
          mentor={fullMentorData || selectedMentor}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setFullMentorData(null);
          }}
          initialType={bookingType}
          onBookingComplete={(data) => {
            console.log("Booking Complete:", data);
            window.dispatchEvent(new Event('bookingCompleted'));
          }}
        />

        <CandidateProfileModal
          candidate={selectedCandidate}
          isOpen={isCandidateModalOpen}
          onClose={() => setIsCandidateModalOpen(false)}
          onChat={() => {
            setIsCandidateModalOpen(false);
          }}
        />
        </div>
        <Toaster position="top-center" richColors />

        <style>{`
          * {
              transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
          }

          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          html {
            scroll-behavior: smooth;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}</style>
      </ThemeProvider>
    </SocketProvider>
  );
}
