import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export type ToastType = 'success' | 'error' | 'info' | 'coming_soon';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  comingSoon: (featureName: string, detail?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((title: string, description?: string) => {
    showToast('success', title, description);
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    showToast('error', title, description);
  }, [showToast]);

  const info = useCallback((title: string, description?: string) => {
    showToast('info', title, description);
  }, [showToast]);

  const comingSoon = useCallback((featureName: string, detail?: string) => {
    showToast(
      'coming_soon',
      `${featureName} — In Development`,
      detail || 'This capability is slated for the upcoming EverFest Pro release. Check back soon!'
    );
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, info, comingSoon, removeToast }}>
      {children}

      {/* Accessible Toast Container */}
      <div 
        aria-live="polite" 
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto p-4 rounded-xl border shadow-elevated backdrop-blur-md transition-all duration-300 flex items-start gap-3 animate-slide-up',
              toast.type === 'success' && 'bg-white/95 border-emerald-200 text-slate-900',
              toast.type === 'error' && 'bg-white/95 border-rose-200 text-slate-900',
              toast.type === 'info' && 'bg-white/95 border-plum-200 text-slate-900',
              toast.type === 'coming_soon' && 'bg-ivory-50/95 border-gold-300/80 text-slate-900 ring-1 ring-gold-400/20'
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-plum-700" />}
              {toast.type === 'coming_soon' && (
                <div className="w-5 h-5 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
                  <Sparkles className="w-3.5 h-3.5 fill-gold-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pr-2">
              <h5 className="text-xs font-bold font-serif text-slate-900 tracking-tight">
                {toast.title}
              </h5>
              {toast.description && (
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
