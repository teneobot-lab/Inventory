
import React, { useState, useRef, useMemo } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { 
    Plus, Search, Trash2, Edit, X, Save, 
    FileSpreadsheet, PlusCircle, Download, CheckSquare, Square, 
    Trash, AlertCircle, Calculator, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onUpdateItem: (item: RejectItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

// UI interface uses a 'divisor' instead of factor directly for better UX in division-only mode
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
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  
  // Selection State for Bulk Action
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

  // --- SELECTION LOGIC ---
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

  const handleBulkDeleteAction = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Hapus ${selectedIds.size} master barang reject secara permanen?`)) {
        if (onBulkDelete) {
            onBulkDelete(Array.from(selectedIds));
        } else {
            // Fallback strategy
            selectedIds.forEach(id => onDeleteItem(id));
        }
        setSelectedIds(new Set());
    }
  };

  // --- MODAL & FORM LOGIC ---
  const handleOpenModal = (item?: RejectItem) => {
    if (item) {
        setEditingItem(item);
        setFormData({ ...item });
        
        // Convert stored factors back to divisors for UI
        // Factor = BaseValue / Divisor -> Divisor = 1 / Factor
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logika Unit Kecil (Divide Mode): 
    // Jika input "1000" untuk unit "GR" ke base "KG", 
    // maka 1 GR = 1/1000 KG. Factor = 0.001.
    const finalConversions: InventoryUnitConversion[] = uiConversions.map(c => ({
        name: c.name.toUpperCase(),
        factor: c.divisor !== 0 ? parseFloat((1 / c.divisor).toFixed(8)) : 1
    }));

    const payload = {
      ...formData,
      conversions: finalConversions,
      id: editingItem?.id || `REJ-${Date.now()}`
    } as RejectItem;

    if (editingItem) onUpdateItem(payload);
    else onAddItem(payload);
    setIsModalOpen(false);
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
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Master Data Reject</h2>
          <p className="text-sm text-slate-500 font-medium italic">Katalog acuan untuk standarisasi laporan barang rusak.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-5 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all text-sm font-bold shadow-sm">
            <FileSpreadsheet size={18} /> Import Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" />
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm font-black uppercase tracking-widest">
            <Plus size={18} strokeWidth={3} /> Tambah Barang
          </button>
        </div>
      </div>

      {/* Floating Action Bar for Multiple Selection */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 duration-300 sticky top-4 z-40 border border-white/10 ring-4 ring-blue-500/20">
            <div className="flex items-center gap-4 ml-2">
                <div className="bg-blue-600 p-2.5 rounded-xl">
                    <CheckSquare size={24} />
                </div>
                <div>
                    <span className="font-black uppercase tracking-[0.2em] text-sm">{selectedIds.size} Barang Terpilih</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Batch Action Ready</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setSelectedIds(new Set())} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-slate-700">Batalkan</button>
                <button onClick={handleBulkDeleteAction} className="flex items-center gap-2 bg-red-500 text-white px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95">
                    <Trash size={16} strokeWidth={3}/> Hapus Terpilih
                </button>
            </div>
        </div>
      )}

      {/* Main Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all text-sm font-medium" placeholder="Cari SKU atau Nama Barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-6 w-12 text-center sticky left-0 z-10 bg-inherit">
                   <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-500 transition-colors">
                       {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} />}
                   </button>
                </th>
                <th className="px-6 py-4">Informasi Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-center">Satuan Dasar</th>
                <th className="px-6 py-4">Konversi Rasio</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="p-6 text-center sticky left-0 bg-inherit z-10 border-r border-slate-50 dark:border-slate-800">
                      <button onClick={() => toggleSelectRow(item.id)}>
                        {selectedIds.has(item.id) ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} className="text-slate-200 dark:text-slate-700" />}
                      </button>
                  </td>
                  <td className="px-6 py-5">
                      <div className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-base leading-none mb-1.5">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">SKU: {item.sku}</div>
                  </td>
                  <td className="px-6 py-5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{item.category}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase shadow-sm">{item.baseUnit}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {item.conversions && item.conversions.length > 0 ? item.conversions.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                          <Calculator size={12} className="text-blue-500" />
                          1 {c.name} = {parseFloat(Number(c.factor).toFixed(6))} {item.baseUnit}
                        </div>
                      )) : <span className="text-slate-300 italic text-[11px]">Satuan tunggal</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(item)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"><Edit size={18} /></button>
                        <button onClick={() => { if(confirm('Hapus master barang ini?')) onDeleteItem(item.id); }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-20 text-center text-slate-300 italic text-sm">
                        Data master tidak ditemukan atau masih kosong.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] w-full max-w-2xl p-10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-600 rounded-[1.5rem] text-white shadow-2xl shadow-blue-500/40">
                     <Edit size={32} strokeWidth={2.5}/>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{editingItem ? 'Edit Master Reject' : 'Tambah Master Baru'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1 text-center">Sistem Konversi Rasio Pembagi</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600 dark:hover:text-white p-2 transition-colors"><X size={32}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nama Produk Lengkap</label>
                 <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] p-5 outline-none font-black text-xl dark:text-white shadow-inner transition-all uppercase" placeholder="ABON AYAM..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">SKU Barang</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] p-5 outline-none font-mono font-black text-lg dark:text-white shadow-inner transition-all uppercase placeholder:text-slate-300" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Kategori</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] p-5 outline-none font-black text-lg dark:text-white shadow-inner transition-all" placeholder="UMUM" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">Satuan Dasar Utama (Acuan Stok)</label>
                 <input required placeholder="KG / PCS / DUS" className="w-full bg-blue-50 dark:bg-blue-900/20 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] p-5 outline-none font-black text-2xl text-blue-600 uppercase tracking-widest shadow-inner text-center" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value.toUpperCase()})} />
               </div>

               <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-6 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Calculator size={100} /></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3 text-blue-600">
                        <PlusCircle size={20} strokeWidth={3} />
                        <label className="text-xs font-black uppercase tracking-[0.3em]">Unit Pembagi (Sub-Unit)</label>
                    </div>
                    <button type="button" onClick={addConversion} className="text-white text-[10px] font-black bg-blue-600 px-5 py-2.5 rounded-xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-95">Tambah Varian</button>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                      {uiConversions.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-xl animate-in slide-in-from-top-2 duration-300">
                           <div className="flex items-center gap-3 flex-1">
                               <span className="text-slate-300 font-black text-lg w-4 text-center">1</span>
                               <input placeholder="Unit" className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-xl p-3 text-sm text-center font-black uppercase outline-none shadow-inner" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value.toUpperCase())} required />
                           </div>
                           
                           <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-lg font-black text-slate-400">
                               ÷
                           </div>

                           <div className="flex-1 relative">
                               <label className="absolute -top-6 left-0 right-0 text-[9px] text-center font-black text-blue-500 uppercase tracking-widest">RASIO PEMBAGI</label>
                               <input type="number" step="any" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-xl p-3 text-sm text-center font-black outline-none shadow-inner" value={c.divisor} onChange={e => updateConversion(idx, 'divisor', parseFloat(e.target.value))} required />
                           </div>

                           <div className="flex items-center gap-3">
                               <span className="text-slate-400 font-black text-xs uppercase tracking-tighter w-12 text-center truncate">{formData.baseUnit}</span>
                               <button type="button" onClick={() => removeConversion(idx)} className="text-slate-200 hover:text-red-500 p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={22}/></button>
                           </div>
                        </div>
                      ))}
                      {uiConversions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col items-center gap-3 opacity-20">
                            <AlertCircle size={40} strokeWidth={2.5}/>
                            <p className="text-xs font-black uppercase tracking-[0.4em]">Belum Ada Varian Satuan</p>
                        </div>
                      )}
                  </div>
                  <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 text-[10px] font-medium text-blue-600 leading-relaxed">
                      💡 Tip: Gunakan Rasio Pembagi untuk sub-unit. Misal: 1 GR ke KG, input rasio <b>1000</b>. Sistem akan menghitung (Qty Input / 1000) = Qty KG.
                  </div>
               </div>

               <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-[0.3em] text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[1.5rem] transition-all">Batal</button>
                    <button type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-[0.3em] text-sm flex justify-center items-center gap-4">
                        <Save size={24} strokeWidth={2.5} /> Simpan Data Master
                    </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
