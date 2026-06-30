import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Sun, Moon, LogOut, ShieldAlert, Award, Menu, X, CheckSquare, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, loginWithGoogle, logout, isFirebase, isMockAllowed } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const list = await api.getNotifications(user.uid);
        setNotifications(list);
      } catch (err) {
        console.warn("Failed to retrieve notifications");
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = async (notif) => {
    try {
      await api.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setShowNotifDropdown(false);
      if (notif.reportId) {
        navigate(`/problems/${notif.reportId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync theme
  useEffect(() => {
    const isDark = 
      localStorage.theme === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setDarkMode(true);
    }
  };

  const handleSignIn = async (role, forceMock = false) => {
    setShowLoginModal(false);
    await loginWithGoogle(role, forceMock);
    navigate('/account');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🦸</span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
                Community Hero
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 transition">
              Home
            </Link>
            <Link to="/problems" className="text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 transition">
              Problems
            </Link>
            <Link to="/leaderboard" className="text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 transition">
              Leaderboard
            </Link>
            {user && (
              <Link to="/account" className="text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 transition">
                Account
              </Link>
            )}

            {/* Ask Gemini Button */}
            <a 
              href="https://gemini.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center space-x-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold transition text-slate-700 dark:text-slate-200"
            >
              <span>🤖 Ask Gemini</span>
            </a>

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition relative"
                  aria-label="View Notifications"
                >
                  <Bell size={18} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950 z-50">
                    <div className="flex justify-between items-center px-3 py-1.5 border-b dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <span>Notifications</span>
                      <span>({notifications.filter(n => !n.read).length} Unread)</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-900 mt-1">
                      {notifications.length === 0 ? (
                        <p className="text-center py-4 text-xs text-slate-450 italic">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer rounded-xl transition ${!n.read ? 'bg-primary-50/20 dark:bg-primary-950/10' : ''}`}
                          >
                            <h5 className={`text-xs ${!n.read ? 'font-bold text-slate-905 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>
                              {n.title}
                            </h5>
                            <p className="text-[10px] text-slate-550 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[8px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="h-8 w-8 rounded-full border border-slate-200 shadow object-cover"
                  />
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-250 leading-tight">{user.displayName}</p>
                    <p className="text-[10px] text-primary-500 font-bold flex items-center">
                      <Award size={10} className="mr-0.5" />
                      {user.reputation} pts
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 animate-slide-up">
                    <Link 
                      to="/account" 
                      onClick={() => setUserDropdownOpen(false)}
                      className="block rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-880"
                    >
                      Account Profile
                    </Link>
                    <Link 
                      to="/report" 
                      onClick={() => setUserDropdownOpen(false)}
                      className="block rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800 font-semibold text-primary-600 dark:text-primary-400"
                    >
                      Report Civic Issue
                    </Link>
                    <hr className="my-1 border-slate-100 dark:border-slate-800" />
                    <button 
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 active:scale-95 transition"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden animate-fade-in">
          <div className="space-y-2">
            <Link 
              to="/" 
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Home
            </Link>
            <Link 
              to="/problems" 
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Problems
            </Link>
            <Link 
              to="/leaderboard" 
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Leaderboard
            </Link>
            {user && (
              <Link 
                to="/account" 
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Account Profile
              </Link>
            )}
            <a 
              href="https://gemini.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              🤖 Ask Gemini
            </a>
            <hr className="my-2 border-slate-100 dark:border-slate-800" />
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 px-3 py-1">
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold">{user.displayName}</p>
                    <p className="text-xs text-primary-500 font-bold">{user.reputation} pts</p>
                  </div>
                </div>
                <Link 
                  to="/account" 
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300"
                >
                  Account Profile
                </Link>
                <Link 
                  to="/report" 
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base font-semibold text-primary-600 hover:bg-slate-50 dark:text-primary-400"
                >
                  Report Civic Issue
                </Link>
                <button 
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  setShowLoginModal(true);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 py-2.5 text-center text-sm font-semibold text-white shadow"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sign-In Dialog / Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sign in to Community Hero</h3>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Participate in local problem-solving, earn contribution reputation, and verify city reports.
            </p>

            <div className="space-y-3">
              {isFirebase || !isMockAllowed ? (
                <button 
                  onClick={() => handleSignIn('citizen', false)}
                  className="flex w-full items-center justify-center space-x-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-850 px-4 py-3 text-sm font-semibold shadow-sm transition"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.104C18.28 1.83 15.542 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.91 0 9.847-4.143 9.847-10.023 0-.675-.072-1.185-.16-1.688H12.24z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleSignIn('citizen', true)}
                    className="flex w-full items-center justify-center space-x-3 rounded-xl bg-primary-600 hover:bg-primary-750 text-white px-4 py-3 text-sm font-semibold shadow-md transition"
                  >
                    <span>🦸 Sign In as Citizen (Mock)</span>
                  </button>
                  <button 
                    onClick={() => handleSignIn('admin', true)}
                    className="flex w-full items-center justify-center space-x-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 text-sm font-semibold shadow-md transition"
                  >
                    <span>💼 Sign In as Volunteer Crew Leader (Mock)</span>
                  </button>
                  <div className="text-center mt-4">
                    <p className="text-[10px] text-slate-400">
                      Mock mode active. No Google account verification required.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
