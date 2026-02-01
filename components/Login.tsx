
import React, { useState, useEffect } from 'react';
import { User, Lock, Loader2, CheckCircle2, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Toast } from './Toast';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (u: string, p: string) => boolean | Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbStatus, setDbStatus] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false, message: '', type: 'success'
  });

  const checkServer = async () => {
    setServerStatus('checking');
    try {
      const status = await api.checkConnection();
      setServerStatus(status.online ? 'online' : 'offline');
      setDbStatus(status.db);
      
      if (!status.online) {
         setToast({ show: true, message: 'Server API tidak merespons. Pastikan backend menyala.', type: 'error' });
      } else if (!status.db) {
         setToast({ show: true, message: 'API Online, tapi gagal terhubung ke Database MySQL.', type: 'error' });
      }
    } catch (e) {
      setServerStatus('offline');
      setToast({ show: true, message: 'Gagal menghubungi server.', type: 'error' });
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  const handleLoginProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (!username || !password) {
      setToast({ show: true, message: 'Mohon isi Username dan Password', type: 'error' });
      return;
    }

    setIsLoading(true);
    setProgress(10); // Mulai progress
    
    try {
      // 1. Cek Kredensial via API
      setProgress(40);
      const user = await api.login(username.trim(), password);
      
      if (user) {
        // 2. Simulasi visual progress untuk UX
        setProgress(70);
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(100);
        
        setToast({ show: true, message: 'Login Berhasil! Mengalihkan...', type: 'success' });
        
        // 3. Callback ke App parent
        setTimeout(() => onLogin(username, password), 500);
      } else {
        throw new Error("Kredensial salah.");
      }
    } catch (err: any) {
       setIsLoading(false);
       setProgress(0);
       setError(true);
       setToast({ 
         show: true, 
         message: err.message || 'Login gagal. Cek kembali koneksi & kredensial.', 
         type: 'error' 
       });
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

      <div className="w-full max-w-sm flex flex-col items-center relative z-10">
        
        <div className="mb-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-2xl border border-white/20">
               <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-widest uppercase drop-shadow-lg">
              SmartInventory
            </h1>
            <p className="text-slate-400 text-xs tracking-widest mt-2 uppercase font-medium">Secure Access Portal</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
              serverStatus === 'online' ? (dbStatus ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300') : 
              serverStatus === 'offline' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 
              'bg-slate-500/20 border-slate-500/50 text-slate-300'
          }`}>
              {serverStatus === 'online' && (dbStatus ? <Wifi size={14} /> : <AlertCircle size={14} />)}
              {serverStatus === 'offline' && <WifiOff size={14} />}
              {serverStatus === 'checking' && <Loader2 size={14} className="animate-spin" />}
              
              <span>
                  {serverStatus === 'online' ? (dbStatus ? 'System Online' : 'DB Connection Error') : 
                   serverStatus === 'offline' ? 'Server Unreachable' : 
                   'Checking Status...'}
              </span>
          </div>
          
          <button 
            type="button"
            onClick={checkServer}
            disabled={serverStatus === 'checking'}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Cek Ulang Status"
          >
            <RefreshCw size={14} className={serverStatus === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>

        <form onSubmit={handleLoginProcess} className={`w-full space-y-6 transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
          
          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg transition-transform group-focus-within:scale-105">
               <User size={20} className="text-slate-800" />
            </div>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              disabled={isLoading}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-white/10 text-white placeholder-slate-400 pl-16 pr-6 rounded-full border border-white/10 focus:border-white/50 focus:bg-white/20 transition-all shadow-inner outline-none disabled:opacity-50"
            />
          </div>

          <div className="relative group">
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/10 text-white placeholder-slate-400 pl-6 pr-16 rounded-full border border-white/10 focus:border-white/50 focus:bg-white/20 transition-all shadow-inner outline-none disabled:opacity-50"
            />
             <div className="absolute right-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg transition-transform group-focus-within:scale-105">
               <Lock size={20} className="text-slate-800" />
            </div>
          </div>

          <div className="h-14 relative">
            {isLoading ? (
               <div className="w-full h-full flex flex-col justify-center animate-fade-in">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-teal-300 mb-1.5 px-2">
                     <span className="flex items-center gap-1">
                        {progress === 100 ? <CheckCircle2 size={10}/> : <Loader2 size={10} className="animate-spin"/>}
                        {progress === 100 ? 'Verified' : 'Authorizing...'}
                     </span>
                     <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden border border-white/10">
                     <div 
                        className="h-full bg-gradient-to-r from-teal-400 to-blue-500 shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-75 ease-out"
                        style={{ width: `${progress}%` }}
                     />
                  </div>
               </div>
            ) : (
               <button 
                  type="submit"
                  disabled={serverStatus === 'checking'}
                  className="w-full h-12 bg-white text-slate-900 font-bold text-sm rounded-full hover:bg-slate-200 hover:scale-[1.02] active:scale-95 transition-all shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 group disabled:opacity-50"
               >
                  Sign In <span className="group-hover:translate-x-1 transition-transform">→</span>
               </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
