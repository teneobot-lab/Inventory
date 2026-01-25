import React, { useState, useRef } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, Plus, Trash2, Save, ShoppingCart, Calendar, CheckCircle } from 'lucide-react';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onSaveTransaction: (tx: RejectTransaction) => void;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onSaveTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  
  // Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Fuzzy-ish Search
  const filteredItems = masterItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.baseUnit); // Default to base
    setShowDropdown(false);
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !inputQty || !reason) {
        alert("Mohon lengkapi item, qty, dan alasan.");
        return;
    }

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
        quantity: finalQty, // Stored in Base Unit
        inputQuantity: qty, // Display purposes
        inputUnit: inputUnit,
        reason: reason
    };

    setCart([...cart, newItem]);
    
    // Reset inputs
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setReason('');
    setInputUnit('');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSave = () => {
    if (cart.length === 0) {
        alert("Keranjang kosong.");
        return;
    }

    const tx: RejectTransaction = {
        id: `TX-REJ-${Date.now()}`, // Auto generate ID
        date: new Date(date).toISOString(),
        items: cart,
        createdAt: new Date().toISOString()
    };

    onSaveTransaction(tx);
    setCart([]);
    setReason('');
    alert("Transaksi Reject Berhasil Disimpan!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <ShoppingCart /> Transaksi Reject
            </h2>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Calendar size={16} className="text-slate-500"/>
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="outline-none text-sm text-slate-700"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* INPUT FORM */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-semibold text-slate-800 mb-4">Input Barang Reject</h3>
                
                <div className="space-y-4">
                    {/* Search / Autocomplete */}
                    <div className="relative">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Cari Barang</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                type="text"
                                placeholder="Ketik nama / SKU..."
                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-200 outline-none"
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    setShowDropdown(true);
                                    setSelectedItem(null);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                        </div>
                        {showDropdown && searchQuery && !selectedItem && (
                            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                {filteredItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleSelectItem(item)}
                                        className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                    >
                                        <div className="font-medium text-slate-800">{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedItem && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle size={12} /> Barang terpilih: {selectedItem.name} ({selectedItem.baseUnit})
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Jumlah (Qty)</label>
                            <input 
                                ref={qtyInputRef}
                                type="number" 
                                placeholder="0"
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                                value={inputQty}
                                onChange={e => setInputQty(e.target.value)}
                            />
                         </div>
                         <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Satuan</label>
                            <select 
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white"
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
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Alasan Reject</label>
                        <textarea 
                            rows={2}
                            placeholder="Contoh: Rusak, Kadaluarsa, Kemasan Sobek..."
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={handleAddToCart}
                        disabled={!selectedItem}
                        className={`w-full py-2 rounded-lg font-medium text-white transition-colors flex justify-center items-center gap-2 ${selectedItem ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <Plus size={16} /> Tambah ke Keranjang
                    </button>
                </div>
            </div>

            {/* CART LIST */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Daftar Item (Keranjang)</h3>
                    <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">{cart.length} Items</span>
                </div>
                
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-white border-b border-slate-100 text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Barang</th>
                                <th className="px-4 py-3">Input</th>
                                <th className="px-4 py-3">Tersimpan (Base)</th>
                                <th className="px-4 py-3">Alasan</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{item.itemName}</div>
                                        <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        {item.inputQuantity} {item.inputUnit}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {item.quantity} {masterItems.find(m => m.id === item.itemId)?.baseUnit}
                                    </td>
                                    <td className="px-4 py-3 text-xs italic max-w-[150px] truncate">{item.reason}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleRemoveFromCart(idx)} className="text-red-500 hover:text-red-700 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {cart.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                                        Keranjang masih kosong.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100">
                    <button 
                        onClick={handleSave}
                        disabled={cart.length === 0}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${cart.length > 0 ? 'bg-slate-800 hover:bg-slate-900 transform hover:scale-[1.01]' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <div className="flex justify-center items-center gap-2">
                            <Save size={20} /> Simpan Transaksi Reject
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
