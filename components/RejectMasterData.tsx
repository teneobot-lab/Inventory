
import React, { useState, useRef, useMemo } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { 
    Plus, Search, Trash2, Edit, X, Save, 
    FileSpreadsheet, PlusCircle, CheckSquare, Square, 
    Trash, AlertCircle, Calculator, Loader2
} from 'lucide-react';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => Promise<void> | void;
  onUpdateItem: (item: RejectItem) => Promise<void> | void;
  onDeleteItem: (id: string) => Promise<void> | void;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
}

interface UIConversion {
    name: string;
    divisor: number;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ 
  items, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem,
  onBulkDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: 'UMUM', baseUnit: 'KG', conversions: []
  });

  const [uiConversions, setUiConversions] = useState<UIConversion[]>([]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDeleteAction = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Hapus ${selectedIds.size} master barang secara permanen?`)) {
        try {
            if (onBulkDelete) {
                await onBulkDelete(Array.from(selectedIds));
            } else {
                for (const id of selectedIds) {
                    await onDeleteItem(id);
                }
            }
            setSelectedIds(new Set());
        } catch (error: any) {
            alert(`Gagal hapus massal: ${error.message || "Kesalahan Server"}`);
        }
    }
  };

  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
        setEditingItem(item);
        setFormData({ ...item });
        const uiConvs: UIConversion[] = (item.conversions || []).map(c => ({
            name: c.name,
            divisor: c.factor !== 0 ? parseFloat((1 / c.factor).toFixed(6)) : 1
        }));
        setUiConversions(uiConvs);
    } else {
        setEditingItem(null);
        setFormData({ name: '', sku: '', category: 'UMUM', baseUnit: 'KG', conversions: [] });
        setUiConversions([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // --- ERP DATA VALIDATION ---
    const cleanName = (formData.name || '').trim().toUpperCase();
    const cleanBaseUnit = (formData.baseUnit || 'KG').trim().toUpperCase();
    const cleanSku = (formData.sku || '').trim().toUpperCase();
    const cleanCategory = (formData.category || 'UMUM').trim();

    if (!cleanName || !cleanBaseUnit) {
        alert("Nama Produk dan Satuan Dasar wajib diisi.");
        return;
    }

    setIsSubmitting(true);
    try {
        // Safe Number Conversion Helper
        const finalConversions: InventoryUnitConversion[] = uiConversions.map(c => {
            const rawDivisor = parseFloat(String(c.divisor));
            // Anti-Zero & Anti-NaN Defense
            const divisor = (isNaN(rawDivisor) || rawDivisor <= 0) ? 1 : rawDivisor;
            return {
                name: c.name.trim().toUpperCase(),
                factor: parseFloat((1 / divisor).toFixed(8))
            };
        }).filter(c => c.name !== '');

        const payload: RejectItem = {
          // ERP HARDENING: Create mode should NOT have ID, Update MUST have ID
          id: editingItem ? editingItem.id : (undefined as any), 
          name: cleanName,
          sku: cleanSku,
          category: cleanCategory,
          baseUnit: cleanBaseUnit,
          conversions: finalConversions
        };

        if (editingItem) {
          await onUpdateItem(payload);
        } else {
          await onAddItem(payload);
        }
        
        // Only close if success
        setIsModalOpen(false);
    } catch (error: any) {
        console.error("Master Reject Save Error:", error);
        alert(`Gagal menyimpan data: ${error.message || "Kesalahan Server"}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const addConversion = () => {
    setUiConversions([...uiConversions, { name: '', divisor: 1000 }]);
  };

  const updateConversion = (index: number, field: keyof UIConversion, value: any) => {
    const current = [...uiConversions];
    current[index] = { ...current[index], [field]: value };
    setUiConversions(current);
  };

  const removeConversion = (index: number) => {
    const current = [...uiConversions];
    current.splice(index, 1);
    setUiConversions(current);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Header - More Compact */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Master Reject</h2>
          <p className="text-xs text-slate-500 font-medium">Manajemen katalog barang rusak & pemusnahan.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all text-xs font-bold">
            <FileSpreadsheet size={16} /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" />
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all text-xs font-black uppercase tracking-widest">
            <Plus size={16} strokeWidth={3} /> Tambah Item
          </button>
        </div>
      </div>

      {/* Floating Batch Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 sticky top-4 z-40 border border-white/10 ring-4 ring-blue-500/10">
            <div className="flex items-center gap-3 ml-2">
                <CheckSquare size={18} className="text-blue-500" />
                <span className="font-black uppercase tracking-widest text-[10px]">{selectedIds.size} Dipilih</span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl">Batal</button>
                <button onClick={handleBulkDeleteAction} className="flex items-center gap-2 bg-red-600 text-white px-5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg">
                    <Trash size={12} strokeWidth={3}/> Hapus Massal
                </button>
            </div>
        </div>
      )}

      {/* Main Table - Enterprise Padding */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all text-xs font-medium" placeholder="Cari SKU / Nama..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-4 w-10 text-center sticky left-0 z-10 bg-inherit border-r border-slate-100 dark:border-slate-700">
                   <button onClick={toggleSelectAll}>
                       {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                   </button>
                </th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-center">Base Unit</th>
                <th className="px-4 py-3">Variasi Satuan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <td className="p-4 text-center sticky left-0 bg-inherit z-10 border-r border-slate-50 dark:border-slate-800">
                      <button onClick={() => toggleSelectRow(item.id)}>
                        {selectedIds.has(item.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-slate-200 dark:text-slate-700" />}
                      </button>
                  </td>
                  <td className="px-4 py-3">
                      <div className="font-black text-slate-800 dark:text-white uppercase leading-tight">{item.name}</div>
                      <div className="font-mono text-[9px] text-slate-400 mt-0.5">{item.sku}</div>
                  </td>
                  <td className="px-4 py-3 uppercase font-bold text-slate-500">{item.category}</td>
                  <td className="px-4 py-3 text-center">
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{item.baseUnit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.conversions && item.conversions.length > 0 ? item.conversions.map((c, i) => (
                        <div key={i} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-xs">
                          <Calculator size={10} className="text-blue-500" />
                          1 {c.name} = {parseFloat(Number(c.factor).toFixed(6))} {item.baseUnit}
                        </div>
                      )) : <span className="text-slate-300 italic text-[10px]">Tunggal</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16} /></button>
                        <button onClick={() => { if(confirm('Hapus master barang ini?')) onDeleteItem(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200 border dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                     <Edit size={24} strokeWidth={2.5}/>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingItem ? 'Edit Master Reject' : 'Barang Baru'}</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk</label>
                 <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl p-4 outline-none font-bold text-base dark:text-white uppercase transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isSubmitting} />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl p-4 outline-none font-mono font-bold text-sm dark:text-white uppercase" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} disabled={isSubmitting} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl p-4 outline-none font-bold text-sm dark:text-white uppercase" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} disabled={isSubmitting} />
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Satuan Dasar (UTAMA)</label>
                 <input required className="w-full bg-blue-50 dark:bg-blue-900/20 border-2 border-transparent focus:border-blue-500 rounded-xl p-4 outline-none font-black text-xl text-blue-600 uppercase tracking-widest text-center" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value.toUpperCase()})} disabled={isSubmitting} />
               </div>

               <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Variasi Unit (Pembagi)</label>
                    <button type="button" onClick={addConversion} className="text-white text-[9px] font-black bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 uppercase tracking-widest" disabled={isSubmitting}>Tambah Varian</button>
                  </div>
                  
                  <div className="space-y-3">
                      {uiConversions.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                           <div className="flex items-center gap-2 flex-1">
                               <span className="text-slate-300 font-black text-sm">1</span>
                               <input placeholder="Unit" className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-lg p-2 text-xs text-center font-black uppercase outline-none" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value.toUpperCase())} required disabled={isSubmitting} />
                           </div>
                           
                           <div className="font-black text-slate-400 text-base">÷</div>

                           <div className="flex-1 relative">
                               <label className="absolute -top-4 left-0 right-0 text-[8px] text-center font-black text-blue-500 uppercase tracking-widest">RASIO</label>
                               <input type="number" step="any" min="0.00000001" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-lg p-2 text-xs text-center font-black outline-none" value={c.divisor} onChange={e => updateConversion(idx, 'divisor', parseFloat(e.target.value))} required disabled={isSubmitting} />
                           </div>

                           <div className="flex items-center gap-2">
                               <span className="text-slate-400 font-bold text-[9px] uppercase w-8 truncate">{formData.baseUnit}</span>
                               <button type="button" onClick={() => removeConversion(idx)} className="text-slate-200 hover:text-red-500 transition-all" disabled={isSubmitting}><Trash2 size={18}/></button>
                           </div>
                        </div>
                      ))}
                      {uiConversions.length === 0 && <p className="text-[10px] text-slate-300 text-center italic py-2">Belum ada variasi satuan.</p>}
                  </div>
               </div>

               <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 rounded-xl" disabled={isSubmitting}>Batal</button>
                    <button type="submit" disabled={isSubmitting} className={`flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-[0.2em] text-xs flex justify-center items-center gap-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} strokeWidth={2.5} />}
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Data Master'}
                    </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
