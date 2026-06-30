const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Detect if Firebase service account is provided
let useFirebase = false;
let firestoreDb = null;

const firebaseConfigured = 
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  ((process.env.NODE_ENV === 'production' || process.env.K_SERVICE) && process.env.VITE_FIREBASE_PROJECT_ID);

if (firebaseConfigured) {
  try {
    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
      });
    } else {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      });
    }
    const { getFirestore } = require('firebase-admin/firestore');
    firestoreDb = getFirestore();
    useFirebase = true;
    console.log("🔥 Firebase Admin initialized successfully. Using live Firestore database.");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase Admin SDK. Falling back to Mock In-Memory Database.", error.message);
  }
} else {
  console.log("ℹ️ No Firebase credentials found. Running in MOCK Mode with in-memory database.");
}

// ==========================================
// MOCK DATABASE & SEED DATA DEFINITIONS (PERSISTENT JSON)
// ==========================================
const dbFilePath = path.join(__dirname, 'db.json');

let localDb = { users: [], reports: [], notifications: [] };
if (fs.existsSync(dbFilePath)) {
  try {
    localDb = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  } catch (e) {
    console.error("⚠️ Failed to parse db.json, using defaults.", e.message);
  }
}

const mockUsers = localDb.users || [];
let mockReports = localDb.reports || [];
let mockNotifications = localDb.notifications || [];

function saveDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify({
      users: mockUsers,
      reports: mockReports,
      notifications: mockNotifications
    }, null, 2), 'utf8');
  } catch (e) {
    console.error("⚠️ Failed to write to db.json", e.message);
  }
}

// Helper to calculate trust score based on upvotes and verifications
const calculateTrustScore = (votes, verifications) => {
  const base = 50;
  const voteWeight = Math.min(30, votes * 1.5);
  const verifyWeight = Math.min(20, verifications * 2.5);
  return Math.round(base + voteWeight + verifyWeight);
};

// Dynamic badge checker
function checkAndAwardBadges(user, reports) {
  const currentBadges = new Set(user.badges || ['Community Hero']);
  
  const userReports = reports.filter(r => r.reporter?.uid === user.uid);
  const completedProjects = reports.filter(r => r.status === 'Community Verified' && r.volunteers?.includes(user.uid));

  const countCategory = (categoryName) => {
    return userReports.filter(r => r.category === categoryName).length + 
           completedProjects.filter(r => r.category === categoryName).length;
  };

  if (user.reputation >= 500) currentBadges.add('Elite Civic Leader');
  if (user.reputation >= 1000) currentBadges.add('Legendary Hero');
  if (countCategory('Roads & Potholes') >= 3) currentBadges.add('Road Guardian');
  if (countCategory('Sanitation & Garbage') >= 3) currentBadges.add('Clean City Champion');
  if (countCategory('Water & Sewage') >= 3) currentBadges.add('Water Protector');
  if (countCategory('Streetlights') >= 3) currentBadges.add('Illuminator');
  if ((user.projectsJoinedCount || 0) >= 5) currentBadges.add('Super Volunteer');
  if ((user.verificationsMade || 0) >= 5) currentBadges.add('Master Verifier');

  const newBadgesList = Array.from(currentBadges);
  if (newBadgesList.length !== (user.badges || []).length) {
    const newlyAdded = newBadgesList.filter(b => !(user.badges || []).includes(b));
    newlyAdded.forEach(b => {
      db.addNotification({
        userId: user.uid,
        title: 'Badge Unlocked! 🏆',
        message: `Congratulations! You have earned the "${b}" badge.`,
        type: 'achievement'
      });
    });
    user.badges = newBadgesList;
  }
}

// Reward Points Helper (Supports Dual Modes)
async function rewardPoints(uid, amount, reason) {
  if (!uid) return;
  if (useFirebase) {
    try {
      const userRef = firestoreDb.collection('users').doc(uid);
      await firestoreDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        let userData = userDoc.exists ? userDoc.data() : {
          reputation: 120,
          badges: ['Community Hero'],
          pointsHistory: [{ points: 120, reason: 'Initial Reputation', timestamp: new Date().toISOString() }],
          solvedCount: 0,
          volunteerHours: 0,
          projectsJoinedCount: 0,
          projectsCompletedCount: 0,
          verificationsMade: 0,
          streak: 1
        };
        const newRep = Math.max(0, (userData.reputation || 0) + amount);
        const history = userData.pointsHistory || [];
        history.push({
          points: amount,
          reason,
          timestamp: new Date().toISOString()
        });
        
        const updatedUser = {
          ...userData,
          reputation: newRep,
          pointsHistory: history
        };

        // Query all reports for badge calculation
        const reportsSnapshot = await firestoreDb.collection('reports').get();
        const reports = reportsSnapshot.docs.map(d => d.data());
        checkAndAwardBadges(updatedUser, reports);

        transaction.set(userRef, updatedUser, { merge: true });
      });
    } catch (e) {
      console.error(`⚠️ Firestore rewardPoints failed for ${uid}:`, e.message);
    }
  } else {
    let user = mockUsers.find(u => u.uid === uid);
    if (!user) {
      user = {
        uid,
        name: 'Citizen Hero',
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        reputation: 120,
        badges: ['Community Hero'],
        pointsHistory: [{ points: 120, reason: 'Initial Reputation', timestamp: new Date().toISOString() }],
        solvedCount: 0,
        volunteerHours: 0,
        projectsJoinedCount: 0,
        projectsCompletedCount: 0,
        verificationsMade: 0,
        streak: 1
      };
      mockUsers.push(user);
    }
    user.reputation = Math.max(0, (user.reputation || 0) + amount);
    if (!user.pointsHistory) user.pointsHistory = [];
    user.pointsHistory.push({
      points: amount,
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Check achievements
    checkAndAwardBadges(user, mockReports);
    saveDb();
  }
}

// ==========================================
// DB INTERFACE EXPORTS (DUAL-MODE ROUTER)
// ==========================================
const db = {
  async getReports() {
    if (useFirebase) {
      try {
        const snapshot = await firestoreDb.collection('reports').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("⚠️ Firestore getReports query failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    return [...mockReports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getReport(id) {
    if (useFirebase) {
      try {
        const doc = await firestoreDb.collection('reports').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() };
        }
        return null;
      } catch (error) {
        console.error("⚠️ Firestore getReport query failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    return mockReports.find(r => r.id === id) || null;
  },

  async createReport(data) {
    const newReport = {
      id: useFirebase ? null : `report-${uuidv4().substring(0, 8)}`,
      votes: 0,
      voters: [],
      verifications: 0,
      verifiers: [],
      trustScore: 50,
      comments: [],
      history: [
        {
          status: 'Reported',
          updatedBy: data.reporter ? data.reporter.name : 'Citizen',
          note: 'Civic complaint submitted.',
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      ...data
    };

    if (useFirebase) {
      try {
        const docRef = await firestoreDb.collection('reports').add(newReport);
        if (data.reporter?.uid) {
          await rewardPoints(data.reporter.uid, 20, 'Reported neighborhood issue');
        }
        return { id: docRef.id, ...newReport };
      } catch (error) {
        console.error("⚠️ Firestore createReport failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
        newReport.id = `report-${uuidv4().substring(0, 8)}`;
      }
    }
    
    mockReports.push(newReport);
    saveDb();
    
    if (data.reporter?.uid) {
      await rewardPoints(data.reporter.uid, 20, 'Reported neighborhood issue');
    }
    return newReport;
  },

  async updateReport(id, updateData) {
    if (useFirebase) {
      try {
        await firestoreDb.collection('reports').doc(id).update(updateData);
        const updated = await this.getReport(id);
        return updated;
      } catch (error) {
        console.error("⚠️ Firestore updateReport failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    
    const index = mockReports.findIndex(r => r.id === id);
    if (index === -1) return null;

    // Handle status timeline update
    if (updateData.status && updateData.status !== mockReports[index].status) {
      const historyNote = updateData.historyNote || `Status updated to ${updateData.status}.`;
      const newHistory = [
        ...mockReports[index].history,
        {
          status: updateData.status,
          updatedBy: updateData.updatedBy || 'Admin',
          note: historyNote,
          timestamp: new Date().toISOString()
        }
      ];
      mockReports[index].history = newHistory;
    }

    mockReports[index] = { ...mockReports[index], ...updateData };
    delete mockReports[index].historyNote;
    delete mockReports[index].updatedBy;
    saveDb();
    return mockReports[index];
  },

  async toggleUpvote(reportId, userId) {
    let reportObj = null;
    let isUpvoted = false;

    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        const result = await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          
          const r = doc.data();
          let voters = r.voters || [];
          let votes = r.votes || 0;
          let upvoted = false;

          if (voters.includes(userId)) {
            voters = voters.filter(id => id !== userId);
            votes = Math.max(0, votes - 1);
          } else {
            voters.push(userId);
            votes += 1;
            upvoted = true;
          }

          const trustScore = calculateTrustScore(votes, r.verifications || 0);
          transaction.update(docRef, { votes, voters, trustScore });
          return { report: { id: docRef.id, ...r, votes, voters, trustScore }, isUpvoted: upvoted };
        });

        reportObj = result.report;
        isUpvoted = result.isUpvoted;
      } catch (error) {
        console.error("⚠️ Firestore toggleUpvote failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    if (!useFirebase) {
      const r = mockReports.find(x => x.id === reportId);
      if (!r) return null;

      if (r.voters.includes(userId)) {
        r.voters = r.voters.filter(id => id !== userId);
        r.votes = Math.max(0, r.votes - 1);
      } else {
        r.voters.push(userId);
        r.votes += 1;
        isUpvoted = true;
      }
      r.trustScore = calculateTrustScore(r.votes, r.verifications || 0);
      saveDb();
      reportObj = r;
    }

    if (reportObj && isUpvoted) {
      // Award +2 reputation to reporter
      if (reportObj.reporter?.uid && reportObj.reporter.uid !== userId) {
        await rewardPoints(reportObj.reporter.uid, 2, `Project "${reportObj.title}" upvoted`);
        // Notify reporter
        await this.addNotification({
          userId: reportObj.reporter.uid,
          title: 'Project Liked! ❤️',
          message: `A neighbor liked your project: "${reportObj.title}".`,
          type: 'like',
          reportId: reportId
        });
      }
    }

    return { votes: reportObj.votes, voters: reportObj.voters, trustScore: reportObj.trustScore, isUpvoted };
  },

  async toggleVerify(reportId, userId) {
    let reportObj = null;
    let isVerified = false;

    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        const result = await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          
          const r = doc.data();
          let verifiers = r.verifiers || [];
          let verifications = r.verifications || 0;
          let verified = false;

          if (verifiers.includes(userId)) {
            verifiers = verifiers.filter(id => id !== userId);
            verifications = Math.max(0, verifications - 1);
          } else {
            verifiers.push(userId);
            verifications += 1;
            verified = true;
          }

          const trustScore = calculateTrustScore(r.votes || 0, verifications);
          transaction.update(docRef, { verifications, verifiers, trustScore });
          return { report: { id: docRef.id, ...r, verifications, verifiers, trustScore }, isVerified: verified };
        });

        reportObj = result.report;
        isVerified = result.isVerified;
      } catch (error) {
        console.error("⚠️ Firestore toggleVerify failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    if (!useFirebase) {
      const r = mockReports.find(x => x.id === reportId);
      if (!r) return null;

      if (r.verifiers.includes(userId)) {
        r.verifiers = r.verifiers.filter(id => id !== userId);
        r.verifications = Math.max(0, r.verifications - 1);
      } else {
        r.verifiers.push(userId);
        r.verifications += 1;
        isVerified = true;
      }
      r.trustScore = calculateTrustScore(r.votes || 0, r.verifications);
      saveDb();
      reportObj = r;
    }

    if (reportObj && isVerified) {
      // Reward the verifier
      await rewardPoints(userId, 10, 'Verified a reported community problem');
      // Reward the original reporter
      if (reportObj.reporter?.uid && reportObj.reporter.uid !== userId) {
        await rewardPoints(reportObj.reporter.uid, 5, 'Your reported issue was verified');
      }
    }

    return { verifications: reportObj.verifications, verifiers: reportObj.verifiers, trustScore: reportObj.trustScore, isVerified };
  },

  async addComment(reportId, commentData) {
    const newComment = {
      id: `comment-${uuidv4().substring(0, 8)}`,
      createdAt: new Date().toISOString(),
      ...commentData
    };

    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error("Report not found");
        const currentComments = doc.data().comments || [];
        await docRef.update({
          comments: [...currentComments, newComment]
        });
        return newComment;
      } catch (error) {
        console.error("⚠️ Firestore addComment failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return null;
    report.comments.push(newComment);
    saveDb();
    
    // Award reputation to commenter
    if (commentData.user?.uid) {
      await rewardPoints(commentData.user.uid, 5, 'Commented on a community project');
    }

    // Trigger notifications for comments
    if (report.reporter?.uid && report.reporter.uid !== commentData.user?.uid) {
      await this.addNotification({
        userId: report.reporter.uid,
        title: 'New Comment 💬',
        message: `${commentData.user?.name || 'A user'} commented on your report: "${report.title}"`,
        type: 'comment',
        reportId: reportId
      });
    }

    return newComment;
  },

  async addNotification(notificationData) {
    const notification = {
      id: `notif-${uuidv4().substring(0, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...notificationData
    };
    if (useFirebase) {
      try {
        await firestoreDb.collection('notifications').add(notification);
        return notification;
      } catch (error) {
        console.error("⚠️ Firestore addNotification failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    mockNotifications.unshift(notification);
    saveDb();
    return notification;
  },

  async getNotifications(userId) {
    if (useFirebase) {
      try {
        const snapshot = await firestoreDb.collection('notifications')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("⚠️ Firestore getNotifications failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    return mockNotifications.filter(n => n.userId === userId);
  },

  async markNotificationRead(id) {
    if (useFirebase) {
      try {
        await firestoreDb.collection('notifications').doc(id).update({ read: true });
        return true;
      } catch (error) {
        console.error("⚠️ Firestore markNotificationRead failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    
    const notif = mockNotifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      saveDb();
      return true;
    }
    return false;
  },

  async joinProject(reportId, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const volunteers = report.volunteers || [];
          if (!volunteers.includes(userId)) {
            volunteers.push(userId);
            const update = { volunteers };
            if (report.status === 'Verified') {
              update.status = 'Volunteers Joined';
              update.history = [
                ...(report.history || []),
                { status: 'Volunteers Joined', updatedBy: 'System', note: 'A volunteer joined the team.', timestamp: new Date().toISOString() }
              ];
            }
            transaction.update(docRef, update);
          }
        });
        
        const userRef = firestoreDb.collection('users').doc(userId);
        await firestoreDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists) {
            const userData = userDoc.data();
            const rep = (userData.reputation || 0) + 10;
            const history = userData.historyReputation || [];
            history.push(rep);
            transaction.update(userRef, { 
              reputation: rep, 
              projectsJoinedCount: (userData.projectsJoinedCount || 0) + 1,
              historyReputation: history
            });
          }
        });
      } catch (error) {
        console.error("⚠️ Firestore joinProject failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      if (!report.volunteers) report.volunteers = [];
      if (!report.volunteers.includes(userId)) {
        report.volunteers.push(userId);
        // Transition status
        if (report.status === 'Reported' || report.status === 'Verified') {
          report.status = 'Community Joined';
          report.history.push({
            status: 'Community Joined',
            updatedBy: 'System',
            note: 'First volunteer joined the project.',
            timestamp: new Date().toISOString()
          });
        }
        saveDb();
        await rewardPoints(userId, 10, `Joined project: "${report.title}"`);
        // Increment join count directly on user object too
        const user = mockUsers.find(u => u.uid === userId);
        if (user) {
          user.projectsJoinedCount = (user.projectsJoinedCount || 0) + 1;
          saveDb();
          if (report.reporter?.uid && report.reporter.uid !== userId) {
            await this.addNotification({
              userId: report.reporter.uid,
              title: '👋 Volunteer Joined!',
              message: `${user.name || 'A neighbor'} volunteered to help with "${report.title}".`,
              type: 'volunteer',
              reportId: reportId
            });
          }
        }
      }
    }
    return report;
  },

  async leaveProject(reportId, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          let volunteers = report.volunteers || [];
          if (volunteers.includes(userId)) {
            volunteers = volunteers.filter(uid => uid !== userId);
            const update = { volunteers };
            if (volunteers.length === 0 && report.status === 'Volunteers Joined') {
              update.status = 'Verified';
            }
            transaction.update(docRef, update);
          }
        });

        const userRef = firestoreDb.collection('users').doc(userId);
        await firestoreDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists) {
            const userData = userDoc.data();
            const rep = Math.max(0, (userData.reputation || 0) - 10);
            const history = userData.historyReputation || [];
            history.push(rep);
            transaction.update(userRef, { 
              reputation: rep, 
              projectsJoinedCount: Math.max(0, (userData.projectsJoinedCount || 0) - 1),
              historyReputation: history
            });
          }
        });
      } catch (error) {
        console.error("⚠️ Firestore leaveProject failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      if (report.volunteers && report.volunteers.includes(userId)) {
        report.volunteers = report.volunteers.filter(uid => uid !== userId);
        if (report.volunteers.length === 0 && (report.status === 'Community Joined' || report.status === 'Volunteers Joined')) {
          report.status = 'Reported';
          report.history.push({
            status: 'Reported',
            updatedBy: 'System',
            note: 'All volunteers left. Back to reported state.',
            timestamp: new Date().toISOString()
          });
        }
        const user = mockUsers.find(u => u.uid === userId);
        if (user) {
          user.projectsJoinedCount = Math.max(0, (user.projectsJoinedCount || 0) - 1);
        }
        saveDb();
      }
    }
    return report;
  },

  async updateChecklist(reportId, checklistId, completed, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const checklist = report.checklist || [];
          const idx = checklist.findIndex(item => item.id === checklistId);
          if (idx !== -1) {
            checklist[idx].completed = completed;
            checklist[idx].completedBy = completed ? userId : null;
            
            const update = { checklist };
            if (completed && report.status === 'Volunteers Joined') {
              update.status = 'In Progress';
              update.history = [
                ...(report.history || []),
                { status: 'In Progress', updatedBy: userId, note: `Task checklist item completed.`, timestamp: new Date().toISOString() }
              ];
            }
            transaction.update(docRef, update);
          }
        });
      } catch (error) {
        console.error("⚠️ Firestore updateChecklist failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      if (!report.checklist) report.checklist = [];
      const item = report.checklist.find(i => i.id === checklistId);
      if (item) {
        item.completed = completed;
        item.completedBy = completed ? userId : null;
        if (completed && (report.status === 'Community Joined' || report.status === 'Volunteers Joined' || report.status === 'Verified')) {
          report.status = 'In Progress';
          report.history.push({
            status: 'In Progress',
            updatedBy: userId,
            note: `Checklist task completed: "${item.text}".`,
            timestamp: new Date().toISOString()
          });
        }
        saveDb();
      }
    }
    return report;
  },

  async uploadProgressPhoto(reportId, imageUrl, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const progressPhotos = report.progressPhotos || [];
          progressPhotos.push(imageUrl);
          const update = { progressPhotos };
          if (report.status === 'Volunteers Joined' || report.status === 'Verified') {
            update.status = 'In Progress';
            update.history = [
              ...(report.history || []),
              { status: 'In Progress', updatedBy: userId, note: `Uploaded progress photo.`, timestamp: new Date().toISOString() }
            ];
          }
          transaction.update(docRef, update);
        });

        const userRef = firestoreDb.collection('users').doc(userId);
        await firestoreDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists) {
            const userData = userDoc.data();
            const rep = (userData.reputation || 0) + 15;
            const history = userData.historyReputation || [];
            history.push(rep);
            transaction.update(userRef, { reputation: rep, historyReputation: history });
          }
        });
      } catch (error) {
        console.error("⚠️ Firestore uploadProgressPhoto failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      if (!report.progressPhotos) report.progressPhotos = [];
      report.progressPhotos.push(imageUrl);
      if (report.status === 'Volunteers Joined' || report.status === 'Verified') {
        report.status = 'In Progress';
        report.history.push({
          status: 'In Progress',
          updatedBy: userId,
          note: `Before/After evidence updated: Progress photo added.`,
          timestamp: new Date().toISOString()
        });
      }
      const user = mockUsers.find(u => u.uid === userId);
      if (user) {
        user.reputation += 15;
        if (!user.historyReputation) user.historyReputation = [];
        user.historyReputation.push(user.reputation);
      }
    }
    return report;
  },

  async completeProject(reportId, completionPhotoUrl, note, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        let volunteers = [];
        let reporterId = null;
        let title = '';
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          volunteers = report.volunteers || [];
          reporterId = report.reporter?.uid;
          title = report.title;
          const completionPhotos = report.completionPhotos || [];
          completionPhotos.push(completionPhotoUrl);
          
          const newHistory = [
            ...(report.history || []),
            { status: 'Completed', updatedBy: userId, note: note || 'Project completed. Submitted final photos for community verification.', timestamp: new Date().toISOString() }
          ];

          transaction.update(docRef, {
            status: 'Completed',
            completionPhotos,
            history: newHistory,
            completedAt: new Date().toISOString()
          });
        });

        const allUserIds = Array.from(new Set([userId, ...volunteers]));
        for (const uid of allUserIds) {
          const userRef = firestoreDb.collection('users').doc(uid);
          await firestoreDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
              const userData = userDoc.data();
              let bonus = 0;
              if (uid === userId) bonus += 60;
              if (volunteers.includes(uid)) bonus += 40;
              const rep = (userData.reputation || 0) + bonus;
              const history = userData.historyReputation || [];
              history.push(rep);
              transaction.update(userRef, { 
                reputation: rep, 
                solvedCount: (userData.solvedCount || 0) + 1,
                projectsCompletedCount: (userData.projectsCompletedCount || 0) + 1,
                historyReputation: history 
              });
            }
          });
        }

        if (reporterId) {
          const repRef = firestoreDb.collection('users').doc(reporterId);
          await firestoreDb.runTransaction(async (transaction) => {
            const repDoc = await transaction.get(repRef);
            if (repDoc.exists) {
              const repData = repDoc.data();
              const rep = (repData.reputation || 0) + 20;
              const history = repData.historyReputation || [];
              history.push(rep);
              transaction.update(repRef, { reputation: rep, historyReputation: history });
            }
          });
        }
      } catch (error) {
        console.error("⚠️ Firestore completeProject failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      report.status = 'Completed';
      report.completedAt = new Date().toISOString();
      if (!report.completionPhotos) report.completionPhotos = [];
      if (completionPhotoUrl) report.completionPhotos.push(completionPhotoUrl);
      report.history.push({
        status: 'Completed',
        updatedBy: userId,
        note: note || 'Project completed. Awaiting community verification.',
        timestamp: new Date().toISOString()
      });
      saveDb();

      const estimatedHours = report.estimatedHours || 2;
      const allVolunteers = new Set([...(report.volunteers || []), userId]);

      for (const volId of allVolunteers) {
        const bonus = volId === userId ? 60 : 40;
        await rewardPoints(volId, bonus, `Completed project: "${report.title}"`);
        const u = mockUsers.find(x => x.uid === volId);
        if (u) {
          u.solvedCount = (u.solvedCount || 0) + 1;
          u.projectsCompletedCount = (u.projectsCompletedCount || 0) + 1;
          u.volunteerHours = (u.volunteerHours || 0) + estimatedHours;
          saveDb();
        }
      }

      if (report.reporter?.uid) {
        await rewardPoints(report.reporter.uid, 20, `Your reported issue "${report.title}" was completed`);
      }

      const notifyUids = new Set([report.reporter?.uid, ...(report.volunteers || [])].filter(Boolean));
      notifyUids.delete(userId);
      for (const notifyUid of notifyUids) {
        await this.addNotification({
          userId: notifyUid,
          title: '✅ Project Completed!',
          message: `The project "${report.title}" has been completed. Please verify the work!`,
          type: 'status',
          reportId: reportId
        });
      }
    }
    return report;
  },

  async verifyCompletion(reportId, userId, isGenuine) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        let volunteers = [];
        let completedVerifications = 0;
        let shouldUpgrade = false;
        let title = '';

        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          
          if (report.reporter?.uid === userId) {
            throw new Error("You cannot verify your own project.");
          }
          
          const verifiersOfCompletion = report.verifiersOfCompletion || [];
          if (verifiersOfCompletion.includes(userId)) {
            throw new Error("You have already verified this project.");
          }
          
          verifiersOfCompletion.push(userId);
          volunteers = report.volunteers || [];
          title = report.title;
          
          const update = { verifiersOfCompletion };

          if (isGenuine) {
            completedVerifications = (report.completionVerifications || 0) + 1;
            update.completionVerifications = completedVerifications;
            if (completedVerifications >= 3 && report.status === 'Completed') {
              update.status = 'Community Verified';
              update.history = [
                ...(report.history || []),
                { status: 'Community Verified', updatedBy: 'System', note: 'Resolution verified by community consensus.', timestamp: new Date().toISOString() }
              ];
              shouldUpgrade = true;
            }
          }
          transaction.update(docRef, update);
        });

        if (isGenuine) {
          const userRef = firestoreDb.collection('users').doc(userId);
          await firestoreDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
              const userData = userDoc.data();
              const rep = (userData.reputation || 0) + 10;
              const history = userData.historyReputation || [];
              history.push(rep);
              transaction.update(userRef, { 
                reputation: rep, 
                verificationsMade: (userData.verificationsMade || 0) + 1,
                historyReputation: history 
              });
            }
          });

          if (shouldUpgrade) {
            for (const volId of volunteers) {
              const volRef = firestoreDb.collection('users').doc(volId);
              await firestoreDb.runTransaction(async (transaction) => {
                const volDoc = await transaction.get(volRef);
                if (volDoc.exists) {
                  const volData = volDoc.data();
                  const rep = (volData.reputation || 0) + 25;
                  const history = volData.historyReputation || [];
                  history.push(rep);
                  transaction.update(volRef, { reputation: rep, historyReputation: history });
                }
              });
            }
          }
        } else {
          const userRef = firestoreDb.collection('users').doc(userId);
          await firestoreDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
              const userData = userDoc.data();
              const rep = Math.max(0, (userData.reputation || 0) - 20);
              const history = userData.historyReputation || [];
              history.push(rep);
              transaction.update(userRef, { reputation: rep, historyReputation: history });
            }
          });
        }
      } catch (error) {
        console.error("⚠️ Firestore verifyCompletion failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }

    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      if (!report.verifiersOfCompletion) report.verifiersOfCompletion = [];
      
      // Prevent reporter from verifying own project
      if (report.reporter?.uid === userId) {
        throw new Error('You cannot verify your own project.');
      }
      
      if (report.verifiersOfCompletion.includes(userId)) {
        throw new Error('You have already verified this project.');
      }
      
      report.verifiersOfCompletion.push(userId);

      if (isGenuine) {
        report.completionVerifications = (report.completionVerifications || 0) + 1;
        saveDb();

        await rewardPoints(userId, 10, `Verified completion of "${report.title}"`);
        const verifier = mockUsers.find(u => u.uid === userId);
        if (verifier) {
          verifier.verificationsMade = (verifier.verificationsMade || 0) + 1;
          saveDb();
        }

        if (report.completionVerifications >= 3 && report.status === 'Completed') {
          report.status = 'Community Verified';
          report.verifiedAt = new Date().toISOString();
          report.history.push({
            status: 'Community Verified',
            updatedBy: 'System (Community Consensus)',
            note: 'Resolution verified by 3 community members.',
            timestamp: new Date().toISOString()
          });
          saveDb();

          for (const volId of report.volunteers || []) {
            await rewardPoints(volId, 25, `Community verified your work on "${report.title}"`);
            await this.addNotification({
              userId: volId,
              title: '🏆 Completion Verified!',
              message: `Your project "${report.title}" has been community-verified! +25 rep awarded.`,
              type: 'verify',
              reportId: reportId
            });
          }
          if (report.reporter?.uid) {
            await this.addNotification({
              userId: report.reporter.uid,
              title: '🌟 Project Community Verified!',
              message: `Your reported issue "${report.title}" has been fully resolved and verified!`,
              type: 'verify',
              reportId: reportId
            });
          }
        }
      } else {
        // Record vote, deduct reputation from user, but do not count as genuine approval
        saveDb();
        await rewardPoints(userId, -20, `Flagged incorrect resolution for "${report.title}"`);
      }
    }
    return report;
  },

  async getUsers() {
    if (useFirebase) {
      try {
        const snapshot = await firestoreDb.collection('users').get();
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("⚠️ Firestore getUsers failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    return mockUsers;
  },

  async getUser(uid) {
    if (useFirebase) {
      try {
        const doc = await firestoreDb.collection('users').doc(uid).get();
        return doc.exists ? { uid: doc.id, ...doc.data() } : null;
      } catch (error) {
        console.error("⚠️ Firestore getUser failed. Disabling Firebase mode.", error.message);
        useFirebase = false;
      }
    }
    return mockUsers.find(u => u.uid === uid) || null;
  },

  async deleteReport(id, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return false;
        const report = doc.data();
        if (report.reporter?.uid !== userId) {
          const userDoc = await firestoreDb.collection('users').doc(userId).get();
          const userData = userDoc.exists ? userDoc.data() : null;
          if (!userData || userData.role !== 'admin') {
            throw new Error("Unauthorized to delete this report");
          }
        }
        await docRef.delete();
        return true;
      } catch (error) {
        console.error("⚠️ Firestore deleteReport failed.", error.message);
        throw error;
      }
    }
    const idx = mockReports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const report = mockReports[idx];
    if (report.reporter?.uid !== userId) {
      const user = mockUsers.find(u => u.uid === userId);
      if (!user || user.role !== 'admin') {
        throw new Error("Unauthorized to delete this report");
      }
    }
    mockReports.splice(idx, 1);
    saveDb();
    return true;
  },

  async editComment(reportId, commentId, text, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const comments = report.comments || [];
          const idx = comments.findIndex(c => c.id === commentId);
          if (idx !== -1) {
            if (comments[idx].user?.uid !== userId) {
              throw new Error("Unauthorized to edit this comment");
            }
            comments[idx].text = text;
            comments[idx].updatedAt = new Date().toISOString();
            transaction.update(docRef, { comments });
          }
        });
        const updated = await this.getReport(reportId);
        return updated.comments.find(c => c.id === commentId);
      } catch (error) {
        console.error("⚠️ Firestore editComment failed.", error.message);
        throw error;
      }
    }
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return null;
    const comment = report.comments.find(c => c.id === commentId);
    if (!comment) return null;
    if (comment.user?.uid !== userId) {
      throw new Error("Unauthorized to edit this comment");
    }
    comment.text = text;
    comment.updatedAt = new Date().toISOString();
    return comment;
  },

  async deleteComment(reportId, commentId, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const comments = report.comments || [];
          const idx = comments.findIndex(c => c.id === commentId);
          if (idx !== -1) {
            if (comments[idx].user?.uid !== userId) {
              throw new Error("Unauthorized to delete this comment");
            }
            const updatedComments = comments.filter(c => c.id !== commentId);
            transaction.update(docRef, { comments: updatedComments });
          }
        });
        return true;
      } catch (error) {
        console.error("⚠️ Firestore deleteComment failed.", error.message);
        throw error;
      }
    }
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return false;
    const idx = report.comments.findIndex(c => c.id === commentId);
    if (idx === -1) return false;
    if (report.comments[idx].user?.uid !== userId) {
      throw new Error("Unauthorized to delete this comment");
    }
    report.comments.splice(idx, 1);
    return true;
  },

  async toggleLikeComment(reportId, commentId, userId) {
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        let updatedComment = null;
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const comments = report.comments || [];
          const idx = comments.findIndex(c => c.id === commentId);
          if (idx !== -1) {
            let likes = comments[idx].likes || [];
            if (likes.includes(userId)) {
              likes = likes.filter(id => id !== userId);
            } else {
              likes.push(userId);
            }
            comments[idx].likes = likes;
            updatedComment = comments[idx];
            transaction.update(docRef, { comments });
          }
        });
        return updatedComment;
      } catch (error) {
        console.error("⚠️ Firestore toggleLikeComment failed.", error.message);
        throw error;
      }
    }
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return null;
    const comment = report.comments.find(c => c.id === commentId);
    if (!comment) return null;
    if (!comment.likes) comment.likes = [];
    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter(id => id !== userId);
    } else {
      comment.likes.push(userId);
    }
    return comment;
  },

  async addReply(reportId, commentId, replyData) {
    const newReply = {
      id: `reply-${uuidv4().substring(0, 8)}`,
      createdAt: new Date().toISOString(),
      ...replyData
    };
    if (useFirebase) {
      try {
        const docRef = firestoreDb.collection('reports').doc(reportId);
        await firestoreDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) throw new Error("Report not found");
          const report = doc.data();
          const comments = report.comments || [];
          const idx = comments.findIndex(c => c.id === commentId);
          if (idx !== -1) {
            const replies = comments[idx].replies || [];
            replies.push(newReply);
            comments[idx].replies = replies;
            transaction.update(docRef, { comments });
          }
        });
        return newReply;
      } catch (error) {
        console.error("⚠️ Firestore addReply failed.", error.message);
        throw error;
      }
    }
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return null;
    const comment = report.comments.find(c => c.id === commentId);
    if (!comment) return null;
    if (!comment.replies) comment.replies = [];
    comment.replies.push(newReply);
    return newReply;
  },

  async updateUserProfile(uid, profileData) {
    if (useFirebase) {
      try {
        const userRef = firestoreDb.collection('users').doc(uid);
        await firestoreDb.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const currentData = userDoc.exists ? userDoc.data() : {
            reputation: 120,
            badges: ['Community Hero'],
            solvedCount: 0,
            volunteerHours: 0,
            projectsJoinedCount: 0,
            projectsCompletedCount: 0,
            verificationsMade: 0,
            streak: 1,
            historyReputation: [120]
          };
          const updated = { ...currentData, ...profileData, uid };
          transaction.set(userRef, updated, { merge: true });
        });
        const doc = await userRef.get();
        return { uid: doc.id, ...doc.data() };
      } catch (error) {
        console.error("⚠️ Firestore updateUserProfile failed.", error.message);
        throw error;
      }
    }
    let user = mockUsers.find(u => u.uid === uid);
    if (!user) {
      user = {
        uid,
        name: profileData.name || 'New Neighbor',
        photoURL: profileData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        email: profileData.email || '',
        reputation: 120,
        badges: ['Community Hero'],
        pointsHistory: [{ points: 120, reason: 'Welcome bonus', timestamp: new Date().toISOString() }],
        solvedCount: 0,
        volunteerHours: 0,
        projectsJoinedCount: 0,
        projectsCompletedCount: 0,
        verificationsMade: 0,
        streak: 1,
        historyReputation: [120],
        bio: '"Neighborhood champion helping to build a clean and safe community."',
        createdAt: new Date().toISOString()
      };
      mockUsers.push(user);
    } else {
      // Update fields that changed (name/photo from Google)
      if (profileData.name) user.name = profileData.name;
      if (profileData.photoURL) user.photoURL = profileData.photoURL;
      if (profileData.email) user.email = profileData.email;
    }
    saveDb();
    return user;
  }
};

module.exports = {
  db,
  useFirebase,
  mockUsers,
  rewardPoints,
  saveDb
};
