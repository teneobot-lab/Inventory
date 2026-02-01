
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, Plus, Trash2, Save, ShoppingCart, Calendar, CheckCircle, Download, FileSpreadsheet, ChevronRight, TrendingDown, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onSaveTransaction: (tx: RejectTransaction) => void;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onAddItem, onSaveTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  
  // Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fuzzy Search
  const filteredItems = useMemo(() => {
    if (!searchQuery || selectedItem) return [];
    const query = searchQuery.toLowerCase();
    return masterItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.sku.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [masterItems, searchQuery, selectedItem]);

  // Click Outside logic for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    
    // --- SMART UNIT MEMORY (LOGIKA USER) ---
    const savedUnit = localStorage.getItem(`reject_unit_pref_${item.id}`);
    const availableUnits = [item.baseUnit, ...(item.conversions || []).map(c => c.name)];
    if (savedUnit && availableUnits.includes(savedUnit)) {
        setInputUnit(savedUnit);
    } else {
        setInputUnit(item.baseUnit);
    }

    setShowDropdown(false);
    setHighlightedIndex(-1);
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !inputQty || !reason) return;

    const qty = parseFloat(inputQty);
    if (isNaN(qty) || qty <= 0) return;

    // Calculate Base Qty based on conversion
    let finalQty = qty;
    const conversion = selectedItem.conversions?.find(c => c.name === inputUnit);
    if (conversion) {
        finalQty = qty * conversion.factor;
    }

    const newItem: RejectTransactionItem = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        sku: selectedItem.sku,
        quantity: parseFloat(finalQty.toFixed(6)), 
        inputQuantity: qty,
        inputUnit: inputUnit,
        reason: reason
    };

    // Save Preference
    localStorage.setItem(`reject_unit_pref_${selectedItem.id}`, inputUnit);

    setCart([newItem, ...cart]);
    
    // Reset inputs
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setReason('');
    setInputUnit('');
    
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) handleSelectItem(filteredItems[highlightedIndex]);
      else handleSelectItem(filteredItems[0]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Visual Impact Calculation
  const impactText = useMemo(() => {
    if (!selectedItem || !inputQty) return null;
    let ratio = 1;
    const conv = selectedItem.conversions?.find(c => c.name === inputUnit);
    if (conv) ratio = conv.factor;
    const val = parseFloat(inputQty) * ratio;
    return `${val.toFixed(3)} ${selectedItem.baseUnit}`;
  }, [selectedItem, inputQty, inputUnit]);

  const handleSave = () => {
    if (cart.length === 0) return;
    const tx: RejectTransaction = {
        id: `TX-REJ-${Date.now()}`, 
        date: new Date(date).toISOString(),
        items: cart,
        createdAt: new Date().toISOString()
    };
    onSaveTransaction(tx);
    setCart([]);
    alert("Transaksi Reject Berhasil Disimpan!");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 uppercase tracking-tighter">
                <Zap fill="currentColor"/> Input Transaksi Reject
            </h2>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar size={16} className="text-slate-500"/>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* INPUT FORM (KIRI) */}
            <div className="xl:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 h-fit space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">I. Detail Pencatatan</h3>
                
                <div className="space-y-5">
                    {/* Search Autocomplete */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Cari Barang (SKU/Nama)</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                            <input 
                                ref={searchInputRef}
                                type="text"
                                placeholder="Ketik atau scan SKU..."
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 transition-all outline-none text-lg font-bold ${selectedItem ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10 text-red-600' : 'border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-400'}`}
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSelectedItem(null); setShowDropdown(true); setHighlightedIndex(-1); }}
                                onFocus={() => setShowDropdown(true)}
                                onKeyDown={handleKeyDownSearch}
                            />
                        </div>
                        {showDropdown && filteredItems.length > 0 && (
                            <div className="absolute z-30 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl mt-2 overflow-hidden p-1">
                                {filteredItems.map((m, idx) => (
                                    <div 
                                        key={m.id} 
                                        onClick={() => handleSelectItem(m)}
                                        className={`p-4 cursor-pointer rounded-xl flex justify-between items-center transition-all ${highlightedIndex === idx ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        <div>
                                            <div className="text-sm font-black uppercase tracking-tight">{m.name}</div>
                                            <div className={`text-[10px] font-mono ${highlightedIndex === idx ? 'text-white/70' : 'text-slate-400'}`}>{m.sku}</div>
                                        </div>
                                        <ChevronRight size={18} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Jumlah</label>
                            <input 
                                ref={qtyInputRef}
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                className="w-full px-5 py-4 border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl outline-none focus:border-red-400 font-black text-2xl text-center"
                                value={inputQty}
                                onChange={e => setInputQty(e.target.value.replace(/[^0-9.]/g, ''))}
                                onKeyDown={e => e.key === 'Enter' && reasonInputRef.current?.focus()}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Satuan</label>
                            <select 
                                className="w-full px-5 py-4 border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl font-black outline-none appearance-none cursor-pointer text-center bg-white"
                                value={inputUnit}
                                onChange={e => setInputUnit(e.target.value)}
                                disabled={!selectedItem}
                            >
                                {selectedItem ? (
                                    <>
                                        <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                                        {selectedItem.conversions?.map((c, i) => (
                                            <option key={i} value={c.name}>{c.name}</option>
                                        ))}
                                    </>
                                ) : <option>-</option>}
                            </select>
                         </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Alasan Reject</label>
                        <textarea 
                            ref={reasonInputRef}
                            rows={2}
                            placeholder="Contoh: Pecah, Expired, Rusak Distributor..."
                            className="w-full px-5 py-4 border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl outline-none focus:border-red-400 font-bold text-sm resize-none"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddToCart())}
                        />
                    </div>

                    {/* Impact Calculator Visual */}
                    {impactText && (
                        <div className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 animate-in slide-in-from-top-2">
                            <TrendingDown size={24} className="text-red-500" />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Impact Stok Dasar</p>
                                <div className="text-xl font-black text-red-600 uppercase tracking-tighter">{impactText}</div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleAddToCart}
                        disabled={!selectedItem || !inputQty || !reason}
                        className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-30 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                    >
                        <Plus size={20} strokeWidth={3}/> Tambah Ke Keranjang (Enter)
                    </button>
                </div>
            </div>

            {/* CART LIST (KANAN) */}
            <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.4em] flex items-center gap-3">
                        <ShoppingCart size={18}/> Keranjang Tunggu Konfirmasi
                    </h3>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black">{cart.length} ITEM</span>
                </div>
                
                <div className="flex-1 overflow-auto max-h-[500px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white dark:bg-slate-950 border-b border-slate-50 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Barang & SKU</th>
                                <th className="px-6 py-4">Input</th>
                                <th className="px-6 py-4">Konversi Base</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.itemName}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-red-600">{item.inputQuantity} {item.inputUnit}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.quantity} {masterItems.find(m => m.id === item.itemId)?.baseUnit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => {
                                            const next = [...cart]; next.splice(idx, 1); setCart(next);
                                        }} className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {cart.length === 0 && (
                                <tr><td colSpan={4} className="p-24 text-center text-slate-400 text-xs italic">Keranjang masih kosong. Pilih barang di sebelah kiri.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={handleSave}
                        disabled={cart.length === 0}
                        className={`w-full py-4 rounded-2xl font-black text-white shadow-2xl transition-all flex justify-center items-center gap-3 uppercase tracking-[0.3em] text-[11px] ${cart.length > 0 ? 'bg-slate-900 hover:bg-black shadow-slate-900/20 active:scale-[0.99]' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <Save size={18} /> Finalisasi & Simpan Semua Log
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
