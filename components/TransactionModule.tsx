
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, Calendar, Search, Save, Trash2, Upload, Loader2, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ENHANCED FUZZY SEARCH ---
  const filteredItems = items.filter(item => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    const name = item.name.toLowerCase();
    const sku = item.sku.toLowerCase();
    const category = item.category.toLowerCase();
    
    // Split query for multi-word fuzzy matching
    const words = query.split(' ').filter(w => w.length > 0);
    return words.every(word => 
      name.includes(word) || sku.includes(word) || category.includes(word)
    );
  }).slice(0, 8); // Limit suggestions for performance

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

  // --- KEYBOARD NAVIGATION LOGIC ---
  const handleKeyDownSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        selectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const handleKeyDownQty = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddToCart();
    }
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.unit);
    setShowAutocomplete(false);
    // Move focus to Qty field
    setTimeout(() => qtyInputRef.current?.focus(), 10);
  };

  const handleAddToCart = () => {
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

    setCart(prev => [...prev, newItem]);
    
    // RAPID FLOW: Reset and refocus search
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setInputUnit('');
    setHighlightedIndex(0);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const handleDeleteCartItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // --- PHOTO UPLOAD LOGIC ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fixed: Explicitly cast to File[] to ensure type safety with reader.readAsDataURL
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
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
      setShowSuccessToast(true);
      resetForm();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
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
        
        {/* LEFT COLUMN: META & PHOTOS */}
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
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>

                {isIncoming && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">No. Surat Jalan / Ref</label>
                      <input 
                        type="text" 
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        placeholder="Contoh: SJ-001"
                        className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Supplier</label>
                      <input 
                        type="text" 
                        value={supplier}
                        onChange={e => setSupplier(e.target.value)}
                        placeholder="Nama Supplier"
                        className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Opsional..."
                    className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>

                {/* MULTI PHOTO UPLOAD */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">Dokumentasi Foto</label>
                   <div className="grid grid-cols-4 gap-2 mb-2">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                           <img src={p} className="w-full h-full object-cover" alt="tx photo" />
                           <button 
                             onClick={() => removePhoto(idx)}
                             className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X size={10} />
                           </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all"
                      >
                         <ImageIcon size={20} />
                      </button>
                   </div>
                   <input 
                     ref={fileInputRef}
                     type="file" 
                     multiple 
                     accept="image/*" 
                     onChange={handlePhotoUpload} 
                     className="hidden" 
                   />
                   <p className="text-[10px] text-slate-400 uppercase font-medium">PNG, JPG up to 10MB each</p>
                </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: ITEM ENTRY & CART */}
        <div className="xl:col-span-8 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                 Input Barang
                 <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-normal">Fast Entry Active</span>
              </h3>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* ENHANCED SEARCH */}
                    <div className="md:col-span-6 relative">
                       <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">1. Cari Barang (SKU / Nama)</label>
                       <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            value={searchQuery}
                            onFocus={() => setShowAutocomplete(true)}
                            onChange={e => {
                              setSearchQuery(e.target.value);
                              setShowAutocomplete(true);
                              setSelectedItem(null);
                              setHighlightedIndex(0);
                            }}
                            onKeyDown={handleKeyDownSearch}
                            placeholder="Cari item..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                       </div>
                       
                       {/* AUTOCOMPLETE DROPDOWN */}
                       {showAutocomplete && searchQuery && !selectedItem && filteredItems.length > 0 && (
                         <div className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl mt-1 overflow-hidden animate-scale-in">
                            {filteredItems.map((item, idx) => (
                              <div 
                                key={item.id}
                                onClick={() => selectItem(item)}
                                className={`p-3 text-sm cursor-pointer border-b dark:border-slate-700 last:border-0 transition-colors flex justify-between items-center ${
                                  idx === highlightedIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="font-bold">{item.name}</div>
                                  <div className={`text-[10px] ${idx === highlightedIndex ? 'text-blue-100' : 'text-slate-400'}`}>{item.sku} • {item.category}</div>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${idx === highlightedIndex ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                  {item.stock} {item.unit}
                                </div>
                              </div>
                            ))}
                         </div>
                       )}

                       {selectedItem && (
                         <div className="absolute top-1/2 -translate-y-1/2 right-3 text-green-500 flex items-center gap-1 animate-scale-in">
                            <CheckCircle2 size={16} />
                         </div>
                       )}
                    </div>

                    {/* QUANTITY (NO SPINNERS) */}
                    <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">2. Qty</label>
                       <div className="relative">
                          <input 
                            ref={qtyInputRef}
                            type="text"
                            inputMode="numeric"
                            value={inputQty}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setInputQty(val);
                            }}
                            onKeyDown={handleKeyDownQty}
                            placeholder="0"
                            className="w-full border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                       </div>
                    </div>

                    {/* UNIT SELECTION */}
                    <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">3. Satuan</label>
                       <select 
                         value={inputUnit}
                         onChange={e => setInputUnit(e.target.value)}
                         disabled={!selectedItem}
                         className="w-full border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                       >
                         {selectedItem ? (
                           <>
                             <option value={selectedItem.unit}>{selectedItem.unit}</option>
                             {selectedItem.conversions?.map((c, i) => (
                               <option key={i} value={c.name}>{c.name}</option>
                             ))}
                           </>
                         ) : <option>Pilih Item...</option>}
                       </select>
                    </div>
                 </div>
              </div>

              {/* CART TABLE */}
              <div className="flex-1 overflow-auto border dark:border-slate-700 rounded-xl">
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
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                        <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3">
                           <span className="font-bold text-slate-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                             {item.quantity} {item.unit}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <button onClick={() => handleDeleteCartItem(idx)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors">
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-16 text-center text-slate-400 italic">
                          <div className="flex flex-col items-center gap-2">
                             <ShoppingCart size={32} className="opacity-10"/>
                             <span>Keranjang masih kosong. Gunakan Search & Enter untuk menambah.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 pt-4 border-t dark:border-slate-700 flex justify-between items-center">
                 <div className="text-xs text-slate-500">
                    Total Item: <span className="font-bold text-slate-800 dark:text-slate-200">{cart.length}</span>
                 </div>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving || cart.length === 0}
                   className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${
                     isIncoming ? 'bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-none' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-none'
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

// UI Icon used in empty state
const ShoppingCart = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);
