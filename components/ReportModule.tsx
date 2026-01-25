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

    // Header
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
      headStyles: { fillColor: [47, 53, 66] } // Slate-800 equivalent
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
           <h2 className="text-2xl font-bold text-slate-800">Laporan & Export</h2>
           <p className="text-sm text-slate-500">Generate laporan per barang, tanggal, dan jenis transaksi.</p>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold border-b border-slate-50 pb-2">
            <Filter size={18} /> Filter Laporan
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Dari Tanggal</label>
               <input 
                 type="date" 
                 className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
               />
            </div>
            <div>
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Sampai Tanggal</label>
               <input 
                 type="date" 
                 className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
               />
            </div>

            {/* Transaction Type */}
            <div>
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Jenis Transaksi</label>
               <select 
                 className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value as any)}
               >
                 <option value="ALL">Semua (IN & OUT)</option>
                 <option value="IN">Masuk (IN)</option>
                 <option value="OUT">Keluar (OUT)</option>
               </select>
            </div>

            {/* Item Select */}
            <div>
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Spesifik Barang</label>
               <select 
                 className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 value={selectedItemId}
                 onChange={(e) => setSelectedItemId(e.target.value)}
               >
                 <option value="ALL">Semua Barang</option>
                 {items.map(item => (
                   <option key={item.id} value={item.id}>{item.name}</option>
                 ))}
               </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
               <button 
                 onClick={handleResetFilters}
                 className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2 rounded-lg transition-colors text-sm"
               >
                 <RefreshCw size={16} /> Reset Filter
               </button>
            </div>
         </div>
      </div>

      {/* ACTION & PREVIEW SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="text-sm font-semibold text-slate-700">
               Preview Data <span className="text-slate-400 font-normal">({filteredData.length} baris ditemukan)</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
               <button 
                 onClick={handleExportPDF}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
               >
                 <FileText size={16} /> Export PDF
               </button>
               <button 
                 onClick={handleExportExcel}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
               >
                 <FileSpreadsheet size={16} /> Export Excel
               </button>
            </div>
         </div>

         {/* TABLE PREVIEW */}
         <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-bold sticky top-0 shadow-sm z-10">
                  <tr>
                     <th className="px-6 py-3">Tanggal</th>
                     <th className="px-6 py-3">ID & Tipe</th>
                     <th className="px-6 py-3">Barang</th>
                     <th className="px-6 py-3 text-right">Qty</th>
                     <th className="px-6 py-3">Info Tambahan</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row, idx) => (
                     <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-6 py-3 whitespace-nowrap">
                           {row.date}
                        </td>
                        <td className="px-6 py-3">
                           <div className="font-mono text-xs text-slate-500">{row.id}</div>
                           <div>
                              {row.type === 'IN' 
                                ? <span className="text-xs font-bold text-green-600 bg-green-50 px-1 rounded">IN</span>
                                : <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1 rounded">OUT</span>
                              }
                           </div>
                        </td>
                        <td className="px-6 py-3">
                           <div className="font-medium text-slate-800">{row.itemName}</div>
                           <div className="text-xs text-slate-400 font-mono">{row.sku}</div>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold">
                           {row.quantity} <span className="text-xs font-normal text-slate-500">{row.unit}</span>
                        </td>
                        <td className="px-6 py-3 text-xs">
                           <div className="grid grid-cols-[60px_1fr] gap-1">
                              <span className="text-slate-400">Ref:</span> <span className="truncate">{row.reference}</span>
                              <span className="text-slate-400">Supp:</span> <span className="truncate">{row.supplier}</span>
                              <span className="text-slate-400">Note:</span> <span className="italic truncate">{row.notes}</span>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredData.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                           <div className="flex flex-col items-center gap-2">
                              <Search size={32} className="opacity-20"/>
                              <p>Tidak ada data yang sesuai dengan filter.</p>
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