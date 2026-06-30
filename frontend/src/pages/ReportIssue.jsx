import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import MapContainer from '../components/MapContainer';
import { toast } from '../components/NotificationToast';
import { motion } from 'framer-motion';
import { Upload, MapPin, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ReportIssue() {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  // Loading States
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFileTooLarge, setIsFileTooLarge] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);

  // Form Fields
  const [files, setFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [ward, setWard] = useState('Ward 6 - Downtown');
  const [volunteersNeeded, setVolunteersNeeded] = useState(3);
  const [tags, setTags] = useState('');

  // AI-Derived Categorization values (hidden from main simple inputs, filled in from backend response)
  const [aiCategory, setAiCategory] = useState('Others');
  const [aiSeverity, setAiSeverity] = useState('Medium');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');

  // Auto-detect GPS on load
  useEffect(() => {
    handleDetectGPS();
  }, []);

  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          const wardNum = (Math.floor(position.coords.latitude * 100) % 12) + 1;
          setWard(`Ward ${wardNum}`);
          toast.success("GPS Location detected!");
        },
        (error) => {
          console.warn("Geolocation permission denied, using city defaults.");
        }
      );
    }
  };

  const handleMapPin = (coords) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);
  };

  // Media selector
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      const file = selectedFiles[0];
      if (file.size > 20 * 1024 * 1024) {
        setIsFileTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
        setFiles(selectedFiles);
        setMediaPreview(selectedFiles.map(f => URL.createObjectURL(f)));
        return;
      }
    }
    setIsFileTooLarge(false);
    setFiles(selectedFiles);
    setMediaPreview(selectedFiles.map(f => URL.createObjectURL(f)));
  };

  // Generate Caption button (calls backend AI endpoint)
  const handleGenerateCaption = async () => {
    if (files.length === 0) {
      toast.error("Please upload an image first.");
      return;
    }
    try {
      setLoadingAI(true);
      const analysis = await api.analyzeImage(files[0], description || 'Analyzing incident image');
      
      // Update form fields based on backend response
      setCaption(analysis.summary || 'A local community issue requiring cleanup.');
      setAiCategory(analysis.category || 'Others');
      setAiSeverity(analysis.severity || 'Medium');
      setAiDifficulty(analysis.difficulty || 'Medium');
      
      if (analysis.estimatedVolunteers) {
        setVolunteersNeeded(analysis.estimatedVolunteers);
      }
      if (analysis.title && !title) {
        setTitle(analysis.title);
      }
      
      toast.success("AI Caption generated!");
    } catch (err) {
      toast.error("Failed to generate caption");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please upload an image first.");
      return;
    }
    if (!description) {
      toast.error("Please enter a description.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));

      // Construct project data
      const dataObj = {
        title: title || `Community Cleanup at ${ward}`,
        description,
        latitude,
        longitude,
        ward,
        category: aiCategory || 'Others',
        severity: aiSeverity || 'Medium',
        imageCaption: caption, // Store generated caption
        estimatedVolunteers: volunteersNeeded,
        difficulty: aiDifficulty || 'Medium',
        volunteers: [user.uid], // Initial volunteer
        status: 'Reported',
        reporter: {
          uid: user.uid,
          name: user.displayName,
          photoURL: user.photoURL
        },
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        checklist: [
          { id: 'chk-1', text: 'Gather volunteers at the site location', completed: false, completedBy: null },
          { id: 'chk-2', text: 'Distribute cleanup tools and equipment', completed: false, completedBy: null },
          { id: 'chk-3', text: 'Conduct cleanup and collect before/after photos', completed: false, completedBy: null },
          { id: 'chk-4', text: 'Deliver collected waste to recycling center', completed: false, completedBy: null }
        ],
        votes: 0,
        voters: [],
        verifications: 0,
        verifiers: [],
        trustScore: 50,
        comments: [],
        history: [
          {
            status: 'Reported',
            updatedBy: user.displayName,
            note: 'Issue reported, volunteers are invited to join.',
            timestamp: new Date().toISOString()
          }
        ]
      };

      formData.append('data', JSON.stringify(dataObj));
      await api.createReport(formData);
      try {
        await refreshUserProfile();
      } catch (e) {
        console.warn("Failed to refresh user profile:", e);
      }
      toast.success("Problem reported successfully! +20 Reputation");
      navigate('/problems');
    } catch (err) {
      if (err.message && (err.message.includes("limit of 20 MB") || err.message.includes("File too large"))) {
        setIsFileTooLarge(true);
        setShowSizeModal(true);
        toast.error("Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading.");
      } else {
        toast.error(err.message || "Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        
        {/* Back navigation */}
        <button
          onClick={() => navigate('/problems')}
          className="mb-6 inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Problems</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-850 dark:bg-slate-900 space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Report Neighborhood Problem</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add details and location to coordinate a community response with your neighbors.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. IMAGE UPLOAD BOX */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Image</label>
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition relative ${
                isFileTooLarge 
                  ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                  : 'border-slate-250 dark:border-slate-800 hover:border-primary-500'
              }`}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                {mediaPreview.length > 0 ? (
                  <div className="flex justify-center relative">
                    <img src={mediaPreview[0]} alt="Incident preview" className="h-44 rounded-xl object-cover" />
                    {isFileTooLarge && (
                      <div className="absolute inset-0 bg-red-500/10 rounded-xl flex items-center justify-center pointer-events-none" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload size={36} className="text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">Drag & drop photo here</p>
                  </div>
                )}
                <p className={`text-[11px] mt-2 font-semibold ${isFileTooLarge ? 'text-red-500' : 'text-slate-400'}`}>
                  Supported formats: JPG, JPEG, PNG, WEBP • Maximum size: 20 MB
                </p>
              </div>
            </div>

            {/* 2. GENERATE CAPTION */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">AI Generated Caption</label>
                <button
                  type="button"
                  onClick={handleGenerateCaption}
                  disabled={loadingAI || files.length === 0 || isFileTooLarge}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-xs font-bold transition disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Sparkles size={13} className={loadingAI ? 'animate-spin' : ''} />
                  <span>{loadingAI ? 'Generating...' : 'Generate Caption'}</span>
                </button>
              </div>

              <input 
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption will populate here. Feel free to edit..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium"
              />
            </div>

            {/* 3. SHORTER DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Short Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Local Alley Trash Pileup"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Volunteers</label>
                <input 
                  type="number" 
                  value={volunteersNeeded}
                  onChange={(e) => setVolunteersNeeded(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* 4. DESCRIPTION */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <textarea 
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide directions, estimated effort, details of what tools are needed..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* 5. GEOLOCATION MAP */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Pin Location on Map</label>
                <button 
                  type="button" 
                  onClick={handleDetectGPS}
                  className="flex items-center space-x-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <MapPin size={12} />
                  <span>Use current GPS location</span>
                </button>
              </div>
              
              <MapContainer 
                zoom={14} 
                interactive={true} 
                onPinSelect={handleMapPin}
                selectedLocation={{ lat: latitude, lng: longitude }}
                height="240px"
              />
              
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span>Lat: {latitude.toFixed(6)}</span>
                <span>Lng: {longitude.toFixed(6)}</span>
                <span>Assigned Ward: {ward}</span>
              </div>
            </div>

            {/* 6. TAGS */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags (Comma-separated)</label>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. cleanup, tools-needed, weekend"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* SUBMIT */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
              <button
                type="submit"
                disabled={submitting || isFileTooLarge}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-500/25 active:scale-98 transition duration-150 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>

          </form>

        </motion.div>
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
