import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function NotificationToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type = 'success', duration = 4000 } = e.detail;
      setToast({ message, type });

      // Auto dismiss
      const timer = setTimeout(() => {
        setToast(null);
      }, duration);

      return () => clearTimeout(timer);
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  if (!toast) return null;

  const bgColors = {
    success: 'bg-emerald-500 border-emerald-600 text-white',
    error: 'bg-red-500 border-red-600 text-white',
    warning: 'bg-amber-500 border-amber-600 text-white',
    info: 'bg-blue-500 border-blue-600 text-white'
  };

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertTriangle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex items-center space-x-3 rounded-2xl border px-4 py-3 shadow-2xl glass transition-all duration-300 animate-slide-up bg-slate-900 border-slate-800 text-white">
      <div className={`p-1.5 rounded-xl ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : toast.type === 'error' ? 'bg-red-500/20 text-red-400' : toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
        {icons[toast.type]}
      </div>
      <p className="text-sm font-semibold text-slate-100">{toast.message}</p>
      <button 
        onClick={() => setToast(null)}
        className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Global utility helper to trigger toasts
export const toast = {
  show(message, type = 'success') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  },
  success(message) {
    this.show(message, 'success');
  },
  error(message) {
    this.show(message, 'error');
  },
  warn(message) {
    this.show(message, 'warning');
  },
  info(message) {
    this.show(message, 'info');
  }
};
