
import React, { useState } from 'react';
import { RejectTransaction, RejectItem } from '../types';
import { Search, Clipboard, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectHistoryProps {
  transactions: RejectTransaction[];
  masterItems: RejectItem[];
  onDeleteTransaction?: (id: string) => void;
}

export const RejectHistory: React.FC<RejectHistoryProps> = ({ transactions, masterItems, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(t => 
    t.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || i.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCopyToClipboard = () => {
    const today = new Date();
    const ddmmyy = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth()+1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
    let text = `Data reject KKL ${ddmmyy}\n`;
    filteredTransactions.forEach(t => {
        t.items.forEach(item => { text += `- ${item.itemName} ${item.inputQuantity} ${item.inputUnit} ${item.reason}\n`; });
    });
    navigator.clipboard.writeText(text).then(() => alert("Berhasil disalin!"));
  };

  const handleExportExcel = () => {
    const uniqueDates = Array.from(new Set(filteredTransactions.map(t => t.date.split('T')[0]))).sort() as string[];
    const matrix: any[] = [];
    const header = ["SKU", "Nama Barang", "Unit", ...uniqueDates];
    
    // Simplifikasi export untuk performa
    const dataMap: any = {};
    filteredTransactions.forEach(t => {
        const d = t.date.split('T')[0];
        t.items.forEach(i => {
            if(!dataMap[i.itemId]) dataMap[i.itemId] = { sku: i.sku, name: i.itemName, unit: i.inputUnit, dates: {} };
            dataMap[i.itemId].dates[d] = (dataMap[i.itemId].dates[d] || 0) + i.quantity;
        });
    });

    Object.values(dataMap).forEach((v: any) => {
        const row = [v.sku, v.name, v.unit, ...uniqueDates.map(d => v.dates[d] || 0)];
        matrix.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...matrix]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix Reject");
    XLSX.writeFile(wb, "Report_Reject.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Riwayat Reject</h2>
            <div className="flex gap-2">
                <button onClick={handleCopyToClipboard} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border">Copy Text (WA)</button>
                <button onClick={handleExportExcel} className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border">Excel Matrix</button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" placeholder="Cari barang..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             <div className="overflow-auto max-h-[65vh]">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-700 uppercase text-xs sticky top-0 border-b">
                         <tr>
                             <th className="px-4 py-3">Tanggal</th>
                             <th className="px-4 py-3">Barang</th>
                             <th className="px-4 py-3">Input</th>
                             <th className="px-4 py-3">Alasan</th>
                             <th className="px-4 py-3 text-right">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {filteredTransactions.map(t => (
                             <React.Fragment key={t.id}>
                                 {t.items.map((item, idx) => (
                                     <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50">
                                         {idx === 0 && <td rowSpan={t.items.length} className="px-4 py-3 align-top font-bold text-slate-800">{new Date(t.date).toLocaleDateString('id-ID')}</td>}
                                         <td className="px-4 py-3 font-medium">{item.itemName}</td>
                                         <td className="px-4 py-3">{item.inputQuantity} {item.inputUnit}</td>
                                         <td className="px-4 py-3 italic text-slate-500">{item.reason}</td>
                                         {idx === 0 && (
                                             <td rowSpan={t.items.length} className="px-4 py-3 text-right align-top">
                                                 <button onClick={() => onDeleteTransaction && onDeleteTransaction(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                             </td>
                                         )}
                                     </tr>
                                 ))}
                             </React.Fragment>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  );
};
