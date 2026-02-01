
import React, { useState, useMemo } from 'react';
import { RejectTransaction, RejectItem } from '../types';
import { Search, Clipboard, FileSpreadsheet, CheckSquare, Square, Trash2, Calendar, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectHistoryProps {
  transactions: RejectTransaction[];
  masterItems: RejectItem[];
}

export const RejectHistory: React.FC<RejectHistoryProps> = ({ transactions, masterItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || i.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
  };

  // --- LOGIKA EXPORT MATRIX (LOGIKA USER) ---
  const handleExportMatrixExcel = () => {
    const targetLogs = transactions.filter(t => selectedIds.has(t.id));
    if (targetLogs.length === 0) return alert("Pilih minimal satu transaksi untuk diekspor.");

    const uniqueDates = Array.from(new Set(targetLogs.map(t => t.date.split('T')[0]))).sort();
    const matrix: Record<string, { name: string, sku: string, unit: string, values: Record<string, number> }> = {};

    targetLogs.forEach(log => {
        const dateKey = log.date.split('T')[0];
        log.items.forEach(item => {
            if (!matrix[item.sku]) {
                const master = masterItems.find(m => m.sku === item.sku);
                matrix[item.sku] = { 
                    name: item.itemName, 
                    sku: item.sku, 
                    unit: master?.baseUnit || item.inputUnit, 
                    values: {} 
                };
            }
            const currentVal = matrix[item.sku].values[dateKey] || 0;
            matrix[item.sku].values[dateKey] = currentVal + item.quantity; // Aggregating base quantity
        });
    });

    const exportData = Object.values(matrix).map(row => {
        const rowData: any = { 
            'SKU': row.sku, 
            'NAMA BARANG': row.name.toUpperCase(), 
            'SATUAN DASAR': row.unit.toUpperCase() 
        };
        
        let totalRow = 0;
        uniqueDates.forEach(date => {
            const val = row.values[date] || 0;
            rowData[date] = val === 0 ? "" : Number(val.toFixed(3));
            totalRow += val;
        });

        rowData['TOTAL AKHIR'] = Number(totalRow.toFixed(3));
        return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Reject_Matrix");
    XLSX.writeFile(wb, `LAPORAN_REJECT_MATRIX_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleCopyToClipboard = () => {
      const targetLogs = transactions.filter(t => selectedIds.has(t.id));
      if (targetLogs.length === 0) return alert("Pilih transaksi terlebih dahulu.");

      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      let text = `*Data Reject KKL ${dateStr}*\n`;
      
      targetLogs.forEach(t => {
          t.items.forEach(item => {
              text += `• ${item.itemName} ${item.inputQuantity} ${item.inputUnit} (${item.reason})\n`;
          });
      });

      navigator.clipboard.writeText(text).then(() => alert("Format WhatsApp disalin!"));
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Riwayat Kejadian Reject</h2>
                <p className="text-sm text-slate-500">Manajemen log kerusakan dan pemusnahan aset.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-72">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                      type="text" 
                      placeholder="Cari log atau produk..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white" 
                   />
               </div>
               
               {selectedIds.size > 0 && (
                   <div className="flex gap-2 animate-in zoom-in duration-200">
                       <button onClick={handleCopyToClipboard} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all">
                           <Clipboard size={16} /> WA Copy ({selectedIds.size})
                       </button>
                       <button onClick={handleExportMatrixExcel} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                           <FileSpreadsheet size={16} className="text-emerald-400" /> Export Matrix Atasan
                       </button>
                   </div>
               )}
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left enterprise-table">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                        <th className="p-6 w-12 text-center sticky left-0 z-10 bg-inherit">
                            <button onClick={toggleSelectAll} className="text-slate-400">
                                {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                            </button>
                        </th>
                        <th className="p-6">ID Log</th>
                        <th className="p-6">Tanggal</th>
                        <th className="p-6">Detail Barang</th>
                        <th className="p-6">Alasan/Catatan</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTransactions.map(t => (
                        <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <td className="p-6 text-center sticky left-0 bg-inherit z-10 border-r border-slate-50 dark:border-slate-800">
                                <button onClick={() => toggleSelection(t.id)}>
                                    {selectedIds.has(t.id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-200 dark:text-slate-700" />}
                                </button>
                            </td>
                            <td className="p-6 font-bold text-blue-600 dark:text-blue-400 text-xs font-mono">{t.id}</td>
                            <td className="p-6 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                            </td>
                            <td className="p-6">
                                <div className="flex flex-col gap-1.5">
                                    {t.items.map((it, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            {it.itemName} <span className="text-blue-600 dark:text-blue-400">{it.inputQuantity} {it.inputUnit}</span>
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td className="p-6 text-xs font-bold text-slate-400 italic">
                                {t.items[0]?.reason || 'Reguler Reject'}
                            </td>
                        </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic text-sm">Belum ada riwayat reject yang tersimpan.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};
