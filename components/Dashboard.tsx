
import React, { useMemo, useState } from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Calendar, ChevronRight, Filter } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  // --- Filter State (Visual Only for now, defaults to today/month) ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- KPI Calculations ---
  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;
  const totalStockValue = items.reduce((acc, i) => acc + (i.stock * i.price), 0);
  const totalTransactions = transactions.length;
  const activeStockItems = items.filter(i => i.stock > 0).length;

  // --- CHART LOGIC: Frequency of OUT Transactions (Bukan Qty, tapi Frekuensi muncul) ---
  const topFrequencyData = useMemo(() => {
    const frequencyMap = new Map<string, number>();

    transactions
      .filter(t => t.type === 'OUT') // Hanya transaksi keluar
      .forEach(t => {
        t.items.forEach(item => {
          // Hitung berapa kali item ini muncul dalam struk/transaksi
          // Jika dalam 1 transaksi ada 10 qty, tetap dihitung 1 kejadian (frekuensi)
          const currentCount = frequencyMap.get(item.itemName) || 0;
          frequencyMap.set(item.itemName, currentCount + 1);
        });
      });

    // Convert to array, sort desc, take top 5
    return Array.from(frequencyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 items
  }, [transactions]);

  // --- Recent Activity List ---
  const recentActivity = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-10">
      
      {/* 1. Header & Filter Section */}
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard Overview</h2>
         
         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Filter Dashboard</h3>
            <div className="flex flex-col md:flex-row items-end gap-4">
               <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Mulai Dari</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                     <Calendar size={16} className="text-slate-400"/>
                     <input 
                       type="date" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
                     />
                  </div>
               </div>
               <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Hingga</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                     <Calendar size={16} className="text-slate-400"/>
                     <input 
                       type="date" 
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                       className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
                     />
                  </div>
               </div>
               <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 h-[42px]">
                  <Filter size={16} /> Terapkan Filter
               </button>
            </div>
         </div>
      </div>
      
      {/* 2. KPI Cards (Blue Consolidated Panel) */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-3xl shadow-xl shadow-blue-200 dark:shadow-none p-8 text-white">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-blue-400/30">
            
            {/* KPI 1: Total Value */}
            <div className="px-4 first:pl-0">
               <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Total Nilai Aset</div>
               <div className="text-3xl font-bold mb-1">
                  Rp {(totalStockValue / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} JT
               </div>
               <button className="text-[10px] font-bold text-blue-100 hover:text-white flex items-center gap-1 mt-2 opacity-80 hover:opacity-100 transition-opacity">
                  RINCIAN <ChevronRight size={10} />
               </button>
            </div>

            {/* KPI 2: Total Items */}
            <div className="px-4 pt-6 md:pt-0">
               <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Total Item (SKU)</div>
               <div className="text-4xl font-bold mb-1">
                  {items.length}
               </div>
               <button className="text-[10px] font-bold text-blue-100 hover:text-white flex items-center gap-1 mt-2 opacity-80 hover:opacity-100 transition-opacity">
                  RINCIAN <ChevronRight size={10} />
               </button>
            </div>

            {/* KPI 3: Transactions */}
            <div className="px-4 pt-6 md:pt-0">
               <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Jumlah Transaksi</div>
               <div className="text-4xl font-bold mb-1">
                  {totalTransactions}
               </div>
               <button className="text-[10px] font-bold text-blue-100 hover:text-white flex items-center gap-1 mt-2 opacity-80 hover:opacity-100 transition-opacity">
                  RINCIAN <ChevronRight size={10} />
               </button>
            </div>

            {/* KPI 4: Active Stock / Low Stock */}
            <div className="px-4 pt-6 md:pt-0">
               <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Stok Kritis (Alert)</div>
               <div className="text-4xl font-bold mb-1 flex items-center gap-3">
                  {lowStockCount}
                  {lowStockCount > 0 && <AlertTriangle className="text-yellow-300 animate-pulse" size={24}/>}
               </div>
               <button className="text-[10px] font-bold text-blue-100 hover:text-white flex items-center gap-1 mt-2 opacity-80 hover:opacity-100 transition-opacity">
                  RINCIAN <ChevronRight size={10} />
               </button>
            </div>

         </div>
      </div>

      {/* 3. Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Frequency Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Top Frekuensi Keluar</h3>
                <p className="text-sm text-slate-400 mt-1">5 Barang yang paling sering muncul dalam transaksi keluar.</p>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">Terpopuler</span>
             </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={topFrequencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={window.matchMedia('(prefers-color-scheme: dark)').matches ? '#334155' : '#f1f5f9'} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 12}} 
                   dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderColor: '#e2e8f0',
                    color: '#1e293b',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }} 
                />
                <Area 
                   type="monotone" 
                   dataKey="value" 
                   stroke="#3b82f6" 
                   strokeWidth={3}
                   fillOpacity={1} 
                   fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: Recent Activity (Styled like 'Menu Terlaris' list) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivitas Terkini</h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Lihat Semua</button>
           </div>
           
           <div className="space-y-6">
              {recentActivity.map((t, idx) => (
                 <div key={t.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${t.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {idx + 1}
                       </div>
                       <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                             {t.items[0]?.itemName} {t.items.length > 1 ? `+${t.items.length - 1}` : ''}
                          </div>
                          <div className="text-xs text-slate-400">
                             {new Date(t.date).toLocaleDateString('id-ID')} • {t.type}
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                          {t.items.reduce((acc, item) => acc + item.quantity, 0)} Unit
                       </div>
                       <div className="text-[10px] text-slate-400 uppercase tracking-wide">TOTAL QTY</div>
                    </div>
                 </div>
              ))}
              
              {recentActivity.length === 0 && (
                 <div className="text-center text-slate-400 py-10">Belum ada aktivitas.</div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};
