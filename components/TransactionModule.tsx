
import React, { useState, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, Calendar, Search, Save, Trash2, Upload, Loader2, X, CheckCircle2, FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';
import { Toast } from './Toast';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface TransactionModuleProps {
  type: TransactionType;
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onSaveTransaction: (t: Transaction) => Promise<void>;
  onUpdateTransaction: (t: Transaction) => Promise<void>;
  initialData?: Transaction | null;
  onCancelEdit?: () => void;
  performerName?: string;
}

export const TransactionModule: React.FC<TransactionModuleProps> = ({ 
  type, items, onAddItem, onSaveTransaction, onUpdateTransaction, initialData, onCancelEdit, performerName = 'Admin' 
}) => {
  const isIncoming = type === 'IN';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<TransactionItem[] | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const parsed: TransactionItem[] = data.map((row: any) => {
        const match = items.find(i => i.sku === String(row.SKU));
        return {
          itemId: match?.id || `NEW-${Date.now()}`,
          itemName: row.Nama || match?.name || "Unknown",
          sku: String(row.SKU),
          quantity: parseFloat(row.Qty) || 0,
          unit: row.Satuan || match?.unit || "pcs"
        };
      });
      setImportPreview(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const confirmBulkImport = () => {
    if (importPreview) {
      setCart([...cart, ...importPreview]);
      setImportPreview(null);
    }
  };

  const handleSave = async () => {
    if (cart.length === 0) return alert("Keranjang kosong");
    setIsSaving(true);
    try {
      const tx: Transaction = {
        id: `TX-${Date.now()}`,
        type,
        date: new Date(date).toISOString(),
        notes,
        items: cart,
        performer: performerName,
        photos: []
      };
      await onSaveTransaction(tx);
      setShowSuccessToast(true);
      setCart([]);
      setNotes('');
    } catch (e) {
      alert("Error: " + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <Toast message="Transaksi Berhasil Disimpan" isVisible={showSuccessToast} onClose={() => setShowSuccessToast(false)} />

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isIncoming ? 'text-green-600' : 'text-orange-600'}`}>
          {isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
          Transaksi {isIncoming ? 'Masuk' : 'Keluar'}
        </h2>
        <div className="flex gap-2">
            <input type="file" id="bulk-upload" className="hidden" accept=".xlsx,.xls" onChange={handleBulkImport} />
            <label htmlFor="bulk-upload" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200">
                <FileSpreadsheet size={18}/> Bulk Import
            </label>
        </div>
      </div>

      {importPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border dark:border-slate-800">
                <div className="p-4 bg-blue-600 text-white font-bold flex justify-between">
                    <span>Preview Import Data</span>
                    <button onClick={() => setImportPreview(null)}><X /></button>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b dark:border-slate-800">
                                <th className="py-2">SKU</th>
                                <th className="py-2">Nama</th>
                                <th className="py-2 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {importPreview.map((item, idx) => (
                                <tr key={idx} className="border-b dark:border-slate-800">
                                    <td className="py-2">{item.sku}</td>
                                    <td className="py-2">{item.itemName}</td>
                                    <td className="py-2 text-right font-bold">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 flex gap-2">
                    <button onClick={() => setImportPreview(null)} className="flex-1 py-2 bg-white dark:bg-slate-700 border rounded-lg">Batal</button>
                    <button onClick={confirmBulkImport} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Tambahkan ke Keranjang</button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 space-y-4 h-fit">
            <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Pilih Barang</label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg outline-none" 
                      placeholder="Cari Nama/SKU..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl max-h-40 overflow-auto">
                            {items.filter(i => i.status === 'active' && (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku.toLowerCase().includes(searchQuery.toLowerCase()))).map(item => (
                                <div key={item.id} onClick={() => { setSelectedItem(item); setSearchQuery(item.name); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 dark:border-slate-700">
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-[10px] text-slate-400">Stock: {item.stock} {item.unit}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">JUMLAH</label>
                    <input type="number" className="w-full p-2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg font-bold" value={inputQty} onChange={e => setInputQty(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">SATUAN</label>
                    <select className="w-full p-2 border dark:border-slate-700 dark:bg-slate-800 rounded-lg bg-white" disabled={!selectedItem}>
                        <option>{selectedItem?.unit || 'Pilih...'}</option>
                    </select>
                </div>
            </div>
            <button 
                onClick={() => {
                    if(!selectedItem || !inputQty) return;
                    setCart([...cart, { itemId: selectedItem.id, itemName: selectedItem.name, sku: selectedItem.sku, quantity: parseFloat(inputQty), unit: selectedItem.unit }]);
                    setSelectedItem(null); setSearchQuery(''); setInputQty('');
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all"
            >
                Tambah ke Keranjang
            </button>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 flex flex-col h-[500px]">
            <div className="p-4 border-b dark:border-slate-800 font-bold flex justify-between">
                <span>Daftar Item Transaksi</span>
                <span className="text-slate-400 font-normal">Total: {cart.length} SKU</span>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Nama Barang</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                        {cart.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3">
                                    <div className="font-bold">{item.itemName}</div>
                                    <div className="text-[10px] text-slate-400">{item.sku}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 block mb-1">CATATAN TRANSAKSI</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm outline-none resize-none" rows={2} placeholder="Keterangan tambahan..."></textarea>
                </div>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving || cart.length === 0} 
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                    Simpan Transaksi Permanen
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
