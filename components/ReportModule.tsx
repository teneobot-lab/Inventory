
import React, { useState } from 'react';
import { InventoryItem, Transaction } from '../types';
import { FileText, FileSpreadsheet, Search, Filter, Calendar, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportModuleProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

interface FlattenedTransaction {
  id: string;
  date: string;
  type: string;
  reference: string;
  supplier: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  notes: string;
}

export const ReportModule: React.FC<ReportModuleProps> = ({ items, transactions }) => {
  // Filter States
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  // Logic to flatten transactions (Item Level Granularity)
  const getFilteredData = (): FlattenedTransaction[] => {
    let data: FlattenedTransaction[] = [];

    transactions.forEach(t => {
      // 1. Date Filter
      const tDate = t.date.split('T')[0];
      if (tDate < startDate || tDate > endDate) return;

      // 2. Type Filter
      if (filterType !== 'ALL' && t.type !== filterType) return;

      t.items.forEach(item => {
        // 3. Item Filter
        if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;

        data.push({
          id: t.id,
          date: tDate,
          type: t.type,
          reference: t.referenceNumber || '-',
          supplier: t.supplier || '-',
          itemName: item.itemName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          notes: t.notes
        });
      });
    });

    // Sort by date descending
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredData = getFilteredData();

  // --- EXPORT HANDLERS ---

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(filteredData.map(d => ({
      "ID Transaksi": d.id,
      "Tanggal": d.date,
      "Tipe": d.type,
      "Referensi": d.reference,
      "Supplier": d.supplier,
      "SKU": d.sku,
      "Nama Barang": d.itemName,
      "Qty": d.quantity,
      "Satuan": d.unit,
      "Catatan": d.notes
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");
    const fileName = `Laporan_Stok_${startDate}_sd_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Transaksi Barang", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 22);
    doc.text(`Tipe: ${filterType} | Item: ${selectedItemId === 'ALL' ? 'Semua' : items.find(i => i.id === selectedItemId)?.name}`, 14, 27);
    
    const tableColumn = ["Tanggal", "Tipe", "Ref/Supp", "Barang", "Qty", "Satuan", "Ket"];
    const tableRows: any[] = [];

    filteredData.forEach(d => {
      const rowData = [
        d.date,
        d.type,
        d.type === 'IN' ? d.supplier : d.reference,
        d.itemName,
        d.quantity,
        d.unit,
        d.notes
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [47, 53, 66] }
    });

    doc.save(`Laporan_Stok_${startDate}_sd_${endDate}.pdf`);
  };

  const handleResetFilters = () => {
    setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setFilterType('ALL');
    setSelectedItemId('ALL');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan & Export</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Generate laporan per barang, tanggal, dan jenis transaksi.</p>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-2 mb-6 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-50 dark:border-slate-800 pb-3">
            <Filter size={18} /> Parameter Laporan
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
               <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">Dari Tanggal</label>
               <input 
                 type="date" 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-slate-200"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
               />
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">Sampai Tanggal</label>
               <input 
                 type="date" 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-slate-200"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
               />
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">Tipe Transaksi</label>
               <select 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value as any)}
               >
                 <option value="ALL">Semua Aliran</option>
                 <option value="IN">Masuk Saja (IN)</option>
                 <option value="OUT">Keluar Saja (OUT)</option>
               </select>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">Filter Barang</label>
               <select 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                 value={selectedItemId}
                 onChange={(e) => setSelectedItemId(e.target.value)}
               >
                 <option value="ALL">Semua Katalog</option>
                 {items.map(item => (
                   <option key={item.id} value={item.id}>{item.name}</option>
                 ))}
               </select>
            </div>

            <div className="flex items-end">
               <button 
                 onClick={handleResetFilters}
                 className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl transition-all text-sm border border-transparent dark:border-slate-700 shadow-sm"
               >
                 <RefreshCw size={16} /> Reset
               </button>
            </div>
         </div>
      </div>

      {/* ACTION & PREVIEW SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
         <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
               Laporan Preview <span className="text-slate-400 dark:text-slate-500 font-normal ml-2">[{filteredData.length} records matched]</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
               <button 
                 onClick={handleExportPDF}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-200 dark:shadow-none active:scale-95"
               >
                 <FileText size={18} /> PDF
               </button>
               <button 
                 onClick={handleExportExcel}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none active:scale-95"
               >
                 <FileSpreadsheet size={18} /> EXCEL
               </button>
            </div>
         </div>

         {/* TABLE PREVIEW */}
         <div className="overflow-x-auto max-h-[550px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
               <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-xs font-bold sticky top-0 shadow-sm z-10">
                  <tr>
                     <th className="px-6 py-4">Tanggal</th>
                     <th className="px-6 py-4">ID & Alur</th>
                     <th className="px-6 py-4">Item Catalog</th>
                     <th className="px-6 py-4 text-right">Vol</th>
                     <th className="px-6 py-4">Metadata</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredData.map((row, idx) => (
                     <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-200">
                           {row.date}
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-mono text-[10px] text-slate-400 mb-1">{row.id}</div>
                           <div>
                              {row.type === 'IN' 
                                ? <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded border border-green-100 dark:border-green-900/50">MASUK</span>
                                : <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/50">KELUAR</span>
                              }
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-slate-800 dark:text-slate-200">{row.itemName}</div>
                           <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{row.sku}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="font-bold text-slate-900 dark:text-slate-100">{row.quantity}</span> <span className="text-[10px] text-slate-400">{row.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-[11px] leading-relaxed">
                           <div className="flex flex-col gap-1">
                              <span className="text-slate-400">Ref: <span className="text-slate-600 dark:text-slate-300 font-medium">{row.reference}</span></span>
                              <span className="text-slate-400">Supp: <span className="text-slate-600 dark:text-slate-300 font-medium">{row.supplier}</span></span>
                              {row.notes && <span className="italic text-slate-500 dark:text-slate-400 truncate max-w-[200px] bg-slate-50 dark:bg-slate-800 p-1 rounded">"{row.notes}"</span>}
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredData.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-24 text-center text-slate-400">
                           <div className="flex flex-col items-center gap-3">
                              <Search size={48} className="opacity-10 dark:opacity-5"/>
                              <p className="text-sm font-medium">No records found matching criteria.</p>
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
