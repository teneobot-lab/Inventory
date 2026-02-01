
import React, { useState, useEffect, useRef } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, Plus, Trash2, Save, ShoppingCart, Calendar, CheckCircle, X, Loader2 } from 'lucide-react';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onSaveTransaction: (tx: RejectTransaction) => Promise<void>;
  initialData?: RejectTransaction | null;
  onCancelEdit?: () => void;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onSaveTransaction, initialData, onCancelEdit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
      if (initialData) {
          setDate(initialData.date.split('T')[0]);
          setCart([...initialData.items]);
      } else {
          setCart([]);
          setDate(new Date().toISOString().split('T')[0]);
      }
  }, [initialData]);

  const filteredItems = masterItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
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

    // LOGIKA PERBAIKAN: Pembagian (Base = Input / Factor)
    // Contoh: 500 GRM / 1000 = 0.5 KG
    let finalQty = qty;
    const conversion = selectedItem.conversions?.find(c => c.name === inputUnit);
    if (conversion && conversion.factor > 0) {
        finalQty = qty / conversion.factor;
    }

    const newItem: RejectTransactionItem = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        sku: selectedItem.sku,
        quantity: finalQty,
        inputQuantity: qty,
        inputUnit: inputUnit,
        reason: reason
    };

    setCart([...cart, newItem]);
    setSelectedItem(null); setSearchQuery(''); setInputQty(''); setReason('');
  };

  const handleSave = async () => {
    if (cart.length === 0) return;
    setIsSaving(true);
    try {
        const tx: RejectTransaction = {
            id: initialData?.id || `REJ-${Date.now()}`, 
            date: new Date(date).toISOString(),
            items: cart,
            createdAt: initialData?.createdAt || new Date().toISOString()
        };
        await onSaveTransaction(tx);
        setCart([]);
    } catch (e) { alert("Simpan gagal"); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <ShoppingCart /> {initialData ? 'Edit Transaksi Reject' : 'Transaksi Reject Baru'}
            </h2>
            <div className="flex gap-2">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded p-2 text-sm dark:bg-slate-800" />
                {initialData && <button onClick={onCancelEdit} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded text-sm font-bold">Batal Edit</button>}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border space-y-4 h-fit">
                <div className="relative">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Pilih Barang Master</label>
                    <input type="text" placeholder="Cari SKU/Nama..." className="w-full border rounded-lg p-2 text-sm dark:bg-slate-800" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
                    {showDropdown && searchQuery && (
                        <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border rounded-lg shadow-xl mt-1 max-h-40 overflow-auto">
                            {filteredItems.map(item => (
                                <div key={item.id} onClick={() => handleSelectItem(item)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0">
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-[10px] text-slate-400">{item.sku}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Qty" className="w-full border rounded-lg p-2 font-bold dark:bg-slate-800" value={inputQty} onChange={e => setInputQty(e.target.value)} />
                    <select className="w-full border rounded-lg p-2 text-sm dark:bg-slate-800" value={inputUnit} onChange={e => setInputUnit(e.target.value)}>
                        {selectedItem ? (
                            <>
                                <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                                {selectedItem.conversions?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </>
                        ) : <option>Unit...</option>}
                    </select>
                </div>
                <textarea placeholder="Alasan Reject..." className="w-full border rounded-lg p-2 text-sm h-20 dark:bg-slate-800" value={reason} onChange={e => setReason(e.target.value)} />
                <button onClick={handleAddToCart} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all">Tambah Item</button>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border flex flex-col h-[500px]">
                <div className="p-4 border-b font-bold">Keranjang Barang Reject ({cart.length})</div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                            <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Input</th><th className="px-4 py-3">Base Qty</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {cart.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3"><div className="font-bold">{item.itemName}</div><div className="text-[10px] text-slate-400 italic">{item.reason}</div></td>
                                    <td className="px-4 py-3 font-bold">{item.inputQuantity} {item.inputUnit}</td>
                                    <td className="px-4 py-3 text-blue-600 font-bold">{parseFloat(item.quantity.toFixed(3))} Base</td>
                                    <td className="px-4 py-3 text-right"><button onClick={() => setCart(cart.filter((_,i)=>i!==idx))} className="text-red-500"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t">
                    <button onClick={handleSave} disabled={isSaving || cart.length === 0} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin"/> : <Save/>} SIMPAN TRANSAKSI PERMANEN
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
