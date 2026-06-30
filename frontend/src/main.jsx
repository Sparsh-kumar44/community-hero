import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationToast from './components/NotificationToast';

// Import Pages
import LandingPage from './pages/LandingPage';
import Problems from './pages/Problems';
import ReportIssue from './pages/ReportIssue';
import IssueDetails from './pages/IssueDetails';
import Leaderboard from './pages/Leaderboard';
import Account from './pages/Account';

import './index.css';

// Guard for authenticated pages
function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-250 relative">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          {/* Protected Routes */}
          <Route path="/account" element={<AuthGuard><Account /></AuthGuard>} />
          <Route path="/report" element={<AuthGuard><ReportIssue /></AuthGuard>} />
          <Route path="/problems/:id" element={<AuthGuard><IssueDetails /></AuthGuard>} />
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <NotificationToast />

      {/* Floating action button visible everywhere for logged-in users */}
      {user && (
        <Link
          to="/report"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 duration-200"
          title="Report a Problem"
        >
          <span className="text-3xl font-light leading-none">+</span>
        </Link>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
