import React from 'react';
import { InventoryItem, Transaction } from '../types';
import { X, ArrowDownLeft, ArrowUpRight, Calendar, FileText } from 'lucide-react';

interface StockCardModalProps {
  item: InventoryItem;
  transactions: Transaction[];
  onClose: () => void;
}

export const StockCardModal: React.FC<StockCardModalProps> = ({ item, transactions, onClose }) => {
  // Logic to build the history
  const itemTransactions = transactions
    .filter(t => t.items.some(i => i.itemId === item.id))
    .map(t => {
      const tItem = t.items.find(i => i.itemId === item.id);
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        ref: t.referenceNumber,
        qty: tItem?.quantity || 0,
        unit: tItem?.unit || '',
        notes: t.notes
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  // Calculate balances backwards
  let currentStock = item.stock;
  const historyWithBalance = itemTransactions.map(t => {
    const balanceAfter = currentStock;
    // Reverse the operation to find stock before this transaction
    if (t.type === 'IN') {
      currentStock -= t.qty;
    } else {
      currentStock += t.qty;
    }
    return { ...t, balance: balanceAfter };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                 <FileText size={20}/>
               </div>
               <h2 className="text-xl font-bold text-slate-800">Kartu Stok Barang</h2>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mt-2">{item.name}</h3>
            <div className="text-sm text-slate-500 font-mono">SKU: {item.sku} • {item.category}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="text-right">
               <div className="text-xs text-slate-500 uppercase font-semibold">Saldo Akhir</div>
               <div className="text-3xl font-bold text-slate-800 tracking-tight">{item.stock} <span className="text-sm font-normal text-slate-500">{item.unit}</span></div>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Tanggal</th>
                <th className="px-6 py-4 font-semibold tracking-wider">No. Referensi</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider">Tipe</th>
                <th className="px-6 py-4 text-right font-semibold tracking-wider text-green-700">Masuk</th>
                <th className="px-6 py-4 text-right font-semibold tracking-wider text-orange-700">Keluar</th>
                <th className="px-6 py-4 text-right font-bold text-slate-900 tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyWithBalance.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-800">
                    {new Date(t.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    <div className="text-xs text-slate-400">{new Date(t.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{t.ref || t.id}</td>
                  <td className="px-6 py-4 max-w-xs truncate text-slate-500">{t.notes || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    {t.type === 'IN' ? 
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><ArrowDownLeft size={12}/> IN</span> : 
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold"><ArrowUpRight size={12}/> OUT</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium font-mono">
                    {t.type === 'IN' ? `+${t.qty}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-orange-600 font-medium font-mono">
                     {t.type === 'OUT' ? `-${t.qty}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 bg-slate-50/50 font-mono border-l border-slate-100">
                    {t.balance}
                  </td>
                </tr>
              ))}
              {historyWithBalance.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                      <Calendar size={48} className="mb-4 opacity-20"/>
                      <p>Belum ada transaksi tercatat untuk item ini.</p>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-xl">
           <div className="text-xs text-slate-500">
             Menampilkan {historyWithBalance.length} riwayat transaksi terakhir.
           </div>
           <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors shadow-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};