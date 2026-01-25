import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, Calendar, CheckCircle, Search, Save, X, Trash2, Upload, FileSpreadsheet, Image as ImageIcon, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TransactionModuleProps {
  type: TransactionType;
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void; // New prop for Auto-Create
  onSaveTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  initialData?: Transaction | null;
  onCancelEdit?: () => void;
}

export const TransactionModule: React.FC<TransactionModuleProps> = ({ 
  type, 
  items, 
  onAddItem,
  onSaveTransaction, 
  onUpdateTransaction,
  initialData,
  onCancelEdit
}) => {
  const isIncoming = type === 'IN';
  
  // -- State Management --
  const [isEditing, setIsEditing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Cart State
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  // Input State for Cart (Rapid Input)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputQty, setInputQty] = useState<string>('');
  const [inputUnit, setInputUnit] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Filtered list for autocomplete
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartFileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // -- Effects --
  
  // Handle Initial Data for Editing (from History)
  useEffect(() => {
    if (initialData) {
      setIsEditing(true);
      setTransactionId(initialData.id);
      setDate(initialData.date.split('T')[0]);
      setReferenceNumber(initialData.referenceNumber || '');
      setNotes(initialData.notes);
      setPhotos(initialData.photos || []);
      setCart([...initialData.items]);
    } else {
      // If no initial data (or switching menu), reset
      resetForm();
    }
  }, [initialData, type]);

  const resetForm = () => {
    setIsEditing(false);
    setTransactionId(`TX-${Date.now()}-${Math.floor(Math.random()*1000)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setNotes('');
    setPhotos([]);
    setCart([]);
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setInputUnit('');
    if (onCancelEdit) onCancelEdit();
  };

  // -- Cart Logic --
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
    
    // Reset Input fields for rapid entry
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setInputUnit('');
    setShowAutocomplete(false);
    
    // Return Focus to Search
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleDeleteCartItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // -- Autocomplete Logic --
  const handleKeyDownSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showAutocomplete && filteredItems[highlightedIndex]) {
        selectItem(filteredItems[highlightedIndex]);
      }
    }
  };

  const handleKeyDownQty = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddItem();
      }
  };

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.unit);
    setShowAutocomplete(false);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // -- XLSX Template Download --
  const handleDownloadTemplate = () => {
    const headers = ["SKU", "Nama Barang", "Qty", "Satuan"];
    const sample = ["NEW-001", "Contoh Barang Baru", 10, "pcs"];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Transaksi");
    XLSX.writeFile(wb, "template_transaksi.xlsx");
  };

  // -- XLSX Import for Cart (with Auto Create) --
  const handleCartImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const newCartItems: TransactionItem[] = [];
      let autoCreatedCount = 0;
      
      // Skip header
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        
        const sku = String(row[0]).trim();
        const name = String(row[1]).trim();
        const qty = parseFloat(String(row[2]));
        const unit = row[3] ? String(row[3]).trim() : 'pcs';

        if (!sku || isNaN(qty) || qty <= 0) continue;

        let matchedItem = items.find(it => it.sku.toLowerCase() === sku.toLowerCase());

        // AUTO CREATE LOGIC
        if (!matchedItem) {
            const newItem: InventoryItem = {
                id: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: name || `New Item (${sku})`,
                sku: sku,
                category: 'Uncategorized',
                stock: 0,
                minStock: 0,
                unit: unit,
                price: 0,
                lastUpdated: new Date().toISOString()
            };
            onAddItem(newItem);
            matchedItem = newItem; // Use this new item
            autoCreatedCount++;
        }
        
        newCartItems.push({
          itemId: matchedItem.id,
          itemName: matchedItem.name,
          sku: matchedItem.sku,
          quantity: qty,
          unit: unit
        });
      }
      
      if (newCartItems.length > 0) {
        setCart([...cart, ...newCartItems]);
        let msg = `Berhasil menambahkan ${newCartItems.length} item ke keranjang.`;
        if (autoCreatedCount > 0) msg += `\n(${autoCreatedCount} item baru dibuat otomatis)`;
        alert(msg);
      } else {
        alert("Tidak ada data valid ditemukan.");
      }
      if (cartFileInputRef.current) cartFileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file as Blob);
  };

  // -- Photo Handling --
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // -- Save Transaction --
  const handleSave = () => {
    if (cart.length === 0) {
      alert("Keranjang kosong!");
      return;
    }

    // SOFT VALIDATION (Stock < 0) for OUT Transactions
    if (type === 'OUT') {
        const warningItems: string[] = [];
        cart.forEach(cItem => {
            const currentItem = items.find(i => i.id === cItem.itemId);
            if (currentItem) {
                const predictedStock = currentItem.stock - cItem.quantity;
                if (predictedStock < 0) {
                    warningItems.push(`${cItem.itemName} (Sisa: ${currentItem.stock}, Keluar: ${cItem.quantity} => ${predictedStock})`);
                }
            }
        });

        if (warningItems.length > 0) {
            const confirmed = confirm(
                `PERINGATAN: Stok akan menjadi negatif untuk item berikut:\n\n` +
                warningItems.join('\n') +
                `\n\nLanjutkan transaksi?`
            );
            if (!confirmed) return;
        }
    }

    const transactionData: Transaction = {
      id: transactionId,
      type,
      date: new Date(date).toISOString(),
      referenceNumber: isIncoming ? referenceNumber : undefined,
      notes,
      photos,
      items: cart,
      performer: 'Current User'
    };

    if (isEditing) {
      onUpdateTransaction(transactionData);
    } else {
      onSaveTransaction(transactionData);
    }
    
    resetForm();
    alert("Transaksi Berhasil Disimpan!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER: Title */}
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isIncoming ? 'text-green-600' : 'text-orange-600'}`}>
          {isIncoming ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
          {isEditing ? 'Edit Transaksi' : (isIncoming ? 'Transaksi Masuk' : 'Transaksi Keluar')}
        </h2>
        {isEditing && (
          <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <X size={16} /> Cancel Edit
          </button>
        )}
      </div>

      {/* MAIN FORM: Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Detail Informasi */}
        <div className="xl:col-span-4 space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar size={18} /> Detail Informasi
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID Transaksi (Auto)</label>
                  <input type="text" disabled value={transactionId} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-500 font-mono text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>

                {isIncoming && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Surat Jalan</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SJ-2023-001"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan / Notes</label>
                  <textarea 
                    rows={4}
                    placeholder="Catatan tambahan..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                  />
                </div>

                {isIncoming && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dokumentasi / Foto</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                       {photos.map((photo, idx) => (
                         <div key={idx} className="relative w-16 h-16 border rounded-lg overflow-hidden group">
                           <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black bg-opacity-40 hidden group-hover:flex items-center justify-center gap-1">
                             <a href={photo} download={`photo-${idx}.jpg`} className="text-white hover:text-blue-300"><Download size={12}/></a>
                             <button onClick={() => removePhoto(idx)} className="text-white hover:text-red-300"><X size={12}/></button>
                           </div>
                         </div>
                       ))}
                       <button onClick={() => photoInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                         <Upload size={20} />
                       </button>
                    </div>
                    <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* RIGHT PANEL: Keranjang Barang */}
        <div className="xl:col-span-8 space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Search size={18} /> Keranjang Barang
                 </h3>
                 <div className="flex gap-2">
                   <button onClick={handleDownloadTemplate} className="text-xs flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                     <Download size={14}/> Template
                   </button>
                   <button onClick={() => cartFileInputRef.current?.click()} className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100">
                     <FileSpreadsheet size={14}/> Import Items (XLSX)
                   </button>
                   <input ref={cartFileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleCartImport} />
                 </div>
              </div>

              {/* RAPID INPUT FORM */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* Autocomplete Field */}
                    <div className="md:col-span-6 relative">
                       <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Barang (SKU/Nama)</label>
                       <input 
                         ref={searchInputRef}
                         type="text" 
                         value={searchQuery}
                         onChange={e => {
                           setSearchQuery(e.target.value);
                           setShowAutocomplete(true);
                           setSelectedItem(null); // Clear selection if typing
                         }}
                         onKeyDown={handleKeyDownSearch}
                         onFocus={() => setShowAutocomplete(true)}
                         placeholder="Ketik untuk mencari..."
                         className={`w-full border rounded-lg p-2.5 outline-none ${selectedItem ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}
                       />
                       {selectedItem && <CheckCircle size={16} className="absolute right-3 top-9 text-green-600" />}
                       
                       {/* Dropdown */}
                       {showAutocomplete && searchQuery && !selectedItem && (
                         <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                              filteredItems.map((item, idx) => (
                                <div 
                                  key={item.id}
                                  onClick={() => selectItem(item)}
                                  className={`p-2.5 text-sm cursor-pointer hover:bg-slate-50 flex justify-between items-center ${idx === highlightedIndex ? 'bg-blue-50' : ''}`}
                                >
                                  <div>
                                    <div className="font-medium text-slate-800">{item.name}</div>
                                    <div className="text-xs text-slate-500">{item.sku}</div>
                                  </div>
                                  <div className="text-xs bg-slate-100 px-2 py-1 rounded">Stock: {item.stock}</div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-sm text-slate-400 text-center">
                                 <span className="block">Tidak ditemukan.</span>
                                 <span className="text-xs italic">Akan dibuat otomatis jika diimport.</span>
                              </div>
                            )}
                         </div>
                       )}
                    </div>

                    {/* Qty Field */}
                    <div className="md:col-span-2">
                       <label className="block text-xs font-semibold text-slate-600 mb-1">Qty</label>
                       <input 
                         ref={qtyInputRef}
                         id="qty-input"
                         type="number"
                         min="0"
                         placeholder=""
                         value={inputQty}
                         onChange={e => setInputQty(e.target.value)}
                         onKeyDown={handleKeyDownQty}
                         className="w-full border border-slate-300 rounded-lg p-2.5 outline-none"
                         style={{ appearance: 'textfield' }} 
                       />
                       <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button {-webkit-appearance: none; margin: 0;}`}</style>
                    </div>

                    {/* Unit Field */}
                    <div className="md:col-span-2">
                       <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan</label>
                       <select 
                         value={inputUnit}
                         onChange={e => setInputUnit(e.target.value)}
                         onKeyDown={handleKeyDownQty}
                         className="w-full border border-slate-300 rounded-lg p-2.5 outline-none bg-white"
                       >
                         {selectedItem ? (
                           <>
                             <option value={selectedItem.unit}>{selectedItem.unit}</option>
                             {selectedItem.conversions?.map(c => (
                               <option key={c.name} value={c.name}>{c.name}</option>
                             ))}
                           </>
                         ) : (
                           <option value="">-</option>
                         )}
                       </select>
                    </div>

                    {/* Add Button */}
                    <div className="md:col-span-2">
                       <button 
                         onClick={handleAddItem}
                         className={`w-full py-2.5 rounded-lg font-medium text-white transition-colors ${selectedItem && inputQty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                       >
                         + Add
                       </button>
                    </div>
                 </div>
              </div>

              {/* CART TABLE */}
              <div className="flex-1 overflow-auto border rounded-lg border-slate-100">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-xs sticky top-0">
                    <tr>
                       <th className="px-4 py-3">No</th>
                       <th className="px-4 py-3">SKU</th>
                       <th className="px-4 py-3">Item Name</th>
                       <th className="px-4 py-3">Qty</th>
                       <th className="px-4 py-3">Unit</th>
                       <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{item.quantity}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right">
                           <button onClick={() => handleDeleteCartItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          Keranjang kosong. Tambahkan barang melalui form di atas atau import Excel.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-sm text-slate-500">
                   Total Item: <span className="font-bold text-slate-800">{cart.length}</span>
                 </div>
                 <button 
                   onClick={handleSave}
                   className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-all transform hover:scale-105 ${
                     isIncoming ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                   }`}
                 >
                   <Save size={20} /> Simpan Transaksi
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};