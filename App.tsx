
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
  const [editingRejectTransaction, setEditingRejectTransaction] = useState<RejectTransaction | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const refreshData = async () => {
    try {
        const [inv, tx, rm, rt] = await Promise.all([
            api.getInventory(), api.getTransactions(), api.getRejectMaster(), api.getRejectTransactions()
        ]);
        setItems(inv); setTransactions(tx); setRejectItems(rm); setRejectTransactions(rt);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthenticated) refreshData(); }, [isAuthenticated]);

  const handleSaveRejectTransaction = async (tx: RejectTransaction) => {
      if (editingRejectTransaction) {
          await api.updateRejectTransaction(tx);
          setEditingRejectTransaction(null);
      } else {
          await api.addRejectTransaction(tx);
      }
      refreshData();
  };

  const handleEditReject = (tx: RejectTransaction) => {
      setEditingRejectTransaction(tx);
      setCurrentView(View.REJECT_TRANSACTION);
  };

  if (!isAuthenticated) return <Login onLogin={async (u, p) => { const user = await api.login(u, p); if (user) { setCurrentUser(user); setIsAuthenticated(true); return true; } return false; }} />;

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 font-bold text-xl">SmartInventory</div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => setCurrentView(View.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === View.DASHBOARD ? 'bg-blue-600' : 'text-slate-400'}`}><LayoutDashboard size={20}/> Dashboard</button>
            <button onClick={() => setCurrentView(View.INVENTORY)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === View.INVENTORY ? 'bg-blue-600' : 'text-slate-400'}`}><Package size={20}/> Inventory</button>
            <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Reject</div>
            <button onClick={() => setCurrentView(View.REJECT_TRANSACTION)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === View.REJECT_TRANSACTION ? 'bg-red-600' : 'text-slate-400'}`}><ListPlus size={20}/> Transaksi Reject</button>
            <button onClick={() => setCurrentView(View.REJECT_HISTORY)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === View.REJECT_HISTORY ? 'bg-red-600' : 'text-slate-400'}`}><ClipboardList size={20}/> Riwayat Reject</button>
            <button onClick={() => setCurrentView(View.REJECT_MASTER)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === View.REJECT_MASTER ? 'bg-red-600' : 'text-slate-400'}`}><Database size={20}/> Master Reject</button>
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b flex items-center px-8 justify-between">
            <div className="font-bold text-slate-800 dark:text-white">Panel Administrator</div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full border">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
        </header>
        <div className="flex-1 overflow-auto p-8">
            {currentView === View.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
            {currentView === View.REJECT_MASTER && <RejectMasterData items={rejectItems} onAddItem={refreshData} onUpdateItem={refreshData} onDeleteItem={refreshData} />}
            {currentView === View.REJECT_TRANSACTION && <RejectTransactionModule masterItems={rejectItems} onSaveTransaction={handleSaveRejectTransaction} initialData={editingRejectTransaction} onCancelEdit={() => setEditingRejectTransaction(null)} />}
            {currentView === View.REJECT_HISTORY && <RejectHistory transactions={rejectTransactions} masterItems={rejectItems} onEditTransaction={handleEditReject} />}
        </div>
      </main>
    </div>
  );
};

export default App;
