
import React, { useState, useRef } from 'react';
import { InventoryItem, UnitConversion } from '../types';
import { Plus, Search, Edit2, Trash2, AlertCircle, Upload, Download, CheckSquare, X, PlusCircle, Trash, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryModuleProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkDeleteItem?: (ids: string[]) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem, onBulkDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form State - Using strings for numeric fields to allow empty state and decimals
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    stock: '',
    minStock: '',
    unit: '',
    price: '',
    conversions: [] as UnitConversion[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Bulk Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.size} item secara massal? Tindakan ini tidak dapat dibatalkan.`)) {
      if (onBulkDeleteItem) {
          onBulkDeleteItem(Array.from(selectedIds));
      } else {
          selectedIds.forEach(id => onDeleteItem(id));
      }
      setSelectedIds(new Set());
    }
  };

  // --- Modal Logic ---
  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        stock: item.stock.toString(),
        minStock: item.minStock.toString(),
        unit: item.unit,
        price: item.price.toString(),
        conversions: item.conversions || []
      });
    } else {
      setEditingItem(null);
      setFormData({ 
        name: '', sku: '', category: '', stock: '', minStock: '5', unit: 'pcs', price: '', conversions: [] 
      });
    }
    setIsModalOpen(true);
  };

  const handleNumericInput = (field: 'stock' | 'minStock' | 'price', value: string) => {
    // Allow digits and at most one decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    const dots = sanitized.split('.').length - 1;
    if (dots > 1) return;
    setFormData({ ...formData, [field]: sanitized });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedSku = formData.sku?.trim().toLowerCase();
    const isDuplicate = items.some(item => 
      item.sku.trim().toLowerCase() === normalizedSku && 
      item.id !== editingItem?.id
    );

    if (isDuplicate) {
      alert(`Gagal: SKU "${formData.sku}" sudah digunakan oleh produk lain.`);
      return;
    }

    const payload: InventoryItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      stock: parseFloat(formData.stock) || 0,
      minStock: parseFloat(formData.minStock) || 0,
      unit: formData.unit,
      baseUnit: formData.unit,
      price: parseFloat(formData.price) || 0,
      conversions: formData.conversions,
      lastUpdated: new Date().toISOString()
    };

    if (editingItem) {
      onUpdateItem(payload);
    } else {
      onAddItem(payload);
    }
    setIsModalOpen(false);
  };

  // --- Conversion Logic ---
  const addConversion = () => {
    setFormData({
      ...formData,
      conversions: [...formData.conversions, { id: Math.random().toString(36).substr(2, 9), name: '', factor: 1 }]
    });
  };

  const updateConversion = (index: number, field: keyof UnitConversion, value: string) => {
    const currentConversions = [...formData.conversions];
    if (field === 'factor') {
      const sanitized = value.replace(/[^0-9.]/g, '');
      currentConversions[index] = { ...currentConversions[index], factor: parseFloat(sanitized) || 0 };
    } else {
      currentConversions[index] = { ...currentConversions[index], [field]: value } as any;
    }
    setFormData({ ...formData, conversions: currentConversions });
  };

  const removeConversion = (index: number) => {
    const currentConversions = [...formData.conversions];
    currentConversions.splice(index, 1);
    setFormData({ ...formData, conversions: currentConversions });
  };

  // --- Import/Export Logic (XLSX) ---
  const handleDownloadTemplate = () => {
    const headers = ["name", "sku", "category", "stock", "minStock", "unit", "price"];
    const sampleData = ["Sample Item", "SMPL-001", "General", 100, 10, "pcs", 50000];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "inventory_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        alert("File seems empty or missing data rows.");
        return;
      }
      
      const existingSkusInDb = new Set(items.map(i => i.sku.trim().toLowerCase()));
      const processedSkusInCurrentFile = new Set();
      
      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const name = row[0] ? String(row[0]).trim() : "Unnamed Item";
        const skuInput = row[1] ? String(row[1]).trim() : `AUTO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const category = row[2] ? String(row[2]).trim() : "Uncategorized";
        const stock = parseFloat(String(row[3])) || 0;
        const minStock = parseFloat(String(row[4])) || 0;
        const unit = row[5] ? String(row[5]).trim() : "pcs";
        const price = parseFloat(String(row[6])) || 0;

        const normalizedSku = skuInput.toLowerCase();

        if (existingSkusInDb.has(normalizedSku) || processedSkusInCurrentFile.has(normalizedSku)) {
          skippedCount++;
          continue;
        }

        const newItem: InventoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          sku: skuInput,
          category,
          stock: isNaN(stock) ? 0 : stock,
          minStock: isNaN(minStock) ? 0 : minStock,
          unit,
          baseUnit: unit,
          price: isNaN(price) ? 0 : price,
          conversions: [],
          lastUpdated: new Date().toISOString()
        };

        onAddItem(newItem);
        processedSkusInCurrentFile.add(normalizedSku);
        importedCount++;
      }
      
      alert(`Import Selesai.\n- Berhasil: ${importedCount} item baru\n- Dilewati (SKU Duplikat): ${skippedCount} item`);
      setIsImportModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inventory Management</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors border border-transparent dark:border-slate-700"
          >
            <Upload size={18} /> Import
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Add Item
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg flex items-center justify-between animate-fade-in shadow-sm">
          <span className="text-blue-800 dark:text-blue-300 font-medium px-2">{selectedIds.size} items selected</span>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-red-100 dark:border-red-900/50 shadow-sm"
          >
            <Trash size={16} /> Delete Selected
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-auto max-h-[65vh] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 w-10 bg-slate-50 dark:bg-slate-800">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">Item Name</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">SKU</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">Stock</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">Units</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">Price</th>
                <th className="px-6 py-4 bg-slate-50 dark:bg-slate-800">Status</th>
                <th className="px-6 py-4 text-right bg-slate-50 dark:bg-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelectRow(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{item.sku}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.stock}</span> <span className="text-slate-400">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
                      <span>Base: {item.unit}</span>
                      {item.conversions && item.conversions.length > 0 && (
                        <span className="text-blue-500 dark:text-blue-400 font-medium">
                          +{item.conversions.length} variations
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">Rp {item.price.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4">
                    {item.stock <= item.minStock ? (
                      <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/50">
                        <AlertCircle size={12} /> Critical Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-[10px] uppercase bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100 dark:border-green-900/50">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit Item">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteItem(item.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Item">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                       <Search size={48} className="opacity-10 dark:opacity-5"/>
                       <p className="text-sm font-medium">No items found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-scale-in max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{editingItem ? 'Edit Product' : 'New Product'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Name</label>
                <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">SKU</label>
                  <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-sm" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                  <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Stock Level</label>
                  <input required type="text" inputMode="decimal" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold" value={formData.stock} onChange={e => handleNumericInput('stock', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Min. Alert</label>
                  <input required type="text" inputMode="decimal" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-red-500 font-bold" value={formData.minStock} onChange={e => handleNumericInput('minStock', e.target.value)} />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Unit</label>
                  <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Base Price</label>
                  <input required type="text" inputMode="decimal" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono" value={formData.price} onChange={e => handleNumericInput('price', e.target.value)} />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Variation Units</label>
                  <button type="button" onClick={addConversion} className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1.5 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors">
                    <PlusCircle size={14} /> Add Scale
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.conversions?.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">No unit variations defined.</p>}
                  {formData.conversions?.map((conv, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm animate-scale-in">
                       <span className="text-xs text-slate-400 font-bold ml-1">1</span>
                       <input 
                         type="text" 
                         className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                         value={conv.name}
                         onChange={(e) => updateConversion(idx, 'name', e.target.value)}
                         required
                       />
                       <span className="text-xs text-slate-400 font-bold">=</span>
                       <input 
                         type="text" 
                         inputMode="decimal"
                         className="w-20 bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 text-center font-bold"
                         value={conv.factor.toString()}
                         onChange={(e) => updateConversion(idx, 'factor', e.target.value)}
                         required
                       />
                       <span className="text-xs text-slate-400 font-bold pr-2">{formData.unit}</span>
                       <button type="button" onClick={() => removeConversion(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                         <Trash size={16} />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors">Discard</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100">
                   <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><FileSpreadsheet size={24} className="text-green-600 dark:text-green-400"/></div>
                   Import Data
                </h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                   <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Step 1: Prep Template</h4>
                   <p className="text-xs text-blue-600 dark:text-blue-400 mb-4 leading-relaxed">Download our standard Excel template to ensure columns match our system expectations.</p>
                   <button 
                     onClick={handleDownloadTemplate}
                     className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm"
                   >
                     <Download size={16} /> Download Template (.xlsx)
                   </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                   <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Step 2: Upload Files</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">System will auto-generate SKUs and fill missing values with defaults if detected.</p>
                   <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                 <Upload className="w-6 h-6 text-slate-400 dark:text-slate-300" />
                              </div>
                              <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-bold">Click to select</span> or drag file</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Excel spreadsheets only</p>
                          </div>
                          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
                      </label>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
