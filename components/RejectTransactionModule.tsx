
import React, { useState, useRef } from 'react';
import { RejectItem, RejectTransaction, RejectTransactionItem } from '../types';
import { Search, Plus, Trash2, Save, ShoppingCart, Calendar, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectTransactionModuleProps {
  masterItems: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onSaveTransaction: (tx: RejectTransaction) => void;
}

export const RejectTransactionModule: React.FC<RejectTransactionModuleProps> = ({ masterItems, onAddItem, onSaveTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<RejectTransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = masterItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setInputUnit(item.baseUnit);
    setShowDropdown(false);
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !inputQty || !reason) return alert("Mohon lengkapi item, qty, dan alasan.");
    const qty = parseFloat(inputQty);
    if (isNaN(qty) || qty <= 0) return;

    // LOGIKA DI BAGI: BaseQty = InputQty / Factor
    let finalQty = qty;
    const conversion = selectedItem.conversions?.find(c => c.name === inputUnit);
    if (conversion && conversion.factor !== 0) {
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
    setSelectedItem(null);
    setSearchQuery('');
    setInputQty('');
    setReason('');
    setInputUnit('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleSave = () => {
    if (cart.length === 0) return alert("Keranjang kosong.");
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
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2"><ShoppingCart /> Transaksi Reject</h2>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="outline-none text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border h-fit">
                <div className="space-y-4">
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">1. Pilih Barang</label>
                        <input ref={searchInputRef} type="text" placeholder="Cari..." className="w-full pl-3 pr-3 py-2 border rounded-lg text-sm outline-none" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedItem(null); }} onFocus={() => setShowDropdown(true)} />
                        {showDropdown && searchQuery && !selectedItem && (
                            <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                {filteredItems.map(item => (
                                    <div key={item.id} onClick={() => handleSelectItem(item)} className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0">
                                        <div className="font-bold">{item.name}</div>
                                        <div className="text-xs text-slate-400">{item.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">2. Jumlah</label>
                            <input ref={qtyInputRef} type="number" step="any" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={inputQty} onChange={e => setInputQty(e.target.value)} />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">3. Satuan</label>
                            <select className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white" value={inputUnit} onChange={e => setInputUnit(e.target.value)} disabled={!selectedItem}>
                                {selectedItem && (
                                    <>
                                        <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                                        {selectedItem.conversions?.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                                    </>
                                )}
                            </select>
                         </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">4. Alasan Reject</label>
                        <textarea rows={2} placeholder="Misal: Rusak, Kadaluarsa..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none" value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                    <button onClick={handleAddToCart} className={`w-full py-3 rounded-xl font-bold text-white ${selectedItem ? 'bg-red-600' : 'bg-slate-300'}`} disabled={!selectedItem}>Tambah</button>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border flex flex-col">
                <div className="p-4 border-b font-bold text-slate-700">Keranjang Reject</div>
                <div className="flex-1 overflow-auto min-h-[300px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Barang</th>
                                <th className="px-4 py-3">Input</th>
                                <th className="px-4 py-3">Hasil (Base)</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cart.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 font-medium">{item.itemName}</td>
                                    <td className="px-4 py-3">{item.inputQuantity} {item.inputUnit}</td>
                                    <td className="px-4 py-3 text-red-600 font-bold">{parseFloat(item.quantity.toFixed(4))} {masterItems.find(m=>m.id === item.itemId)?.baseUnit}</td>
                                    <td className="px-4 py-3 text-right"><button onClick={() => setCart(cart.filter((_,i)=>i!==idx))} className="text-red-500"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t">
                    <button onClick={handleSave} disabled={cart.length === 0} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">Simpan Transaksi Reject</button>
                </div>
            </div>
        </div>
    </div>
  );
};
