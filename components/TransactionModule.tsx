
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionLineItem, Warehouse } from '../types';
import { api } from '../services/api';
import { toBaseUnit, fromBaseUnit } from '../utils/calculations';
import { Package, Warehouse as WarehouseIcon, Search, Plus, Trash2, Save, X, Calculator, ArrowRight, AlertCircle } from 'lucide-react';
import { Decimal } from 'decimal.js';

interface TransactionModuleProps {
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';
  items: InventoryItem[];
  warehouses: Warehouse[];
  onSave: (tx: Transaction) => void;
  performerName?: string;
}

export const TransactionModule: React.FC<TransactionModuleProps> = ({ type, items, warehouses, onSave, performerName = 'Admin' }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState(`TX-${Date.now()}`);
  const [notes, setNotes] = useState('');
  const [fromWh, setFromWh] = useState(warehouses[0]?.id || '');
  const [toWh, setToWh] = useState(warehouses[0]?.id || '');
  
  const [cart, setCart] = useState<TransactionLineItem[]>([]);
  
  // Selection State
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Autocomplete
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.sku.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearch(item.name);
    setUnit(item.baseUnit);
    setShowResults(false);
    qtyRef.current?.focus();
  };

  const addToCart = () => {
    if (!selectedItem || !qty) return;
    
    const qtyNum = parseFloat(qty);
    const conversion = selectedItem.conversions.find(c => c.name === unit);
    const factor = unit === selectedItem.baseUnit ? 1 : (conversion?.factor || 1);
    
    const baseQty = toBaseUnit(qtyNum, factor);

    const newLine: TransactionLineItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: qtyNum,
      unit,
      factor,
      baseQuantity: baseQty
    };

    setCart([...cart, newLine]);
    setSelectedItem(null);
    setSearch('');
    setQty('');
    searchRef.current?.focus();
  };

  const handleSave = async () => {
    if (cart.length === 0) return;
    setIsSaving(true);
    
    const tx: Transaction = {
      id: refNo,
      type,
      date: new Date(date).toISOString(),
      fromWarehouseId: (type === 'OUT' || type === 'TRANSFER') ? fromWh : undefined,
      toWarehouseId: (type === 'IN' || type === 'TRANSFER') ? toWh : undefined,
      referenceNumber: refNo,
      notes,
      items: cart,
      performer: performerName
    };

    try {
      await onSave(tx);
      setCart([]);
      setRefNo(`TX-${Date.now()}`);
      alert("Transaksi berhasil disimpan.");
    } catch (e) {
      alert("Gagal menyimpan: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="text-emerald-500" />
            Entry Transaksi: <span className="text-emerald-500">{type}</span>
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referensi / No SJ</label>
              <input value={refNo} onChange={e => setRefNo(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/30 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none" />
            </div>
          </div>

          <div className="space-y-4">
            {(type === 'IN' || type === 'TRANSFER') && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ke Gudang (Destinasi)</label>
                <select value={toWh} onChange={e => setToWh(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
            {(type === 'OUT' || type === 'TRANSFER') && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari Gudang (Sumber)</label>
                <select value={fromWh} onChange={e => setFromWh(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none resize-none" placeholder="Masukkan keterangan tambahan..." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-fit">
           <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Plus size={16}/> Input Item</h3>
           <div className="space-y-4">
              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cari Barang</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                  <input 
                    ref={searchRef}
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setShowResults(true); }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 outline-none" 
                    placeholder="Nama / SKU..."
                  />
                </div>
                {showResults && search && !selectedItem && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {filteredItems.map(i => (
                      <button key={i.id} onClick={() => handleSelectItem(i)} className="w-full text-left p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between">
                        <span>{i.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{i.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</label>
                    <input 
                      ref={qtyRef}
                      type="number" 
                      value={qty} 
                      onChange={e => setQty(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addToCart()}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none bg-white">
                      {selectedItem && (
                        <>
                          <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                          {selectedItem.conversions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </>
                      )}
                    </select>
                 </div>
              </div>

              <button 
                onClick={addToCart}
                disabled={!selectedItem}
                className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                <Plus size={18}/> Tambah ke Daftar
              </button>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
           <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item List ({cart.length})</span>
              {type === 'TRANSFER' && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                  <WarehouseIcon size={12}/> {warehouses.find(w => w.id === fromWh)?.name} <ArrowRight size={10}/> {warehouses.find(w => w.id === toWh)?.name}
                </div>
              )}
           </div>

           <div className="flex-1 overflow-auto max-h-[400px]">
              <table className="w-full text-left text-sm">
                 <thead className="text-[10px] font-black uppercase text-slate-400 bg-white dark:bg-slate-900 sticky top-0">
                    <tr>
                       <th className="px-6 py-4">Nama Barang</th>
                       <th className="px-6 py-4">Input Qty</th>
                       <th className="px-6 py-4">Stock Qty (Base)</th>
                       <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cart.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium">{line.itemName}</td>
                        <td className="px-6 py-4 font-mono font-bold">{line.quantity} {line.unit}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                           {line.baseQuantity} {items.find(i => i.id === line.itemId)?.baseUnit}
                           {line.factor !== 1 && <span className="ml-2 opacity-50 text-[9px]">(1 {line.unit} = {line.factor})</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16}/>
                           </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-300 italic">Belum ada item ditambahkan.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving || cart.length === 0}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? < Calculator className="animate-spin" size={18}/> : <Save size={18}/>}
                Simpan Transaksi
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
