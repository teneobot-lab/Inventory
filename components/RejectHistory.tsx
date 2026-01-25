import React, { useState } from 'react';
import { RejectTransaction, RejectItem } from '../types';
import { Search, Clipboard, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectHistoryProps {
  transactions: RejectTransaction[];
  masterItems: RejectItem[];
}

export const RejectHistory: React.FC<RejectHistoryProps> = ({ transactions, masterItems }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(t => 
    t.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || i.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- EXPORT TO CLIPBOARD ---
  const handleCopyToClipboard = () => {
    // Format: "Data reject KKL ddmmyy \n - nama barang qty satuan alesan"
    const today = new Date();
    const ddmmyy = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth()+1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
    
    let text = `Data reject KKL ${ddmmyy}\n`;
    
    filteredTransactions.forEach(t => {
        // Only include items from transaction matching current date if strictly following "ddmmyy", 
        // but typically user wants to copy what's filtered/visible. 
        // Let's assume we copy all *visible* filtered transactions or just group by date.
        // For simplicity based on prompt: list items linearly.
        t.items.forEach(item => {
            text += `- ${item.itemName} ${item.inputQuantity} ${item.inputUnit} ${item.reason}\n`;
        });
    });

    navigator.clipboard.writeText(text).then(() => {
        alert("Data berhasil disalin ke Clipboard!");
    });
  };

  // --- EXPORT TO EXCEL (MATRIX) ---
  const handleExportExcel = () => {
    // Row: SKU, Name, Unit (Base)
    // Col: Date 1, Date 2...
    // Cell: Total Qty (Base)

    // 1. Get Unique Dates (Sorted)
    const uniqueDates: string[] = [...new Set(filteredTransactions.map(t => t.date.split('T')[0]))].sort();
    
    // 2. Prepare Matrix Data
    // Key: ItemID, Value: { meta: ItemMeta, dates: { [date]: qty } }
    const matrix: Record<string, { sku: string, name: string, unit: string, dateQtys: Record<string, number> }> = {};

    filteredTransactions.forEach(t => {
        const dateKey = t.date.split('T')[0];
        t.items.forEach(item => {
            if (!matrix[item.itemId]) {
                const master = masterItems.find(m => m.id === item.itemId);
                matrix[item.itemId] = {
                    sku: item.sku,
                    name: item.itemName,
                    unit: master?.baseUnit || 'Unit',
                    dateQtys: {}
                };
            }
            const currentQty = matrix[item.itemId].dateQtys[dateKey] || 0;
            matrix[item.itemId].dateQtys[dateKey] = currentQty + item.quantity; // Summing base quantity
        });
    });

    // 3. Build Array of Arrays for XLSX
    const headerRow = ["Kode Barang", "Nama Barang", "Satuan", ...uniqueDates];
    const dataRows = Object.values(matrix).map(row => {
        const dateValues = uniqueDates.map(d => row.dateQtys[d] || 0);
        return [row.sku, row.name, row.unit, ...dateValues];
    });

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Matrix Reject");
    XLSX.writeFile(wb, "Laporan_Reject_Matrix.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Riwayat Reject</h2>
            <div className="flex gap-2">
                <button onClick={handleCopyToClipboard} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Clipboard size={18} /> Copy Text (WA)
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    <FileSpreadsheet size={18} /> Export Matrix Excel
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Cari nama barang atau alasan..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                         <tr>
                             <th className="px-4 py-3">Tanggal</th>
                             <th className="px-4 py-3">ID Transaksi</th>
                             <th className="px-4 py-3">Barang</th>
                             <th className="px-4 py-3">Input User</th>
                             <th className="px-4 py-3">Tersimpan (Base)</th>
                             <th className="px-4 py-3">Alasan</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {filteredTransactions.map(t => (
                             <React.Fragment key={t.id}>
                                 {t.items.map((item, idx) => (
                                     <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50">
                                         {idx === 0 && (
                                             <td rowSpan={t.items.length} className="px-4 py-3 align-top border-r border-slate-50 font-medium text-slate-800 whitespace-nowrap">
                                                 {new Date(t.date).toLocaleDateString('id-ID')}
                                             </td>
                                         )}
                                         {idx === 0 && (
                                             <td rowSpan={t.items.length} className="px-4 py-3 align-top border-r border-slate-50 font-mono text-xs">
                                                 {t.id}
                                             </td>
                                         )}
                                         <td className="px-4 py-3 font-medium">{item.itemName}</td>
                                         <td className="px-4 py-3">{item.inputQuantity} {item.inputUnit}</td>
                                         <td className="px-4 py-3 text-slate-400 text-xs">{item.quantity} {masterItems.find(m=>m.id === item.itemId)?.baseUnit}</td>
                                         <td className="px-4 py-3 italic text-slate-500">{item.reason}</td>
                                     </tr>
                                 ))}
                             </React.Fragment>
                         ))}
                         {filteredTransactions.length === 0 && (
                             <tr><td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada riwayat reject ditemukan.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  );
};