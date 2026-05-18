import { Moon, Sun, LogOut, Calendar, Search, User, DollarSign, LayoutDashboard, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import useAuthStore from '../store/authStore';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';


export function Navbar({ onLoginClick, onNavigate, currentView, userRole, onLogout, onNavigateTab }) {
  const { theme, toggleTheme } = useTheme();
  const currentUser = useAuthStore(s => s.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view, sectionId) => {
    setMobileMenuOpen(false);
    if (view === 'home' && sectionId) {
      if (currentView !== 'home') {
        onNavigate('home');
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      onNavigate(view);
    }
  };

  const isLoggedIn = !!currentUser;
  const isDashboard = isLoggedIn;

  const navItems = {
    home: [
      { label: 'Home', view: 'home', sectionId: null },
      { label: 'Mentors', view: 'home', sectionId: 'mentors' },
      { label: 'How It Works', view: 'home', sectionId: 'how-it-works' },
      { label: 'About', view: 'about', sectionId: null },
      { label: 'Contact', view: 'contact', sectionId: null },
    ],
    candidate: [
      { label: 'Sessions', icon: Calendar, view: 'dashboard', tab: 'upcoming' },
      { label: 'Explore', icon: Search, view: 'dashboard', tab: 'discovery' },
      { label: 'Profile', icon: User, view: 'profile' },
    ],
    mentor: [
      { label: 'Schedule', icon: Calendar, view: 'dashboard', tab: 'upcoming' },
      { label: 'Earnings', icon: DollarSign, view: 'dashboard', tab: 'earnings' },
      { label: 'Profile', icon: User, view: 'profile' },
    ]
  };

  const currentNavItems = isLoggedIn ? (userRole === 'mentor' ? navItems.mentor : navItems.candidate) : navItems.home;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl px-5 sm:px-6 py-3 sm:py-3.5 bg-card backdrop-blur-2xl border border-border shadow-md transition-all duration-300">
          <div className="flex items-center justify-between h-12">
            {/* LEFT: Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
              onClick={() => handleNavClick('home')}
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                <span className="text-primary-foreground font-black text-lg">G</span>
              </div>
              <span className="text-xl font-black tracking-tight text-foreground hidden sm:block">Guru<span className="text-primary">Connect</span></span>
            </div>

            {/* CENTER: Nav Links */}
            <div className="hidden md:flex items-center justify-center flex-1 px-8">
              <div className="flex items-center space-x-8">
                {!isDashboard ? (
                  currentNavItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNavClick(item.view, item.sectionId)}
                      className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                        currentView === item.view && !item.sectionId 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => onNavigate('dashboard')} className="gap-2 h-9">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                    <div className="w-px h-5 bg-border" />
                    {currentNavItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.view === 'profile') {
                            onNavigate(userRole === 'mentor' ? 'mentor-profile' : 'candidate-profile');
                          } else if (item.tab) {
                            onNavigateTab(item.view, item.tab);
                          } else {
                            onNavigate(item.view);
                          }
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: Theme Toggle + Auth */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="w-9 h-9">
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
              </motion.div>

              {isDashboard ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" onClick={onLogout} className="hidden sm:flex gap-2 text-muted-foreground hover:text-destructive h-9">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" onClick={onLoginClick} className="h-9">
                    Login
                  </Button>
                </motion.div>
              )}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden w-9 h-9" aria-label="Toggle mobile menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                  {/* Required by Radix UI for screen reader accessibility */}
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">Mobile navigation links for GuruConnect</SheetDescription>
                  <div className="flex flex-col gap-6 mt-8">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleNavClick('home')}
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-black text-base">G</span>
                      </div>
                      <span className="text-lg font-black tracking-tight text-foreground">Guru<span className="text-primary">Connect</span></span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!isDashboard ? (
                        currentNavItems.map((item) => (
                          <Button
                            key={item.label}
                            variant={currentView === item.view && !item.sectionId ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => handleNavClick(item.view, item.sectionId)}
                          >
                            {item.label}
                          </Button>
                        ))
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            className="justify-start gap-2"
                            onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </Button>
                          {currentNavItems.map((item) => (
                            <Button
                              key={item.label}
                              variant="ghost"
                              className="justify-start gap-2"
                              onClick={() => {
                                if (item.view === 'profile') {
                                  onNavigate(userRole === 'mentor' ? 'mentor-profile' : 'candidate-profile');
                                } else if (item.tab) {
                                  onNavigateTab(item.view, item.tab);
                                } else {
                                  onNavigate(item.view);
                                }
                                setMobileMenuOpen(false);
                              }}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.label}
                            </Button>
                          ))}
                          <Button
                            variant="destructive"
                            className="justify-start gap-2 mt-4"
                            onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}