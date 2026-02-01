
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

/**
 * Enterprise-Grade Response Handler
 */
const handleResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    if (res.status === 502) {
      throw new Error(`Server Error (502 Bad Gateway): VPS Backend (89.21.85.28:3010) tidak merespons. Periksa Firewall VPS.`);
    }
    throw new Error(`Server Error (${res.status}): Respons bukan JSON.`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
};

export const api = {
  checkConnection: async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
      return res.ok ? await res.json() : { online: false, db: false };
    } catch { return { online: false, db: false }; }
  },

  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, { method: 'POST', headers, body: JSON.stringify({ username, password }) });
    const data = await handleResponse(res);
    return data.success ? data.data : null;
  },

  // --- INVENTORY ---
  getInventory: async () => {
    const res = await fetch(`${API_URL}/inventory`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  updateInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(item.id)}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  deleteInventoryBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/inventory/bulk-delete`, { method: 'POST', headers, body: JSON.stringify({ ids }) });
    return await handleResponse(res);
  },

  // --- TRANSACTIONS ---
  getTransactions: async () => {
    const res = await fetch(`${API_URL}/transactions`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },
  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${encodeURIComponent(tx.id)}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // --- USERS ---
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addUser: async (u: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(u) });
    return await handleResponse(res);
  },
  updateUser: async (u: User) => {
    const res = await fetch(`${API_URL}/users/${encodeURIComponent(u.id)}`, { method: 'PUT', headers, body: JSON.stringify(u) });
    return await handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // --- REJECT MODULE (REBUILT) ---
  getRejectMaster: async () => {
    const res = await fetch(`${API_URL}/reject/master`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  updateRejectMaster: async (item: RejectItem) => {
    const cleanId = String(item.id).replace(/:/g, '-').trim();
    const res = await fetch(`${API_URL}/reject/master/${encodeURIComponent(cleanId)}`, { 
      method: 'PUT', 
      headers, 
      body: JSON.stringify({ ...item, id: cleanId }) 
    });
    return await handleResponse(res);
  },
  deleteRejectMaster: async (id: string) => {
    const cleanId = String(id).replace(/:/g, '-').trim();
    const res = await fetch(`${API_URL}/reject/master/${encodeURIComponent(cleanId)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  deleteRejectMasterBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/reject/master/bulk`, { method: 'DELETE', headers, body: JSON.stringify({ ids }) });
    return await handleResponse(res);
  },
  getRejectTransactions: async () => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },

  // --- MEDIA PLAYER ---
  getPlaylists: async () => {
    const res = await fetch(`${API_URL}/playlists`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  createPlaylist: async (name: string) => {
    const res = await fetch(`${API_URL}/playlists`, { method: 'POST', headers, body: JSON.stringify({ id: `PL-${Date.now()}`, name }) });
    return await handleResponse(res);
  },
  deletePlaylist: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  getPlaylistItems: async (pid: string) => {
    const res = await fetch(`${API_URL}/playlists/${encodeURIComponent(pid)}/items`);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.data || []);
  },
  addPlaylistItem: async (pid: string, item: any) => {
    const res = await fetch(`${API_URL}/playlists/${encodeURIComponent(pid)}/items`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deletePlaylistItem: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // --- SYSTEM ---
  resetDatabase: async () => {
    const res = await fetch(`${API_URL}/system/reset`, { method: 'POST', headers });
    return await handleResponse(res);
  }
};
