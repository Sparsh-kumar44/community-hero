import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapContainer from '../components/MapContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, MessageSquare, Users, Eye, ArrowUpRight, Filter, AlertCircle } from 'lucide-react';
import { toast } from '../components/NotificationToast';

export default function Problems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('By Severity'); // Nearby, Newest, Most Popular, Needs Volunteers, Completed, By Severity
  const [userLocation, setUserLocation] = useState(null);

  // Get user geolocation if "Nearby" filter is used
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.log("Geolocation permission denied")
      );
    }
  }, []);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      toast.error("Failed to load community problems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Distance helper (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
  };

  const SEVERITY_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };

  // Filter & Search processing
  const processedReports = [...reports]
    .filter((report) => {
      const term = searchTerm.toLowerCase();
      const titleMatch = (report.title || '').toLowerCase().includes(term);
      const captionMatch = (report.imageCaption || '').toLowerCase().includes(term);
      const descMatch = (report.description || '').toLowerCase().includes(term);
      const locationMatch = (report.ward || '').toLowerCase().includes(term);
      const reporterMatch = (report.reporter?.name || '').toLowerCase().includes(term);
      const statusMatch = (report.status || '').toLowerCase().includes(term);
      const tagsMatch = (report.tags || []).some(tag => tag.toLowerCase().includes(term));
      const categoryMatch = (report.category || '').toLowerCase().includes(term);
      const severityMatch = (report.severity || '').toLowerCase().includes(term);

      return titleMatch || captionMatch || descMatch || locationMatch || reporterMatch || statusMatch || tagsMatch || categoryMatch || severityMatch;
    })
    .sort((a, b) => {
      if (activeFilter === 'By Severity') {
        const sA = SEVERITY_ORDER[a.severity] ?? 4;
        const sB = SEVERITY_ORDER[b.severity] ?? 4;
        if (sA !== sB) return sA - sB;
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      }
      // Sort logic based on filter
      if (activeFilter === 'Newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (activeFilter === 'Most Popular') {
        return (b.votes || 0) - (a.votes || 0);
      }
      // Default: sort Critical first
      const sA = SEVERITY_ORDER[a.severity] ?? 4;
      const sB = SEVERITY_ORDER[b.severity] ?? 4;
      return sA - sB;
    })
    .filter((report) => {
      // Filter logic
      if (activeFilter === 'Completed') {
        return report.status === 'Completed' || report.status === 'Community Verified';
      }
      if (activeFilter === 'Needs Volunteers') {
        const joined = report.volunteers?.length || 0;
        const est = report.estimatedVolunteers || 1;
        return joined < est && report.status !== 'Completed' && report.status !== 'Community Verified';
      }
      if (activeFilter === 'Nearby' && userLocation) {
        // Only show reports within 15km
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          report.latitude,
          report.longitude
        );
        return dist <= 15;
      }
      return true;
    });

  // Action handlers
  const handleLike = async (reportId) => {
    if (!user) {
      toast.warning("Please sign in to like projects");
      return;
    }
    try {
      await api.upvoteReport(reportId, user.uid);
      await fetchReports();
      toast.success("Project upvoted!");
    } catch (err) {
      toast.error("Failed to register like");
    }
  };

  const handleJoin = async (reportId) => {
    if (!user) {
      toast.warning("Please sign in to join projects");
      return;
    }
    try {
      await api.volunteerForProject(reportId, user.uid, 'join');
      await fetchReports();
      toast.success("Joined cleanup crew! +10 Reputation");
    } catch (err) {
      toast.error("Failed to join crew");
    }
  };

  const handleLeave = async (reportId) => {
    if (!user) return;
    try {
      await api.volunteerForProject(reportId, user.uid, 'leave');
      await fetchReports();
      toast.info("Left cleanup crew");
    } catch (err) {
      toast.error("Failed to leave crew");
    }
  };

  // Scroll to card handler when map marker is clicked
  const handleMarkerClick = (report) => {
    const cardEl = document.getElementById(`problem-card-${report.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary blink border highlight
      cardEl.classList.add('ring-4', 'ring-primary-500');
      setTimeout(() => {
        cardEl.classList.remove('ring-4', 'ring-primary-500');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. TOP GOOGLE MAP AREA */}
      <section className="relative w-full h-[320px] sm:h-[400px] bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <MapContainer 
          reports={processedReports} 
          height="100%" 
          onMarkerClick={handleMarkerClick} 
        />
      </section>

      {/* 2. FILTER & SEARCH SHELF */}
      <section className="sticky top-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 lg:px-8 z-30 shadow-sm">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by title, category, or neighborhood..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          {/* Filter list */}
          <div className="flex flex-wrap items-center gap-2">
            {['By Severity', 'Newest', 'Most Popular', 'Needs Volunteers', 'Completed', 'Nearby'].map((filter) => {
              if (filter === 'Nearby' && !userLocation) return null;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold transition ${
                    activeFilter === filter
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* 3. PROBLEMS CARDS FEED */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <span>📋</span>
              <span>Active Problems ({processedReports.length})</span>
            </h2>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-xs text-primary-500 font-semibold hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-[460px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 animate-pulse" />
              ))}
            </div>
          ) : processedReports.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-xl mx-auto p-8">
              <span className="text-4xl">📭</span>
              <h3 className="text-lg font-bold text-slate-850 dark:text-white mt-4">No reported problems match your filter</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Be the first to click the "+" Floating Action Button in the lower-right to report a new problem in your neighborhood!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {processedReports.map((report) => {
                  const joinedCrew = report.volunteers?.includes(user?.uid);
                  const volCount = report.volunteers?.length || 0;
                  const volEst = report.estimatedVolunteers || 3;
                  const progressPct = Math.min(100, Math.round((volCount / volEst) * 100));

                  return (
                    <motion.div
                      id={`problem-card-${report.id}`}
                      key={report.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white dark:border-slate-850 dark:bg-slate-900 shadow-sm transition hover:shadow-md ring-offset-2 duration-300 relative"
                    >
                      {/* Image header */}
                      <div>
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-50">
                          <img 
                            src={report.imageUrls?.[0] || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600'} 
                            alt={report.title} 
                            className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                            {report.status}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-primary-500 tracking-wider">
                              {report.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                            {report.title}
                          </h3>
                          
                          {/* Image Caption */}
                          <p className="text-xs text-slate-400 italic mt-1 line-clamp-1 border-l-2 border-slate-200 dark:border-slate-750 pl-2">
                            "{report.imageCaption || 'No caption generated'}"
                          </p>

                          <p className="text-sm text-slate-500 dark:text-slate-450 mt-3 line-clamp-2">
                            {report.description}
                          </p>

                          <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
                            <span>📍</span>
                            <span className="line-clamp-1">{report.ward || 'General Area'}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-5 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <span>Crew Progress</span>
                              <span>{volCount} / {volEst} Volunteers</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full" 
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-6 pb-6 pt-4 border-t border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10">
                        
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <button
                            onClick={() => handleLike(report.id)}
                            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 dark:text-slate-400 transition"
                          >
                            <Heart size={16} className={report.voters?.includes(user?.uid) ? 'fill-red-500 text-red-500' : ''} />
                            <span>{report.votes || 0}</span>
                          </button>
                          
                          <button
                            onClick={() => navigate(`/problems/${report.id}`)}
                            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-primary-500 dark:text-slate-400 transition"
                          >
                            <MessageSquare size={16} />
                            <span>{report.comments?.length || 0}</span>
                          </button>

                          <button
                            onClick={() => navigate(`/problems/${report.id}`)}
                            className="flex items-center space-x-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:opacity-80 transition ml-auto"
                          >
                            <span>Details</span>
                            <ArrowUpRight size={14} />
                          </button>
                        </div>

                        {/* Crew join toggle */}
                        {joinedCrew ? (
                          <button
                            onClick={() => handleLeave(report.id)}
                            className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-98 transition duration-150"
                          >
                            Leave Cleanup Force
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoin(report.id)}
                            disabled={report.status === 'Completed' || report.status === 'Community Verified'}
                            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-md active:scale-98 transition duration-150 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:pointer-events-none"
                          >
                            Join Cleanup Force
                          </button>
                        )}

                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
