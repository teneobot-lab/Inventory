import React, { useEffect, useState, useRef } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success', duration = 3000 }) => {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated to avoid resetting timer on parent re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      setProgress(100);
      
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      // Timer for closing
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, duration);

      // Interval for progress bar smoothness
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now;
        const percentage = Math.max(0, (remaining / duration) * 100);
        
        setProgress(percentage);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 16); // ~60fps for smooth animation

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isVisible, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-up">
      <div className={`relative flex items-center gap-4 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border overflow-hidden min-w-[320px] max-w-md ${
        type === 'success' 
          ? 'bg-white/95 dark:bg-slate-800/95 border-green-500/20 shadow-green-900/10' 
          : 'bg-white/95 dark:bg-slate-800/95 border-red-500/20 shadow-red-900/10'
      }`}>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700">
           <div 
             className={`h-full transition-all duration-75 ease-linear ${type === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
             style={{ width: `${progress}%` }}
           />
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
           type === 'success' 
             ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' 
             : 'bg-gradient-to-br from-red-400 to-red-600 text-white'
        }`}>
          {type === 'success' ? <Check size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col pr-8">
          <h4 className={`text-sm font-bold ${
            type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}>
            {type === 'success' ? 'Berhasil Disimpan' : 'Terjadi Kesalahan'}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-0.5">
            {message}
          </p>
        </div>

        {/* Close Button (Optional but good UX) */}
        <button 
          onClick={() => onCloseRef.current()} 
          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};