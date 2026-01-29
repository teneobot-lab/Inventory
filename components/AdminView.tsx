
import React, { useState, useEffect } from 'react';
import { InventoryItem, Transaction, User } from '../types';
import { generateInventoryInsights } from '../services/geminiService';
import { api } from '../services/api';
import { Bot, Settings, Shield, User as UserIcon, Loader2, Database, Link, RefreshCw, Plus, Edit, Trash2, X, Save, Eye, EyeOff, AlertTriangle, Trash } from 'lucide-react';
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

  // --- Reset Database State ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false, message: '', type: 'success'
  });

  // Load Users on Mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.getUsers();
    setUsers(data);
  };

  // --- AI Logic ---
  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setAiAnalysis('');
    const result = await generateInventoryInsights(items, transactions);
    setAiAnalysis(result);
    setIsLoading(false);
  };

  // --- Sync Logic ---
  const handleSyncToSheets = async () => {
    if (!syncConfig.scriptUrl) {
      alert("Harap masukkan Google Apps Script Web App URL.");
      return;
    }
    
    setIsSyncing(true);
    
    // Simulate API Call delay
    setTimeout(() => {
       const now = new Date().toLocaleString('id-ID');
       setLastSyncTime(now);
       localStorage.setItem('gs_script_url', syncConfig.scriptUrl);
       localStorage.setItem('gs_sheet_id', syncConfig.sheetId);
       localStorage.setItem('gs_last_sync', now);
       setIsSyncing(false);
       setToast({ show: true, message: "Sinkronisasi berhasil! (Simulasi)", type: 'success' });
    }, 2000);
  };

  // --- User CRUD Logic ---
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
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
       alert("Username, Password, dan Nama wajib diisi.");
       return;
    }

    if (editingUser) {
      await api.updateUser({ ...editingUser, ...userFormData } as User);
    } else {
      const newUser: User = {
        ...userFormData as User,
        id: `user-${Date.now()}`
      };
      await api.addUser(newUser);
    }
    await loadUsers();
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus user ini?")) {
      await api.deleteUser(id);
      await loadUsers();
    }
  };

  // --- System Reset Logic ---
  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'RESET') return;
    
    setIsResetting(true);
    try {
      const result = await api.resetDatabase();
      if (result.success) {
        setToast({ show: true, message: "Database berhasil direset ke pengaturan pabrik.", type: 'success' });
        setIsResetModalOpen(false);
        setResetConfirmText('');
        // Force refresh application state
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setToast({ show: true, message: result.error || "Gagal mereset database.", type: 'error' });
      }
    } catch (error) {
      setToast({ show: true, message: "Terjadi kesalahan jaringan.", type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />

      <div className="flex items-center gap-4">
        <div className="bg-slate-800 p-3 rounded-full text-white">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Administrator Panel</h2>
          <p className="text-slate-500">System settings, User Management & AI Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. CURRENT USER PROFILE */}
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

        {/* 2. GOOGLE SHEETS SYNC */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700 dark:text-green-500">
              <Database size={20} /> Google Sheets Sync
           </h3>
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Konfigurasi koneksi ke Google Spreadsheets untuk backup data otomatis. Gunakan Google Apps Script Web App URL.
           </p>
           
           <div className="space-y-3">
              <div>
                 <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Google Script Web App URL</label>
                 <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                    <Link size={14} className="text-slate-400 flex-shrink-0"/>
                    <input 
                       type="password"
                       placeholder="https://script.google.com/macros/s/..."
                       className="w-full bg-transparent outline-none text-sm dark:text-slate-200"
                       value={syncConfig.scriptUrl}
                       onChange={e => setSyncConfig({...syncConfig, scriptUrl: e.target.value})}
                    />
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Spreadsheet ID (Optional)</label>
                 <input 
                    type="text"
                    placeholder="1BxiMVs0XRA5nFK..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-500 dark:text-slate-200"
                    value={syncConfig.sheetId}
                    onChange={e => setSyncConfig({...syncConfig, sheetId: e.target.value})}
                 />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                 <span className="text-xs text-slate-400">
                    Last Sync: <span className="font-mono text-slate-600 dark:text-slate-300">{lastSyncTime}</span>
                 </span>
                 <button 
                    onClick={handleSyncToSheets}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-sm'}`}
                 >
                    {isSyncing ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                 </button>
              </div>
           </div>
        </div>

        {/* 3. AI ASSISTANT */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-[500px]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Bot size={20} /> Smart Inventory Advisor
            </h3>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isLoading 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Analyzing...</span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-y-auto">
            {aiAnalysis ? (
              <article className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
                   {aiAnalysis}
                </div>
              </article>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <Bot size={48} className="mb-2 opacity-20" />
                <p>Click "Generate Report" to let Gemini AI analyze your stock levels and transaction trends.</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. USER MANAGEMENT CRUD */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-[500px]">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                 <UserIcon size={20} /> User Management
              </h3>
              <button 
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Add User
              </button>
           </div>

           <div className="flex-1 overflow-auto border rounded-lg border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                 <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-xs sticky top-0">
                    <tr>
                       <th className="px-4 py-3">User</th>
                       <th className="px-4 py-3">Role</th>
                       <th className="px-4 py-3">Email</th>
                       <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map(u => (
                       <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                             <div className="font-medium text-slate-900 dark:text-slate-200">{u.username}</div>
                             <div className="text-xs text-slate-500">{u.name}</div>
                          </td>
                          <td className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                                {u.role}
                             </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{u.email}</td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => handleOpenUserModal(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                                   <Edit size={14} />
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* 5. SYSTEM MAINTENANCE (RESET DB) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 p-6">
           <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">System Maintenance</h3>
           </div>
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="max-w-2xl">
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">Reset Database ke Pengaturan Pabrik</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tindakan ini akan <span className="font-bold text-red-600">MENGHAPUS SEMUA DATA</span> termasuk inventaris, riwayat transaksi, barang reject, dan user (kecuali admin utama). Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda telah melakukan backup via Google Sheets jika diperlukan.
                 </p>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-red-200 dark:shadow-none active:scale-95"
              >
                 <Trash size={18} /> Reset Database
              </button>
           </div>
        </div>

      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in border dark:border-slate-800">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               
               <form onSubmit={handleSaveUser} className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                     <input 
                        required
                        type="text"
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={userFormData.name}
                        onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                        <input 
                           required
                           type="text"
                           className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                           value={userFormData.username}
                           onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                        <select 
                           className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none bg-white dark:text-white"
                           value={userFormData.role}
                           onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}
                        >
                           <option value="staff">Staff</option>
                           <option value="admin">Admin</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                     <input 
                        required
                        type="email"
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={userFormData.email}
                        onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                     <div className="relative">
                        <input 
                           required
                           type={showPassword ? "text" : "password"}
                           className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 pr-10 dark:text-white"
                           value={userFormData.password}
                           onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">
                           {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                     </div>
                  </div>
                  
                  <div className="pt-2">
                     <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                        <Save size={18} /> Simpan User
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* RESET DATABASE MODAL */}
      {isResetModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-in border border-red-100 dark:border-red-900/30">
               <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4">
                     <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reset Seluruh Database?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                     Ini akan menghapus semua data transaksi dan stok. Proses ini tidak dapat dibatalkan.
                  </p>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Ketik <span className="text-red-600">RESET</span> untuk konfirmasi</label>
                     <input 
                        type="text"
                        placeholder="RESET"
                        className="w-full text-center border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 rounded-xl p-3 font-bold tracking-widest outline-none focus:border-red-500 transition-all dark:text-white"
                        value={resetConfirmText}
                        onChange={e => setResetConfirmText(e.target.value.toUpperCase())}
                     />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                     <button 
                        onClick={() => setIsResetModalOpen(false)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                     >
                        Batal
                     </button>
                     <button 
                        disabled={resetConfirmText !== 'RESET' || isResetting}
                        onClick={handleResetDatabase}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-white transition-all ${
                           resetConfirmText === 'RESET' && !isResetting
                             ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none' 
                             : 'bg-slate-300 cursor-not-allowed'
                        }`}
                     >
                        {isResetting ? <Loader2 size={20} className="animate-spin" /> : <Trash size={20} />}
                        Reset Sekarang
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
