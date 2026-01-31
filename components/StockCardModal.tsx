
import React from 'react';
import { InventoryItem, Transaction } from '../types';
import { X, ArrowDownLeft, ArrowUpRight, Calendar, FileText, Info } from 'lucide-react';

interface StockCardModalProps {
  item: InventoryItem;
  transactions: Transaction[];
  onClose: () => void;
}

export const StockCardModal: React.FC<StockCardModalProps> = ({ item, transactions, onClose }) => {
  // 1. Get all transactions involving this item
  const itemTransactions = transactions
    .filter(t => t.items.some(i => i.itemId === item.id))
    .map(t => {
      const tItem = t.items.find(i => i.itemId === item.id);
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        ref: t.referenceNumber,
        qty: parseFloat(String(tItem?.quantity || 0)), // Ensure it's a number
        unit: tItem?.unit || '',
        notes: t.notes
      };
    })
    // Sort Oldest to Newest for calculation
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Calculate the "Starting Balance" before the first transaction in this list
  // Formula: StartingBalance = CurrentStock - Sum(IN_qty) + Sum(OUT_qty)
  let totalIn = 0;
  let totalOut = 0;
  itemTransactions.forEach(t => {
    if (t.type === 'IN') totalIn += t.qty;
    else totalOut += t.qty;
  });

  // Precise decimal calculation
  const startingBalance = Number((item.stock - totalIn + totalOut).toFixed(3));

  // 3. Reconstruct history with running balance
  let runningBalance = startingBalance;
  const historyWithBalance = itemTransactions.map(t => {
    if (t.type === 'IN') {
      runningBalance += t.qty;
    } else {
      runningBalance -= t.qty;
    }
    // Fix precision issues
    const currentBalance = Number(runningBalance.toFixed(3));
    return { ...t, balance: currentBalance };
  });

  // 4. Reverse back to Newest First for the UI table
  const displayHistory = [...historyWithBalance].reverse();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/30 dark:bg-slate-800/30">
          <div className="flex gap-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl h-fit">
               <FileText size={24}/>
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kartu Stok Barang</h2>
               <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">{item.name}</h3>
               <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">SKU: {item.sku} • {item.category}</div>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="text-right">
               <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Saldo Saat Ini</div>
               <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                 {/* FIXED: Wrap in Number() */}
                 {Number(item.stock).toLocaleString('id-ID', { maximumFractionDigits: 3 })} <span className="text-sm font-normal text-slate-400">{item.unit}</span>
               </div>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 tracking-wider bg-slate-50 dark:bg-slate-800">Tanggal & Waktu</th>
                <th className="px-6 py-4 tracking-wider bg-slate-50 dark:bg-slate-800">No. Referensi</th>
                <th className="px-6 py-4 tracking-wider bg-slate-50 dark:bg-slate-800">Keterangan</th>
                <th className="px-6 py-4 text-center tracking-wider bg-slate-50 dark:bg-slate-800">Tipe</th>
                <th className="px-6 py-4 text-right tracking-wider text-green-700 dark:text-green-400 bg-slate-50 dark:bg-slate-800">Masuk</th>
                <th className="px-6 py-4 text-right tracking-wider text-orange-700 dark:text-orange-400 bg-slate-50 dark:bg-slate-800">Keluar</th>
                <th className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white tracking-wider bg-slate-100 dark:bg-slate-700">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Row: Starting Balance */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 italic">
                <td colSpan={6} className="px-6 py-3 text-xs text-slate-400">Saldo sebelum periode riwayat ini</td>
                {/* FIXED: Wrap in Number() */}
                <td className="px-6 py-3 text-right font-mono font-bold text-slate-400">{Number(startingBalance).toLocaleString('id-ID', { maximumFractionDigits: 3 })}</td>
              </tr>

              {displayHistory.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-800 dark:text-slate-200">
                    <div className="font-medium">
                      {new Date(t.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </div>
                    <div className="text-[10px] text-slate-400">{new Date(t.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">{t.ref || t.id}</td>
                  <td className="px-6 py-4 max-w-xs truncate text-slate-500 dark:text-slate-400 group-hover:whitespace-normal transition-all" title={t.notes}>
                    {t.notes || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {t.type === 'IN' ? 
                      <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-[10px] font-bold"><ArrowDownLeft size={10}/> IN</span> : 
                      <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full text-[10px] font-bold"><ArrowUpRight size={10}/> OUT</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-bold font-mono">
                    {/* FIXED: Wrap in Number() */}
                    {t.type === 'IN' ? `+${Number(t.qty).toLocaleString('id-ID', { maximumFractionDigits: 3 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400 font-bold font-mono">
                     {/* FIXED: Wrap in Number() */}
                     {t.type === 'OUT' ? `-${Number(t.qty).toLocaleString('id-ID', { maximumFractionDigits: 3 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white bg-slate-100/30 dark:bg-slate-700/30 font-mono border-l dark:border-slate-800">
                    {/* FIXED: Wrap in Number() */}
                    {Number(t.balance).toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                  </td>
                </tr>
              ))}
              {displayHistory.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-24 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center">
                      <Calendar size={64} className="mb-4 opacity-10"/>
                      <p className="text-sm font-medium">Belum ada riwayat mutasi untuk item ini.</p>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center rounded-b-2xl">
           <div className="flex items-center gap-2 text-xs text-slate-400">
             <Info size={14} />
             <span>Menampilkan {displayHistory.length} mutasi terbaru. Saldo dihitung akumulatif.</span>
           </div>
           <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm active:scale-95">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};