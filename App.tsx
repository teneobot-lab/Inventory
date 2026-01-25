import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ArrowDownLeft, ArrowUpRight, FileBarChart, Settings, Menu, X, LogOut, History as HistoryIcon, Search, Bell, AlertTriangle, ChevronRight, CheckCircle, Ban, Database, ClipboardList, ListPlus, Wifi, Clock, Sun, Moon } from 'lucide-react';
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from './types';
import { INITIAL_ITEMS, INITIAL_TRANSACTIONS, CURRENT_USER } from './constants';
import { Dashboard } from './components/Dashboard';
import { InventoryModule } from './components/InventoryModule';
import { TransactionModule } from './components/TransactionModule';
import { TransactionHistory } from './components/TransactionHistory';
import { AdminView } from './components/AdminView';
import { StockCardModal } from './components/StockCardModal';
// Import New Reject Components
import { RejectMasterData } from './components/RejectMasterData';
import { RejectTransactionModule } from './components/RejectTransactionModule';
import { RejectHistory } from './components/RejectHistory';
// Import Media Player
import { MediaPlayer } from './components/MediaPlayer';
// Import Report Module
import { ReportModule } from './components/ReportModule';
// Import Login Module
import { Login } from './components/Login';

// Router enum
enum View {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  IN_TRANSACTION = 'IN_TRANSACTION',
  OUT_TRANSACTION = 'OUT_TRANSACTION',
  HISTORY = 'HISTORY',
  REPORTS = 'REPORTS',
  ADMIN = 'ADMIN',
  // New Reject Routes
  REJECT_MASTER = 'REJECT_MASTER',
  REJECT_TRANSACTION = 'REJECT_TRANSACTION',
  REJECT_HISTORY = 'REJECT_HISTORY'
}

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedRejectMenu, setExpandedRejectMenu] = useState(true);
  
  // App State
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [user] = useState<User>(CURRENT_USER);

  // --- REJECT MODULE STATE ---
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectTransactions, setRejectTransactions] = useState<RejectTransaction[]>([]);

  // State to handle editing when triggered from History view
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Top Bar Search State
  const [stockCardItem, setStockCardItem] = useState<InventoryItem | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Notification State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // --- UI/UX STATE (Time & Connectivity & Theme) ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [latency, setLatency] = useState<number>(24);
  
  // Initialize Theme from localStorage or default to light
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Derived State
  const filteredGlobalItems = items.filter(i => 
    i.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    i.sku.toLowerCase().includes(globalSearchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(i => i.stock <= i.minStock);

  // --- Effects ---
  
  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Clock Interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Latency Simulation Interval
  useEffect(() => {
    const pingInterval = setInterval(() => {
       // Simulate latency fluctuation between 15ms and 65ms
       setLatency(Math.floor(Math.random() * 50) + 15);
    }, 3000);
    return () => clearInterval(pingInterval);
  }, []);

  // --- Handlers ---

  const handleLogin = (u: string, p: string): boolean => {
    // Hardcoded credentials as requested
    if (u === 'admin' && p === '22') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView(View.DASHBOARD);
  };

  const handleAddItem = (item: InventoryItem) => {
    setItems(prev => [...prev, item]);
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // --- Reject Handlers ---
  const handleAddRejectItem = (item: RejectItem) => {
    setRejectItems(prev => [...prev, item]);
  };
  const handleDeleteRejectItem = (id: string) => {
      if(confirm('Hapus master barang reject ini?')) {
        setRejectItems(prev => prev.filter(i => i.id !== id));
      }
  };
  const handleSaveRejectTransaction = (tx: RejectTransaction) => {
      setRejectTransactions(prev => [...prev, tx]);
  };


  // Helper to adjust stock for a list of transaction items
  const adjustStock = (transactionItems: any[], type: 'IN' | 'OUT', multiplier: 1 | -1) => {
    const stockMap = new Map<string, number>();
    
    // Group by ID first
    transactionItems.forEach(tItem => {
       const currentVal = stockMap.get(tItem.itemId) || 0;
       stockMap.set(tItem.itemId, currentVal + tItem.quantity);
    });

    setItems(prevItems => prevItems.map(item => {
       const qtyChange = stockMap.get(item.id);
       if (qtyChange) {
         const factor = type === 'IN' ? 1 : -1;
         return { ...item, stock: item.stock + (qtyChange * factor * multiplier) };
       }
       return item;
    }));
  };

  const handleSaveTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [...prev, newTransaction]);
    adjustStock(newTransaction.items, newTransaction.type, 1);
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prevTransactions => {
      const oldTransaction = prevTransactions.find(t => t.id === updatedTransaction.id);
      if (oldTransaction) {
        // 1. Revert stock from old transaction (multiplier -1)
        adjustStock(oldTransaction.items, oldTransaction.type, -1);
      }
      return prevTransactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
    });

    // 2. Apply stock for new transaction (multiplier 1)
    adjustStock(updatedTransaction.items, updatedTransaction.type, 1);
    
    // Clear editing state if applicable
    setEditingTransaction(null);
  };

  // Handler to switch from History to Form
  const handleEditFromHistory = (t: Transaction) => {
    setEditingTransaction(t);
    if (t.type === 'IN') {
      setCurrentView(View.IN_TRANSACTION);
    } else {
      setCurrentView(View.OUT_TRANSACTION);
    }
  };

  // Helper to change view and reset edit state if navigating manually
  const changeView = (view: View) => {
    setCurrentView(view);
    setEditingTransaction(null);
    setIsMobileMenuOpen(false);
  };

  // Mobile menu toggle
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Click outside listener for notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigation Item Component
  const NavItem = ({ view, icon: Icon, label, isActive = false }: { view: View; icon: any; label: string; isActive?: boolean }) => (
    <button
      onClick={() => changeView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1
        ${currentView === view || isActive
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* GLOBAL MEDIA PLAYER */}
      <MediaPlayer />

      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-wide">SmartInventory</h1>
            <button onClick={toggleMobileMenu} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem view={View.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem view={View.INVENTORY} icon={Package} label="Inventory" />
            
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transactions
            </div>
            <NavItem view={View.IN_TRANSACTION} icon={ArrowDownLeft} label="Transaksi Masuk" />
            <NavItem view={View.OUT_TRANSACTION} icon={ArrowUpRight} label="Transaksi Keluar" />
            <NavItem view={View.HISTORY} icon={HistoryIcon} label="History" />

            {/* REJECT MODULE SIDEBAR */}
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between cursor-pointer" onClick={() => setExpandedRejectMenu(!expandedRejectMenu)}>
              <span>Reject Module</span>
              <span className="text-[10px] bg-red-900 text-red-100 px-1 rounded">Standalone</span>
            </div>
            
            {expandedRejectMenu && (
                <div className="bg-slate-800/50 rounded-lg p-2 space-y-1">
                    <button
                        onClick={() => changeView(View.REJECT_TRANSACTION)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${currentView === View.REJECT_TRANSACTION ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <ListPlus size={16} /> Transaksi Reject
                    </button>
                    <button
                        onClick={() => changeView(View.REJECT_HISTORY)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${currentView === View.REJECT_HISTORY ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <ClipboardList size={16} /> Riwayat Reject
                    </button>
                    <button
                        onClick={() => changeView(View.REJECT_MASTER)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${currentView === View.REJECT_MASTER ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Database size={16} /> Master Reject
                    </button>
                </div>
            )}
            
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Management
            </div>
            <NavItem view={View.REPORTS} icon={FileBarChart} label="Laporan" />
            <NavItem view={View.ADMIN} icon={Settings} label="Admin" />
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - MODIFIED FOR DARK THEME CONSISTENCY */}
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 z-20 relative shadow-md">
          <button onClick={toggleMobileMenu} className="lg:hidden text-slate-400 hover:text-white">
            <Menu size={24} />
          </button>
          
          {/* Top Bar Search with Autocomplete */}
          <div className="flex-1 px-4 lg:px-8 max-w-2xl relative">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari Barang (Lihat Mutasi & Stok)..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-slate-900 transition-all shadow-inner"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowGlobalSearch(true);
                  }}
                  onFocus={() => setShowGlobalSearch(true)}
                  onBlur={() => setTimeout(() => setShowGlobalSearch(false), 200)}
                />
                
                {/* Autocomplete Dropdown (Keeps white background for readability) */}
                {showGlobalSearch && globalSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-96 overflow-y-auto animate-fade-in z-50">
                      {filteredGlobalItems.length > 0 ? (
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/50">Hasil Pencarian</div>
                          {filteredGlobalItems.map(item => (
                            <button 
                              key={item.id}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between group transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                              onClick={() => {
                                 setStockCardItem(item);
                                 setGlobalSearchQuery('');
                                 setShowGlobalSearch(false);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                   <Package size={18} />
                                 </div>
                                 <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-700">{item.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.sku} • {item.category}</div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.stock} {item.unit}</div>
                                 <div className="text-[10px] text-slate-400">Saldo Akhir</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-sm">
                           <Package size={32} className="mx-auto mb-2 opacity-20"/>
                           Tidak ada barang ditemukan.
                        </div>
                      )}
                  </div>
                )}
             </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
             {/* Connectivity Status */}
             <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <div className="flex flex-col items-start leading-none">
                   <span className="text-[10px] text-slate-400 font-medium">SERVER</span>
                   <span className="text-[10px] font-mono text-emerald-400">{latency} ms</span>
                </div>
             </div>

             {/* Theme Toggle Button */}
             <button
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-yellow-400 transition-all border border-slate-700 hover:border-slate-600"
               title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {isDarkMode ? <Moon size={18} className="text-blue-300" /> : <Sun size={18} />}
             </button>

             {/* Time Widget */}
             <div className="hidden lg:flex flex-col items-end text-right border-r border-slate-700 pr-6 border-l pl-6">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                   {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                   <Clock size={14} className="text-blue-400"/>
                </span>
                <span className="text-xs text-slate-400">
                   {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
             </div>

             {/* Notification Bell */}
             <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-2 rounded-full transition-colors ${isNotificationsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <Bell size={20} />
                  {lowStockItems.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900 animate-pulse">
                      {lowStockItems.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-fade-in origin-top-right">
                     <div className="p-4 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex justify-between items-center">
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                           <Bell size={14} className="text-blue-600" /> Notifikasi Stok
                        </h3>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                           {lowStockItems.length} Alert
                        </span>
                     </div>
                     <div className="max-h-80 overflow-y-auto">
                       {lowStockItems.length > 0 ? (
                         lowStockItems.map(item => (
                            <button 
                              key={item.id}
                              onClick={() => {
                                setStockCardItem(item);
                                setIsNotificationsOpen(false);
                              }}
                              className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 flex gap-3 transition-colors group"
                            >
                               <div className="mt-1 flex-shrink-0">
                                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full text-red-500">
                                    <AlertTriangle size={16} />
                                  </div>
                               </div>
                               <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700">{item.name}</p>
                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400" />
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.sku}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                     <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-900 font-medium">
                                        Stok: {item.stock} {item.unit}
                                     </span>
                                     <span className="text-[10px] text-slate-400">
                                        Min: {item.minStock}
                                     </span>
                                  </div>
                               </div>
                            </button>
                         ))
                       ) : (
                         <div className="p-8 text-center text-slate-400">
                            <CheckCircle size={32} className="mx-auto mb-2 text-green-500 opacity-50"/>
                            <p className="text-sm">Semua stok aman!</p>
                            <p className="text-xs mt-1">Tidak ada item dibawah batas minimum.</p>
                         </div>
                       )}
                     </div>
                     {lowStockItems.length > 0 && (
                       <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
                          <button 
                            onClick={() => {
                              setCurrentView(View.INVENTORY);
                              setIsNotificationsOpen(false);
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Lihat Inventory Manager
                          </button>
                       </div>
                     )}
                  </div>
                )}
             </div>

             {/* User Profile */}
             <div className="flex items-center gap-3 border-l border-slate-700 pl-4 md:pl-6">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-white">{user.name}</p>
                   <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                 </div>
                 <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md ring-2 ring-slate-700">
                   {user.name.charAt(0)}
                 </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === View.DASHBOARD && (
              <Dashboard items={items} transactions={transactions} />
            )}
            
            {currentView === View.INVENTORY && (
              <InventoryModule 
                items={items} 
                onAddItem={handleAddItem} 
                onUpdateItem={handleUpdateItem} 
                onDeleteItem={handleDeleteItem} 
              />
            )}

            {currentView === View.IN_TRANSACTION && (
              <TransactionModule 
                type="IN" 
                items={items} 
                onAddItem={handleAddItem}
                onSaveTransaction={handleSaveTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                initialData={editingTransaction?.type === 'IN' ? editingTransaction : null}
                onCancelEdit={() => setEditingTransaction(null)}
              />
            )}

            {currentView === View.OUT_TRANSACTION && (
              <TransactionModule 
                type="OUT" 
                items={items} 
                onAddItem={handleAddItem}
                onSaveTransaction={handleSaveTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                initialData={editingTransaction?.type === 'OUT' ? editingTransaction : null}
                onCancelEdit={() => setEditingTransaction(null)}
              />
            )}

            {currentView === View.HISTORY && (
              <TransactionHistory 
                transactions={transactions} 
                onEditTransaction={handleEditFromHistory} 
              />
            )}

            {currentView === View.REPORTS && (
              <ReportModule items={items} transactions={transactions} />
            )}

            {currentView === View.ADMIN && (
              <AdminView user={user} items={items} transactions={transactions} />
            )}

            {/* REJECT VIEWS */}
            {currentView === View.REJECT_MASTER && (
                <RejectMasterData 
                    items={rejectItems} 
                    onAddItem={handleAddRejectItem} 
                    onDeleteItem={handleDeleteRejectItem} 
                />
            )}
            {currentView === View.REJECT_TRANSACTION && (
                <RejectTransactionModule 
                    masterItems={rejectItems} 
                    onAddItem={handleAddRejectItem}
                    onSaveTransaction={handleSaveRejectTransaction} 
                />
            )}
            {currentView === View.REJECT_HISTORY && (
                <RejectHistory 
                    transactions={rejectTransactions} 
                    masterItems={rejectItems}
                />
            )}
          </div>
        </div>

        {/* Stock Card Modal */}
        {stockCardItem && (
          <StockCardModal 
            item={stockCardItem} 
            transactions={transactions} 
            onClose={() => setStockCardItem(null)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;