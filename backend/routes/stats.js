const express = require('express');
const router = express.Router();
const { db, mockUsers } = require('../config');

/**
 * Get overall dashboard analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const reports = await db.getReports();
    const users = await db.getUsers();
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const total = reports.length;
    const completed = reports.filter(r => r.status === 'Completed' || r.status === 'Community Verified').length;
    const completedThisWeek = reports.filter(r => {
      const isComplete = r.status === 'Completed' || r.status === 'Community Verified';
      const completedAt = r.completedAt || r.verifiedAt;
      return isComplete && completedAt && new Date(completedAt) > oneWeekAgo;
    }).length;
    const criticalIssues = reports.filter(r => r.severity === 'Critical' && r.status !== 'Community Verified').length;
    const highPriority = reports.filter(r => r.severity === 'High' && r.status !== 'Community Verified').length;
    const activeProjects = reports.filter(r => !['Completed','Community Verified'].includes(r.status)).length;
    
    const volunteerIds = new Set(reports.flatMap(r => r.volunteers || []));
    const totalVolunteers = Math.max(volunteerIds.size, users.length);
    const totalVolunteerHours = users.reduce((sum, u) => sum + (u.volunteerHours || 0), 0);
    const communityImpactScore = Math.round((completed * 25) + (totalVolunteers * 15) + (totalVolunteerHours * 2));

    // Resolution time
    let totalResMs = 0, resolvedCount = 0;
    reports.forEach(r => {
      if ((r.status === 'Completed' || r.status === 'Community Verified') && r.history) {
        const start = new Date(r.createdAt);
        const step = r.history.find(h => h.status === 'Completed');
        if (step) { totalResMs += new Date(step.timestamp) - start; resolvedCount++; }
      }
    });
    const averageResolutionDays = resolvedCount > 0 ? parseFloat((totalResMs / (1000*60*60*24) / resolvedCount).toFixed(1)) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const wasteCollected = reports.filter(r => r.category === 'Sanitation & Garbage' && (r.status === 'Completed' || r.status === 'Community Verified')).length * 120;
    const roadRepairs = reports.filter(r => r.category === 'Roads & Potholes' && (r.status === 'Completed' || r.status === 'Community Verified')).length * 2;

    const categoriesMap = {};
    reports.forEach(r => { categoriesMap[r.category] = (categoriesMap[r.category] || 0) + 1; });
    const categoryDistribution = Object.entries(categoriesMap).map(([category, count]) => ({ category, count }));

    // Real monthly trends from report data
    const monthlyMap = {};
    reports.forEach(r => {
      const month = r.createdAt ? r.createdAt.substring(0, 7) : null;
      if (!month) return;
      if (!monthlyMap[month]) monthlyMap[month] = { reported: 0, completed: 0 };
      monthlyMap[month].reported++;
      if (r.status === 'Completed' || r.status === 'Community Verified') monthlyMap[month].completed++;
    });
    const monthlyTrends = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    const neighborhoodMap = {};
    reports.forEach(r => {
      const hood = (r.ward || 'General').replace(/Ward \d+ - /, '');
      if (!neighborhoodMap[hood]) neighborhoodMap[hood] = { name: hood, total: 0, completed: 0 };
      neighborhoodMap[hood].total++;
      if (r.status === 'Completed' || r.status === 'Community Verified') neighborhoodMap[hood].completed++;
    });

    const topContributors = [...users]
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
      .slice(0, 5)
      .map(u => ({
        uid: u.uid,
        name: u.name,
        score: u.reputation || 0,
        photoURL: u.photoURL,
        badges: u.badges || []
      }));
    
    const newestReports = [...reports]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(r => ({
        id: r.id, title: r.title, severity: r.severity,
        status: r.status, category: r.category, createdAt: r.createdAt
      }));

    res.json({
      summary: {
        totalProjects: total, activeProjects, completedProjects: completed,
        completedThisWeek, criticalIssues, highPriority,
        totalVolunteers, volunteerHours: totalVolunteerHours,
        communityImpactScore, completionRate, averageResolutionDays,
        environmentalMetrics: { wasteCollectedKg: wasteCollected, roadRepairsOrganized: roadRepairs }
      },
      categoryDistribution, monthlyTrends,
      neighborhoodStats: Object.values(neighborhoodMap),
      topContributors, newestReports
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Leaderboard with Daily/Weekly/Monthly/All-Time filtering
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await db.getUsers();
    const reports = await db.getReports();
    const { time, neighborhood } = req.query;

    const now = new Date();
    let cutoff = null;
    if (time === 'daily') cutoff = new Date(now.getTime() - 24*60*60*1000);
    else if (time === 'weekly') cutoff = new Date(now.getTime() - 7*24*60*60*1000);
    else if (time === 'monthly') cutoff = new Date(now.getTime() - 30*24*60*60*1000);

    let filteredUsers = [...users];
    if (neighborhood && neighborhood !== 'All') {
      filteredUsers = filteredUsers.filter(u =>
        (u.neighborhood || 'General').toLowerCase().includes(neighborhood.toLowerCase())
      );
    }

    let leaderboard = filteredUsers.map(user => {
      // Calculate dynamic stats from actual reports
      const myReports = reports.filter(r => r.reporter?.uid === user.uid);
      const joinedProjects = reports.filter(r => r.volunteers?.includes(user.uid));
      const completedProjects = reports.filter(r =>
        (r.status === 'Completed' || r.status === 'Community Verified') &&
        r.volunteers?.includes(user.uid)
      );
      const verified = reports.filter(r => r.verifiersOfCompletion?.includes(user.uid));

      // For time-filtered leaderboard, sum points from pointsHistory within cutoff
      let displayRep = user.reputation || 0;
      if (cutoff && user.pointsHistory && user.pointsHistory.length > 0) {
        displayRep = user.pointsHistory
          .filter(h => h.timestamp && new Date(h.timestamp) >= cutoff)
          .reduce((sum, h) => sum + (h.points || 0), 0);
      }

      const dynamicVolHours = user.volunteerHours || (completedProjects.length * 2);

      return {
        uid: user.uid,
        name: user.name || 'Citizen Hero',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        reputation: user.reputation || 0,
        displayReputation: displayRep,
        badges: user.badges || ['Community Hero'],
        reportsSubmitted: myReports.length,
        solvedCount: user.solvedCount || completedProjects.length,
        volunteerHours: dynamicVolHours,
        projectsJoinedCount: user.projectsJoinedCount || joinedProjects.length,
        projectsCompletedCount: user.projectsCompletedCount || completedProjects.length,
        verificationsMade: user.verificationsMade || verified.length,
        streak: user.streak || 1,
        neighborhood: user.neighborhood || 'General'
      };
    });

    // Sort by displayReputation (time-filtered) or total reputation (all time)
    leaderboard.sort((a, b) => {
      const scoreA = cutoff ? a.displayReputation : a.reputation;
      const scoreB = cutoff ? b.displayReputation : b.reputation;
      return scoreB - scoreA;
    });

    leaderboard = leaderboard.map((item, idx) => ({ rank: idx + 1, ...item }));
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get stats for a specific user - dynamically calculated from reports
 */
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const [user, reports] = await Promise.all([db.getUser(uid), db.getReports()]);

    const myReports = reports.filter(r => r.reporter?.uid === uid);
    const joinedProjects = reports.filter(r => r.volunteers?.includes(uid));
    const completedProjects = reports.filter(r =>
      (r.status === 'Completed' || r.status === 'Community Verified') &&
      r.volunteers?.includes(uid)
    );
    const solvedReports = reports.filter(r =>
      r.reporter?.uid === uid &&
      (r.status === 'Completed' || r.status === 'Community Verified')
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dynamicVolHours = user.volunteerHours || (completedProjects.length * 2);
    const reputation = user.reputation || 120;
    const level = Math.floor(reputation / 200) + 1;
    const xpForNext = level * 200;
    const xpProgress = reputation % 200;

    // Build timeline from report history
    const timeline = [];
    myReports.forEach(r => {
      timeline.push({ action: 'Reported', project: r.title, timestamp: r.createdAt, reportId: r.id });
    });
    joinedProjects.forEach(r => {
      const joinEvent = r.history?.find(h => h.status === 'Community Joined' || h.status === 'Volunteers Joined');
      if (joinEvent) {
        timeline.push({ action: 'Joined', project: r.title, timestamp: joinEvent.timestamp, reportId: r.id });
      }
    });
    completedProjects.forEach(r => {
      timeline.push({ action: 'Solved', project: r.title, timestamp: r.completedAt || r.createdAt, reportId: r.id });
    });
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      ...user,
      reportsSubmitted: myReports.length,
      solvedCount: user.solvedCount || (solvedReports.length + completedProjects.length),
      projectsJoinedCount: user.projectsJoinedCount || joinedProjects.length,
      projectsCompletedCount: user.projectsCompletedCount || completedProjects.length,
      volunteerHours: dynamicVolHours,
      reputation,
      level,
      xpForNext,
      xpProgress,
      badges: user.badges || ['Community Hero'],
      timeline: timeline.slice(0, 20)
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
