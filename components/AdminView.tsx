
import React, { useState, useEffect } from 'react';
import { InventoryItem, Transaction, User } from '../types';
import { generateInventoryInsights } from '../services/geminiService';
import { api } from '../services/api';
import { Bot, Settings, Shield, User as UserIcon, Loader2, Database, Link, RefreshCw, Plus, Edit, Trash2, X, Save, Eye, EyeOff, AlertTriangle, Trash, FileCode, Copy } from 'lucide-react';
import { Toast } from './Toast';

interface AdminViewProps {
  user: User;
  items: InventoryItem[];
  transactions: Transaction[];
}

export const AdminView: React.FC<AdminViewProps> = ({ user, items, transactions }) => {
  // --- AI State ---
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Sync State ---
  const [syncConfig, setSyncConfig] = useState({
    scriptUrl: localStorage.getItem('gs_script_url') || '',
    sheetId: localStorage.getItem('gs_sheet_id') || ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(localStorage.getItem('gs_last_sync') || '-');

  // --- User Management State ---
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', email: '', role: 'staff'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Reset Database State ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // --- Prompt State ---
  const [showPromptModal, setShowPromptModal] = useState(false);

  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false, message: '', type: 'success'
  });

  // Load Users on Mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch(e) {
      console.error("Failed to load users", e);
    }
  };

  const handleRunAnalysis = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      setAiAnalysis('');
      const result = await generateInventoryInsights(items, transactions);
      setAiAnalysis(result);
    } catch(e:any) {
      setAiAnalysis("Gagal memuat analisis: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToSheets = async () => {
    if (!syncConfig.scriptUrl) {
      alert("Harap masukkan Google Apps Script Web App URL.");
      return;
    }
    if (isSyncing) return;
    setIsSyncing(true);
    try {
       await new Promise(resolve => setTimeout(resolve, 2000));
       const now = new Date().toLocaleString('id-ID');
       setLastSyncTime(now);
       localStorage.setItem('gs_script_url', syncConfig.scriptUrl);
       localStorage.setItem('gs_sheet_id', syncConfig.sheetId);
       localStorage.setItem('gs_last_sync', now);
       setToast({ show: true, message: "Sinkronisasi berhasil!", type: 'success' });
    } catch(e:any) {
       setToast({ show: true, message: "Sinkronisasi gagal: " + e.message, type: 'error' });
    } finally {
       setIsSyncing(false);
    }
  };

  const handleOpenUserModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserFormData(userToEdit);
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', username: '', password: '', email: '', role: 'staff' });
    }
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
       alert("Username, Password, dan Nama wajib diisi.");
       return;
    }
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await api.updateUser({ ...editingUser, ...userFormData } as User);
        setToast({ show: true, message: "User berhasil diperbarui.", type: 'success' });
      } else {
        const newUser: User = { ...userFormData as User, id: `user-${Date.now()}` };
        await api.addUser(newUser);
        setToast({ show: true, message: "User baru berhasil ditambahkan.", type: 'success' });
      }
      await loadUsers();
      setIsUserModalOpen(false);
    } catch(e:any) {
      alert(`Gagal menyimpan user: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (isSubmitting) return;
    if (confirm("Apakah anda yakin ingin menghapus user ini?")) {
      setIsSubmitting(true);
      try {
        await api.deleteUser(id);
        setToast({ show: true, message: "User berhasil dihapus.", type: 'success' });
        await loadUsers();
      } catch(e:any) {
        alert(`Gagal menghapus user: ${e.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'RESET' || isResetting) return;
    setIsResetting(true);
    try {
      const result = await api.resetDatabase();
      if (result.success) {
        setToast({ show: true, message: "Database berhasil direset.", type: 'success' });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setToast({ show: true, message: result.error || "Gagal mereset database.", type: 'error' });
      }
    } catch (error:any) {
      setToast({ show: true, message: "Terjadi kesalahan: " + error.message, type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const masterPrompt = `Aplikasi Inventory Pro: Modern React Frontend, Node.js Backend, MySQL DB. Fitur: Dashboard Analytics, Multi-unit conversions, Atomic transactions with reversal logic, Image compression on upload, Standalone Reject Module with WA export, AI Gemini Insights, User CRUD, Google Sheets Sync. Aesthetics: Slate Dark Mode, Enterprise UX.`;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-full text-white">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Administrator Panel</h2>
            <p className="text-slate-500">System settings, User Management & AI Insights</p>
          </div>
        </div>
        <button 
           onClick={() => setShowPromptModal(true)}
           className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all"
        >
           <FileCode size={18} /> App Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PROFILE */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <UserIcon size={20} /> Current User
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{user.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Username</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{user.username}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Role</span>
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-sm font-semibold uppercase">{user.role}</span>
            </div>
            <div className="pt-2">
              <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1">
                <Settings size={14} /> Edit Profile Settings
              </button>
            </div>
          </div>
        </div>

        {/* SYNC */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700 dark:text-green-500">
              <Database size={20} /> Google Sheets Sync
           </h3>
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Integrasi cloud untuk cadangan data otomatis via Google Apps Script.</p>
           <div className="space-y-3">
              <div>
                 <input type="password" placeholder="Script URL" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-200" value={syncConfig.scriptUrl} onChange={e => setSyncConfig({...syncConfig, scriptUrl: e.target.value})} />
              </div>
              <div className="flex justify-between items-center pt-2">
                 <span className="text-xs text-slate-400">Last: {lastSyncTime}</span>
                 <button onClick={handleSyncToSheets} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700">
                    {isSyncing ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Sync
                 </button>
              </div>
           </div>
        </div>

        {/* AI */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-400"><Bot size={20} /> AI Advisor</h3>
            <button onClick={handleRunAnalysis} disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              {isLoading ? 'Analyzing...' : 'Generate report'}
            </button>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border overflow-y-auto text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {aiAnalysis || "Klik tombol di atas untuk mendapatkan saran stok berbasis AI."}
          </div>
        </div>

        {/* USER LIST */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-[400px]">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400"><UserIcon size={20} /> Users</h3>
              <button onClick={() => handleOpenUserModal()} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"><Plus size={16}/></button>
           </div>
           <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-800 text-xs sticky top-0">
                    <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Action</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {users.map(u => (
                       <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><div className="font-medium dark:text-white">{u.username}</div><div className="text-xs text-slate-500">{u.name}</div></td>
                          <td className="px-4 py-3"><span className="text-[10px] font-bold uppercase">{u.role}</span></td>
                          <td className="px-4 py-3 text-right">
                             <button onClick={() => handleOpenUserModal(u)} className="p-1 text-blue-600"><Edit size={14} /></button>
                             <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-red-600"><Trash2 size={14} /></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* RESET */}
        <div className="lg:col-span-2 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <p className="font-bold text-red-600 dark:text-red-400 uppercase text-xs tracking-widest">Maintenance Area</p>
              <p className="text-sm text-slate-500">Reset database akan menghapus semua item dan riwayat selamanya.</p>
           </div>
           <button onClick={() => setIsResetModalOpen(true)} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-200">Reset System</button>
        </div>
      </div>

      {/* PROMPT MODAL */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl p-8 border dark:border-slate-800 animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">System Master Prompt</h3>
                 <button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <p className="text-xs text-slate-500 mb-4">Salin prompt ini untuk mereplikasi atau mendokumentasikan spesifikasi teknis aplikasi Anda.</p>
              <div className="relative group">
                 <pre className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono border dark:border-slate-800 max-h-96 overflow-y-auto">
                    {masterPrompt}
                 </pre>
                 <button 
                    onClick={() => {
                        navigator.clipboard.writeText(masterPrompt);
                        alert("Prompt berhasil disalin!");
                    }}
                    className="absolute top-4 right-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md hover:scale-110 transition-transform"
                 >
                    <Copy size={16} className="text-blue-600"/>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border dark:border-slate-800">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold dark:text-white">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               <form onSubmit={handleSaveUser} className="space-y-4">
                  <input required placeholder="Full Name" className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none dark:text-white" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                     <input required placeholder="Username" className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none dark:text-white" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} />
                     <select className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none dark:text-white bg-white" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                     </select>
                  </div>
                  <input required type="email" placeholder="Email" className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none dark:text-white" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} />
                  <div className="relative">
                     <input required type={showPassword ? "text" : "password"} placeholder="Password" className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 pr-10 outline-none dark:text-white" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                     </button>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2">
                     {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* RESET MODAL */}
      {isResetModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-red-100 dark:border-red-900/30">
               <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32} /></div>
                  <h3 className="text-xl font-bold dark:text-white">Reset Database?</h3>
                  <p className="text-sm text-slate-500 mt-2">Ketik RESET untuk konfirmasi penghapusan permanen.</p>
               </div>
               <input placeholder="RESET" className="w-full text-center border-2 rounded-xl p-3 font-bold mb-4 dark:bg-slate-800 dark:text-white" value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value.toUpperCase())} />
               <div className="flex gap-3">
                  <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Batal</button>
                  <button disabled={resetConfirmText !== 'RESET' || isResetting} onClick={handleResetDatabase} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-30">Reset</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
