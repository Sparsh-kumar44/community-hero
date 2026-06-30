import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import MapContainer from '../components/MapContainer';
import ImageSlider from '../components/ImageSlider';
import { toast } from '../components/NotificationToast';
import { motion } from 'framer-motion';
import { 
  Heart, MessageSquare, Share2, Shield, Calendar, MapPin, 
  Clock, AlertTriangle, Sparkles, Send, Award, Users, Check, X, Camera, Plus 
} from 'lucide-react';

export default function IssueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Interactive comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Volunteering file upload states
  const [progressImage, setProgressImage] = useState(null);
  const [progressUploading, setProgressUploading] = useState(false);
  const [isProgressTooLarge, setIsProgressTooLarge] = useState(false);

  const [completionImage, setCompletionImage] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [isCompletionTooLarge, setIsCompletionTooLarge] = useState(false);

  const [showSizeModal, setShowSizeModal] = useState(false);

  // Inline edit report states
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSeverity, setEditSeverity] = useState('');
  const [editVolunteers, setEditVolunteers] = useState(3);
  const [editDifficulty, setEditDifficulty] = useState('');
  const [editTags, setEditTags] = useState('');

  // Comment interactive states
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getReport(id);
      setReport(data);
      // Initialize edit fields
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
      setEditCategory(data.category || 'Others');
      setEditSeverity(data.severity || 'Medium');
      setEditVolunteers(data.estimatedVolunteers || 3);
      setEditDifficulty(data.difficulty || 'Medium');
      setEditTags((data.tags || []).join(', '));
    } catch (err) {
      toast.error("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleUpvote = async () => {
    if (!user) return toast.warning("Please sign in to upvote");
    try {
      const result = await api.upvoteReport(id, user.uid);
      setReport(prev => ({
        ...prev,
        votes: result.votes,
        voters: result.voters,
        trustScore: result.trustScore
      }));
      toast.success(result.isUpvoted ? "Upvoted! +2 Reputation" : "Removed upvote");
      refreshUserProfile().catch(() => null);
    } catch (e) {
      toast.error("Upvote failed");
    }
  };

  const handleVolunteerAction = async (action) => {
    if (!user) return toast.warning("Please sign in to volunteer");
    try {
      const result = await api.volunteerForProject(id, user.uid, action);
      setReport(result);
      toast.success(action === 'join' ? "Joined cleanup crew force! +10 Reputation" : "Left crew force.");
      refreshUserProfile().catch(() => null);
    } catch (e) {
      toast.error("Volunteering update failed");
    }
  };

  const handleToggleChecklist = async (checklistId, completed) => {
    if (!user) return;
    try {
      const result = await api.updateChecklist(id, checklistId, completed, user.uid);
      setReport(result);
      toast.success(completed ? "Task checked off! +40 Reputation" : "Task unchecked.");
      refreshUserProfile().catch(() => null);
    } catch (e) {
      toast.error("Checklist update failed");
    }
  };

  const handleProgressImageChange = (file) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setIsProgressTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
        setProgressImage(file);
        return;
      }
    }
    setIsProgressTooLarge(false);
    setProgressImage(file);
  };

  const handleCompletionImageChange = (file) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setIsCompletionTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
        setCompletionImage(file);
        return;
      }
    }
    setIsCompletionTooLarge(false);
    setCompletionImage(file);
  };

  const handleUploadProgressPhoto = async (e) => {
    e.preventDefault();
    if (!progressImage || !user || isProgressTooLarge) return;
    try {
      setProgressUploading(true);
      const result = await api.uploadProgressPhoto(id, progressImage, user.uid);
      setReport(result);
      setProgressImage(null);
      toast.success("Progress photo uploaded! +15 Reputation");
      refreshUserProfile().catch(() => null);
    } catch (err) {
      if (err.message && (err.message.includes("limit of 20 MB") || err.message.includes("File too large"))) {
        setIsProgressTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
      } else {
        toast.error(err.message || "Failed to upload progress photo.");
      }
    } finally {
      setProgressUploading(false);
    }
  };

  const handleCompleteProject = async (e) => {
    e.preventDefault();
    if (!completionImage || !user || isCompletionTooLarge) {
      toast.error("Please select a valid completion photo.");
      return;
    }
    try {
      setCompletionSubmitting(true);
      const result = await api.completeProject(id, completionImage, completionNote, user.uid);
      setReport(result);
      setCompletionImage(null);
      setCompletionNote('');
      toast.success("Project marked completed! Peer verification requested. +60 Reputation");
      refreshUserProfile().catch(() => null);
    } catch (err) {
      if (err.message && (err.message.includes("limit of 20 MB") || err.message.includes("File too large"))) {
        setIsCompletionTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
      } else {
        toast.error(err.message || "Completion submission failed.");
      }
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const handleVerifyCompletion = async (isGenuine) => {
    if (!user) return;
    try {
      const result = await api.verifyProjectCompletion(id, user.uid, isGenuine);
      setReport(result);
      toast.success(isGenuine ? "Voted genuine resolution! +10 Reputation" : "Flagged resolution as incorrect.");
      refreshUserProfile().catch(() => null);
    } catch (e) {
      toast.error(e.message || "Verification vote failed.");
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    try {
      setPostingComment(true);
      const updated = await api.addComment(id, {
        uid: user.uid,
        name: user.displayName,
        photoURL: user.photoURL
      }, commentText.trim());
      setReport(updated);
      setCommentText('');
      toast.success("Comment posted!");
    } catch (err) {
      toast.error("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      const updated = await api.updateReportData(id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        severity: editSeverity,
        estimatedVolunteers: Number(editVolunteers),
        difficulty: editDifficulty,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
      }, user.uid);
      setReport(updated);
      setIsEditingReport(false);
      toast.success("Project details updated!");
    } catch (err) {
      toast.error("Failed to save updates");
    }
  };

  const handleDeleteReport = async () => {
    if (!window.confirm("Are you sure you want to delete this community report? This action cannot be undone.")) return;
    try {
      await api.deleteReport(id, user.uid);
      toast.success("Project deleted successfully");
      navigate('/problems');
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) return toast.warning("Sign in to like comments");
    try {
      const updatedComment = await api.toggleLikeComment(id, commentId, user.uid);
      setReport(prev => ({
        ...prev,
        comments: prev.comments.map(c => c.id === commentId ? updatedComment : c)
      }));
    } catch (err) {
      toast.error("Failed to like comment");
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      const updatedComment = await api.editComment(id, commentId, editCommentText.trim(), user.uid);
      setReport(prev => ({
        ...prev,
        comments: prev.comments.map(c => c.id === commentId ? updatedComment : c)
      }));
      setEditingCommentId(null);
      toast.success("Comment updated");
    } catch (err) {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api.deleteComment(id, commentId, user.uid);
      setReport(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handlePostReply = async (e, commentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    try {
      const reply = await api.addReply(id, commentId, {
        uid: user.uid,
        name: user.displayName,
        photoURL: user.photoURL
      }, replyText.trim());
      
      setReport(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: [...(c.replies || []), reply]
            };
          }
          return c;
        })
      }));
      
      setReplyText('');
      setReplyingCommentId(null);
      toast.success("Reply posted!");
    } catch (err) {
      toast.error("Failed to post reply");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Project URL copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950">
        <div>
          <span className="text-4xl">🔍</span>
          <h2 className="text-xl font-bold mt-4">Problem Not Found</h2>
          <Link to="/problems" className="text-primary-600 dark:text-primary-400 mt-2 block font-semibold hover:underline">
            Back to Problems feed
          </Link>
        </div>
      </div>
    );
  }

  const isVolunteer = report.volunteers?.includes(user?.uid);
  const isUpvoted = report.voters?.includes(user?.uid);

  // Status mapping to workflow indices:
  // Reported ➔ Community Joined ➔ In Progress ➔ Completed ➔ Community Verified
  const workflowSteps = [
    { key: 'Reported', label: 'Reported', desc: 'Project launched.' },
    { key: 'Community Joined', label: 'Community Joined', desc: 'Volunteers joined crew.' },
    { key: 'In Progress', label: 'In Progress', desc: 'Cleanup tasks started.' },
    { key: 'Completed', label: 'Completed', desc: 'Final photo uploaded.' },
    { key: 'Community Verified', label: 'Community Verified', desc: 'Peer verification complete.' }
  ];

  const getActiveStepIndex = () => {
    const status = report.status;
    if (status === 'Community Verified') return 4;
    if (status === 'Completed') return 3;
    if (status === 'In Progress') return 2;
    if (status === 'Volunteers Joined' || status === 'Verified' || status === 'Community Joined') return 1;
    return 0; // Reported
  };

  const activeStep = getActiveStepIndex();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* 1. TOP HEADER TITLE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold bg-primary-100/70 text-primary-750 dark:bg-primary-950/20 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-200/30">
                {report.category}
              </span>
              <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200/30">
                🛡️ Trust Score: {report.trustScore}%
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-955 dark:text-white leading-tight">{report.title}</h1>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <MapPin size={12} />
              <span>{report.ward} • Created on {new Date(report.createdAt).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={handleUpvote}
              className={`flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 rounded-2xl px-5 py-3 text-xs font-bold transition shadow-sm border ${
                isUpvoted 
                  ? 'bg-primary-600 border-primary-750 text-white shadow-primary-500/20' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350'
              }`}
            >
              <Heart size={14} className={isUpvoted ? 'fill-white' : ''} />
              <span>{isUpvoted ? 'Liked' : 'Like Project'}</span>
              <span className="opacity-80">({report.votes || 0})</span>
            </button>

            <button
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 shadow-sm"
              title="Copy URL Link"
            >
              <Share2 size={16} />
            </button>

            {report.reporter?.uid === user?.uid && (
              <>
                <button
                  onClick={() => setIsEditingReport(!isEditingReport)}
                  className="px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-indigo-650 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-400 shadow-sm font-bold text-xs"
                  title="Edit details"
                >
                  {isEditingReport ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={handleDeleteReport}
                  className="px-4 py-3 rounded-2xl bg-white border border-red-200 hover:bg-red-50 text-red-650 dark:bg-slate-900 dark:border-red-950/20 dark:text-red-400 shadow-sm font-bold text-xs"
                  title="Delete Project"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT LAYOUT: IMAGE GALLERY & TIMELINE */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* IMAGE SLIDER (BEFORE/AFTER OR IMAGE) */}
            {report.status === 'Community Verified' && report.beforeAfterImages ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before & After Project Comparison</h4>
                <ImageSlider 
                  before={report.beforeAfterImages.before} 
                  after={report.beforeAfterImages.after} 
                />
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden shadow border border-slate-200 dark:border-slate-850 aspect-video w-full max-h-[380px] bg-slate-100">
                <img 
                  src={report.imageUrls?.[0] || 'https://images.unsplash.com/photo-1599740831146-80e6f7c30b22?w=800'} 
                  alt="Project Details" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* DESCRIPTION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Vision</h4>
                {report.reporter?.uid === user?.uid && (
                  <button
                    onClick={() => setIsEditingReport(!isEditingReport)}
                    className="text-xs text-primary-500 font-bold hover:underline"
                  >
                    {isEditingReport ? 'Cancel' : 'Edit Inline'}
                  </button>
                )}
              </div>

              {isEditingReport ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Project Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                      >
                        <option value="Roads & Potholes">Roads & Potholes</option>
                        <option value="Sanitation & Garbage">Sanitation & Garbage</option>
                        <option value="Water & Sewage">Water & Sewage</option>
                        <option value="Streetlights">Streetlights</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Severity</label>
                      <select
                        value={editSeverity}
                        onChange={(e) => setEditSeverity(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Required Volunteers</label>
                      <input
                        type="number"
                        value={editVolunteers}
                        onChange={(e) => setEditVolunteers(Number(e.target.value))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Difficulty</label>
                      <select
                        value={editDifficulty}
                        onChange={(e) => setEditDifficulty(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSaveReport}
                    className="w-full inline-flex justify-center items-center rounded-xl bg-primary-600 hover:bg-primary-750 text-white text-xs font-bold py-2.5 shadow-sm transition"
                  >
                    Save Project Vision Updates
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-normal">{report.description}</p>
                  
                  <p className="text-xs text-slate-400 italic mt-3 border-l-2 border-slate-250 dark:border-slate-800 pl-3">
                    AI Caption: "{report.imageCaption || 'No caption generated'}"
                  </p>

                  <div className="mt-6 flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center space-x-3">
                      <img src={report.reporter?.photoURL} alt="" className="h-10 w-10 rounded-full object-cover border" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Reported by {report.reporter?.name}</p>
                        <p className="text-[10px] text-slate-400">Reputation Score: {report.reporter?.reputation || 0} pts</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* VISUAL WORKFLOW TIMELINE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Community Campaign Workflow
              </h4>
              
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 ml-4 md:ml-0">
                {/* Horizontal line for desktop */}
                <div className="hidden md:block absolute left-4 right-4 h-0.5 bg-slate-100 dark:bg-slate-800 z-0 top-6" />

                {workflowSteps.map((step, idx) => {
                  const isCurrent = idx === activeStep;
                  const isPassed = idx < activeStep;

                  return (
                    <div key={step.key} className="flex md:flex-col items-center text-left md:text-center flex-1 z-10 relative">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        isCurrent 
                          ? 'bg-primary-600 border-primary-700 text-white font-bold ring-4 ring-primary-100 dark:ring-primary-950/20' 
                          : isPassed 
                            ? 'bg-emerald-500 border-emerald-600 text-white font-bold' 
                            : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                      }`}>
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <div className="ml-4 md:ml-0 md:mt-3">
                        <h5 className={`text-xs font-bold ${isCurrent ? 'text-primary-600 dark:text-primary-400' : isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                          {step.label}
                        </h5>
                        <p className="text-[10px] text-slate-400 hidden md:block mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VOLUNTEER CHECKLIST */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Volunteer Action Checklist
                </h4>
                <span className="text-xs font-bold text-primary-500">
                  {report.checklist?.filter(c => c.completed).length || 0}{"/"}{report.checklist?.length || 0} completed
                </span>
              </div>

              <div className="space-y-3">
                {report.checklist && report.checklist.length > 0 ? (
                  report.checklist.map(task => (
                    <label 
                      key={task.id} 
                      className={`flex items-start p-3.5 rounded-2xl border transition cursor-pointer ${
                        task.completed 
                          ? 'bg-slate-50/70 border-slate-100 text-slate-400 line-through dark:bg-slate-950/10 dark:border-slate-850/60' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        disabled={!isVolunteer}
                        onChange={(e) => handleToggleChecklist(task.id, e.target.checked)}
                        className="mt-0.5 mr-3 h-4 w-4 rounded border-slate-350 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-50"
                      />
                      <div className="text-xs font-semibold">
                        <p>{task.text}</p>
                        {task.completed && task.completedBy && (
                          <p className="text-[9px] text-slate-400 font-bold mt-1 line-through-none">Completed by Crew Member</p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No checklist items formulated yet.</p>
                )}
              </div>

              {/* UPLOAD PROGRESS PHOTO (Crews In Progress) */}
              {isVolunteer && report.status === 'In Progress' && (
                <form onSubmit={handleUploadProgressPhoto} className={`p-4 rounded-2xl border space-y-4 transition ${
                  isProgressTooLarge 
                    ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                    : 'bg-indigo-50/30 border-indigo-150/40 dark:bg-indigo-950/10 dark:border-indigo-900/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <h5 className={`text-xs font-bold flex items-center space-x-1.5 ${isProgressTooLarge ? 'text-red-500' : 'text-indigo-700 dark:text-indigo-400'}`}>
                      <Camera size={14} />
                      <span>Upload Cleanup Progress Photo</span>
                    </h5>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleProgressImageChange(e.target.files[0])}
                      className={`text-xs w-full p-2 border rounded-xl ${isProgressTooLarge ? 'border-red-500 text-red-500' : 'text-slate-500 border-transparent'}`}
                    />
                    <button
                      type="submit"
                      disabled={progressUploading || !progressImage || isProgressTooLarge}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {progressUploading ? 'Uploading...' : 'Upload Progress Photo'}
                    </button>
                  </div>
                  <p className={`text-[10px] ${isProgressTooLarge ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    Supported formats: JPG, JPEG, PNG, WEBP • Maximum size: 20 MB
                  </p>
                </form>
              )}
            </div>

            {/* COMMENTS & DISCUSSION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Discussion Board ({report.comments?.length || 0})
              </h4>

              <form onSubmit={handlePostComment} className="flex gap-3">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post an update or offer tools..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim() || !user}
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-750 text-white rounded-2xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </form>

              <div className="space-y-6 pt-4 border-t border-slate-50 dark:border-slate-850">
                {report.comments && report.comments.length > 0 ? (
                  report.comments.map(c => {
                    const isMyComment = c.user?.uid === user?.uid;
                    const hasLikedComment = c.likes?.includes(user?.uid);
                    const likeCount = c.likes?.length || 0;

                    return (
                      <div key={c.id} className="space-y-3">
                        {/* Parent Comment */}
                        <div className="flex items-start space-x-3 text-xs">
                          <img src={c.user?.photoURL} alt="" className="h-8 w-8 rounded-full object-cover border" />
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850/60 relative group">
                            
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-bold text-slate-955 dark:text-white">{c.user?.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>

                            {editingCommentId === c.id ? (
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="flex-1 bg-white border border-slate-200 dark:bg-slate-900 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                />
                                <button
                                  onClick={() => handleEditComment(c.id)}
                                  className="px-3 py-1 bg-primary-600 text-white rounded-xl text-[10px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded-xl text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <p className="text-slate-650 dark:text-slate-350 leading-relaxed">{c.text}</p>
                            )}

                            {/* Comment Actions: Like, Reply, Edit, Delete */}
                            <div className="flex items-center space-x-3 mt-3 text-[10px] font-semibold text-slate-400">
                              <button
                                onClick={() => handleLikeComment(c.id)}
                                className={`flex items-center space-x-1 hover:text-red-500 transition ${hasLikedComment ? 'text-red-500 font-bold' : ''}`}
                              >
                                <span>♥</span>
                                <span>{likeCount} Likes</span>
                              </button>

                              <button
                                onClick={() => {
                                  setReplyingCommentId(replyingCommentId === c.id ? null : c.id);
                                  setReplyText('');
                                }}
                                className="hover:text-primary-500 transition"
                              >
                                Reply
                              </button>

                              {isMyComment && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(c.id);
                                      setEditCommentText(c.text);
                                    }}
                                    className="hover:text-indigo-500 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="hover:text-red-500 transition"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reply Form */}
                        {replyingCommentId === c.id && (
                          <form onSubmit={(e) => handlePostReply(e, c.id)} className="flex gap-2 ml-10">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-750 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                            >
                              Reply
                            </button>
                          </form>
                        )}

                        {/* Nested Replies List */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="ml-10 pl-4 border-l border-slate-250 dark:border-slate-800 space-y-3.5">
                            {c.replies.map(r => (
                              <div key={r.id} className="flex items-start space-x-2.5 text-[11px]">
                                <img src={r.user?.photoURL} alt="" className="h-6 w-6 rounded-full object-cover border" />
                                <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/65 p-2.5 rounded-xl border border-slate-100/30 dark:border-slate-850/40">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-850 dark:text-slate-200">{r.user?.name}</span>
                                    <span className="text-[9px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-350">{r.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No comments posted yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT LAYOUT: CREW FORCE & VERIFICATIONS */}
          <div className="space-y-6">
            
            {/* ACTIVE CREW FORCE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                <Users size={16} className="text-slate-400" />
                <span>Cleanup Crew Force</span>
              </h4>

              {/* Join crew toggle */}
              {isVolunteer ? (
                <button
                  onClick={() => handleVolunteerAction('leave')}
                  className="w-full py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition duration-150"
                >
                  Leave Crew Force
                </button>
              ) : (
                <button
                  onClick={() => handleVolunteerAction('join')}
                  disabled={report.status === 'Completed' || report.status === 'Community Verified'}
                  className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-750 text-white text-xs font-bold shadow-md transition duration-150 disabled:opacity-50"
                >
                  Join Cleanup Crew
                </button>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Joined Volunteers ({report.volunteers?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.volunteers?.map((volId, idx) => (
                    <span 
                      key={volId} 
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold tracking-tight text-slate-700 dark:text-slate-300 border border-slate-200/40"
                    >
                      👤 Volunteer #{idx + 1}
                    </span>
                  ))}
                  {(!report.volunteers || report.volunteers.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No volunteers yet. Be the first to join!</span>
                  )}
                </div>
              </div>
            </div>

            {/* GEOLOCATION MAP DETAIL */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Project Coordinate Area
              </p>
              <MapContainer 
                interactive={false} 
                zoom={14} 
                center={{ lat: report.latitude, lng: report.longitude }} 
                selectedLocation={{ lat: report.latitude, lng: report.longitude }}
                height="200px" 
              />
            </div>

            {/* SUBMIT PROJECT COMPLETION */}
            {isVolunteer && (report.status === 'In Progress' || report.status === 'Volunteers Joined' || report.status === 'Reported') && (
              <div className={`rounded-3xl border p-6 shadow-sm dark:bg-slate-900 space-y-4 transition ${
                isCompletionTooLarge 
                  ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                  : 'border-slate-200 bg-white dark:border-slate-850'
              }`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${isCompletionTooLarge ? 'text-red-500' : 'text-slate-400'}`}>
                  <Check className={isCompletionTooLarge ? 'text-red-500' : 'text-emerald-500'} size={16} />
                  <span>Submit Completion Details</span>
                </h4>
                
                <form onSubmit={handleCompleteProject} className="space-y-4">
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1.5 ${isCompletionTooLarge ? 'text-red-500' : 'text-slate-400'}`}>Upload Completion Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleCompletionImageChange(e.target.files[0])}
                      className={`text-xs w-full p-2 border rounded-xl ${isCompletionTooLarge ? 'border-red-500 text-red-500' : 'text-slate-500 border-slate-200 dark:border-slate-800'}`}
                    />
                    <p className={`text-[10px] mt-1.5 ${isCompletionTooLarge ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      Supported formats: JPG, JPEG, PNG, WEBP • Maximum size: 20 MB
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Completion Note</label>
                    <input 
                      type="text" 
                      value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      placeholder="Explain how the issue was resolved..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={completionSubmitting || !completionImage || isCompletionTooLarge}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {completionSubmitting ? 'Submitting...' : 'Mark Project Resolved'}
                  </button>
                </form>
              </div>
            )}

            {/* PEER VERIFICATION CONSENSUS */}
            {report.status === 'Completed' && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/10 p-6 shadow-sm dark:border-emerald-850 dark:bg-slate-900 space-y-4">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="animate-pulse" size={16} />
                  <span>Peer Resolution Voting</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The crew marked this project completed. Does the final image below confirm resolution? 3 positive votes verifies this project.
                </p>

                {report.completionPhotos?.[0] && (
                  <div className="rounded-2xl overflow-hidden shadow max-h-[160px] bg-slate-100">
                    <img src={report.completionPhotos[0]} alt="Resolution" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyCompletion(true)}
                    disabled={report.verifiersOfCompletion?.includes(user?.uid) || report.reporter?.uid === user?.uid}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    Yes, Verified
                  </button>
                  <button
                    onClick={() => handleVerifyCompletion(false)}
                    disabled={report.verifiersOfCompletion?.includes(user?.uid) || report.reporter?.uid === user?.uid}
                    className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    No, Flag incorrect
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold text-center mt-2">
                  Votes: {report.completionVerifications || 0}{" / "}3 approvals
                </div>
              </div>
            )}

          </div>

        </div>
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