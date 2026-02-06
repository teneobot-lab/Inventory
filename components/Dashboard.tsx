
import React from 'react';
import { InventoryItem, Warehouse } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';
import { Package, Warehouse as WhIcon, Activity, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  warehouses: Warehouse[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items, warehouses }) => {
  const kpis = [
    { label: 'Active SKU', value: items.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Warehouses', value: warehouses.length, icon: WhIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Out of Stock', value: items.filter(i => i.minStock === 0).length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'System Health', value: '100%', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  const chartData = [
    { name: 'Electronics', stock: 400, cap: 500 },
    { name: 'Food', stock: 300, cap: 600 },
    { name: 'Health', stock: 200, cap: 400 },
    { name: 'General', stock: 150, cap: 300 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white">Warehouse Intelligence</h1>
            <p className="text-slate-500">Real-time logistics and inventory health overview.</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold">
             <Activity size={14} className="text-emerald-500"/> MONITORING ACTIVE
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => (
             <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <div className={`${kpi.bg} ${kpi.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                   <kpi.icon size={24} />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-3xl font-black mt-1 dark:text-white">{kpi.value}</p>
             </div>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                   <TrendingUp size={20} className="text-emerald-500"/> Inventory Utilization
                </h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"/> CURRENT STOCK
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <div className="w-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"/> CAPACITY
                   </div>
                </div>
             </div>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="stock" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                      <Bar dataKey="cap" fill="#e2e8f0" radius={[10, 10, 0, 0]} barSize={40} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-6 text-lg">Quick Access</h3>
             <div className="space-y-3">
                {['Export Stock Card', 'Audit Log', 'Warehouse Config', 'Bulk SKU Update'].map((action, i) => (
                  <button key={i} className="w-full text-left p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-sm font-medium">
                     {action} <TrendingUp size={14} className="text-slate-400" />
                  </button>
                ))}
             </div>
             <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                   <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">PRO TIP</p>
                   <p className="text-xs text-emerald-700 dark:text-emerald-300">Use <kbd className="bg-white/50 px-1 rounded font-mono">Alt+T</kbd> to quickly toggle between warehouse ledger views.</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
