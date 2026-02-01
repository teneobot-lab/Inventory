
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Request failed with status ${res.status}`);
  }
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : true;
  } catch (e) {
    return true;
  }
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

  // Inventory
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
  deleteInventoryBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/inventory/bulk-delete`, { method: 'POST', headers, body: JSON.stringify({ ids }) });
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
  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return await handleResponse(res);
  },
  addUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  // Added updateUser method to fix compilation error in AdminView
  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Reject Module
  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return await handleResponse(res);
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  updateRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deleteRejectMaster: async (id: string) => {
    const res = await fetch(`${API_URL}/reject/master/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
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

  // Playlists
  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await fetch(`${API_URL}/playlists`);
    return await handleResponse(res);
  },
  createPlaylist: async (name: string) => {
    const id = `PL-${Date.now()}`;
    const res = await fetch(`${API_URL}/playlists`, { method: 'POST', headers, body: JSON.stringify({ id, name }) });
    return await handleResponse(res);
  },
  deletePlaylist: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },
  // Added getPlaylistItems method to fix compilation error in MediaPlayer
  getPlaylistItems: async (playlistId: string): Promise<PlaylistItem[]> => {
    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`);
    return await handleResponse(res);
  },
  // Added addPlaylistItem method to fix compilation error in MediaPlayer
  addPlaylistItem: async (playlistId: string, item: Partial<PlaylistItem>) => {
    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify(item) 
    });
    return await handleResponse(res);
  },
  // Added deletePlaylistItem method to fix compilation error in MediaPlayer
  deletePlaylistItem: async (itemId: string) => {
    const res = await fetch(`${API_URL}/playlists/items/${itemId}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // System
  resetDatabase: async () => {
    const res = await fetch(`${API_URL}/system/reset`, { method: 'POST' });
    return await handleResponse(res);
  }
};
