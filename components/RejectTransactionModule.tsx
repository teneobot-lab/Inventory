
import React, { useState } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, ShoppingCart, Trash2, Save, Loader2, Calendar } from 'lucide-react';
import { api } from '../services/api';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onSaveTransaction: (tx: RejectTransaction) => Promise<void>;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onSaveTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredItems = masterItems.filter(item => 
    item.status === 'active' && (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.baseUnit);
    setShowDropdown(false);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !inputQty || !reason) return;
    const qty = parseFloat(inputQty);
    if (isNaN(qty) || qty <= 0) return;

    let baseQty = qty;
    if (inputUnit !== selectedItem.baseUnit) {
      const conv = selectedItem.conversions?.find(c => c.name === inputUnit);
      if (conv && conv.factor > 0) baseQty = qty / conv.factor;
    }

    const newItem: RejectTransactionItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      sku: selectedItem.sku,
      quantity: baseQty,
      inputQuantity: qty,
      inputUnit: inputUnit,
      reason: reason
    };

    setCart([...cart, newItem]);
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setReason('');
  };

  const handleSave = async () => {
    if (cart.length === 0) return;
    setIsSaving(true);
    try {
      const tx: RejectTransaction = {
        id: `REJ-${Date.now()}`,
        date: new Date(date).toISOString(),
        items: cart,
        createdAt: new Date().toISOString()
      };
      await onSaveTransaction(tx);
      setCart([]);
      alert("Reject Recorded Successfully");
    } catch (e) {
      alert("Save Failed: " + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2"><ShoppingCart /> Standalone Reject Transaction</h2>
        <input type="date" className="border rounded p-2 text-sm outline-none dark:bg-slate-800 dark:border-slate-700" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 h-fit space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">Cari Master Reject</label>
            <input 
              type="text" className="w-full border rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:border-slate-700" 
              placeholder="SKU / Nama..." value={searchQuery} 
              onFocus={() => setShowDropdown(true)}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            />
            {showDropdown && searchQuery && (
              <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border rounded-lg shadow-xl mt-1 max-h-40 overflow-auto">
                {filteredItems.map(item => (
                  <div key={item.id} onClick={() => handleSelectItem(item)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0 dark:border-slate-700">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.sku}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">JUMLAH</label>
              <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold dark:bg-slate-800 dark:border-slate-700" value={inputQty} onChange={e => setInputQty(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">SATUAN</label>
              <select className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700" value={inputUnit} onChange={e => setInputUnit(e.target.value)}>
                {selectedItem ? (
                  <>
                    <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                    {selectedItem.conversions?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </>
                ) : <option>Pilih...</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ALASAN REJECT</label>
            <textarea className="w-full border rounded-lg p-2 text-sm outline-none resize-none dark:bg-slate-800 dark:border-slate-700" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <button onClick={handleAddToCart} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg active:scale-95 transition-all">Tambahkan ke Daftar</button>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b dark:border-slate-800 font-bold">Daftar Reject</div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Barang</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {cart.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-bold">{item.itemName}</div>
                      <div className="text-[10px] text-slate-400 italic">Reason: {item.reason}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{item.inputQuantity} {item.inputUnit}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">
            <button 
              onClick={handleSave} 
              disabled={isSaving || cart.length === 0} 
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                SIMPAN DATA REJECT PERMANEN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
