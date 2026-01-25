
import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError(true);
      // Reset error animation after a bit
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#071e26] flex items-center justify-center p-4">
      {/* Background gradient effect to match depth */}
      <div className="w-full max-w-sm flex flex-col items-center">
        
        <h1 className="text-3xl font-bold text-white mb-10 tracking-widest uppercase text-center">
          User Login
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          
          {/* Username Field - Icon Left */}
          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg">
               <User size={24} className="text-slate-800" />
            </div>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-white/20 text-white placeholder-slate-400 pl-16 pr-6 rounded-full border-none focus:ring-0 focus:bg-white/30 transition-all shadow-inner outline-none"
            />
          </div>

          {/* Password Field - Icon Right */}
          <div className="relative group">
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/20 text-white placeholder-slate-400 pl-6 pr-16 rounded-full border-none focus:ring-0 focus:bg-white/30 transition-all shadow-inner outline-none"
            />
             <div className="absolute right-0 top-0 bottom-0 w-12 h-12 bg-white rounded-full flex items-center justify-center z-10 shadow-lg">
               <Lock size={24} className="text-slate-800" />
            </div>
          </div>

          {/* Error Message Placeholder */}
          <div className="h-6 flex items-center justify-center">
             {error && (
               <span className="text-red-400 text-sm font-medium animate-bounce">
                 Username atau Password salah!
               </span>
             )}
          </div>

          {/* Login Button */}
          <button 
            type="button"
            onClick={handleSubmit} 
            className="w-full h-12 bg-white text-slate-900 font-bold text-lg rounded-full hover:bg-slate-200 active:scale-95 transition-all shadow-lg uppercase tracking-wider"
          >
            Login
          </button>

        </form>
      </div>
    </div>
  );
};
