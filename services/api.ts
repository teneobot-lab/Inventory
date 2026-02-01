
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Error: ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return true; 
};

export const api = {
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/health`);
      return res.ok;
    } catch (e) { return false; }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    return data.success ? data.data : null;
  },

  // Inventory Master
  getInventory: async (): Promise<InventoryItem[]> => {
    const res = await fetch(`${API_URL}/inventory`);
    return await handleResponse(res);
  },
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  // Fix: Added missing deleteInventoryBulk method
  deleteInventoryBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/inventory/delete-bulk`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ ids }) 
    });
    return await handleResponse(res);
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_URL}/transactions`);
    return await handleResponse(res);
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },
  // Fix: Added missing updateTransaction method
  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${tx.id}`, { 
      method: 'PUT', 
      headers, 
      body: JSON.stringify(tx) 
    });
    return await handleResponse(res);
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Reject Master (Standalone)
  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return await handleResponse(res);
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deleteRejectMaster: async (id: string) => {
    const res = await fetch(`${API_URL}/reject/master/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Reject Transactions
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    return await handleResponse(res);
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },
  deleteRejectTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/reject/transactions/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // User Management
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return await handleResponse(res);
  },
  addUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Media Player
  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await fetch(`${API_URL}/playlists`);
    return await handleResponse(res);
  },
  createPlaylist: async (name: string) => {
    const res = await fetch(`${API_URL}/playlists`, { method: 'POST', headers, body: JSON.stringify({ id: `PL-${Date.now()}`, name }) });
    return await handleResponse(res);
  },
  deletePlaylist: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  getPlaylistItems: async (pid: string): Promise<PlaylistItem[]> => {
    const res = await fetch(`${API_URL}/playlists/${pid}/items`);
    return await handleResponse(res);
  },
  addPlaylistItem: async (pid: string, item: Partial<PlaylistItem>) => {
    const res = await fetch(`${API_URL}/playlists/${pid}/items`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deletePlaylistItem: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/items/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // System Maintenance
  // Fix: Added missing resetDatabase method
  resetDatabase: async () => {
    const res = await fetch(`${API_URL}/reset`, { method: 'POST' });
    return await handleResponse(res);
  }
};