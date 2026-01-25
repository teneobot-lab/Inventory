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
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Items</p>
            <p className="text-2xl font-bold text-slate-800">{items.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Low Stock Alert</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Value</p>
            <p className="text-2xl font-bold text-slate-800">
              Rp {totalStockValue.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="text-2xl font-bold text-slate-800">{totalTransactions}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Stock by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Recent Item Activity</h3>
          <div className="overflow-y-auto h-64">
             <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {recentActivity.map((t, idx) => (
                        <tr key={`${t.id}-${idx}`} className="border-b hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{t.itemName}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {t.type}
                                </span>
                            </td>
                            <td className="px-4 py-3">{t.quantity} {t.unit}</td>
                            <td className="px-4 py-3">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};