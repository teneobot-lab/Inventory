import React, { useState, useRef } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Trash2, Upload, X, Save, FileSpreadsheet, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onDeleteItem: (id: string) => void;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ items, onAddItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: '', baseUnit: 'KG', conversions: []
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- CRUD Logic ---
  const handleOpenModal = () => {
    setFormData({ name: '', sku: '', category: '', baseUnit: 'KG', conversions: [] });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddItem({
      ...formData,
      id: `REJ-${Date.now()}`,
    } as RejectItem);
    setIsModalOpen(false);
  };

  // --- Conversion Logic ---
  const addConversion = () => {
    const currentConversions = formData.conversions || [];
    setFormData({
      ...formData,
      conversions: [...currentConversions, { name: '', factor: 1 }]
    });
  };

  const updateConversion = (index: number, field: keyof InventoryUnitConversion, value: string | number) => {
    const currentConversions = [...(formData.conversions || [])];
    currentConversions[index] = { ...currentConversions[index], [field]: value };
    setFormData({ ...formData, conversions: currentConversions });
  };

  const removeConversion = (index: number) => {
    const currentConversions = [...(formData.conversions || [])];
    currentConversions.splice(index, 1);
    setFormData({ ...formData, conversions: currentConversions });
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

        // Format Excel: Name, SKU, Category, BaseUnit, AltUnit, ConversionFactor
        const newItem: RejectItem = {
          id: `REJ-IMP-${Math.random().toString(36).substr(2, 5)}`,
          name: String(row[0] || 'Unknown'),
          sku: String(row[1] || `SKU-${Math.random()}`),
          category: String(row[2] || 'General'),
          baseUnit: String(row[3] || 'pcs'),
          conversions: []
        };

        // Simple logic: if row[4] (AltUnit) and row[5] (Factor) exist, add conversion
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
          
          <button onClick={handleOpenModal} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
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
                            1 {c.name} = {c.factor} {item.baseUnit}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-slate-400 italic">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                      <Trash2 size={16} />
                    </button>
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

      {/* MODAL ADD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">Tambah Master Reject</h3>
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
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600 uppercase">Multi Satuan (Opsional)</label>
                    <button type="button" onClick={addConversion} className="text-blue-600 text-xs flex items-center gap-1"><PlusCircle size={14}/> Add Unit</button>
                  </div>
                  {formData.conversions?.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2 text-sm">
                       <span>1</span>
                       <input placeholder="Satuan (misal: GR)" className="w-24 border rounded p-1" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value)} required />
                       <span>=</span>
                       <input type="number" placeholder="Faktor" step="0.0001" className="w-20 border rounded p-1" value={c.factor} onChange={e => updateConversion(idx, 'factor', e.target.value)} required />
                       <span>{formData.baseUnit}</span>
                       <button type="button" onClick={() => removeConversion(idx)} className="text-red-500"><X size={14}/></button>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Contoh: Jika Base Unit = KG, input GR maka Faktor = 0.001. <br/>
                    Saat user input 500 GR, sistem mencatat 0.5 KG.
                  </p>
               </div>

               <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-700 mt-4">Simpan Data</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};