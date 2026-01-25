import React, { useState, useEffect } from 'react';
import { User, Lock, Loader2, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { Toast } from './Toast';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (u: string, p: string) => boolean | Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  // Connection Status State
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Animation States
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false, message: '', type: 'success'
  });

  // Check Server Status on Mount
  useEffect(() => {
    const checkServer = async () => {
      setServerStatus('checking');
      const isOnline = await api.checkConnection();
      setServerStatus(isOnline ? 'online' : 'offline');
      if (!isOnline) {
         setToast({ show: true, message: 'Gagal terhubung ke Server Backend (VPS).', type: 'error' });
      }
    };
    checkServer();
  }, []);

  const handleLoginProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (serverStatus === 'offline') {
        setToast({ show: true, message: 'Server Offline. Cek koneksi VPS.', type: 'error' });
        return;
    }

    if (!username || !password) {
      setToast({ show: true, message: 'Mohon isi Username dan Password', type: 'error' });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    // Simulate Network/Verification Process
    const duration = 2000; 
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        finalizeLogin();
      }
    }, intervalTime);
  };

  const finalizeLogin = async () => {
    let isValid = false;
    try {
      const user = await api.login(username, password);
      if (user) isValid = true;
    } catch (error) {
      console.error("Login check failed", error);
      isValid = false;
    }

    if (isValid) {
       // SUCCESS FLOW
       setProgress(100);
       setToast({ show: true, message: 'Login Berhasil! Mengalihkan ke Dashboard...', type: 'success' });
       
       setTimeout(() => {
         onLogin(username, password); 
       }, 1500);
    } else {
       // ERROR FLOW
       setIsLoading(false);
       setProgress(0);
       setError(true);
       setToast({ show: true, message: 'Username atau Password salah!', type: 'error' });
       setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#071e26] flex items-center justify-center p-4 relative overflow-hidden">
      
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />

      {/* Background gradient effect to match depth */}
      <div className="w-full max-w-sm flex flex-col items-center relative z-10">
        
        <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-2xl border border-white/20 animate-fade-in-up">
               <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-widest uppercase text-center drop-shadow-lg">
            SmartInventory
            </h1>
            <p className="text-slate-400 text-xs tracking-widest mt-2 uppercase">Secure Access Portal</p>
        </div>

        {/* Server Status Indicator */}
        <div className={`mb-6 px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-semibold transition-all ${
            serverStatus === 'online' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 
            serverStatus === 'offline' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 
            'bg-slate-500/20 border-slate-500/50 text-slate-300'
        }`}>
            {serverStatus === 'online' && <Wifi size={14} />}
            {serverStatus === 'offline' && <WifiOff size={14} />}
            {serverStatus === 'checking' && <Loader2 size={14} className="animate-spin" />}
            
            <span>
                {serverStatus === 'online' ? 'Server Connected' : 
                 serverStatus === 'offline' ? 'Server Unreachable' : 
                 'Connecting to Backend...'}
            </span>
        </div>

        <form onSubmit={handleLoginProcess} className={`w-full space-y-6 transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
          
          {/* Username Field - Icon Left */}
          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg transition-transform group-focus-within:scale-110">
               <User size={24} className="text-slate-800" />
            </div>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              disabled={isLoading}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-white/10 text-white placeholder-slate-400 pl-16 pr-6 rounded-full border border-white/10 focus:border-white/50 focus:bg-white/20 transition-all shadow-inner outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Field - Icon Right */}
          <div className="relative group">
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/10 text-white placeholder-slate-400 pl-6 pr-16 rounded-full border border-white/10 focus:border-white/50 focus:bg-white/20 transition-all shadow-inner outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
             <div className="absolute right-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg transition-transform group-focus-within:scale-110">
               <Lock size={24} className="text-slate-800" />
            </div>
          </div>

          {/* LOGIN BUTTON OR PROGRESS BAR */}
          <div className="h-14 relative">
            {isLoading ? (
               <div className="w-full h-full flex flex-col justify-center animate-fade-in">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-teal-300 mb-1.5 px-2">
                     <span className="flex items-center gap-1">
                        {progress === 100 ? <CheckCircle2 size={10}/> : <Loader2 size={10} className="animate-spin"/>}
                        {progress === 100 ? 'Verified' : 'Verifying Credentials...'}
                     </span>
                     <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900/50 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm relative">
                     {/* Animated Gradient Bar */}
                     <div 
                        className="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-75 ease-out relative"
                        style={{ width: `${progress}%` }}
                     >
                        <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                     </div>
                  </div>
               </div>
            ) : (
               <button 
                  type="submit"
                  className="w-full h-12 bg-white text-slate-900 font-bold text-lg rounded-full hover:bg-slate-200 hover:scale-[1.02] active:scale-95 transition-all shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 group"
               >
                  Login <span className="group-hover:translate-x-1 transition-transform">→</span>
               </button>
            )}
          </div>

        </form>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
    </div>
  );
};