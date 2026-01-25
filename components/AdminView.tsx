
import React, { useState } from 'react';
import { InventoryItem, Transaction, User } from '../types';
import { generateInventoryInsights } from '../services/geminiService';
import { Bot, Settings, Shield, User as UserIcon, Loader2, Database, Link, Check, RefreshCw, Plus, Edit, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import { INITIAL_USERS } from '../constants';

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
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', email: '', role: 'staff'
  });
  const [showPassword, setShowPassword] = useState(false);

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
       alert("Sinkronisasi berhasil! (Simulasi: Data dikirim ke Google Spreadsheets)");
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

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
       alert("Username, Password, dan Nama wajib diisi.");
       return;
    }

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userFormData } as User : u));
    } else {
      const newUser: User = {
        ...userFormData as User,
        id: `user-${Date.now()}`
      };
      setUsers(prev => [...prev, newUser]);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus user ini?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <div className="bg-slate-800 p-3 rounded-full text-white">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Administrator Panel</h2>
          <p className="text-slate-500">System settings, User Management & AI Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. CURRENT USER PROFILE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
            <UserIcon size={20} /> Current User
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-800">{user.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Username</span>
              <span className="font-medium text-slate-800">{user.username}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Role</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm font-semibold uppercase">{user.role}</span>
            </div>
            <div className="pt-2">
              <button className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                <Settings size={14} /> Edit Profile Settings
              </button>
            </div>
          </div>
        </div>

        {/* 2. GOOGLE SHEETS SYNC */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700">
              <Database size={20} /> Google Sheets Sync
           </h3>
           <p className="text-xs text-slate-500 mb-4">
              Konfigurasi koneksi ke Google Spreadsheets untuk backup data otomatis. Gunakan Google Apps Script Web App URL.
           </p>
           
           <div className="space-y-3">
              <div>
                 <label className="block text-xs font-semibold text-slate-600 mb-1">Google Script Web App URL</label>
                 <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <Link size={14} className="text-slate-400 flex-shrink-0"/>
                    <input 
                       type="password"
                       placeholder="https://script.google.com/macros/s/..."
                       className="w-full bg-transparent outline-none text-sm"
                       value={syncConfig.scriptUrl}
                       onChange={e => setSyncConfig({...syncConfig, scriptUrl: e.target.value})}
                    />
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-semibold text-slate-600 mb-1">Spreadsheet ID (Optional)</label>
                 <input 
                    type="text"
                    placeholder="1BxiMVs0XRA5nFK..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-500"
                    value={syncConfig.sheetId}
                    onChange={e => setSyncConfig({...syncConfig, sheetId: e.target.value})}
                 />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                 <span className="text-xs text-slate-400">
                    Last Sync: <span className="font-mono text-slate-600">{lastSyncTime}</span>
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

        {/* 3. AI ASSISTANT (Full Width on Mobile, Left on Desktop) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-[500px]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-700">
              <Bot size={20} /> Smart Inventory Advisor
            </h3>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isLoading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
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
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-200 overflow-y-auto">
            {aiAnalysis ? (
              <article className="prose prose-sm prose-slate max-w-none">
                <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
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

        {/* 4. USER MANAGEMENT CRUD (Full Width on Mobile, Right on Desktop) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-[500px]">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-700">
                 <UserIcon size={20} /> User Management
              </h3>
              <button 
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Add User
              </button>
           </div>

           <div className="flex-1 overflow-auto border rounded-lg border-slate-100">
              <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 text-slate-700 uppercase text-xs sticky top-0">
                    <tr>
                       <th className="px-4 py-3">User</th>
                       <th className="px-4 py-3">Role</th>
                       <th className="px-4 py-3">Email</th>
                       <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                       <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                             <div className="font-medium text-slate-900">{u.username}</div>
                             <div className="text-xs text-slate-500">{u.name}</div>
                          </td>
                          <td className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                                {u.role}
                             </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{u.email}</td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => handleOpenUserModal(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                   <Edit size={14} />
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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

      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               
               <form onSubmit={handleSaveUser} className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                     <input 
                        required
                        type="text"
                        className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={userFormData.name}
                        onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input 
                           required
                           type="text"
                           className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                           value={userFormData.username}
                           onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <select 
                           className="w-full border rounded-lg p-2.5 outline-none bg-white"
                           value={userFormData.role}
                           onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}
                        >
                           <option value="staff">Staff</option>
                           <option value="admin">Admin</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                     <input 
                        required
                        type="email"
                        className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={userFormData.email}
                        onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                     <div className="relative">
                        <input 
                           required
                           type={showPassword ? "text" : "password"}
                           className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 pr-10"
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
    </div>
  );
};
