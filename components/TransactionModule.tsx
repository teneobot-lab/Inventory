
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, Calendar, CheckCircle, Search, Save, X, Trash2, Upload, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Toast } from './Toast';

interface TransactionModuleProps {
  type: TransactionType;
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onSaveTransaction: (t: Transaction) => Promise<void> | void;
  onUpdateTransaction: (t: Transaction) => Promise<void> | void;
  initialData?: Transaction | null;
  onCancelEdit?: () => void;
  performerName?: string;
}

export const TransactionModule: React.FC<TransactionModuleProps> = ({ 
  type, 
  items, 
  onAddItem,
  onSaveTransaction, 
  onUpdateTransaction,
  initialData,
  onCancelEdit,
  performerName = 'Admin'
}) => {
  const isIncoming = type === 'IN';
  
  const [isEditing, setIsEditing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputQty, setInputQty] = useState<string>('');
  const [inputUnit, setInputUnit] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (initialData) {
      setIsEditing(true);
      setTransactionId(initialData.id);
      setDate(initialData.date.split('T')[0]);
      setReferenceNumber(initialData.referenceNumber || '');
      setSupplier(initialData.supplier || '');
      setNotes(initialData.notes);
      setPhotos(initialData.photos || []);
      setCart([...initialData.items]);
    } else {
      resetForm();
    }
  }, [initialData, type]);

  const resetForm = () => {
    setIsEditing(false);
    setTransactionId(`TX-${Date.now()}-${Math.floor(Math.random()*1000)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setSupplier('');
    setNotes('');
    setPhotos([]);
    setCart([]);
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setInputUnit('');
    if (onCancelEdit) onCancelEdit();
  };

  const handleAddItem = () => {
    if (!selectedItem || !inputQty) return;
    const qtyNum = parseFloat(inputQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const newItem: TransactionItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      sku: selectedItem.sku,
      quantity: qtyNum,
      unit: inputUnit || selectedItem.unit
    };

    setCart([...cart, newItem]);
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setInputUnit('');
    setShowAutocomplete(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Fix: Added missing handleDeleteCartItem function to handle removing items from cart
  const handleDeleteCartItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    setIsSaving(true);

    const transactionData: Transaction = {
      id: transactionId,
      type,
      date: new Date(date).toISOString(),
      referenceNumber: isIncoming ? referenceNumber : undefined,
      supplier: isIncoming ? supplier : undefined,
      notes,
      photos,
      items: cart,
      performer: performerName
    };

    try {
      if (isEditing) {
        await onUpdateTransaction(transactionData);
      } else {
        await onSaveTransaction(transactionData);
      }
      
      // CRITICAL: Notif & Reset hanya setelah await berhasil
      setShowSuccessToast(true);
      resetForm();
    } catch (error: any) {
      console.error("Gagal menyimpan transaksi:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.unit);
    setShowAutocomplete(false);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <Toast 
        message="Transaksi berhasil dicatat ke sistem." 
        isVisible={showSuccessToast} 
        onClose={() => setShowSuccessToast(false)} 
      />

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isIncoming ? 'text-green-600' : 'text-orange-600'}`}>
          {isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
          {isEditing ? 'Edit Transaksi' : (isIncoming ? 'Transaksi Masuk' : 'Transaksi Keluar')}
        </h2>
        {isEditing && (
          <button onClick={resetForm} className="text-sm font-medium text-slate-400 hover:text-slate-600">Batal Edit</button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Calendar size={16} /> Informasi Transaksi
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ID Transaksi</label>
                  <input type="text" disabled value={transactionId} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-500 font-mono text-xs" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none" 
                  />
                </div>

                {isIncoming && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">No. Surat Jalan</label>
                      <input 
                        type="text" 
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Supplier</label>
                      <input 
                        type="text" 
                        value={supplier}
                        onChange={e => setSupplier(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none" 
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan</label>
                  <textarea 
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none resize-none" 
                  />
                </div>
              </div>
           </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Input Item</h3>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 relative">
                       <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Barang / SKU</label>
                       <input 
                         ref={searchInputRef}
                         type="text" 
                         value={searchQuery}
                         onChange={e => {
                           setSearchQuery(e.target.value);
                           setShowAutocomplete(true);
                           setSelectedItem(null);
                         }}
                         placeholder="Ketik untuk mencari..."
                         className="w-full border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none"
                       />
                       {showAutocomplete && searchQuery && !selectedItem && (
                         <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                            {filteredItems.map((item, idx) => (
                              <div 
                                key={item.id}
                                onClick={() => selectItem(item)}
                                className="p-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 last:border-0"
                              >
                                <div className="font-bold">{item.name}</div>
                                <div className="text-xs text-slate-400">{item.sku} • Stok: {item.stock}</div>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>

                    <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-400 mb-1">Qty</label>
                       <input 
                         ref={qtyInputRef}
                         type="number"
                         value={inputQty}
                         onChange={e => setInputQty(e.target.value)}
                         className="w-full border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none"
                       />
                    </div>

                    <div className="md:col-span-3">
                       <button 
                         onClick={handleAddItem}
                         className="w-full py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                       >
                         + Tambah
                       </button>
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-auto border dark:border-slate-700 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                    <tr>
                       <th className="px-4 py-3">Item</th>
                       <th className="px-4 py-3">Qty</th>
                       <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                            <div className="font-bold">{item.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right">
                           <button onClick={() => handleDeleteCartItem(idx)} className="text-red-500 p-1">
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic">Keranjang masih kosong</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 pt-4 border-t dark:border-slate-700 flex justify-end">
                 <button 
                   onClick={handleSave}
                   disabled={isSaving || cart.length === 0}
                   className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${
                     isIncoming ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                   } disabled:opacity-50`}
                 >
                   {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                   {isSaving ? 'Menyimpan...' : 'Simpan Transaksi'}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
