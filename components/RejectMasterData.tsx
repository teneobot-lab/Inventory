
import React, { useState, useRef, useMemo } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { 
    Plus, Search, Trash2, Edit, X, Save, 
    FileSpreadsheet, Trash, Calculator, Loader2,
    CheckSquare, Square
} from 'lucide-react';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => Promise<void>;
  onUpdateItem: (item: RejectItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ 
  items, onAddItem, onUpdateItem, onDeleteItem, onBulkDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '', sku: '', category: 'UMUM', baseUnit: 'KG',
    uiConversions: [] as { name: string, divisor: number }[]
  });

  const filteredItems = useMemo(() => {
    return items.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        baseUnit: item.baseUnit,
        uiConversions: (item.conversions || []).map(c => ({
          name: c.name,
          divisor: c.factor !== 0 ? parseFloat((1 / c.factor).toFixed(6)) : 1
        }))
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: 'UMUM', baseUnit: 'KG', uiConversions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.baseUnit.trim()) {
      alert("Nama & Satuan Dasar wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const conversions: InventoryUnitConversion[] = formData.uiConversions
        .filter(c => c.name.trim() !== '')
        .map(c => ({
          name: c.name.toUpperCase().trim(),
          factor: parseFloat((1 / (c.divisor || 1)).toFixed(8))
        }));

      // REBUILD ID: Pastikan ID bersih dari karakter ilegal
      const cleanId = editingItem 
        ? String(editingItem.id).replace(/:/g, '-').trim() 
        : `REJ-${Date.now()}`;

      const payload: RejectItem = {
        id: cleanId,
        name: formData.name.toUpperCase().trim(),
        sku: formData.sku.toUpperCase().trim(),
        category: formData.category.toUpperCase().trim(),
        baseUnit: formData.baseUnit.toUpperCase().trim(),
        conversions
      };

      if (editingItem) {
        await onUpdateItem(payload);
      } else {
        await onAddItem(payload);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addConv = () => setFormData(p => ({ ...p, uiConversions: [...p.uiConversions, { name: '', divisor: 1000 }] }));
  const removeConv = (idx: number) => setFormData(p => ({ ...p, uiConversions: p.uiConversions.filter((_, i) => i !== idx) }));
  const updateConv = (idx: number, field: 'name'|'divisor', val: any) => {
    const next = [...formData.uiConversions];
    next[idx] = { ...next[idx], [field]: val };
    setFormData(p => ({ ...p, uiConversions: next }));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Master Reject (Rebuilt)</h2>
          <p className="text-xs text-slate-500">Pangkalan data barang rusak & pemusnahan aset.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
          <Plus size={16} strokeWidth={3} /> Tambah Master
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b dark:border-slate-800">
           <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 dark:text-white" placeholder="Cari master barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10 border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Produk & SKU</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-center">Base Unit</th>
                <th className="px-6 py-4">Variasi Unit</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-white uppercase">{item.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{item.category}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black">{item.baseUnit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.conversions?.map((c, i) => (
                        <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold border dark:border-slate-700">
                          1 {c.name} = {parseFloat(Number(c.factor).toFixed(6))} {item.baseUnit}
                        </span>
                      ))}
                      {(!item.conversions || item.conversions.length === 0) && <span className="text-slate-300 italic">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                      <button onClick={() => { if(confirm('Hapus master ini?')) onDeleteItem(item.id); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400">Master data kosong atau tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-xl p-8 border dark:border-slate-800 animate-scale-in">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingItem ? 'Edit Master' : 'Tambah Master'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Nama Produk</label>
                      <input required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold uppercase dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">SKU</label>
                      <input required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-mono text-sm uppercase dark:text-white" value={formData.sku} onChange={e => setFormData(p => ({...p, sku: e.target.value}))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Kategori</label>
                      <input required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold uppercase dark:text-white" value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 block text-center">Satuan Dasar (Utama)</label>
                    <input required className="w-full px-4 py-4 bg-blue-50 dark:bg-blue-900/10 border-none rounded-2xl font-black text-2xl text-center text-blue-600 uppercase tracking-widest" value={formData.baseUnit} onChange={e => setFormData(p => ({...p, baseUnit: e.target.value.toUpperCase()}))} />
                 </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 space-y-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variasi Satuan (Pembagi)</span>
                  <button type="button" onClick={addConv} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all">Tambah Varian</button>
                </div>
                <div className="space-y-3">
                  {formData.uiConversions.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm animate-scale-in">
                      <div className="flex items-center gap-2 flex-1">
                         <span className="text-slate-300 font-bold text-xs">1</span>
                         <input required placeholder="Unit" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-lg p-2 text-xs font-black uppercase text-center" value={c.name} onChange={e => updateConv(i, 'name', e.target.value.toUpperCase())} />
                      </div>
                      <span className="font-black text-slate-300">=</span>
                      <div className="flex-1 relative">
                        <input required type="number" step="any" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-lg p-2 text-xs font-black text-center" value={c.divisor} onChange={e => updateConv(i, 'divisor', parseFloat(e.target.value))} />
                        <span className="absolute -top-3.5 left-0 right-0 text-center text-[8px] font-black text-blue-500 uppercase">RASIO</span>
                      </div>
                      <span className="text-slate-400 font-bold text-[10px] w-8 truncate uppercase">{formData.baseUnit}</span>
                      <button type="button" onClick={() => removeConv(i)} className="text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  ))}
                  {formData.uiConversions.length === 0 && <p className="text-center py-2 text-[10px] text-slate-300 italic">Klik tambah untuk variasi satuan (misal: 1 BAL = 10 KG).</p>}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                  {isSubmitting ? 'Memproses...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
