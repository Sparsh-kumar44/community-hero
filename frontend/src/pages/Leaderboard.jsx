import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trophy, MapPin, Flame, Clock, Award, Star, Search, ShieldAlert, BadgeCheck } from 'lucide-react';
import { toast } from '../components/NotificationToast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Leaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('allTime'); // daily, weekly, monthly, allTime
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('All'); // All, Downtown, Civic Center, Mission District, Haight-Ashbury

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.getLeaderboard(timeFilter, neighborhoodFilter);
      setBoard(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter, neighborhoodFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* 1. HEADER SECTION */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="inline-flex p-3.5 bg-primary-100 text-primary-600 rounded-3xl mb-4 dark:bg-primary-950/40 dark:text-primary-400 shadow-sm"
          >
            <Trophy size={36} />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight"
          >
            Neighborhood Champions
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-slate-500 dark:text-slate-400 mt-2"
          >
            Celebrating neighbor leaders taking hands-on action to clean, repair, and verify city sectors.
          </motion.p>
        </div>

        {/* 2. FILTER CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-3xl mb-8 shadow-sm backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          
          {/* Timeframe Filters */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl w-full sm:w-auto">
            {['daily', 'weekly', 'monthly', 'allTime'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold rounded-xl transition capitalize ${
                  timeFilter === filter 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {filter === 'allTime' ? 'All Time' : filter}
              </button>
            ))}
          </div>

          {/* Neighborhood Filters */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <MapPin size={16} className="text-slate-400" />
            <select
              value={neighborhoodFilter}
              onChange={(e) => setNeighborhoodFilter(e.target.value)}
              className="w-full sm:w-48 bg-slate-100 border-none text-slate-700 rounded-2xl px-3 py-2.5 text-xs font-bold focus:outline-none dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Neighborhoods</option>
              <option value="Downtown">Downtown</option>
              <option value="Civic Center">Civic Center</option>
              <option value="Mission District">Mission District</option>
              <option value="Haight-Ashbury">Haight-Ashbury</option>
            </select>
          </div>

        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : board.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 shadow-sm">
            <span className="text-4xl">🏆</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-4">Leaderboard is currently empty</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Start contributing, upvote issues, or join a crew to appear as a champion!
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* 3. PODIUM (TOP 3 INTERACTIVE CARD HIGHLIGHTS) */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-6"
            >
              {/* 2nd Place */}
              {board[1] && (
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="order-2 md:order-1 bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 text-center shadow-sm relative pt-12 mt-8 md:mt-0 transition duration-300"
                >
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl" title="2nd Place">🥈</span>
                  <img src={board[1].photoURL} alt="" className="h-16 w-16 rounded-full border-2 border-slate-250 mx-auto object-cover mb-4 shadow-sm" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">{board[1].name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 flex justify-center items-center gap-1">
                    <MapPin size={10} /> {board[1].neighborhood || 'General'}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400 font-black text-lg mt-2">
                    {timeFilter === 'allTime' ? board[1].reputation : board[1].displayReputation} pts
                  </p>
                  
                  {/* Micro Stats */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-2 text-[10px] text-slate-450 font-bold">
                    <div className="flex items-center justify-center gap-0.5"><Flame size={12} className="text-orange-500" /> {board[1].streak}d Streak</div>
                    <div className="flex items-center justify-center gap-0.5"><Clock size={12} className="text-slate-400" /> {Math.round(board[1].volunteerHours)}h Vol</div>
                  </div>
                </motion.div>
              )}

              {/* 1st Place (Featured taller card) */}
              {board[0] && (
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  className="order-1 md:order-2 bg-gradient-to-b from-primary-50/50 to-white dark:from-slate-850/50 dark:to-slate-900 border-2 border-primary-350 dark:border-primary-850 rounded-3xl p-8 text-center shadow-md relative pt-14 scale-105 transition duration-300"
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl animate-bounce" title="1st Place">👑</span>
                  <img src={board[0].photoURL} alt="" className="h-20 w-20 rounded-full border-4 border-primary-500 mx-auto object-cover mb-4 shadow" />
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{board[0].name}</h4>
                  <p className="text-[10px] text-slate-450 font-bold mt-1 flex justify-center items-center gap-1">
                    <MapPin size={10} /> {board[0].neighborhood || 'General'}
                  </p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-black text-2xl mt-2">
                    {timeFilter === 'allTime' ? board[0].reputation : board[0].displayReputation} pts
                  </p>
                  
                  {/* Micro Stats */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-2 text-[10px] text-slate-455 font-bold">
                    <div className="flex items-center justify-center gap-0.5"><Flame size={12} className="text-orange-500" /> {board[0].streak}d Streak</div>
                    <div className="flex items-center justify-center gap-0.5"><Clock size={12} className="text-slate-400" /> {Math.round(board[0].volunteerHours)}h Vol</div>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {board[2] && (
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="order-3 bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 text-center shadow-sm relative pt-12 mt-8 md:mt-0 transition duration-300"
                >
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl" title="3rd Place">🥉</span>
                  <img src={board[2].photoURL} alt="" className="h-16 w-16 rounded-full border-2 border-slate-250 mx-auto object-cover mb-4 shadow-sm" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">{board[2].name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 flex justify-center items-center gap-1">
                    <MapPin size={10} /> {board[2].neighborhood || 'General'}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400 font-black text-lg mt-2">
                    {timeFilter === 'allTime' ? board[2].reputation : board[2].displayReputation} pts
                  </p>
                  
                  {/* Micro Stats */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-2 text-[10px] text-slate-450 font-bold">
                    <div className="flex items-center justify-center gap-0.5"><Flame size={12} className="text-orange-500" /> {board[2].streak}d Streak</div>
                    <div className="flex items-center justify-center gap-0.5"><Clock size={12} className="text-slate-400" /> {Math.round(board[2].volunteerHours)}h Vol</div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* 4. EXTENDED LEADERBOARD LIST TABLE */}
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-850 dark:bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-4 px-6 text-center">Rank</th>
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Neighborhood</th>
                      <th className="py-4 px-6 text-center">Streak</th>
                      <th className="py-4 px-6 text-center">Vol Hours</th>
                      <th className="py-4 px-6 text-center">Joined</th>
                      <th className="py-4 px-6 text-center">Completed</th>
                      <th className="py-4 px-6 text-right">Reputation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {board.map((item, index) => {
                      const isTopThree = index < 3;
                      return (
                        <tr 
                          key={item.uid} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition duration-150 ${
                            isTopThree ? 'bg-slate-50/20 dark:bg-slate-900/10 font-semibold' : ''
                          }`}
                        >
                          <td className="py-4 px-6 text-center">
                            {index === 0 && <span className="text-xl">👑</span>}
                            {index === 1 && <span className="text-lg">🥈</span>}
                            {index === 2 && <span className="text-lg">🥉</span>}
                            {index > 2 && <span className="font-bold text-slate-400">#{index + 1}</span>}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <img src={item.photoURL} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {item.badges?.slice(0, 2).map((b, i) => (
                                    <span key={i} className="px-1.5 py-0.5 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 text-[8px] rounded font-bold uppercase tracking-wider">{b}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{item.neighborhood || 'General'}</td>
                          <td className="py-4 px-6 text-center text-orange-600 font-bold font-mono">🔥 {item.streak}d</td>
                          <td className="py-4 px-6 text-center text-slate-500 font-bold font-mono">{Math.round(item.volunteerHours)}h</td>
                          <td className="py-4 px-6 text-center text-slate-500 font-semibold">{item.projectsJoinedCount || 0}</td>
                          <td className="py-4 px-6 text-center text-emerald-600 font-bold">{item.projectsCompletedCount || 0}</td>
                          <td className="py-4 px-6 text-right font-black text-primary-600 dark:text-primary-400 font-mono text-sm">
                            {timeFilter === 'allTime' ? item.reputation : item.displayReputation} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
