
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return true;
  return res.json();
};

export const api = {
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/health`);
      return res.ok;
    } catch (e) { return false; }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const res = await fetch(`${API_URL}/login`, { method: 'POST', headers, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    return data.success ? data.data : null;
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    const res = await fetch(`${API_URL}/inventory`);
    return await handleResponse(res);
  },
  
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_URL}/transactions`);
    return await handleResponse(res);
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },

  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return await handleResponse(res);
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },

  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    return await handleResponse(res);
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },
  updateRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },
  deleteRejectTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/reject/transactions/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // --- USER MANAGEMENT ---
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return await handleResponse(res);
  },
  addUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    await handleResponse(res);
  },
  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify(user) });
    await handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // --- SYSTEM ---
  resetDatabase: async (): Promise<{success: boolean, error?: string}> => {
    const res = await fetch(`${API_URL}/system/reset`, { method: 'POST', headers });
    return await handleResponse(res);
  },

  // --- MEDIA PLAYER ---
  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await fetch(`${API_URL}/playlists`);
    return await handleResponse(res);
  },
  getPlaylistItems: async (pid: string): Promise<PlaylistItem[]> => {
    const res = await fetch(`${API_URL}/playlists/${pid}/items`);
    return await handleResponse(res);
  },
  createPlaylist: async (name: string) => {
    const res = await fetch(`${API_URL}/playlists`, { method: 'POST', headers, body: JSON.stringify({ name }) });
    await handleResponse(res);
  },
  deletePlaylist: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },
  addPlaylistItem: async (pid: string, item: Partial<PlaylistItem>) => {
    const res = await fetch(`${API_URL}/playlists/${pid}/items`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  deletePlaylistItem: async (id: string) => {
    const res = await fetch(`${API_URL}/playlist-items/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  }
};
