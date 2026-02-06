
import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Package, ArrowDownLeft, ArrowUpRight, 
    RefreshCcw, FileBarChart, Settings, Menu, X, 
    LogOut, Database, Warehouse as WarehouseIcon, 
    Zap, AlertCircle, Search, History
} from 'lucide-react';
import { InventoryItem, Transaction, User, Warehouse } from './types';
import { api } from './services/api';
import { TransactionModule } from './components/TransactionModule';
import { Dashboard } from './components/Dashboard';

enum View {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  TRANSFER = 'TRANSFER',
  ADJUST = 'ADJUST',
  REPORTS = 'REPORTS',
  ADMIN = 'ADMIN'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load Data
  useEffect(() => {
    const load = async () => {
        const [inv, whs] = await Promise.all([api.getInventory(), api.getWarehouses()]);
        setItems(inv);
        setWarehouses(whs);
    };
    load();
  }, []);

  const handleSaveTx = async (tx: Transaction) => {
    await api.addTransaction(tx);
    // Refresh inventory logic would go here
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl mb-1
        ${currentView === view 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/30">W</div>
             <h1 className="text-xl font-black tracking-tight">WH PRO <span className="text-emerald-500">v2.5</span></h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <NavItem view={View.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem view={View.INVENTORY} icon={Database} label="Inventory Stock" />
            
            <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flow Transactions</div>
            <NavItem view={View.INBOUND} icon={ArrowDownLeft} label="Inbound (Penerimaan)" />
            <NavItem view={View.OUTBOUND} icon={ArrowUpRight} label="Outbound (Pengeluaran)" />
            <NavItem view={View.TRANSFER} icon={RefreshCcw} label="Stock Transfer" />
            <NavItem view={View.ADJUST} icon={Settings} label="Adjustment" />

            <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytics</div>
            <NavItem view={View.REPORTS} icon={FileBarChart} label="Ledger Reports" />
            <NavItem view={View.ADMIN} icon={Zap} label="System Admin" />
          </nav>

          <div className="p-4 border-t border-slate-800">
             <button className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
               <LogOut size={18} /> Logout System
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-20">
           <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-400">
             <Menu size={20} />
           </button>

           <div className="flex-1 max-w-xl mx-4">
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors"/>
                <input className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" placeholder="Quick SKU Lookup (Alt+K)..."/>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full text-[10px] font-bold">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/> SYSTEM STABLE
              </div>
              <div className="flex items-center gap-3 border-l dark:border-slate-800 pl-4">
                 <div className="text-right">
                    <p className="text-xs font-bold dark:text-white leading-none">Angkringan Admin</p>
                    <p className="text-[10px] text-slate-400">Logistics Manager</p>
                 </div>
                 <div className="w-8 h-8 bg-slate-800 rounded-lg border border-slate-700"/>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           <div className="max-w-7xl mx-auto">
              {currentView === View.DASHBOARD && <Dashboard items={items} warehouses={warehouses} />}
              {currentView === View.INBOUND && (
                <TransactionModule 
                    type="IN" 
                    items={items} 
                    warehouses={warehouses} 
                    onSave={handleSaveTx}
                />
              )}
              {currentView === View.OUTBOUND && (
                <TransactionModule 
                    type="OUT" 
                    items={items} 
                    warehouses={warehouses} 
                    onSave={handleSaveTx}
                />
              )}
              {currentView === View.TRANSFER && (
                <TransactionModule 
                    type="TRANSFER" 
                    items={items} 
                    warehouses={warehouses} 
                    onSave={handleSaveTx}
                />
              )}
              {currentView === View.ADJUST && (
                <TransactionModule 
                    type="ADJUST" 
                    items={items} 
                    warehouses={warehouses} 
                    onSave={handleSaveTx}
                />
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
