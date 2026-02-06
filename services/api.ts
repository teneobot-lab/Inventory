
import { InventoryItem, Transaction, User, LedgerEntry, Warehouse, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';
const headers = { 'Content-Type': 'application/json' };

export const api = {
  // --- Auth ---
  login: async (username: string, password: string): Promise<User | null> => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.user : null;
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return res.ok ? res.json() : [];
  },
  addUser: async (u: User) => {
    return (await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(u) })).json();
  },
  updateUser: async (u: User) => {
    return (await fetch(`${API_URL}/users/${u.id}`, { method: 'PUT', headers, body: JSON.stringify(u) })).json();
  },
  deleteUser: async (id: string) => {
    return (await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' })).json();
  },

  // --- Warehouses ---
  getWarehouses: async (): Promise<Warehouse[]> => {
    const res = await fetch(`${API_URL}/warehouses`);
    return res.ok ? res.json() : [
        { id: 'wh-main', name: 'Gudang Utama (Jakarta)', location: 'Jakarta Utara' },
        { id: 'wh-dist', name: 'Gudang Distribusi (Bekasi)', location: 'Bekasi Barat' }
    ];
  },

  // --- Inventory & Ledger ---
  getInventory: async (): Promise<InventoryItem[]> => {
    const res = await fetch(`${API_URL}/inventory`);
    return res.ok ? res.json() : [];
  },

  getLedger: async (params?: { itemId?: string, warehouseId?: string }): Promise<LedgerEntry[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_URL}/ledger?${query}`);
    return res.ok ? res.json() : [];
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_URL}/transactions`);
    return res.ok ? res.json() : [];
  },

  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(tx) 
    });
    if (!res.ok) throw new Error("Gagal menyimpan transaksi");
    return res.json();
  },

  // --- Reject Module ---
  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return res.ok ? res.json() : [];
  },
  addRejectMaster: async (item: RejectItem) => {
    return (await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) })).json();
  },
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    return res.ok ? res.json() : [];
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    return (await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) })).json();
  },

  // --- Playlist / Media Player ---
  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await fetch(`${API_URL}/playlists`);
    return res.ok ? res.json() : [];
  },
  createPlaylist: async (name: string) => {
    return (await fetch(`${API_URL}/playlists`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ id: Date.now().toString(), name }) 
    })).json();
  },
  deletePlaylist: async (id: string) => {
    return (await fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' })).json();
  },
  getPlaylistItems: async (pid: string): Promise<PlaylistItem[]> => {
    const res = await fetch(`${API_URL}/playlists/${pid}/items`);
    return res.ok ? res.json() : [];
  },
  addPlaylistItem: async (pid: string, item: Partial<PlaylistItem>) => {
    return (await fetch(`${API_URL}/playlists/${pid}/items`, { method: 'POST', headers, body: JSON.stringify(item) })).json();
  },
  deletePlaylistItem: async (itemId: string) => {
    return (await fetch(`${API_URL}/playlists/items/${itemId}`, { method: 'DELETE' })).json();
  },

  // --- System ---
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/health`, { method: 'GET' });
      return res.ok;
    } catch { return false; }
  },
  
  resetDatabase: async () => (await fetch(`${API_URL}/system/reset`, { method: 'POST' })).json()
};
