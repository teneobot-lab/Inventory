
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, Plus, Trash2, Save, ShoppingCart, Calendar, ChevronRight, Zap, Loader2 } from 'lucide-react';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onSaveTransaction: (tx: RejectTransaction) => Promise<void>;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onSaveTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Input UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery || selectedItem) return [];
    const q = searchQuery.toLowerCase();
    return masterItems.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [masterItems, searchQuery, selectedItem]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (m: RejectItem) => {
    setSelectedItem(m);
    setSearchQuery(m.name);
    
    const pref = localStorage.getItem(`rej_pref_${m.id}`);
    const units = [m.baseUnit, ...(m.conversions || []).map(c => c.name)];
    setInputUnit(pref && units.includes(pref) ? pref : m.baseUnit);
    
    setShowDropdown(false);
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !inputQty || !reason.trim()) return;
    const qtyNum = parseFloat(inputQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    let finalQty = qtyNum;
    const conv = selectedItem.conversions?.find(c => c.name === inputUnit);
    if (conv) finalQty = qtyNum * conv.factor;

    const newItem: RejectTransactionItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      sku: selectedItem.sku,
      quantity: parseFloat(finalQty.toFixed(6)),
      inputQuantity: qtyNum,
      inputUnit: inputUnit,
      reason: reason.trim()
    };

    localStorage.setItem(`rej_pref_${selectedItem.id}`, inputUnit);
    setCart([newItem, ...cart]);
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setReason('');
    searchRef.current?.focus();
  };

  const handleFinalSave = async () => {
    if (cart.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const tx: RejectTransaction = {
        id: `TX-REJ-${Date.now()}`,
        date: new Date(date).toISOString(),
        items: cart,
        createdAt: new Date().toISOString()
      };
      await onSaveTransaction(tx);
      setCart([]);
      alert("Transaksi reject berhasil dicatat!");
    } catch (e: any) {
      alert(`Gagal simpan: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border dark:border-slate-800 shadow-sm gap-4">
        <h2 className="text-xl font-black text-red-600 flex items-center gap-2 uppercase tracking-tight"><Zap fill="currentColor"/> Transaksi Reject</h2>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border dark:border-slate-700">
           <Calendar size={16} className="text-slate-400"/>
           <input type="date" className="bg-transparent outline-none font-bold text-sm dark:text-white" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-6">
           <div className="relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">1. Pilih Barang</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                <input ref={searchRef} className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none font-bold text-lg transition-all ${selectedItem ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10 text-red-600' : 'border-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-400'}`} placeholder="Ketik SKU/Nama..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedItem(null); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
              </div>
              {showDropdown && filteredItems.length > 0 && (
                <div className="absolute z-30 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl mt-2 border dark:border-slate-700 overflow-hidden p-1">
                  {filteredItems.map((m, idx) => (
                    <div key={m.id} onClick={() => handleSelectItem(m)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer flex justify-between items-center transition-all">
                       <div><div className="text-sm font-black uppercase dark:text-white">{m.name}</div><div className="text-[10px] font-mono text-slate-400">{m.sku}</div></div>
                       <ChevronRight size={16} className="text-slate-300"/>
                    </div>
                  ))}
                </div>
              )}
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">2. Jumlah</label>
                <input ref={qtyRef} className="w-full py-4 border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl outline-none focus:border-red-400 font-black text-2xl text-center" placeholder="0" value={inputQty} onChange={e => setInputQty(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">3. Satuan</label>
                <select className="w-full h-[68px] border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl font-black outline-none px-4 text-center cursor-pointer appearance-none bg-white" value={inputUnit} onChange={e => setInputUnit(e.target.value)} disabled={!selectedItem}>
                   {selectedItem ? (
                     <>
                        <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                        {selectedItem.conversions?.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                     </>
                   ) : <option>-</option>}
                </select>
              </div>
           </div>

           <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">4. Alasan / Keterangan</label>
              <textarea ref={reasonRef} rows={2} className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-2xl outline-none focus:border-red-400 font-bold text-sm resize-none" placeholder="Misal: Pecah saat bongkar, Expired..." value={reason} onChange={e => setReason(e.target.value)} />
           </div>

           <button onClick={handleAddToCart} disabled={!selectedItem || !inputQty || !reason.trim()} className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-[0.98]">
              <Plus size={20} strokeWidth={3}/> Tambah Item
           </button>
        </div>

        <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
           <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3"><ShoppingCart size={18}/> Keranjang Reject</h3>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{cart.length} ITEM</span>
           </div>
           
           <div className="flex-1 overflow-auto max-h-[500px]">
              <table className="w-full text-left text-sm">
                 <thead className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10">
                    <tr><th className="px-6 py-4">Barang</th><th className="px-6 py-4">Qty Input</th><th className="px-6 py-4">Konversi</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                 </thead>
                 <tbody className="divide-y dark:divide-slate-800">
                    {cart.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4"><div className="font-black text-slate-800 dark:text-white uppercase text-xs">{it.itemName}</div><div className="text-[9px] font-mono text-slate-400">{it.sku}</div></td>
                        <td className="px-6 py-4"><span className="font-black text-red-600">{it.inputQuantity} {it.inputUnit}</span></td>
                        <td className="px-6 py-4"><span className="text-[10px] font-bold text-blue-500">{it.quantity} {masterItems.find(m => m.id === it.itemId)?.baseUnit}</span></td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && <tr><td colSpan={4} className="py-24 text-center text-slate-300 text-xs italic">Keranjang kosong. Masukkan item di panel kiri.</td></tr>}
                 </tbody>
              </table>
           </div>

           <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
              <button onClick={handleFinalSave} disabled={cart.length === 0 || isSaving} className={`w-full py-5 rounded-[1.5rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-[11px] ${cart.length > 0 && !isSaving ? 'bg-slate-900 hover:bg-black' : 'bg-slate-300 cursor-not-allowed'}`}>
                 {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                 {isSaving ? 'Menyimpan...' : 'Simpan Seluruh Transaksi'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
