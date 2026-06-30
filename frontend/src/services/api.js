/**
 * Frontend API Service Layer
 */

export const api = {
  // --- REPORTS API ---
  async getReports() {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getReport(id) {
    const res = await fetch(`/api/reports/${id}`);
    if (!res.ok) throw new Error('Failed to fetch report details');
    return res.json();
  },

  async checkDuplicates(params) {
    const res = await fetch('/api/reports/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed duplicate checks');
    return res.json();
  },

  async createReport(formData) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      body: formData // contains file binaries + json metadata string
    });
    if (!res.ok) throw new Error('Failed to submit report');
    return res.json();
  },

  async upvoteReport(id, userId) {
    const res = await fetch(`/api/reports/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to upvote report');
    return res.json();
  },

  async verifyReport(id, userId) {
    const res = await fetch(`/api/reports/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to verify report');
    return res.json();
  },

  async addComment(id, user, text) {
    const res = await fetch(`/api/reports/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, text })
    });
    if (!res.ok) throw new Error('Failed to post comment');
    return res.json();
  },

  async updateReportStatus(id, statusData) {
    const res = await fetch(`/api/reports/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData)
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async resolveReport(id, formData) {
    const res = await fetch(`/api/reports/${id}/resolve`, {
      method: 'POST',
      body: formData // contains resolved afterImage binary + note
    });
    if (!res.ok) throw new Error('Failed to resolve report');
    return res.json();
  },

  async volunteerForProject(id, userId, action = 'join') {
    const res = await fetch(`/api/reports/${id}/volunteer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action })
    });
    if (!res.ok) throw new Error('Failed to volunteer for project');
    return res.json();
  },

  async updateChecklist(id, checklistId, completed, userId) {
    const res = await fetch(`/api/reports/${id}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistId, completed, userId })
    });
    if (!res.ok) throw new Error('Failed to update checklist task');
    return res.json();
  },

  async uploadProgressPhoto(id, imageFile, userId) {
    const formData = new FormData();
    formData.append('progressImage', imageFile);
    formData.append('userId', userId);

    const res = await fetch(`/api/reports/${id}/progress-photo`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload progress photo');
    return res.json();
  },

  async completeProject(id, completionImageFile, note, userId) {
    const formData = new FormData();
    formData.append('completionImage', completionImageFile);
    formData.append('note', note);
    formData.append('userId', userId);

    const res = await fetch(`/api/reports/${id}/complete`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to submit project completion');
    return res.json();
  },

  async verifyProjectCompletion(id, userId, isGenuine) {
    const res = await fetch(`/api/reports/${id}/verify-completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isGenuine })
    });
    if (!res.ok) throw new Error('Failed to verify project completion');
    return res.json();
  },

  // --- STATS / ANALYTICS API ---
  async getAnalytics() {
    const res = await fetch('/api/stats/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getLeaderboard(time = 'allTime', neighborhood = 'All') {
    const res = await fetch(`/api/stats/leaderboard?time=${time}&neighborhood=${neighborhood}`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  // --- AI API ---
  async analyzeImage(imageFile, description = '') {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('description', description);

    const res = await fetch('/api/ai/analyze-image', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('AI analysis failed');
    return res.json();
  },

  async sendChatMessage(message, history = []) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    if (!res.ok) throw new Error('AI assistant failed');
    return res.json();
  },

  async parseVoiceReport(transcript) {
    const res = await fetch('/api/ai/speech-to-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
    if (!res.ok) throw new Error('AI speech parser failed');
    return res.json();
  },

  async getPredictiveInsights() {
    const res = await fetch('/api/ai/predictive-insights');
    if (!res.ok) throw new Error('Failed to fetch predictive insights');
    return res.json();
  },

  async updateReportData(id, data, userId) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data })
    });
    if (!res.ok) throw new Error('Failed to update report');
    return res.json();
  },

  async deleteReport(id, userId) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to delete report');
    return res.json();
  },

  async editComment(reportId, commentId, text, userId) {
    const res = await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userId })
    });
    if (!res.ok) throw new Error('Failed to edit comment');
    return res.json();
  },

  async deleteComment(reportId, commentId, userId) {
    const res = await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to delete comment');
    return res.json();
  },

  async toggleLikeComment(reportId, commentId, userId) {
    const res = await fetch(`/api/reports/${reportId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to toggle like on comment');
    return res.json();
  },

  async addReply(reportId, commentId, user, text) {
    const res = await fetch(`/api/reports/${reportId}/comments/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, text })
    });
    if (!res.ok) throw new Error('Failed to post reply');
    return res.json();
  },

  async getNotifications(userId) {
    const res = await fetch(`/api/reports/notifications/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`/api/reports/notifications/${id}/read`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  async updateUserProfile(formData) {
    const res = await fetch('/api/reports/profile', {
      method: 'POST',
      body: formData // multipart/form-data for avatar upload
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async syncUser(userData) {
    const res = await fetch('/api/reports/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync user');
    }
    return res.json();
  },

  async getUserStats(uid) {
    const res = await fetch(`/api/stats/user/${uid}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user stats');
    }
    return res.json();
  }
};

/**
 * Speech Recognition Wrapper for browsers
 */
export class SpeechService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  isSupported() {
    return !!this.recognition;
  }

  startListening(onResult, onError, onEnd) {
    if (!this.recognition) return onError('Speech recognition not supported in this browser.');

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      onError(e.message);
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}
