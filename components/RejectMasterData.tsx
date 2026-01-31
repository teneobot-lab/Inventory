
import React, { useState, useRef } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Trash2, Edit, Upload, X, Save, FileSpreadsheet, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onUpdateItem: (item: RejectItem) => void; // Added for edit capability
  onDeleteItem: (id: string) => void;
}

// Extended interface for UI state to handle "Operator" choice
interface UIConversion extends InventoryUnitConversion {
    operator: '*' | '/';
    inputValue: number;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: '', baseUnit: 'KG', conversions: []
  });

  // UI State for conversions (to handle * or / logic before saving as factor)
  const [uiConversions, setUiConversions] = useState<UIConversion[]>([]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- CRUD Logic ---
  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
        setEditingItem(item);
        setFormData({ ...item });
        // Transform existing factors back to UI state
        // If factor >= 1, assume multiplication (Operator: *). Value = factor.
        // If factor < 1, assume division (Operator: /). Value = 1 / factor.
        const uiConvs: UIConversion[] = (item.conversions || []).map(c => {
            const isMultiply = c.factor >= 1;
            return {
                ...c,
                operator: isMultiply ? '*' : '/',
                inputValue: isMultiply ? c.factor : parseFloat((1 / c.factor).toFixed(4))
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
    
    // Transform UI Conversions back to Standard conversions
    const finalConversions: InventoryUnitConversion[] = uiConversions.map(c => ({
        name: c.name,
        // If *, factor = value. If /, factor = 1/value.
        factor: c.operator === '*' ? c.inputValue : (c.inputValue !== 0 ? 1 / c.inputValue : 0)
    }));

    const payload = {
      ...formData,
      conversions: finalConversions
    } as RejectItem;

    if (editingItem) {
        onUpdateItem(payload);
    } else {
        onAddItem({
          ...payload,
          id: `REJ-${Date.now()}`,
        });
    }
    setIsModalOpen(false);
  };

  // --- Conversion Logic ---
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

  // --- XLSX Import ---
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
      // Skip header, start at index 1
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;

        const newItem: RejectItem = {
          id: `REJ-IMP-${Math.random().toString(36).substr(2, 5)}`,
          name: String(row[0] || 'Unknown'),
          sku: String(row[1] || `SKU-${Math.random()}`),
          category: String(row[2] || 'General'),
          baseUnit: String(row[3] || 'pcs'),
          conversions: []
        };

        if (row[4] && row[5]) {
           newItem.conversions?.push({
             name: String(row[4]),
             factor: parseFloat(String(row[5]))
           });
        }

        onAddItem(newItem);
        count++;
      }
      alert(`Berhasil import ${count} data master reject.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Data Reject</h2>
          <p className="text-sm text-slate-500">Database barang khusus untuk modul reject (Terpisah dari stok utama)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
            <FileSpreadsheet size={18} /> Import XLSX
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
            <Plus size={18} /> Tambah Barang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
               placeholder="Cari nama barang atau SKU..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
        </div>
        
        {/* SCROLLABLE TABLE CONTAINER */}
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 bg-slate-50">SKU</th>
                <th className="px-6 py-4 bg-slate-50">Nama Barang</th>
                <th className="px-6 py-4 bg-slate-50">Kategori</th>
                <th className="px-6 py-4 bg-slate-50">Satuan Utama (Base)</th>
                <th className="px-6 py-4 bg-slate-50">Konversi Satuan</th>
                <th className="px-6 py-4 text-right bg-slate-50">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">{item.sku}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{item.baseUnit}</span></td>
                  <td className="px-6 py-4">
                    {item.conversions && item.conversions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.conversions.map((c, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                            1 {c.name} = {parseFloat(Number(c.factor).toFixed(4))} {item.baseUnit}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-slate-400 italic">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => onDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Data tidak ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADD / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">{editingItem ? 'Edit Barang Reject' : 'Tambah Master Reject'}</h3>
               <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
                 <input required className="w-full border rounded-lg p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700">SKU</label>
                   <input required className="w-full border rounded-lg p-2" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700">Kategori</label>
                   <input required className="w-full border rounded-lg p-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700">Satuan Utama (Base Unit)</label>
                 <input required placeholder="Contoh: KG, PCS" className="w-full border rounded-lg p-2" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
               </div>

               {/* Conversion Logic */}
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-600 uppercase">Konversi Satuan (Advanced)</label>
                    <button type="button" onClick={addConversion} className="text-blue-600 text-xs flex items-center gap-1 font-bold"><PlusCircle size={14}/> Add Unit</button>
                  </div>
                  
                  {uiConversions.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada satuan alternatif.</p>}

                  {uiConversions.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2 text-sm bg-white p-2 rounded border border-slate-200">
                       <span className="text-slate-500 font-bold">1</span>
                       <input 
                         placeholder="Satuan Alt (misal: GRAM)" 
                         className="w-24 border rounded p-1 text-center font-bold" 
                         value={c.name} 
                         onChange={e => updateConversion(idx, 'name', e.target.value)} 
                         required 
                       />
                       
                       <span className="text-slate-400 text-xs">=</span>
                       
                       {/* Operator Selector */}
                       <div className="flex bg-slate-100 rounded p-0.5">
                           <button 
                             type="button"
                             onClick={() => updateConversion(idx, 'operator', '*')}
                             className={`px-2 py-0.5 rounded text-xs font-bold ${c.operator === '*' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}
                             title="Dikali"
                           >
                            ×
                           </button>
                           <button 
                             type="button"
                             onClick={() => updateConversion(idx, 'operator', '/')}
                             className={`px-2 py-0.5 rounded text-xs font-bold ${c.operator === '/' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500'}`}
                             title="Dibagi"
                           >
                            ÷
                           </button>
                       </div>

                       <input 
                         type="number" 
                         step="0.0001" 
                         placeholder="Nilai" 
                         className="w-20 border rounded p-1 text-center" 
                         value={c.inputValue} 
                         onChange={e => updateConversion(idx, 'inputValue', parseFloat(e.target.value))} 
                         required 
                       />
                       
                       <span className="text-slate-500 text-xs font-bold">{formData.baseUnit}</span>
                       <button type="button" onClick={() => removeConversion(idx)} className="text-slate-400 hover:text-red-500 ml-auto"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  
                  <div className="mt-3 text-[10px] text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
                    <p className="font-bold mb-1">Panduan Konversi:</p>
                    <ul className="list-disc pl-3 space-y-1">
                        <li>Gunakan <span className="font-bold text-blue-600">Dikali (×)</span> jika satuan besar ke kecil (1 Box = 10 Pcs).</li>
                        <li>Gunakan <span className="font-bold text-orange-600">Dibagi (÷)</span> jika satuan kecil ke besar (1 Gram = Base KG / 1000).</li>
                    </ul>
                  </div>
               </div>

               <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 mt-4 shadow-lg">
                 {editingItem ? 'Simpan Perubahan' : 'Simpan Barang Baru'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
