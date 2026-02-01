
import React, { useState, useRef } from 'react';
import { RejectItem, InventoryUnitConversion } from '../types';
import { Plus, Search, Trash2, Edit, Upload, X, Save, FileSpreadsheet, Download } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface RejectMasterDataProps {
  items: RejectItem[];
  onAddItem: () => void;
  onUpdateItem: () => void;
  onDeleteItem: () => void;
}

export const RejectMasterData: React.FC<RejectMasterDataProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RejectItem | null>(null);
  const [formData, setFormData] = useState<Partial<RejectItem>>({ name: '', sku: '', category: '', baseUnit: '', conversions: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = (item?: RejectItem) => {
    if (item) { setEditingItem(item); setFormData({ ...item }); }
    else { setEditingItem(null); setFormData({ name: '', sku: '', category: '', baseUnit: '', conversions: [] }); }
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = () => {
      // Header template yang lengkap dengan konversi
      const headers = [["NAMA_BARANG", "SKU", "KATEGORI", "SATUAN_UTAMA", "UNIT_ALT_1", "FAKTOR_1", "UNIT_ALT_2", "FAKTOR_2"]];
      const sample = [["KERUPUK KALENG", "KKL-001", "MAKANAN", "KG", "GRM", 1000, "ONS", 10]];
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Reject Template");
      XLSX.writeFile(wb, "Template_Master_Reject.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row[0] || !row[1]) continue;

        const conversions: InventoryUnitConversion[] = [];
        if (row[4] && row[5]) conversions.push({ name: String(row[4]), factor: parseFloat(row[5]) });
        if (row[6] && row[7]) conversions.push({ name: String(row[6]), factor: parseFloat(row[7]) });

        await api.addRejectMaster({
          id: `REJ-${Date.now()}-${i}`,
          name: String(row[0]),
          sku: String(row[1]),
          category: String(row[2] || 'UMUM'),
          baseUnit: String(row[3] || 'PCS'),
          conversions: conversions
        });
      }
      alert("Import Selesai");
      onAddItem();
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await api.addRejectMaster({ ...formData, id: editingItem?.id || `REJ-${Date.now()}` } as RejectItem);
      setIsModalOpen(false);
      onAddItem();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Master Barang Reject</h2>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border font-bold"><Download size={18}/> Template</button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border font-bold"><Upload size={18}/> Import XLSX</button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleImport} />
          <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow-lg">+ Tambah Barang</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
              <input type="text" placeholder="Cari SKU/Nama..." className="w-full max-w-sm border rounded-lg p-2 dark:bg-slate-800" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Nama Barang</th><th className="px-6 py-4">Unit Utama</th><th className="px-6 py-4">Konversi</th><th className="px-6 py-4 text-right">Aksi</th></tr>
            </thead>
            <tbody>
              {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <tr key={item.id} className="border-b">
                  <td className="px-6 py-4 font-mono">{item.sku}</td>
                  <td className="px-6 py-4 font-bold">{item.name}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">{item.baseUnit}</td>
                  <td className="px-6 py-4 text-xs">
                    {item.conversions?.map(c => `1 ${c.name} = 1/${c.factor} ${item.baseUnit}`).join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 text-right"><button onClick={() => handleOpenModal(item)} className="text-blue-600 mr-2"><Edit size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold mb-6">Master Reject</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <input placeholder="Nama Barang" className="w-full border rounded p-2 dark:bg-slate-800" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      <input placeholder="SKU" className="w-full border rounded p-2 dark:bg-slate-800" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                      <input placeholder="Unit Utama (e.g. KG)" className="w-full border rounded p-2 dark:bg-slate-800 font-bold" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Simpan Master</button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold">Batal</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
