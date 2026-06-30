import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, animate } from 'framer-motion';
import { AlertCircle, Users, Clock, Award, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { toast } from '../components/NotificationToast';

function Counter({ value, duration = 2 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) {
      setCount(end);
      return;
    }
    const controls = animate(start, end, {
      duration: duration,
      onUpdate: (latest) => setCount(Math.floor(latest))
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeVolunteers: 0,
    volunteerHours: 0,
    communityImpactScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const reportsList = await api.getReports();
        // Get up to 3 featured projects
        setFeaturedProjects(reportsList.slice(0, 3));
        
        const analytics = await api.getAnalytics();
        setStats({
          totalProjects: analytics.summary.totalProjects || 0,
          activeVolunteers: analytics.summary.totalVolunteers || 0,
          volunteerHours: Math.round(analytics.summary.volunteerHours) || 0,
          communityImpactScore: analytics.summary.communityImpactScore || 0
        });
      } catch (err) {
        console.warn("Could not load real landing page stats");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCTA = () => {
    navigate('/problems');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. HERO SECTION */}
      <section className="relative flex items-center justify-center pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-primary-500/10 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 rounded-full bg-primary-100/70 dark:bg-primary-950/30 px-4 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 mb-8 border border-primary-200/50 dark:border-primary-900/30"
          >
            <span>🌿 Co-Create Better Neighborhoods</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight"
          >
            Collaborate. Solve. <br />
            <span className="bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
              Own Your Neighborhood
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-8 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            A community-led coordination platform. Report local issues, volunteer to join local cleanups, and vote on community verifications to build hyperlocal trust.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex justify-center"
          >
            <button
              onClick={handleCTA}
              className="inline-flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 px-8 py-4.5 text-base font-bold text-white shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:scale-105 active:scale-98 transition-all duration-200"
            >
              <span>Explore Community Problems</span>
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS SECTION WITH ANIMATED COUNTERS */}
      <section className="py-16 bg-white/40 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between"
            >
              <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-2xl w-fit mb-4">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Campaigns</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-850 dark:text-white mt-1">
                  <Counter value={stats.totalProjects} />
                </h3>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl w-fit mb-4">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Volunteers</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-850 dark:text-white mt-1">
                  <Counter value={stats.activeVolunteers} />
                </h3>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volunteer Hours</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-850 dark:text-white mt-1">
                  <Counter value={stats.volunteerHours} />
                </h3>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mb-4">
                <Award size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Impact Score</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-850 dark:text-white mt-1">
                  <Counter value={stats.communityImpactScore} />
                </h3>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COMMUNITY PROJECTS */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Neighborhood Action</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Collaborative cleanup and repair projects driven by residents.</p>
            </div>
            <button 
              onClick={handleCTA}
              className="mt-4 sm:mt-0 inline-flex items-center space-x-1.5 text-sm font-bold text-primary-600 dark:text-primary-400 hover:opacity-85 transition"
            >
              <span>View all projects</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 animate-pulse" />
              ))}
            </div>
          ) : featuredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 max-w-xl mx-auto">
              <span className="text-4xl">🛠️</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-4">Database is currently empty</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Be the first to report an issue in your block and gather a crew to coordinate cleanups.
              </p>
              <button
                onClick={() => navigate(user ? '/report' : '/')}
                className="mt-6 inline-flex items-center justify-center space-x-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 text-xs font-semibold shadow transition"
              >
                <span>Report First Issue</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -6 }}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white dark:border-slate-850 dark:bg-slate-900 shadow-sm transition"
                >
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                      <img 
                        src={project.imageUrls?.[0] || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600'} 
                        alt={project.title} 
                        className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                        {project.status}
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-1.5">{project.category}</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">{project.title}</h3>
                      <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{project.imageCaption || 'No image caption provided'}"</p>
                      <p className="text-sm text-slate-500 dark:text-slate-455 mt-3 line-clamp-2">{project.description}</p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4 border-t border-slate-50 dark:border-slate-850 flex justify-between items-center text-xs font-medium text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Users size={14} className="text-slate-400" />
                      <span>{project.volunteers?.length || 0} joined</span>
                    </span>
                    <button 
                      onClick={() => navigate(`/problems/${project.id}`)}
                      className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
                    >
                      Learn more
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. COMMUNITY IMPACT SECTION */}
      <section className="py-20 bg-slate-100/50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Decentralized Peer Resolution</h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
                By taking action into our own hands, we eliminate waiting lists and bureaucratic overhead. Our platform empowers neighborhood champions to assemble crews, obtain materials, resolve structural issues, and peer-verify resolutions.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-emerald-100 text-emerald-600 rounded-lg dark:bg-emerald-950/50 dark:text-emerald-400 mt-0.5">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Consensus Verification</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Resolutions are only validated once at least 3 community members approve the final photos.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-primary-100 text-primary-600 rounded-lg dark:bg-primary-950/50 dark:text-primary-400 mt-0.5">
                    <HeartHandshake size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Co-op Volunteering</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Join cleaning or repair drives, check off items on checklists, and track contributions.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                <span className="text-3xl">🧹</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cleanups</h4>
                  <p className="text-xs text-slate-400 mt-1">Litter sweeps, trash hauls, and park clearing.</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between mt-4">
                <span className="text-3xl">🕳️</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Repairs</h4>
                  <p className="text-xs text-slate-400 mt-1">Asphalt patches, fence repairs, and bulb swaps.</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                <span className="text-3xl">🎨</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Beautification</h4>
                  <p className="text-xs text-slate-400 mt-1">Graffiti tags coverups and sapling plantings.</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between mt-4">
                <span className="text-3xl">🚨</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Safety</h4>
                  <p className="text-xs text-slate-400 mt-1">Crosswalk alerts, signs clearing, and walkway lighting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LEADERBOARD HIGHLIGHT / CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Earn Reputation for Real Action</h2>
          <p className="mt-4 text-primary-100 max-w-xl mx-auto text-base">
            Participate in tasks, volunteer in cleanups, earn achievement badges, and climb the neighborhood leaderboard ranks!
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={handleCTA}
              className="w-full sm:w-auto rounded-2xl bg-white text-primary-600 font-bold px-8 py-4 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full sm:w-auto rounded-2xl bg-primary-700/40 text-white border border-primary-400/30 font-semibold px-8 py-4 hover:bg-primary-700/60 transition"
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </section>
      
    </div>
  );
}
