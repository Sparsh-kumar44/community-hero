import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/NotificationToast';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Users, CheckCircle, Clock, Award, Shield, Compass, Calendar, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('explore'); // explore, my-projects, analytics

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const reportsList = await api.getReports();
      setReports(reportsList);

      const statsData = await api.getAnalytics();
      setAnalytics(statsData);

      const leaderboardData = await api.getLeaderboard('allTime', 'All');
      setLeaderboard(leaderboardData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load volunteer dataset.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleVolunteerAction = async (reportId, action) => {
    if (!user) {
      toast.error("Please sign in to join projects.");
      return;
    }
    try {
      await api.volunteerForProject(reportId, user.uid, action);
      toast.success(action === 'join' ? "Joined project! +10 reputation." : "Left project task force.");
      fetchDashboardData();
    } catch (e) {
      toast.error("Action failed.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Reported': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Verified': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Volunteers Joined': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'In Progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'Completed': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'Community Verified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate local user stats
  const userRankObj = leaderboard.find(u => u.uid === user?.uid);
  const userRank = userRankObj ? userRankObj.rank : '-';
  const userRep = userRankObj ? userRankObj.reputation : (user?.reputation || 0);
  const myHours = userRankObj ? userRankObj.volunteerHours : (user?.volunteerHours || 0);

  const exploreProjects = reports.filter(r => r.status !== 'Community Verified' && r.status !== 'Completed');
  const myProjects = reports.filter(r => r.volunteers?.includes(user?.uid));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Volunteer Action Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-primary-600 dark:text-primary-400">{user?.displayName}</span>. 
            Join neighbors in solving local issues collaboratively.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850 dark:text-white transition"
        >
          Update Board
        </button>
      </div>

      {/* CORE ANALYTICS STRIP */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-xl">
                <Compass size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nearby Projects</span>
            </div>
            <h3 className="text-2xl font-black mt-3 text-slate-900 dark:text-white">{exploreProjects.length} Active</h3>
            <p className="text-[10px] text-slate-400 mt-1">Pending community support</p>
          </div>

          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-xl">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volunteer Hours</span>
            </div>
            <h3 className="text-2xl font-black mt-3 text-slate-900 dark:text-white">{myHours} Hrs</h3>
            <p className="text-[10px] text-slate-400 mt-1">Logged by you</p>
          </div>

          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Award size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impact Score</span>
            </div>
            <h3 className="text-2xl font-black mt-3 text-slate-900 dark:text-white">{analytics.summary.communityImpactScore}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Total community contribution</p>
          </div>

          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
                <Shield size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leaderboard Rank</span>
            </div>
            <h3 className="text-2xl font-black mt-3 text-slate-900 dark:text-white">#{userRank}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{userRep} Reputation points</p>
          </div>
        </div>
      )}

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'explore' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Explore Projects ({exploreProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('my-projects')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'my-projects' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          My Joined Projects ({myProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'analytics' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Impact Analytics
        </button>
      </div>

      {/* EXPLORE PROJECTS TAB */}
      {activeTab === 'explore' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {exploreProjects.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed rounded-3xl dark:bg-slate-900 dark:border-slate-850">
                <p className="text-slate-500 dark:text-slate-400">All local reports are currently solved! Nice job.</p>
                <Link to="/report" className="mt-4 inline-block text-sm font-semibold text-primary-500 hover:underline">
                  Report a new issue →
                </Link>
              </div>
            ) : (
              exploreProjects.map(project => {
                const joined = project.volunteers?.includes(user?.uid);
                return (
                  <div key={project.id} className="bg-white border rounded-3xl dark:bg-slate-900 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-sm">
                    <div className="flex items-start space-x-4">
                      <img 
                        src={project.imageUrls?.[0] || 'https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=150'} 
                        alt="" 
                        className="w-16 h-16 object-cover rounded-2xl"
                      />
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${getStatusBadge(project.status)}`}>
                          {project.status}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{project.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{project.description}</p>
                        
                        <div className="flex items-center space-x-4 mt-3 text-[11px] text-slate-400 font-semibold">
                          <span>👥 {project.volunteers?.length || 0}/{project.estimatedVolunteers || 3} Volunteers</span>
                          <span>⚡ {project.difficulty || 'Medium'}</span>
                          <span>📍 {project.ward?.replace('Ward ', 'Zone ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto">
                      <Link 
                        to={`/reports/${project.id}`}
                        className="flex-1 md:flex-initial text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 px-4 py-2 text-xs font-semibold transition"
                      >
                        Action Board
                      </Link>
                      {joined ? (
                        <button
                          onClick={() => handleVolunteerAction(project.id, 'leave')}
                          className="flex-1 md:flex-initial text-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 px-4 py-2 text-xs font-bold transition"
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVolunteerAction(project.id, 'join')}
                          className="flex-1 md:flex-initial text-center rounded-xl bg-primary-600 text-white hover:bg-primary-750 px-4 py-2 text-xs font-bold transition shadow-sm"
                        >
                          Volunteer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CHALLENGES / EVENTS SIDE PANEL */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary-600 to-indigo-600 text-white p-6 rounded-3xl shadow-md">
              <h4 className="text-base font-black flex items-center gap-2">
                <Calendar size={18} />
                <span>Weekly Mission</span>
              </h4>
              <p className="text-xs text-indigo-100 mt-2 font-medium">
                Collaboratively plant 5 trees and patch 3 potholes this week to unlock the **Nature Shield** badge +50 bonus points!
              </p>
              
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-xs">
                <span>Planted: <b>3 / 5</b></span>
                <span>Patched: <b>2 / 3</b></span>
              </div>
            </div>

            <div className="bg-white border rounded-3xl dark:bg-slate-900 dark:border-slate-800 p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Active Volunteers</h4>
              <div className="space-y-4">
                {leaderboard.slice(0, 3).map((item, idx) => (
                  <div key={item.uid} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img src={item.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="text-xs font-bold">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.neighborhood}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary-500 font-mono">{item.reputation} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY PROJECTS TAB */}
      {activeTab === 'my-projects' && (
        <div className="space-y-4">
          {myProjects.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed rounded-3xl dark:bg-slate-900 dark:border-slate-850">
              <p className="text-slate-500 dark:text-slate-400">You haven't joined any task force crews yet.</p>
              <button 
                onClick={() => setActiveTab('explore')}
                className="mt-4 inline-block text-sm font-semibold text-primary-500 hover:underline"
              >
                Browse active projects →
              </button>
            </div>
          ) : (
            myProjects.map(project => {
              const completedTasks = project.checklist?.filter(c => c.completed).length || 0;
              const totalTasks = project.checklist?.length || 1;
              const progressPercent = Math.round((completedTasks / totalTasks) * 100);

              return (
                <div key={project.id} className="bg-white border rounded-3xl dark:bg-slate-900 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-sm">
                  <div className="flex items-start space-x-4 flex-1">
                    <img 
                      src={project.imageUrls?.[0] || 'https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=150'} 
                      alt="" 
                      className="w-16 h-16 object-cover rounded-2xl"
                    />
                    <div className="flex-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${getStatusBadge(project.status)}`}>
                        {project.status}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{project.title}</h4>
                      
                      {/* PROGRESS BAR */}
                      <div className="mt-3 max-w-md">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Action Plan Progress</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full md:w-auto">
                    <Link 
                      to={`/reports/${project.id}`}
                      className="flex-1 md:flex-initial text-center rounded-xl bg-primary-600 text-white hover:bg-primary-750 px-4 py-2 text-xs font-bold transition shadow-sm"
                    >
                      Open Action Board
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Doughnut: Category Distribution */}
          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Category Distribution</h4>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={{
                  labels: analytics.categoryDistribution.map(c => c.category),
                  datasets: [{
                    data: analytics.categoryDistribution.map(c => c.count),
                    backgroundColor: ['#6366f1', '#eab308', '#dc2626', '#16a34a', '#a855f7'],
                    borderWidth: 1
                  }]
                }}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { 
                      position: 'bottom', 
                      labels: { boxWidth: 10, font: { size: 10 } } 
                    } 
                  } 
                }}
              />
            </div>
          </div>

          {/* Bar: Neighborhood Load & Performance */}
          <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Neighborhood Resolution Activity</h4>
            <div className="h-64">
              <Bar 
                data={{
                  labels: analytics.neighborhoodStats.map(w => w.name),
                  datasets: [
                    {
                      label: 'Total Projects',
                      data: analytics.neighborhoodStats.map(w => w.total),
                      backgroundColor: '#6366f1'
                    },
                    {
                      label: 'Completed Projects',
                      data: analytics.neighborhoodStats.map(w => w.completed),
                      backgroundColor: '#16a34a'
                    }
                  ]
                }}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  scales: { y: { beginAtZero: true } } 
                }}
              />
            </div>
          </div>

          {/* ENVIRONMENTAL METRICS CARDS */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 border p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-850">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Garbage Collected</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {analytics.summary.environmentalMetrics.wasteCollectedKg} kg
              </h3>
              <p className="text-xs text-slate-500 mt-1">Diverted from public pathways</p>
            </div>

            <div className="bg-slate-50 border p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-850">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trees Planted</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {analytics.summary.environmentalMetrics.treesPlanted}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Adding green canopy cover</p>
            </div>

            <div className="bg-slate-50 border p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-850">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Road Repairs Organized</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {analytics.summary.environmentalMetrics.roadRepairsOrganized}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Potholes patched by neighbors</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
