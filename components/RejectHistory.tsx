
import React, { useState } from 'react';
import { RejectTransaction, RejectItem } from '../types';
import { Search, Clipboard, FileSpreadsheet, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface RejectHistoryProps {
  transactions: RejectTransaction[];
  masterItems: RejectItem[];
  onEditTransaction: (tx: RejectTransaction) => void;
}

export const RejectHistory: React.FC<RejectHistoryProps> = ({ transactions, masterItems, onEditTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter(t => 
    t.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || i.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async (id: string) => {
      if (confirm("Hapus riwayat ini?")) {
          await api.deleteRejectTransaction(id);
          window.location.reload();
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border">
            <h2 className="text-xl font-bold">Riwayat Transaksi Reject</h2>
            <div className="flex gap-2">
                <input type="text" placeholder="Cari riwayat..." className="border rounded p-2 text-sm dark:bg-slate-800" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold">
                    <tr><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Item</th><th className="px-6 py-4">Qty (Input)</th><th className="px-6 py-4">Qty (Base)</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                            <td className="px-6 py-4">
                                {t.items.map((item, i) => (
                                    <div key={i} className="mb-1"><div className="font-bold">{item.itemName}</div><div className="text-[10px] text-slate-400 italic">{item.reason}</div></div>
                                ))}
                            </td>
                            <td className="px-6 py-4 font-bold">{t.items[0].inputQuantity} {t.items[0].inputUnit}</td>
                            <td className="px-6 py-4 text-blue-600 font-bold">{parseFloat(t.items[0].quantity.toFixed(3))} Base</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => onEditTransaction(t)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
