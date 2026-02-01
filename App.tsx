
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ArrowDownLeft, ArrowUpRight, FileBarChart, Settings, Menu, X, LogOut, History as HistoryIcon, Search, Bell, AlertTriangle, ChevronRight, CheckCircle, Ban, Database, ClipboardList, ListPlus, Wifi, Clock, Sun, Moon, Music } from 'lucide-react';
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from './types';
import { api } from './services/api';
import { Dashboard } from './components/Dashboard';
import { InventoryModule } from './components/InventoryModule';
import { TransactionModule } from './components/TransactionModule';
import { TransactionHistory } from './components/TransactionHistory';
import { AdminView } from './components/AdminView';
import { StockCardModal } from './components/StockCardModal';
import { RejectMasterData } from './components/RejectMasterData';
import { RejectTransactionModule } from './components/RejectTransactionModule';
import { RejectHistory } from './components/RejectHistory';
import { MediaPlayer } from './components/MediaPlayer';
import { ReportModule } from './components/ReportModule';
import { Login } from './components/Login';

enum View {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  IN_TRANSACTION = 'IN_TRANSACTION',
  OUT_TRANSACTION = 'OUT_TRANSACTION',
  HISTORY = 'HISTORY',
  REPORTS = 'REPORTS',
  ADMIN = 'ADMIN',
  REJECT_MASTER = 'REJECT_MASTER',
  REJECT_TRANSACTION = 'REJECT_TRANSACTION',
  REJECT_HISTORY = 'REJECT_HISTORY'
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedRejectMenu, setExpandedRejectMenu] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectTransactions, setRejectTransactions] = useState<RejectTransaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [stockCardItem, setStockCardItem] = useState<InventoryItem | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMediaPlayerOpen, setIsMediaPlayerOpen] = useState(false);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [latency, setLatency] = useState<number>(24);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const filteredGlobalItems = items.filter(i => 
    i.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    i.sku.toLowerCase().includes(globalSearchQuery.toLowerCase())
  );
  const lowStockItems = items.filter(i => i.stock <= i.minStock);

  const refreshData = async () => {
    try {
        const [invData, txData, rejMaster, rejTx] = await Promise.all([
            api.getInventory(),
            api.getTransactions(),
            api.getRejectMaster(),
            api.getRejectTransactions()
        ]);
        setItems(invData);
        setTransactions(txData);
        setRejectItems(rejMaster);
        setRejectTransactions(rejTx);
    } catch (error) { console.error("Refresh failed", error); }
  };

  useEffect(() => { if (isAuthenticated) refreshData(); }, [isAuthenticated]);
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const l = setInterval(() => setLatency(Math.floor(Math.random()*50)+15), 3000); return () => clearInterval(l); }, []);

  const handleLogin = async (u: string, p: string) => {
    const user = await api.login(u, p);
    if (user) { setCurrentUser(user); setIsAuthenticated(true); return true; }
    return false;
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentView(View.DASHBOARD); setCurrentUser(null); };

  const handleAddItem = async (item: InventoryItem) => { await api.addInventory(item); refreshData(); };
  const handleUpdateItem = async (updatedItem: InventoryItem) => { await api.addInventory(updatedItem); refreshData(); };
  const handleDeleteItem = async (id: string) => { if (confirm('Hapus item ini?')) { await api.deleteInventory(id); refreshData(); } };
  const handleBulkDeleteItems = async (ids: string[]) => { await api.deleteInventoryBulk(ids); refreshData(); };

  const handleAddRejectItem = async (item: RejectItem) => { await api.addRejectMaster(item); refreshData(); };
  const handleUpdateRejectItem = async (item: RejectItem) => { await api.addRejectMaster(item); refreshData(); };
  const handleDeleteRejectItem = async (id: string) => { if(confirm('Hapus master reject ini?')) { await api.deleteRejectMaster(id); refreshData(); } };
  
  const handleSaveRejectTransaction = async (tx: RejectTransaction) => { await api.addRejectTransaction(tx); refreshData(); };
  const handleDeleteRejectTransaction = async (id: string) => { if(confirm('Hapus riwayat transaksi reject ini?')) { await api.deleteRejectTransaction(id); refreshData(); } };

  const handleSaveTransaction = async (tx: Transaction) => { await api.addTransaction(tx); refreshData(); };
  const handleUpdateTransaction = async (tx: Transaction) => { await api.updateTransaction(tx); setEditingTransaction(null); refreshData(); };
  const handleDeleteTransaction = async (id: string) => { if (confirm('Hapus transaksi ini? Stok akan dikembalikan.')) { await api.deleteTransaction(id); refreshData(); } };

  const handleEditFromHistory = (t: Transaction) => { setEditingTransaction(t); setCurrentView(t.type === 'IN' ? View.IN_TRANSACTION : View.OUT_TRANSACTION); };

  // Fix: Return Login component if user is not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      <MediaPlayer isOpen={isMediaPlayerOpen} onClose={() => setIsMediaPlayerOpen(false)} onPlayingChange={setIsMediaPlaying} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-wide">SmartInventory</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400"><X size={24}/></button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => setCurrentView(View.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg ${currentView === View.DASHBOARD ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><LayoutDashboard size={20}/>Dashboard</button>
            <button onClick={() => setCurrentView(View.INVENTORY)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg ${currentView === View.INVENTORY ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Package size={20}/>Inventory</button>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase">Transactions</div>
            <button onClick={() => setCurrentView(View.IN_TRANSACTION)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg ${currentView === View.IN_TRANSACTION ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ArrowDownLeft size={20}/>Masuk</button>
            <button onClick={() => setCurrentView(View.OUT_TRANSACTION)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg ${currentView === View.OUT_TRANSACTION ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ArrowUpRight size={20}/>Keluar</button>
            <button onClick={() => setCurrentView(View.HISTORY)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg ${currentView === View.HISTORY ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><HistoryIcon size={20}/>History</button>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase flex justify-between cursor-pointer" onClick={() => setExpandedRejectMenu(!expandedRejectMenu)}><span>Reject Module</span><span className="bg-red-900 px-1 rounded">STND</span></div>
            {expandedRejectMenu && (
              <div className="bg-slate-800/50 rounded-lg p-2 space-y-1">
                <button onClick={() => setCurrentView(View.REJECT_TRANSACTION)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${currentView === View.REJECT_TRANSACTION ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}><ListPlus size={16}/> Transaksi</button>
                <button onClick={() => setCurrentView(View.REJECT_HISTORY)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${currentView === View.REJECT_HISTORY ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}><ClipboardList size={16}/> Riwayat</button>
                <button onClick={() => setCurrentView(View.REJECT_MASTER)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${currentView === View.REJECT_MASTER ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}><Database size={16}/> Master</button>
              </div>
            )}
            <NavItem view={View.REPORTS} icon={FileBarChart} label="Laporan" current={currentView} onClick={setCurrentView} />
            <NavItem view={View.ADMIN} icon={Settings} label="Admin" current={currentView} onClick={setCurrentView} />
          </nav>
          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300"><LogOut size={18}/> Logout</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 z-20 shadow-md">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-slate-400"><Menu size={24}/></button>
          <div className="flex-1 px-4 lg:px-8 max-w-2xl relative">
            <Search className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input type="text" placeholder="Cari Barang..." value={globalSearchQuery} onChange={e => { setGlobalSearchQuery(e.target.value); setShowGlobalSearch(true); }} className="w-full pl-12 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-600"/>
            {showGlobalSearch && globalSearchQuery && (
              <div className="absolute top-full left-8 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 max-h-96 overflow-y-auto z-50">
                {filteredGlobalItems.map(item => (
                  <button key={item.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 flex justify-between border-b dark:border-slate-700" onClick={() => { setStockCardItem(item); setGlobalSearchQuery(''); setShowGlobalSearch(false); }}>
                    <div><div className="font-medium dark:text-white">{item.name}</div><div className="text-xs text-slate-500">{item.sku}</div></div>
                    <div className="text-right"><div className="text-sm font-bold dark:text-slate-300">{Number(item.stock).toLocaleString('id-ID')} {item.unit}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-800 text-yellow-400 border border-slate-700">{isDarkMode ? <Moon size={18}/> : <Sun size={18}/>}</button>
            <div className="hidden lg:flex flex-col items-end border-r border-slate-700 pr-6 pl-6">
                <span className="text-sm font-medium text-white">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-xs text-slate-400">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
                <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">{currentUser?.name.charAt(0)}</div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === View.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
            {currentView === View.INVENTORY && <InventoryModule items={items} onAddItem={handleAddItem} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} onBulkDeleteItem={handleBulkDeleteItems} />}
            {currentView === View.IN_TRANSACTION && <TransactionModule type="IN" items={items} onAddItem={handleAddItem} onSaveTransaction={handleSaveTransaction} onUpdateTransaction={handleUpdateTransaction} initialData={editingTransaction} onCancelEdit={() => setEditingTransaction(null)} />}
            {currentView === View.OUT_TRANSACTION && <TransactionModule type="OUT" items={items} onAddItem={handleAddItem} onSaveTransaction={handleSaveTransaction} onUpdateTransaction={handleUpdateTransaction} initialData={editingTransaction} onCancelEdit={() => setEditingTransaction(null)} />}
            {currentView === View.HISTORY && <TransactionHistory transactions={transactions} onEditTransaction={handleEditFromHistory} onDeleteTransaction={handleDeleteTransaction} />}
            {currentView === View.REPORTS && <ReportModule items={items} transactions={transactions} />}
            {currentView === View.ADMIN && currentUser && <AdminView user={currentUser} items={items} transactions={transactions} />}
            {currentView === View.REJECT_MASTER && <RejectMasterData items={rejectItems} onAddItem={handleAddRejectItem} onUpdateItem={handleUpdateRejectItem} onDeleteItem={handleDeleteRejectItem} />}
            {/* Fix: Removed unused onAddItem prop from RejectTransactionModule to fix type mismatch error */}
            {currentView === View.REJECT_TRANSACTION && <RejectTransactionModule masterItems={rejectItems} onSaveTransaction={handleSaveRejectTransaction} />}
            {currentView === View.REJECT_HISTORY && <RejectHistory transactions={rejectTransactions} masterItems={rejectItems} onDeleteTransaction={handleDeleteRejectTransaction} />}
          </div>
        </div>
        {stockCardItem && <StockCardModal item={stockCardItem} transactions={transactions} onClose={() => setStockCardItem(null)} />}
      </main>
    </div>
  );
};

const NavItem = ({ view, icon: Icon, label, current, onClick }: any) => (
  <button onClick={() => onClick(view)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg mb-1 ${current === view ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon size={20}/><span>{label}</span></button>
);

export default App;
