
import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3s
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-up">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl backdrop-blur-md border ${
        type === 'success' 
          ? 'bg-white/90 dark:bg-slate-800/90 border-green-500/30 text-slate-800 dark:text-white' 
          : 'bg-white/90 dark:bg-slate-800/90 border-red-500/30 text-slate-800 dark:text-white'
      }`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${
           type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {type === 'success' ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
        </div>
        
        <div className="flex flex-col">
          <span className="font-bold text-sm">{type === 'success' ? 'Berhasil!' : 'Gagal'}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{message}</span>
        </div>

        <button onClick={onClose} className="ml-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
