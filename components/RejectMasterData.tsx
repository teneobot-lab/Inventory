
import React, { useState, useRef, useMemo } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { 
    Plus, Search, Trash2, Edit, Upload, X, Save, 
    FileSpreadsheet, PlusCircle, Download, CheckSquare, Square, 
    Trash, AlertCircle, ChevronRight 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: (item: RejectItem) => void;
  onUpdateItem: (item: RejectItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void; // Optional bulk delete handler
}

interface UIConversion extends InventoryUnitConversion {
    operator: '*' | '/';
    inputValue: number;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<RejectItem>>({
    name: '', sku: '', category: '', baseUnit: 'KG', conversions: []
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
    if (confirm(`Hapus ${selectedIds.size} master data terpilih?`)) {
        if (onBulkDelete) {
            onBulkDelete(Array.from(selectedIds));
        } else {
            // Fallback to loop if bulk prop not provided
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
        
        // Map database factors back to UI state correctly
        const uiConvs: UIConversion[] = (item.conversions || []).map(c => {
            const isDivide = c.factor < 1 && c.factor !== 0;
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
        setFormData({ name: '', sku: '', category: '', baseUnit: 'PCS', conversions: [] });
        setUiConversions([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // LOGIKA: Konversi inputan menjadi faktor multiplier murni untuk database
    const finalConversions: InventoryUnitConversion[] = uiConversions.map(c => {
        let factor = 1;
        // Jika operator '/', maka factor pengali = 1 / rasio (untuk mendapatkan Base Unit)
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
      id: editingItem?.id || `REJ-${Date.now()}`
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

  // --- IMPORT & TEMPLATE LOGIC ---
  const handleDownloadTemplate = () => {
    const headers = [["Nama Barang", "SKU", "Kategori", "Satuan Utama"]];
    const sampleData = [
        ["KERUPUK KALENG 5KG", "KRP-001", "Snack", "KG"],
        ["AIR MINERAL 600ML", "AM-002", "Minuman", "BTL"]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Master Reject");
    XLSX.writeFile(wb, "template_master_reject.xlsx");
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
          name: String(row[0] || 'Tanpa Nama').trim(),
          sku: String(row[1] || `SKU-${Date.now()}-${i}`).trim(),
          category: String(row[2] || 'Umum').trim(),
          baseUnit: String(row[3] || 'PCS').trim().toUpperCase(),
          conversions: []
        });
        count++;
      }
      alert(`Berhasil mengimpor ${count} data master.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Master Data Reject</h2>
          <p className="text-sm text-slate-500">Kelola daftar barang yang dapat dicatat sebagai reject.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all text-sm font-bold">
            <Download size={18} /> Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all text-sm font-bold">
            <FileSpreadsheet size={18} /> Import Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm font-bold">
            <Plus size={18} /> Tambah Barang
          </button>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <CheckSquare size={20} />
                </div>
                <span className="font-bold">{selectedIds.size} Item Terpilih</span>
            </div>
            <button 
                onClick={handleBulkDeleteAction}
                className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-colors shadow-sm"
            >
                <Trash size={16} /> Hapus Terpilih
            </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all" 
                placeholder="Cari SKU, Nama, atau Kategori..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
             />
          </div>
        </div>
        
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-widest sticky top-0 z-10">
              <tr>
                <th className="p-6 w-12 text-center sticky left-0 z-10 bg-inherit">
                   <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-500 transition-colors">
                       {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} />}
                   </button>
                </th>
                <th className="px-6 py-4">Informasi Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Satuan Utama</th>
                <th className="px-6 py-4">Varian Unit (Konversi)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="p-6 text-center sticky left-0 bg-inherit z-10">
                      <button onClick={() => toggleSelectRow(item.id)}>
                        {selectedIds.has(item.id) ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} className="text-slate-200 dark:text-slate-700" />}
                      </button>
                  </td>
                  <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 uppercase">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{item.category}</span>
                  </td>
                  <td className="px-6 py-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">{item.baseUnit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.conversions && item.conversions.length > 0 ? item.conversions.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          1 {c.name} = {parseFloat(Number(c.factor).toFixed(6))} {item.baseUnit}
                        </div>
                      )) : <span className="text-slate-300 italic text-xs">Satuan tunggal</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(item)} className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                      <Search size={64} className="mb-4" />
                      <p className="text-lg font-bold uppercase tracking-[0.3em]">Data Tidak Ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 animate-scale-in max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                     <Edit size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    {editingItem ? 'Edit Master Reject' : 'Tambah Master Reject'}
                  </h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Nama Produk Lengkap</label>
                 <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 outline-none font-bold text-lg dark:text-white shadow-inner transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">SKU Barang</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 outline-none font-mono font-bold dark:text-white shadow-inner transition-all" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Kategori</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 outline-none font-bold dark:text-white shadow-inner transition-all" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Satuan Dasar (UTAMA)</label>
                 <input required placeholder="Contoh: KG atau PCS" className="w-full bg-blue-50 dark:bg-blue-900/20 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 outline-none font-black text-blue-600 uppercase tracking-widest shadow-inner" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
               </div>

               <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-blue-600">
                        <PlusCircle size={16} />
                        <label className="text-[11px] font-black uppercase tracking-[0.2em]">Konversi Satuan Lain</label>
                    </div>
                    <button type="button" onClick={addConversion} className="text-white text-[10px] font-black bg-blue-600 px-4 py-2 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all uppercase tracking-widest">Tambah Varian</button>
                  </div>
                  
                  <div className="space-y-3">
                      {uiConversions.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in zoom-in duration-200">
                           <span className="text-slate-400 font-black text-sm w-4">1</span>
                           <input placeholder="Unit" className="w-24 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-xl p-2 text-xs text-center font-black uppercase outline-none" value={c.name} onChange={e => updateConversion(idx, 'name', e.target.value)} required />
                           <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                               <button type="button" onClick={() => updateConversion(idx, 'operator', '*')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${c.operator === '*' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>×</button>
                               <button type="button" onClick={() => updateConversion(idx, 'operator', '/')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${c.operator === '/' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>÷</button>
                           </div>
                           <input type="number" step="any" className="w-24 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 rounded-xl p-2 text-xs text-center font-black outline-none" value={c.inputValue} onChange={e => updateConversion(idx, 'inputValue', parseFloat(e.target.value))} required />
                           <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">{formData.baseUnit}</span>
                           <button type="button" onClick={() => removeConversion(idx)} className="text-slate-300 hover:text-red-500 ml-auto p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={20}/></button>
                        </div>
                      ))}
                      {uiConversions.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center gap-2 opacity-30">
                            <AlertCircle size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada varian satuan</p>
                        </div>
                      )}
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">Batal</button>
                    <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex justify-center items-center gap-3">
                        <Save size={20} /> Simpan Data Master
                    </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
