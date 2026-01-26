import React, { useState } from 'react';
import { Transaction } from '../types';
import { Search, Filter, ArrowDownLeft, ArrowUpRight, Edit, Trash2, Calendar, Clock, User } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onEditTransaction, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const filteredTransactions = [...transactions]
    .filter(t => {
      const matchesSearch = 
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'ALL' || t.type === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Riwayat Transaksi</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari transaksi..." 
              className="w-full sm:w-64 pl-9 pr-4 py-2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">Semua Tipe</option>
            <option value="IN">Masuk (IN)</option>
            <option value="OUT">Keluar (OUT)</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Waktu & User</th>
                <th className="px-6 py-4">ID / Tipe</th>
                <th className="px-6 py-4">Ref / Supplier</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white mb-1">
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase">
                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1"><User size={10} /> {t.performer || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-[10px] font-bold text-slate-400 mb-1">{t.id}</div>
                    {t.type === 'IN' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        <ArrowDownLeft size={10} /> MASUK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        <ArrowUpRight size={10} /> KELUAR
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <div className="text-slate-800 dark:text-slate-200">{t.referenceNumber || '-'}</div>
                    <div className="text-[10px] text-slate-400">{t.supplier || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        {t.items.slice(0, 2).map((item, i) => (
                            <div key={i} className="text-xs">
                                <span className="font-bold text-blue-600">{item.quantity}</span> {item.unit} {item.itemName}
                            </div>
                        ))}
                        {t.items.length > 2 && <div className="text-[10px] text-slate-400">+{t.items.length - 2} barang lainnya...</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[150px] truncate italic text-slate-500" title={t.notes}>{t.notes || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button 
                            onClick={() => onEditTransaction(t)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                            <Edit size={16} />
                        </button>
                        <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                       <Search size={48} className="opacity-10"/>
                       <p className="text-sm font-medium">Tidak ada transaksi ditemukan.</p>
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