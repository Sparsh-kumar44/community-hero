import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Award, Bell, ShieldAlert, CheckCircle2, Clock, CheckCheck, Landmark, Flame, Shield, MapPin, Calendar, Activity } from 'lucide-react';
import { toast } from '../components/NotificationToast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState([]);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityStats, setCommunityStats] = useState(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const [allReports, notifs, analytics] = await Promise.all([
        api.getReports().catch(() => []),
        api.getNotifications(user.uid).catch(() => []),
        api.getAnalytics().catch(() => null)
      ]);

      setMyReports(allReports.filter(r => r.reporter?.uid === user.uid));
      setNearbyReports(allReports.filter(r => r.reporter?.uid !== user.uid).slice(0, 4));
      setNotifications(notifs);
      if (analytics) setCommunityStats(analytics);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success("Notification marked as read");
    } catch (e) {
      toast.error("Failed to update notification status");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Reported': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Verified': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Volunteers Joined': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'In Progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'Completed': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'Community Verified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-350';
    }
  };

  if (!user) return null;

  const streakDays = [
    { name: 'M', active: true },
    { name: 'T', active: true },
    { name: 'W', active: true },
    { name: 'T', active: (user.streak || 3) >= 4 },
    { name: 'F', active: (user.streak || 3) >= 5 },
    { name: 'S', active: (user.streak || 3) >= 6 },
    { name: 'S', active: (user.streak || 3) >= 7 },
  ];

  const cs = communityStats?.summary;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-880 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Citizen Action Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Welcome back, {user.displayName || user.name}! Track your projects and community impact.</p>
        </div>
        <Link 
          to="/report"
          className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow hover:scale-105 active:scale-95 transition"
        >
          ➕ Report New Problem
        </Link>
      </div>

      {/* COMMUNITY OVERVIEW CARDS */}
      {cs && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: '🚨 Critical Issues', value: cs.criticalIssues || 0, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
            { label: '⚠️ High Priority', value: cs.highPriority || 0, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
            { label: '✅ Done This Week', value: cs.completedThisWeek || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
            { label: '⏱️ Vol. Hours', value: cs.volunteerHours || 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
            { label: '🤝 Volunteers', value: cs.totalVolunteers || 0, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
            { label: '🌟 Impact Score', value: cs.communityImpactScore || 0, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl border p-4 text-center ${item.bg}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{item.label}</p>
              <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PROFILE CARD & GAMIFICATION SECTION */}
          <div className="space-y-6">
            {/* PROFILE DETAILS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img 
                    src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                    alt={user.displayName} 
                    className="h-24 w-24 rounded-full border-2 border-primary-500 shadow object-cover mb-4"
                  />
                  <div className="absolute bottom-3 right-0 bg-orange-500 text-white rounded-full p-1.5 shadow border border-white flex items-center justify-center">
                    <Flame size={16} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-955 dark:text-white">{user.displayName || user.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{user.email}</p>
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Shield size={12} className="text-primary-500" />
                  <span>🦸 Neighborhood Hero</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-150 dark:border-slate-800">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Streak</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 flex items-center justify-center gap-1">
                    <Flame size={20} className="text-orange-500" />
                    {user.streak || 3}d
                  </p>
                </div>
                <div className="text-center border-l border-slate-150 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Reputation</p>
                  <p className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1 flex items-center justify-center">
                    <Award size={18} className="mr-1" />
                    {user.reputation}
                  </p>
                </div>
              </div>
            </div>

            {/* STREAK CALENDAR & PROGRESS BAR */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <Calendar className="mr-2 text-primary-500" size={16} />
                Activity Streak Calendar
              </h4>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border">
                {streakDays.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-2">{day.name}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${day.active ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      {day.active ? '🔥' : '•'}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-450 leading-normal mt-3 font-semibold text-center text-orange-500">
                Log or participate in 1 project today to maintain your streak!
              </p>
            </div>

            {/* REPUTATION PROGRESS TIMELINE GRAPH */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <Activity className="mr-2 text-primary-500" size={16} />
                Reputation Growth
              </h4>
              <div className="h-40">
                <Line 
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Reputation',
                      data: [40, 90, 140, 210, 280, user.reputation || 340],
                      borderColor: '#4f46e5',
                      backgroundColor: 'rgba(79, 70, 229, 0.05)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
                  }}
                />
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: SUBMITTED COMPLAINTS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* NOTIFICATIONS PANEL */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Bell className="mr-2 text-primary-500 animate-bounce" size={18} />
                  Community Activity Feed
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350 font-bold">
                  {notifications.filter(n => !n.read).length} unread
                </span>
              </h4>

              {notifications.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No notifications yet. You will be notified when projects you participate in update.
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      className={`p-3 rounded-2xl border text-xs flex justify-between items-start transition ${notif.read ? 'bg-slate-50/50 border-slate-100 dark:bg-slate-950/20 dark:border-slate-800/80' : 'bg-primary-50/30 border-primary-100 dark:bg-primary-950/10 dark:border-primary-900/60'}`}
                    >
                      <div className="flex-1 mr-3">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                          <span>{notif.title}</span>
                          {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-ping"></span>}
                        </div>
                        <p className="text-slate-500 dark:text-slate-450 mt-1">{notif.message}</p>
                        <Link to={`/reports/${notif.reportId}`} className="text-primary-600 dark:text-primary-400 font-semibold mt-1.5 inline-block hover:underline">
                          View project board ➔
                        </Link>
                      </div>
                      {!notif.read && (
                        <button 
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MY SUBMISSIONS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                My Coordinated Projects ({myReports.length})
              </h4>

              {myReports.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-3xl">📝</span>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-semibold">No community projects reported by you yet.</p>
                  <p className="text-xs text-slate-400 mt-1">If you notice a pothole, broken streetlight, or garbage dump, start a cleanup crew!</p>
                  <button 
                    onClick={() => navigate('/report')}
                    className="mt-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold transition"
                  >
                    Start First Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myReports.map(report => (
                    <div 
                      key={report.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition duration-200 bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <div className="h-32 bg-slate-200 relative">
                        <img 
                          src={report.imageUrls?.[0] || 'https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=300'} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                        <span className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow ${getStatusBadgeClass(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="p-4">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{report.title}</h5>
                        <p className="text-slate-400 text-[10px] mt-1">{report.category} • {report.ward}</p>
                        
                        <div className="mt-4 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500">👥 {report.volunteers?.length || 0} Volunteers</span>
                          <Link 
                            to={`/reports/${report.id}`}
                            className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
                          >
                            Action Board ➔
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NEARBY COMMUNITY PROJECTS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Active Projects Seeking Volunteers
              </h4>

              <div className="space-y-3">
                {nearbyReports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No nearby projects seeking volunteers.</p>
                ) : (
                  nearbyReports.map(report => (
                    <div 
                      key={report.id}
                      className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 hover:border-slate-355 dark:border-slate-800 dark:hover:bg-slate-850 bg-slate-50/30 dark:bg-slate-900/20"
                    >
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">{report.title}</h5>
                        <p className="text-slate-400 text-[10px] mt-1">{report.category} • Zone {report.ward?.replace('Ward ', '')}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeClass(report.status)}`}>
                          {report.status}
                        </span>
                        <Link 
                          to={`/reports/${report.id}`}
                          className="rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-750 px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-350"
                        >
                          Join
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
