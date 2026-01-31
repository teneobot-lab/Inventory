
import React from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;
  const totalStockValue = items.reduce((acc, i) => acc + (i.stock * i.price), 0);
  const totalTransactions = transactions.length;

  // Flatten transactions for table view
  const recentActivity = transactions
    .slice()
    .reverse()
    .slice(0, 5)
    .flatMap(t => t.items.map(item => ({
      ...item,
      id: t.id,
      date: t.date,
      type: t.type
    })));

  // Prepare chart data
  const categoryData = items.reduce((acc: any[], item) => {
    const existing = acc.find(x => x.name === item.category);
    if (existing) {
      existing.value += item.stock;
    } else {
      acc.push({ name: item.category, value: item.stock });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard Overview</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Items</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{items.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-4">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Low Stock Alert</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Rp {totalStockValue.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Transactions</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalTransactions}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Stock by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={window.matchMedia('(prefers-color-scheme: dark)').matches ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    borderColor: '#1e293b',
                    color: '#f1f5f9',
                    borderRadius: '8px'
                  }} 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} 
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Recent Item Activity</h3>
          <div className="overflow-y-auto h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
             <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentActivity.map((t, idx) => (
                        <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{t.itemName}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${t.type === 'IN' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'}`}>
                                    {t.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                {/* FIXED: Wrap in Number() */}
                                {Number(t.quantity).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {t.unit}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                        </tr>
                    ))}
                    {recentActivity.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No recent activity</td>
                      </tr>
                    )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};