
import React, { useState } from 'react';
import { InventoryItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Edit2, Trash2, AlertCircle, CheckCircle, X, PlusCircle, Trash, Ban } from 'lucide-react';

interface InventoryModuleProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkDeleteItem?: (ids: string[]) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', stock: '0', minStock: '5', unit: 'pcs', price: '0', status: 'active' as 'active' | 'inactive',
    conversions: [] as InventoryUnitConversion[]
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, sku: item.sku, category: item.category, stock: item.stock.toString(),
        minStock: item.minStock.toString(), unit: item.unit, price: item.price.toString(),
        status: item.status || 'active', conversions: item.conversions || []
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: '', stock: '0', minStock: '5', unit: 'pcs', price: '0', status: 'active', conversions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: InventoryItem = {
      id: editingItem?.id || `INV-${Date.now()}`,
      name: formData.name, sku: formData.sku, category: formData.category,
      stock: parseFloat(formData.stock) || 0, minStock: parseFloat(formData.minStock) || 0,
      unit: formData.unit, price: parseFloat(formData.price) || 0, status: formData.status,
      conversions: formData.conversions, lastUpdated: new Date().toISOString()
    };
    if (editingItem) onUpdateItem(payload);
    else onAddItem(payload);
    setIsModalOpen(false);
  };

  const toggleStatus = (item: InventoryItem) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    onUpdateItem({ ...item, status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Master Inventory</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700">
          <Plus size={18} /> Tambah Barang
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Cari SKU atau Nama..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg outline-none"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px] sticky top-0">
              <tr>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Stok</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${item.status === 'inactive' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-6 py-4 font-bold">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{item.sku}</td>
                  <td className="px-6 py-4 font-bold">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4">Rp {item.price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {item.status === 'active' ? 
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">AKTIF</span> :
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">NONAKTIF</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => toggleStatus(item)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title={item.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
                        {item.status === 'active' ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
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
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-bold mb-6">{editingItem ? 'Edit Produk' : 'Tambah Produk'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA BARANG</label>
                  <input required className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SKU</label>
                  <input required className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 outline-none" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">KATEGORI</label>
                  <input required className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SATUAN UTAMA</label>
                  <input required className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">HARGA</label>
                  <input type="number" className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold">Batal</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
