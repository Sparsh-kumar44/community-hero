const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, useFirebase } = require('../config');
const { detectDuplicates } = require('../services/duplicates');
const admin = require('firebase-admin');

// Configure local multer storage for mock mode
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

/**
 * Helper to upload a local file to Firebase Storage
 */
async function uploadToFirebaseStorage(localFilePath, mimeType) {
  try {
    const bucket = admin.storage().bucket();
    const destination = `reports/${path.basename(localFilePath)}`;
    
    await bucket.upload(localFilePath, {
      destination,
      metadata: { contentType: mimeType }
    });

    const fileRef = bucket.file(destination);
    // Get public URL
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2491' // Far future
    });
    
    // Clean up local temp file
    fs.unlinkSync(localFilePath);
    return url;
  } catch (error) {
    console.error("🔴 Firebase Storage upload failed, returning fallback mock path.", error.message);
    return `/uploads/${path.basename(localFilePath)}`;
  }
}

/**
 * Check for duplicate reports
 */
router.post('/check-duplicates', async (req, res) => {
  try {
    const { latitude, longitude, category, description, title } = req.body;
    const reports = await db.getReports();
    const duplicates = detectDuplicates({ latitude, longitude, category, description, title }, reports);
    res.json(duplicates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all reports (with backend search & filtering)
 */
router.get('/', async (req, res) => {
  try {
    let reports = await db.getReports();
    const { search, category, status, reporterId } = req.query;

    if (reporterId) {
      reports = reports.filter(r => r.reporter?.uid === reporterId);
    }
    if (category) {
      reports = reports.filter(r => r.category === category);
    }
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    if (search) {
      const term = search.toLowerCase();
      reports = reports.filter(r => {
        const titleMatch = (r.title || '').toLowerCase().includes(term);
        const captionMatch = (r.imageCaption || '').toLowerCase().includes(term);
        const descMatch = (r.description || '').toLowerCase().includes(term);
        const locationMatch = (r.ward || '').toLowerCase().includes(term);
        const reporterMatch = (r.reporter?.name || '').toLowerCase().includes(term);
        const statusMatch = (r.status || '').toLowerCase().includes(term);
        const tagsMatch = (r.tags || []).some(tag => tag.toLowerCase().includes(term));
        return titleMatch || captionMatch || descMatch || locationMatch || reporterMatch || statusMatch || tagsMatch;
      });
    }
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get single report
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create new report (with optional image uploads)
 */
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const reportData = JSON.parse(req.body.data || '{}');
    const files = req.files || [];
    
    // Upload files to storage (Firebase or Local)
    const imageUrls = [];
    for (const file of files) {
      if (useFirebase) {
        const firebaseUrl = await uploadToFirebaseStorage(file.path, file.mimetype);
        imageUrls.push(firebaseUrl);
      } else {
        // Return relative path served statically by Express
        imageUrls.push(`/uploads/${file.filename}`);
      }
    }

    if (imageUrls.length > 0) {
      reportData.imageUrls = imageUrls;
    } else if (!reportData.imageUrls) {
      reportData.imageUrls = ['https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=800']; // default fallback placeholder
    }

    const createdReport = await db.createReport(reportData);
    
    // Send a real-time notification to others
    await db.addNotification({
      userId: reportData.reporter?.uid || 'anonymous',
      title: 'Report Submitted',
      message: `Your complaint "${reportData.title}" has been successfully reported!`,
      type: 'status',
      reportId: createdReport.id
    });

    res.status(201).json(createdReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Upvote a report
 */
router.post('/:id/upvote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const result = await db.toggleUpvote(req.params.id, userId);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify a report
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const result = await db.toggleVerify(req.params.id, userId);
    if (!result) return res.status(404).json({ error: "Report not found" });

    // Notify original reporter if report is verified (milestone trigger)
    const report = await db.getReport(req.params.id);
    if (result.isVerified && report && report.reporter?.uid && report.reporter.uid !== userId) {
      await db.addNotification({
        userId: report.reporter.uid,
        title: 'Report Verified',
        message: `Your report "${report.title}" has been verified by another citizen. Keep it up!`,
        type: 'verify',
        reportId: req.params.id
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add a comment to a report
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: "user and text are required" });
    
    const comment = await db.addComment(req.params.id, { user, text });
    if (!comment) return res.status(404).json({ error: "Report not found" });
    
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update report status (Admin feature)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, note, updatedBy } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });

    const updated = await db.updateReport(req.params.id, { 
      status, 
      historyNote: note, 
      updatedBy 
    });

    if (!updated) return res.status(404).json({ error: "Report not found" });

    // Notify the reporter
    if (updated.reporter?.uid) {
      await db.addNotification({
        userId: updated.reporter.uid,
        title: 'Status Update',
        message: `Your report "${updated.title}" is now "${status}". Note: ${note || 'No description provided.'}`,
        type: 'status',
        reportId: req.params.id
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resolve report with before/after images
 */
router.post('/:id/resolve', upload.single('afterImage'), async (req, res) => {
  try {
    const file = req.file;
    const { note, updatedBy } = req.body;
    
    if (!file) return res.status(400).json({ error: "afterImage file is required to resolve" });
    
    const report = await db.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    let afterImageUrl = '';
    if (useFirebase) {
      afterImageUrl = await uploadToFirebaseStorage(file.path, file.mimetype);
    } else {
      afterImageUrl = `/uploads/${file.filename}`;
    }

    const beforeImage = report.imageUrls[0] || 'https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=800';

    const updated = await db.updateReport(req.params.id, {
      status: 'Resolved',
      historyNote: note || 'Issue resolved successfully.',
      updatedBy: updatedBy || 'Admin',
      beforeAfterImages: {
        before: beforeImage,
        after: afterImageUrl,
        resolvedAt: new Date().toISOString()
      }
    });

    // Award major reputation points to the original reporter (+50 points) and admin
    if (!useFirebase) {
      const reporter = mockUsers.find(u => u.uid === report.reporter?.uid);
      if (reporter) reporter.reputation += 50; // Big bonus for resolved reports!
    }

    // Notify reporter
    if (updated.reporter?.uid) {
      await db.addNotification({
        userId: updated.reporter.uid,
        title: '🎉 Civic Complaint Resolved!',
        message: `Outstanding! Your report "${updated.title}" has been resolved. Open to view the before/after details.`,
        type: 'status',
        reportId: req.params.id
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Join or leave a project
 */
router.post('/:id/volunteer', async (req, res) => {
  try {
    const { userId, action } = req.body; // action: 'join' or 'leave'
    if (!userId || !action) return res.status(400).json({ error: "userId and action are required" });

    let result;
    if (action === 'join') {
      result = await db.joinProject(req.params.id, userId);
    } else {
      result = await db.leaveProject(req.params.id, userId);
    }

    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle a checklist task
 */
router.post('/:id/checklist', async (req, res) => {
  try {
    const { checklistId, completed, userId } = req.body;
    if (!checklistId || completed === undefined || !userId) {
      return res.status(400).json({ error: "checklistId, completed, and userId are required" });
    }

    const result = await db.updateChecklist(req.params.id, checklistId, completed, userId);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Upload progress photo
 */
router.post('/:id/progress-photo', upload.single('progressImage'), async (req, res) => {
  try {
    const file = req.file;
    const { userId } = req.body;
    if (!file || !userId) return res.status(400).json({ error: "progressImage and userId are required" });

    let imageUrl = '';
    if (useFirebase) {
      imageUrl = await uploadToFirebaseStorage(file.path, file.mimetype);
    } else {
      imageUrl = `/uploads/${file.filename}`;
    }

    const result = await db.uploadProgressPhoto(req.params.id, imageUrl, userId);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Complete project (upload optional final photo)
 */
router.post('/:id/complete', upload.single('completionImage'), async (req, res) => {
  try {
    const file = req.file;
    const { note, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    let imageUrl = '';
    if (file) {
      if (useFirebase) {
        imageUrl = await uploadToFirebaseStorage(file.path, file.mimetype);
      } else {
        imageUrl = `/uploads/${file.filename}`;
      }
    }

    const result = await db.completeProject(req.params.id, imageUrl, note, userId);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * Verify completed project resolution
 */
router.post('/:id/verify-completion', async (req, res) => {
  try {
    const { userId, isGenuine } = req.body;
    if (!userId || isGenuine === undefined) {
      return res.status(400).json({ error: "userId and isGenuine are required" });
    }
    const result = await db.verifyCompletion(req.params.id, userId, isGenuine);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json(result);
  } catch (err) {
    if (err.message && err.message.includes('cannot verify your own')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});


/**
 * Update report details (Owner only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { userId, title, description, category, severity, estimatedVolunteers, difficulty, tags } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const report = await db.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    if (report.reporter?.uid !== userId) {
      return res.status(403).json({ error: "Unauthorized to edit this report" });
    }

    const updated = await db.updateReport(req.params.id, {
      title,
      description,
      category,
      severity,
      estimatedVolunteers,
      difficulty,
      tags
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete report (Owner/Admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const success = await db.deleteReport(req.params.id, userId);
    if (!success) return res.status(404).json({ error: "Report not found" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Edit comment (Owner only)
 */
router.put('/:id/comments/:commentId', async (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || !userId) return res.status(400).json({ error: "text and userId are required" });

    const comment = await db.editComment(req.params.id, req.params.commentId, text, userId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete comment (Owner only)
 */
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const success = await db.deleteComment(req.params.id, req.params.commentId, userId);
    if (!success) return res.status(404).json({ error: "Comment not found" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle comment like
 */
router.post('/:id/comments/:commentId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const comment = await db.toggleLikeComment(req.params.id, req.params.commentId, userId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add nested reply to comment
 */
router.post('/:id/comments/:commentId/reply', async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: "user and text are required" });

    const reply = await db.addReply(req.params.id, req.params.commentId, { user, text });
    if (!reply) return res.status(404).json({ error: "Comment not found" });

    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get user notifications
 */
router.get('/notifications/:userId', async (req, res) => {
  try {
    const notifications = await db.getNotifications(req.params.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark notification read
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const success = await db.markNotificationRead(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update profile & upload avatar image
 */
router.post('/profile', upload.single('avatar'), async (req, res) => {
  try {
    const { uid, displayName, bio } = req.body;
    const file = req.file;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const updateData = {};
    if (displayName) updateData.name = displayName;
    if (bio) updateData.bio = bio;

    if (file) {
      let avatarUrl = '';
      if (useFirebase) {
        avatarUrl = await uploadToFirebaseStorage(file.path, file.mimetype);
      } else {
        avatarUrl = `/uploads/${file.filename}`;
      }
      updateData.photoURL = avatarUrl;
    }

    const updatedUser = await db.updateUserProfile(uid, updateData);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Sync Firebase user into local user DB on login
 */
router.post('/sync-user', async (req, res) => {
  try {
    const { uid, name, photoURL, email } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    const user = await db.updateUserProfile(uid, { name, photoURL, email });

    // Fetch reports to calculate stats dynamically
    const reports = await db.getReports();
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

    const dynamicVolHours = user.volunteerHours || (completedProjects.length * 2);
    const solvedCount = user.solvedCount || (solvedReports.length + completedProjects.length);
    const projectsJoinedCount = user.projectsJoinedCount || joinedProjects.length;
    const projectsCompletedCount = user.projectsCompletedCount || completedProjects.length;

    res.json({
      ...user,
      reportsSubmitted: myReports.length,
      solvedCount,
      projectsJoinedCount,
      projectsCompletedCount,
      volunteerHours: dynamicVolHours
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
