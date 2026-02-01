
import React, { useState, useMemo } from 'react';
import { RejectTransaction, RejectItem } from '../types';
import { Search, FileSpreadsheet, CheckSquare, Square, Calendar, ChevronRight, Clipboard } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectHistoryProps {
  transactions: RejectTransaction[];
  masterItems: RejectItem[];
}

export const RejectHistory: React.FC<RejectHistoryProps> = ({ transactions, masterItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return [...transactions].filter(t => 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.items.some(it => it.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm]);

  const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)));
  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleWAExport = () => {
    const targets = transactions.filter(t => selectedIds.has(t.id));
    if (targets.length === 0) return;
    const dateStr = new Date().toLocaleDateString('id-ID');
    let msg = `*LAPORAN REJECT HARIAN ${dateStr}*\n\n`;
    targets.forEach(t => {
      t.items.forEach(it => {
        msg += `• ${it.itemName}: ${it.inputQuantity} ${it.inputUnit} (${it.reason})\n`;
      });
    });
    navigator.clipboard.writeText(msg).then(() => alert("Format WA disalin ke clipboard!"));
  };

  const handleExcelExport = () => {
    const targets = transactions.filter(t => selectedIds.has(t.id));
    if (targets.length === 0) return;
    const data = targets.flatMap(t => t.items.map(it => ({
      'ID Log': t.id,
      'Tanggal': t.date.split('T')[0],
      'SKU': it.sku,
      'Produk': it.itemName,
      'Qty Input': it.inputQuantity,
      'Satuan': it.inputUnit,
      'Alasan': it.reason
    })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reject_History");
    XLSX.writeFile(wb, `History_Reject_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border dark:border-slate-800 shadow-sm gap-4">
           <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Riwayat Reject (Rebuilt)</h2>
              <p className="text-xs text-slate-500">Arsip pencatatan kerusakan & pemusnahan barang.</p>
           </div>
           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium dark:text-white" placeholder="Cari log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex gap-2 animate-scale-in">
                   <button onClick={handleWAExport} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"><Clipboard size={14}/> WA Copy</button>
                   <button onClick={handleExcelExport} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"><FileSpreadsheet size={14} className="text-emerald-400"/> Excel</button>
                </div>
              )}
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-700">
                    <tr>
                       <th className="p-6 w-12 text-center"><button onClick={toggleAll}>{selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}</button></th>
                       <th className="p-6">ID / Tanggal</th>
                       <th className="p-6">Rincian Barang</th>
                       <th className="p-6">Status / Catatan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-slate-800">
                    {filtered.map(t => (
                       <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <td className="p-6 text-center"><button onClick={() => toggleRow(t.id)}>{selectedIds.has(t.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-slate-200 dark:text-slate-700"/>}</button></td>
                          <td className="p-6">
                             <div className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">{t.id}</div>
                             <div className="font-black text-slate-500 mt-0.5">{new Date(t.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</div>
                          </td>
                          <td className="p-6">
                             <div className="space-y-1.5">
                                {t.items.map((it, i) => (
                                   <div key={i} className="flex items-center gap-2 text-xs font-bold dark:text-slate-300">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                      <span className="uppercase">{it.itemName}</span>
                                      <span className="text-red-600 ml-1">{it.inputQuantity} {it.inputUnit}</span>
                                   </div>
                                ))}
                             </div>
                          </td>
                          <td className="p-6">
                             <div className="text-[10px] font-bold text-slate-400 italic">"{t.items[0]?.reason || 'Pencatatan Reguler'}"</div>
                          </td>
                       </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={4} className="py-32 text-center text-slate-300 italic">Arsip reject belum tersedia.</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>
    </div>
  );
};
