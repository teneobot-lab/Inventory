import React, { useState } from 'react';
import { Transaction } from '../types';
import { Search, Filter, ArrowDownLeft, ArrowUpRight, Edit, Trash2 } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onEditTransaction, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || t.type === filterType;

    return matchesSearch && matchesType;
  }).reverse(); // Show newest first

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari ID, No. Ref, Supplier, Notes..." 
              className="w-full sm:w-72 pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Type */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="pl-10 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">Semua Tipe</option>
              <option value="IN">Masuk (IN)</option>
              <option value="OUT">Keluar (OUT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* SCROLLABLE TABLE CONTAINER */}
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">ID Transaksi</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Tipe</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Tanggal</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Ref No</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Supplier</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Items</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-900">Notes</th>
                <th className="px-6 py-4 text-right bg-slate-50 dark:bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{t.id}</td>
                  <td className="px-6 py-4">
                    {t.type === 'IN' ? (
                      <span className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-xs font-bold w-fit">
                        <ArrowDownLeft size={14} /> Masuk
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded text-xs font-bold w-fit">
                        <ArrowUpRight size={14} /> Keluar
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 font-mono text-xs">{t.referenceNumber || '-'}</td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{t.supplier || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2 py-1 rounded">
                      {t.items.length} Items
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={t.notes}>{t.notes}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onEditTransaction(t)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => onDeleteTransaction(t.id)}
                        className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Search size={32} className="opacity-20"/>
                       <p>Tidak ada transaksi ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};