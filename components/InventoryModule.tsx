import React, { useState, useRef } from 'react';
import { InventoryItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Edit2, Trash2, AlertCircle, Upload, Download, CheckSquare, X, PlusCircle, Trash, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryModuleProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '', sku: '', category: '', stock: 0, minStock: 0, unit: 'pcs', price: 0, conversions: []
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
    if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
      selectedIds.forEach(id => onDeleteItem(id));
      setSelectedIds(new Set());
    }
  };

  // --- Modal Logic ---
  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item, conversions: item.conversions || [] });
    } else {
      setEditingItem(null);
      setFormData({ 
        name: '', sku: '', category: '', stock: 0, minStock: 5, unit: 'pcs', price: 0, conversions: [] 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItem({ ...editingItem, ...formData } as InventoryItem);
    } else {
      onAddItem({
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        lastUpdated: new Date().toISOString()
      } as InventoryItem);
    }
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

  // --- Import/Export Logic (XLSX) ---
  const handleDownloadTemplate = () => {
    // Define headers and sample data
    const headers = ["name", "sku", "category", "stock", "minStock", "unit", "price"];
    const sampleData = ["Sample Item", "SMPL-001", "General", 100, 10, "pcs", 50000];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
    
    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    
    // Download file
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
      
      // Convert sheet to JSON (array of arrays)
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Check if there is data (header + at least 1 row)
      if (jsonData.length < 2) {
        alert("File seems empty or missing data rows.");
        return;
      }
      
      let importedCount = 0;

      // Start from index 1 to skip header
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // Map columns based on template order: 
        // 0:name, 1:sku, 2:category, 3:stock, 4:minStock, 5:unit, 6:price
        
        const name = row[0] ? String(row[0]).trim() : "Unnamed Item";
        const sku = row[1] ? String(row[1]).trim() : `AUTO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const category = row[2] ? String(row[2]).trim() : "Uncategorized";
        const stock = row[3] ? parseInt(String(row[3])) : 0;
        const minStock = row[4] ? parseInt(String(row[4])) : 0;
        const unit = row[5] ? String(row[5]).trim() : "pcs";
        const price = row[6] ? parseInt(String(row[6])) : 0;

        const newItem: InventoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          sku,
          category,
          stock: isNaN(stock) ? 0 : stock,
          minStock: isNaN(minStock) ? 0 : minStock,
          unit,
          price: isNaN(price) ? 0 : price,
          conversions: [],
          lastUpdated: new Date().toISOString()
        };

        onAddItem(newItem);
        importedCount++;
      }
      
      alert(`Successfully imported ${importedCount} items from Excel.`);
      setIsImportModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={18} /> Import
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Add Item
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-blue-800 font-medium px-2">{selectedIds.size} items selected</span>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
          >
            <Trash size={16} /> Delete Selected
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* SCROLLABLE TABLE CONTAINER */}
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 w-10 bg-slate-50">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 bg-slate-50">Item Name</th>
                <th className="px-6 py-4 bg-slate-50">SKU</th>
                <th className="px-6 py-4 bg-slate-50">Stock</th>
                <th className="px-6 py-4 bg-slate-50">Units</th>
                <th className="px-6 py-4 bg-slate-50">Price</th>
                <th className="px-6 py-4 bg-slate-50">Status</th>
                <th className="px-6 py-4 text-right bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelectRow(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{item.sku}</td>
                  <td className="px-6 py-4 font-semibold">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-slate-500">
                      <span>Base: {item.unit}</span>
                      {item.conversions && item.conversions.length > 0 && (
                        <span className="text-slate-400" title={item.conversions.map(c => `1 ${c.name} = ${c.factor} ${item.unit}`).join(', ')}>
                          +{item.conversions.length} other units
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">Rp {item.price.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4">
                    {item.stock <= item.minStock ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
                        <AlertCircle size={14} /> Low Stock
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium text-xs">In Stock</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" className="w-full border rounded-lg p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                  <input required type="text" className="w-full border rounded-lg p-2" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input required type="text" className="w-full border rounded-lg p-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input required type="number" className="w-full border rounded-lg p-2" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min. Stock</label>
                  <input required type="number" className="w-full border rounded-lg p-2" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Unit</label>
                  <input required type="text" placeholder="e.g. pcs" className="w-full border rounded-lg p-2" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (Base Unit)</label>
                  <input required type="number" className="w-full border rounded-lg p-2" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>

              {/* Multi-unit Conversion Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Multi-Unit Conversions</label>
                  <button type="button" onClick={addConversion} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                    <PlusCircle size={14} /> Add Unit
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.conversions?.length === 0 && <p className="text-xs text-slate-400 italic">No additional units defined.</p>}
                  {formData.conversions?.map((conv, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                       <span className="text-sm text-slate-500">1</span>
                       <input 
                         type="text" 
                         placeholder="Unit Name (e.g. Box)" 
                         className="flex-1 border rounded-md p-1.5 text-sm"
                         value={conv.name}
                         onChange={(e) => updateConversion(idx, 'name', e.target.value)}
                         required
                       />
                       <span className="text-sm text-slate-500">=</span>
                       <input 
                         type="number" 
                         placeholder="Factor" 
                         className="w-20 border rounded-md p-1.5 text-sm"
                         value={conv.factor}
                         onChange={(e) => updateConversion(idx, 'factor', Number(e.target.value))}
                         min="0.1"
                         step="0.1"
                         required
                       />
                       <span className="text-sm text-slate-500">{formData.unit}</span>
                       <button type="button" onClick={() => removeConversion(idx)} className="text-red-500 hover:text-red-700 p-1">
                         <X size={16} />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet size={24} className="text-green-600"/> Import Inventory</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <h4 className="text-sm font-semibold text-blue-800 mb-2">Step 1: Download Template</h4>
                   <p className="text-xs text-blue-600 mb-3">Download the Excel (.xlsx) template to ensure your data is formatted correctly.</p>
                   <button 
                     onClick={handleDownloadTemplate}
                     className="flex items-center gap-2 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-sm hover:bg-blue-50 transition-colors shadow-sm"
                   >
                     <Download size={14} /> Download Excel Template
                   </button>
                </div>

                <div className="border-t border-slate-100 pt-4">
                   <h4 className="text-sm font-semibold text-slate-800 mb-2">Step 2: Upload Excel File</h4>
                   <p className="text-xs text-slate-500 mb-3">Empty columns will be auto-filled with default values (0 for numbers, 'pcs' for unit, generated SKU).</p>
                   <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-3 text-slate-400" />
                              <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-slate-500">.xlsx files only</p>
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