import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Award, Shield, Clock, Flame, Calendar, Activity, CheckCircle, Edit3, Save, User } from 'lucide-react';
import { toast } from '../components/NotificationToast';

export default function Account() {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  
  // Profile stats
  const [profileStats, setProfileStats] = useState({
    reputation: 0,
    rank: 1,
    reportsSubmitted: 0,
    solvedCount: 0,
    volunteerHours: 0,
    projectsJoinedCount: 0,
    projectsCompletedCount: 0,
    streak: 0,
    badges: []
  });
  
  const [myActivity, setMyActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('Neighborhood champion helping to build a clean and safe community.');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isAvatarTooLarge, setIsAvatarTooLarge] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Fetch dynamic stats directly from backend
      const [statsRes, leaderboardData, reportsData] = await Promise.all([
        api.getUserStats(user.uid).catch(() => null),
        api.getLeaderboard('allTime', 'All').catch(() => []),
        api.getReports().catch(() => [])
      ]);

      const rank = leaderboardData.findIndex(u => u.uid === user.uid);
      
      if (statsRes) {
        setProfileStats({
          reputation: statsRes.reputation || 0,
          rank: rank !== -1 ? rank + 1 : leaderboardData.length + 1,
          reportsSubmitted: statsRes.reportsSubmitted || 0,
          solvedCount: statsRes.solvedCount || 0,
          volunteerHours: statsRes.volunteerHours || 0,
          projectsJoinedCount: statsRes.projectsJoinedCount || 0,
          projectsCompletedCount: statsRes.projectsCompletedCount || 0,
          streak: statsRes.streak || 1,
          badges: statsRes.badges || ['Community Hero'],
          level: statsRes.level || 1,
          xpProgress: statsRes.xpProgress || 0,
          xpForNext: statsRes.xpForNext || 200,
          timeline: statsRes.timeline || []
        });
      } else {
        setProfileStats({
          reputation: user.reputation || 0,
          rank: rank !== -1 ? rank + 1 : 1,
          reportsSubmitted: 0, solvedCount: 0, volunteerHours: 0,
          projectsJoinedCount: 0, projectsCompletedCount: 0,
          streak: 1, badges: user.badges || ['Community Hero'],
          level: 1, xpProgress: 0, xpForNext: 200, timeline: []
        });
      }

      const userProjects = reportsData.filter(r => r.reporter?.uid === user.uid || r.volunteers?.includes(user.uid));
      setMyActivity(userProjects.slice(0, 5));

      setDisplayName(user.displayName || user.name || '');
      const savedBio = localStorage.getItem(`bio_${user.uid}`);
      if (savedBio) setBio(savedBio);

    } catch (err) {
      console.warn("Could not load full profile stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const handleAvatarChange = (file) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setIsAvatarTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        return;
      }
    }
    setIsAvatarTooLarge(false);
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (isAvatarTooLarge) return;
    try {
      const formData = new FormData();
      formData.append('uid', user.uid);
      formData.append('displayName', displayName);
      formData.append('bio', bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      const updatedUser = await api.updateUserProfile(formData);
      
      // Update AuthContext user state locally
      user.displayName = updatedUser.name;
      user.photoURL = updatedUser.photoURL;
      
      // Update local storage credentials cache
      localStorage.setItem('hero_user', JSON.stringify({
        ...user,
        displayName: updatedUser.name,
        photoURL: updatedUser.photoURL
      }));
      
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile details updated!");
      fetchProfileData();
    } catch (err) {
      if (err.message && (err.message.includes("limit of 20 MB") || err.message.includes("File too large"))) {
        setIsAvatarTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
      } else {
        toast.error("Failed to update profile details");
      }
    }
  };

  if (!user) return null;

  // Gamification calculations
  const repPoints = profileStats.reputation;
  const currentLevel = Math.floor(repPoints / 100) + 1;
  const currentLevelMin = (currentLevel - 1) * 100;
  const nextLevelMin = currentLevel * 100;
  const levelProgress = repPoints - currentLevelMin;
  const levelProgressPct = Math.min(100, Math.round((levelProgress / 100) * 100));

  // Activity streak calendar grid (mon-sun)
  const streakDays = [
    { name: 'M', active: true },
    { name: 'T', active: true },
    { name: 'W', active: true },
    { name: 'T', active: profileStats.streak >= 4 },
    { name: 'F', active: profileStats.streak >= 5 },
    { name: 'S', active: profileStats.streak >= 6 },
    { name: 'S', active: profileStats.streak >= 7 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: PROFILE SUMMARY CARD */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <img 
                      src={avatarPreview || user.photoURL} 
                      alt={displayName} 
                      className={`h-24 w-24 rounded-full border-2 shadow-md object-cover transition ${
                        isAvatarTooLarge ? 'border-red-500 ring-4 ring-red-500/20' : 'border-primary-500'
                      }`}
                    />
                    <span className="absolute bottom-1 right-1 bg-orange-500 text-white p-1 rounded-full text-xs shadow-md">
                      🔥
                    </span>
                  </div>

                  {editing ? (
                    <div className="w-full space-y-3">
                      {/* Avatar selector */}
                      <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isAvatarTooLarge 
                          ? 'bg-red-550 hover:bg-red-650 text-white' 
                          : 'bg-slate-105 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200'
                      }`}>
                        <span>📷 Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAvatarChange(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      <p className={`text-[9px] text-center font-medium ${isAvatarTooLarge ? 'text-red-500 font-bold animate-pulse' : 'text-slate-400'}`}>
                        Supported formats: JPG, JPEG, PNG, WEBP • Max: 20 MB
                      </p>

                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full text-center text-sm font-bold border border-slate-200 dark:border-slate-880 rounded-xl px-2 py-1.5 focus:outline-none"
                      />
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        className="w-full text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-880 rounded-xl px-2 py-1.5 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveProfile}
                        disabled={isAvatarTooLarge}
                        className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-2 shadow-sm transition disabled:opacity-50"
                      >
                        <Save size={12} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
                        <span>{displayName}</span>
                        <button 
                          onClick={() => setEditing(true)}
                          className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 px-4 leading-relaxed italic">
                        "{bio}"
                      </p>
                    </>
                  )}

                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mt-6">
                    <Shield size={12} className="text-primary-500" />
                    <span>Level {currentLevel} • Rank #{profileStats.rank}</span>
                  </div>
                </div>

                {/* Points and streak grid */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-150 dark:border-slate-800">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Score</p>
                    <p className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1">
                      {profileStats.reputation}
                    </p>
                  </div>
                  <div className="text-center border-l border-slate-150 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Streak</p>
                    <p className="text-2xl font-black text-orange-500 mt-1 flex items-center justify-center gap-1">
                      <Flame size={20} className="fill-orange-500" />
                      {profileStats.streak}d
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* XP LEVEL DETAILS */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-4"
              >
                <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400 tracking-wider">
                  <span>Level progress</span>
                  <span>{repPoints} / {nextLevelMin} XP</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${levelProgressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Earn {nextLevelMin - repPoints} more reputation points to reach Level {currentLevel + 1}!
                </p>
              </motion.div>
            </div>

            {/* COLUMN 2 & 3: STATS GRID & TIMELINE */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* STATS MATRIX */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volunteer Hours</p>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-2 flex items-center justify-center">
                    <Clock className="text-slate-400 mr-1.5" size={20} />
                    {profileStats.volunteerHours}h
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Problems Reported</p>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-2">
                    {profileStats.reportsSubmitted}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Problems Solved</p>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-2">
                    {profileStats.solvedCount}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projects Joined</p>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-2">
                    {profileStats.projectsJoinedCount}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projects Completed</p>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-2">
                    {profileStats.projectsCompletedCount}
                  </p>
                </div>
              </motion.div>

              {/* ACHIEVEMENT BADGES */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-4"
              >
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Award className="mr-2 text-primary-500" size={16} />
                  Earned Achievement Badges
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {profileStats.badges.map((badge, idx) => (
                    <span 
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-750 dark:bg-primary-950/20 dark:text-primary-400 text-xs font-semibold border border-primary-100/50 dark:border-primary-900/30 flex items-center space-x-1"
                    >
                      <span>🏆</span>
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* TIMELINE / RECENT ACTIVITY */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6"
              >
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Activity className="mr-2 text-primary-500" size={16} />
                  Recent Contribution Timeline
                </h4>

                {myActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No recent contributions. Join a project crew or report an issue to get started!
                  </p>
                ) : (
                  <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6 pl-6">
                    {myActivity.map((project) => {
                      const isCreator = project.reporter?.uid === user.uid;
                      return (
                        <div key={project.id} className="relative group">
                          {/* Dot indicator */}
                          <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 dark:bg-slate-900 border-2 border-primary-500 group-hover:scale-110 transition duration-150" />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                            <h5 className="font-bold text-sm text-slate-950 dark:text-white hover:text-primary-600 transition">
                              <span className="cursor-pointer" onClick={() => navigate(`/problems/${project.id}`)}>
                                {project.title}
                              </span>
                            </h5>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {project.status}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 mt-1">
                            {isCreator ? 'Organized and reported this problem.' : 'Joined cleanup crew force.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

            </div>

          </div>
        )}

      </div>

      {showSizeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-center animate-scale-in">
            <div className="flex justify-center mb-4 text-red-500">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Image Size Exceeded</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.
            </p>
            <button
              onClick={() => setShowSizeModal(false)}
              className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition text-xs shadow-md shadow-red-500/25"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
