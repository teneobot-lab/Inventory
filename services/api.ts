
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

// Helper untuk handle response error
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  // Untuk DELETE atau response kosong, return null/true
  if (res.status === 204 || res.headers.get('content-length') === '0') {
      return true;
  }
  return res.json();
};

export const api = {
  checkConnection: async (): Promise<{online: boolean, db: boolean}> => {
    try {
      const controller = new AbortController();
      // Meningkatkan timeout ke 8 detik untuk mengakomodasi latensi VPS/Jaringan
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`${API_URL}/health`, { 
        method: 'GET', 
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        // Backend mengembalikan { success: true, data: { database: true } }
        return { 
          online: data.success === true, 
          db: data.data?.database === true 
        };
      }
      return { online: false, db: false };
    } catch (e) {
      console.warn("API Connection Check Failed:", e);
      return { online: false, db: false };
    }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        return await handleResponse(res);
    } catch (e) { return []; }
  },
  
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  updateInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },
  deleteInventoryBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/inventory/bulk-delete`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ ids }) 
    });
    return await handleResponse(res);
  },

  getTransactions: async (): Promise<Transaction[]> => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        if(!res.ok) return [];
        return await res.json();
    } catch (e) { return []; }
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },
  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return res.ok ? await res.json() : [];
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

  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return res.ok ? await res.json() : [];
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  updateRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject/master/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  deleteRejectMaster: async (id: string) => {
    const res = await fetch(`${API_URL}/reject/master/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    return res.ok ? await res.json() : [];
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    await handleResponse(res);
  },

  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await fetch(`${API_URL}/playlists`);
    return res.ok ? await res.json() : [];
  },
  createPlaylist: async (name: string) => {
    const id = `PL-${Date.now()}`;
    const res = await fetch(`${API_URL}/playlists`, { method: 'POST', headers, body: JSON.stringify({ id, name }) });
    await handleResponse(res);
  },
  deletePlaylist: async (id: string) => {
    const res = await fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },
  getPlaylistItems: async (playlistId: string): Promise<PlaylistItem[]> => {
    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`);
    return res.ok ? await res.json() : [];
  },
  addPlaylistItem: async (playlistId: string, item: Partial<PlaylistItem>) => {
    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`, { method: 'POST', headers, body: JSON.stringify(item) });
    await handleResponse(res);
  },
  deletePlaylistItem: async (itemId: string) => {
    const res = await fetch(`${API_URL}/playlists/items/${itemId}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  resetDatabase: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const res = await fetch(`${API_URL}/system/reset`, { method: 'POST', headers });
    return res.json();
  }
};
