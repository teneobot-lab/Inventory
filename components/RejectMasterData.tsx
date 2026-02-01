
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

interface UIConversion extends InventoryUnitConversion {
    operator: '*' | '/';
    inputValue: number;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: '', baseUnit: 'KG', conversions: []
  });

  const [uiConversions, setUiConversions] = useState<UIConversion[]>([]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
        setEditingItem(item);
        setFormData({ ...item });
        
        // REFINED: Map database factors back to UI state correctly
        const uiConvs: UIConversion[] = (item.conversions || []).map(c => {
            const isDivide = c.factor < 1;
            return {
                name: c.name,
                factor: c.factor,
                operator: isDivide ? '/' : '*',
                inputValue: isDivide ? parseFloat((1 / c.factor).toFixed(4)) : c.factor
            };
        });
        setUiConversions(uiConvs);
    } else {
        setEditingItem(null);
        setFormData({ name: '', sku: '', category: '', baseUnit: 'KG', conversions: [] });
        setUiConversions([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // REFINED: Ensure factor is never zero or invalid
    const finalConversions: InventoryUnitConversion[] = uiConversions.map(c => {
        let factor = 1;
        if (c.operator === '*') {
            factor = c.inputValue || 1;
        } else {
            factor = c.inputValue !== 0 ? (1 / c.inputValue) : 1;
        }
        return {
            name: c.name.toUpperCase(),
            factor: parseFloat(factor.toFixed(6))
        };
    });

    const payload = {
      ...formData,
      conversions: finalConversions,
      id: editingItem?.id || `REJ-${Date.now()}` // Ensure ID is preserved for updates
    } as RejectItem;

    if (editingItem) {
        onUpdateItem(payload);
    } else {
        onAddItem(payload);
    }
    setIsModalOpen(false);
  };

  const addConversion = () => {
    setUiConversions([
        ...uiConversions, 
        { name: '', factor: 1, operator: '*', inputValue: 1 }
    ]);
  };

  const updateConversion = (index: number, field: keyof UIConversion, value: string | number) => {
    const current = [...uiConversions];
    current[index] = { ...current[index], [field]: value };
    setUiConversions(current);
  };

  const removeConversion = (index: number) => {
    const current = [...uiConversions];
    current.splice(index, 1);
    setUiConversions(current);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      let count = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        onAddItem({
          id: `REJ-IMP-${Math.random().toString(36).substr(2, 5)}`,
          name: String(row[0] || 'Unknown'),
          sku: String(row[1] || `SKU-${Math.random()}`),
          category: String(row[2] || 'General'),
          baseUnit: String(row[3] || 'pcs'),
          conversions: []
        });
        count++;
      }
      alert(`Import ${count} data berhasil.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Data Reject</h2>
          <p className="text-sm text-slate-500">Gunakan kolom pencarian untuk menemukan barang.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
            <FileSpreadsheet size={18} /> Import XLSX
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-sm">
            <Plus size={18} /> Tambah Barang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="Cari barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-10 border-b">
              <tr>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Satuan Utama</th>
                <th className="px-6 py-4">Konversi Satuan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                  <td className="px-6 py-4"><span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">{item.baseUnit.toUpperCase()}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.conversions && item.conversions.length > 0 ? item.conversions.map((c, i) => (
                        <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                          1 {c.name} = {parseFloat(Number(c.factor).toFixed(6))} {item.baseUnit}
                        </span>
                      )) : <span className="text-slate-300 italic">No alternative units</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={16} /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto border">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Barang Reject' : 'Tambah Master Reject'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Barang</label>
                 <input required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                   <input required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori</label>
                   <input required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satuan Utama (Base)</label>
                 <input required placeholder="KG / PCS" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
               </div>

               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Atur Konversi</label>
                    <button type="button" onClick={addConversion} className="text-blue-600 text-xs flex items-center gap-1.5 font-bold bg-white px-2 py-1 rounded-lg border shadow-sm hover:bg-blue-50 transition-colors"><PlusCircle size={14}/> Tambah Satuan</button>
                  </div>
                  
                  <div className="space-y-2">
                      {uiConversions.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-scale-in">
                           <span className="text-slate-400 font-bold text-sm">1</span>
                           <input placeholder="Satuan" className="w-24 border rounded-lg p-2 text-sm text-center font-bold" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value)} required />
                           <div className="flex bg-slate-100 rounded-lg p-1">
                               <button type="button" onClick={() => updateConversion(idx, 'operator', '*')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${c.operator === '*' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>×</button>
                               <button type="button" onClick={() => updateConversion(idx, 'operator', '/')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${c.operator === '/' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500'}`}>÷</button>
                           </div>
                           <input type="number" step="any" className="w-24 border rounded-lg p-2 text-sm text-center font-bold" value={c.inputValue} onChange={e => updateConversion(idx, 'inputValue', parseFloat(e.target.value))} required />
                           <span className="text-slate-400 font-bold text-sm">{formData.baseUnit}</span>
                           <button type="button" onClick={() => removeConversion(idx)} className="text-red-400 hover:text-red-600 ml-auto p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      {uiConversions.length === 0 && <p className="text-center text-slate-400 text-xs italic py-4">Belum ada konversi ditambahkan.</p>}
                  </div>
               </div>

               <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-4">
                 {editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
