
import React, { useState, useRef } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Trash2, Edit, Upload, X, Save, FileSpreadsheet, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onUpdateItem: (item: RejectItem) => void;
  onDeleteItem: (id: string) => void;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: '', baseUnit: 'KG', conversions: []
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
        setEditingItem(item);
        setFormData({ ...item });
    } else {
        setEditingItem(null);
        setFormData({ name: '', sku: '', category: '', baseUnit: 'KG', conversions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, id: editingItem?.id || `REJ-${Date.now()}` } as RejectItem;
    if (editingItem) onUpdateItem(payload);
    else onAddItem(payload);
    setIsModalOpen(false);
  };

  const addConversion = () => {
    setFormData(prev => ({
      ...prev,
      conversions: [...(prev.conversions || []), { name: '', factor: 1 }]
    }));
  };

  const updateConversion = (idx: number, field: keyof InventoryUnitConversion, value: any) => {
    const next = [...(formData.conversions || [])];
    next[idx] = { ...next[idx], [field]: value };
    setFormData({ ...formData, conversions: next });
  };

  const removeConversion = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      conversions: prev.conversions?.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Data Reject</h2>
          <p className="text-sm text-slate-500">Logika: 1 [Satuan Utama] = [X] [Satuan Kecil]. Input Satuan Kecil akan otomatis DIBAGI.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-sm">
          <Plus size={18} /> Tambah Barang
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="Cari barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b">
              <tr>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Satuan Utama</th>
                <th className="px-6 py-4">Konversi (Per 1 Utama)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">{item.name} <div className="text-xs font-normal text-slate-400">{item.sku}</div></td>
                  <td className="px-6 py-4"><span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">{item.baseUnit.toUpperCase()}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.conversions?.map((c, i) => (
                        <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border">
                          1 {item.baseUnit} = {c.factor} {c.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 border">
            <h3 className="text-xl font-bold mb-6">{editingItem ? 'Edit Master Reject' : 'Tambah Master Reject'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Barang</label>
                 <input required className="w-full border rounded-lg p-2.5 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                   <input required className="w-full border rounded-lg p-2.5 outline-none" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satuan Utama (Misal: KG)</label>
                   <input required className="w-full border rounded-lg p-2.5 outline-none font-bold text-blue-600" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                 </div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-600 uppercase">Definisi Satuan Kecil</label>
                    <button type="button" onClick={addConversion} className="text-blue-600 text-xs font-bold bg-white px-2 py-1 rounded border hover:bg-blue-50">Tambah Satuan</button>
                  </div>
                  {formData.conversions?.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border mb-2">
                       <span className="text-slate-400 text-sm">1 {formData.baseUnit} =</span>
                       <input type="number" step="any" className="w-24 border rounded p-2 text-sm text-center font-bold" value={c.factor} onChange={e => updateConversion(idx, 'factor', parseFloat(e.target.value))} required />
                       <input placeholder="Nama Satuan (GR)" className="flex-1 border rounded p-2 text-sm font-bold" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value)} required />
                       <button type="button" onClick={() => removeConversion(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </div>
                  ))}
               </div>
               <div className="flex gap-2 pt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Batal</button>
                 <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">Simpan</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
