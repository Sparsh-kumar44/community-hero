import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/NotificationToast';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Shield, CheckCircle, Clock, AlertCircle, Eye, RefreshCw, Send, Check } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter settings
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Status updating modal states
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('Reported');
  const [timelineNote, setTimelineNote] = useState('');
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const reportsList = await api.getReports();
      setReports(reportsList);

      const statsData = await api.getAnalytics();
      setAnalytics(statsData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load administration dataset.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      setUpdating(true);

      if (statusUpdate === 'Resolved') {
        if (!afterImageFile) {
          toast.error("A resolution (after) photo is required to mark the report as resolved.");
          setUpdating(false);
          return;
        }
        const formData = new FormData();
        formData.append('afterImage', afterImageFile);
        formData.append('note', timelineNote || "Issue resolved and repairs completed.");
        formData.append('updatedBy', user.displayName);

        await api.resolveReport(selectedReport.id, formData);
        toast.success("Civic complaint resolved successfully!");
      } else {
        await api.updateReportStatus(selectedReport.id, {
          status: statusUpdate,
          note: timelineNote || `Status updated to ${statusUpdate}.`,
          updatedBy: user.displayName
        });
        toast.success(`Report status updated to ${statusUpdate}.`);
      }

      setSelectedReport(null);
      setTimelineNote('');
      setAfterImageFile(null);
      fetchAdminData(); // Refresh lists
    } catch (err) {
      toast.error("Status transition failed.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Reported': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Verified': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Assigned': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'In Progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || r.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
            <Shield className="mr-2 text-amber-500" />
            Municipal Management Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official municipal oversight panel for processing infrastructure reports, assigning departments, and resolving citizen complaints.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* 1. KEY PERFORMANCE METRICS */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports</p>
                  <h3 className="text-2xl font-black mt-2">{analytics.summary.totalReports}</h3>
                </div>
                <AlertCircle size={28} className="text-primary-500" />
              </div>

              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Complaints</p>
                  <h3 className="text-2xl font-black mt-2 text-amber-500">{analytics.summary.pendingReports}</h3>
                </div>
                <Clock size={28} className="text-amber-500" />
              </div>

              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved Tickets</p>
                  <h3 className="text-2xl font-black mt-2 text-emerald-500">{analytics.summary.resolvedReports}</h3>
                </div>
                <CheckCircle size={28} className="text-emerald-500" />
              </div>

              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Repair Time</p>
                  <h3 className="text-2xl font-black mt-2 text-indigo-500">{analytics.summary.averageResolutionDays} days</h3>
                </div>
                <RefreshCw size={28} className="text-indigo-500" />
              </div>
            </div>
          )}

          {/* 2. ANALYTICS CHARTS ROWS */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Pie: Category Distribution */}
              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-4">Category Distribution</h4>
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
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }}
                  />
                </div>
              </div>

              {/* Bar: Ward Stats */}
              <div className="bg-white border p-6 rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-4">Ward-wise Load & Performance</h4>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: analytics.wardStats.map(w => w.name),
                      datasets: [
                        {
                          label: 'Total Reports',
                          data: analytics.wardStats.map(w => w.total),
                          backgroundColor: '#6366f1'
                        },
                        {
                          label: 'Resolved Reports',
                          data: analytics.wardStats.map(w => w.resolved),
                          backgroundColor: '#16a34a'
                        }
                      ]
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. REPORT LIST DATA-TABLE */}
          <div className="bg-white border rounded-3xl dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Filters Header bar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints by title, ward, keyword..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-xs focus:outline-none"
              />
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl border border-slate-250 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="Roads & Potholes">Roads & Potholes</option>
                  <option value="Sanitation & Garbage">Sanitation & Garbage</option>
                  <option value="Water & Sewage">Water & Sewage</option>
                  <option value="Streetlights">Streetlights</option>
                  <option value="Others">Others</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-slate-250 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="Verified">Verified</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="py-4 px-6">Incident Title</th>
                    <th className="py-4 px-6">Ward</th>
                    <th className="py-4 px-6">Assigned Department</th>
                    <th className="py-4 px-6 text-center">Severity</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">No civic reports found matching filters.</td>
                    </tr>
                  ) : (
                    filteredReports.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <img src={report.imageUrls[0]} alt="" className="h-10 w-10 rounded-xl object-cover" />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-snug">{report.title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{report.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-650 dark:text-slate-350">{report.ward}</td>
                        <td className="py-4 px-6 text-slate-500">{report.aiAnalysis?.department || 'Unassigned'}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${report.severity === 'Critical' ? 'bg-red-100 text-red-700' : report.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                            {report.severity}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5">
                          <Link 
                            to={`/reports/${report.id}`}
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 text-slate-500 dark:text-slate-300"
                            title="Inspect details"
                          >
                            <Eye size={14} />
                          </Link>
                          {report.status !== 'Resolved' && (
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setStatusUpdate(report.status);
                              }}
                              className="inline-flex items-center space-x-1 rounded-xl bg-primary-600 hover:bg-primary-750 text-white px-3 py-2 font-bold"
                            >
                              <Check size={12} />
                              <span>Update</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* 4. UPDATE STATUS SIDE-PANEL / MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-150 dark:border-slate-800 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">Update Incident Status</h3>
            <p className="text-xs text-slate-400 mb-6">Report: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedReport.title}</span></p>

            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Transition Stage</label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-xs focus:outline-none"
                >
                  <option value="Reported">Reported</option>
                  <option value="Verified">Verified</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved (Close Complaint)</option>
                </select>
              </div>

              {statusUpdate === 'Resolved' && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Resolution Picture (After)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setAfterImageFile(e.target.files[0])}
                    className="w-full text-xs"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Upload proof of work completion to draw slider comparison.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Timeline Note</label>
                <textarea 
                  rows={3}
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  placeholder="e.g. Work crew scheduled for Tuesday repair. Road closure signboards deployed."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-xs focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 rounded-xl border hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-750 text-white py-2.5 text-xs font-bold shadow disabled:opacity-50"
                >
                  {updating ? 'Processing...' : 'Apply Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
