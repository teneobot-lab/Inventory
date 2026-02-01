
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction, Playlist, PlaylistItem } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

/**
 * Enterprise-Grade Response Handler
 * Menangani parsing JSON, deteksi error HTTP, dan fallback pesan error.
 */
const handleResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  
  // Jika response bukan JSON (misal: 502 HTML page dari Nginx/Vercel)
  if (!contentType || !contentType.includes('application/json')) {
    const textError = await res.text();
    console.error("Non-JSON Error Response:", textError);
    throw new Error(`Server Error (${res.status}): Layanan tidak tersedia atau sedang gangguan.`);
  }

  const data = await res.json();

  if (!res.ok) {
    // Gunakan pesan error dari backend jika ada, jika tidak gunakan fallback
    throw new Error(data.message || data.error || `Request failed with status ${res.status}`);
  }

  // Khusus untuk DELETE atau response tanpa body data
  if (res.status === 204 || res.headers.get('content-length') === '0') {
      return true;
  }
  
  return data;
};

export const api = {
  checkConnection: async (): Promise<{online: boolean, db: boolean}> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`${API_URL}/health`, { 
        method: 'GET', 
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        return { 
          online: data.success === true, 
          db: data.data?.database === true 
        };
      }
      return { online: false, db: false };
    } catch (e) {
      return { online: false, db: false };
    }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password }),
      });
      const data = await handleResponse(res);
      return data.success ? data.data : null;
    } catch (e) {
      throw e;
    }
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        const data = await handleResponse(res);
        return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
  },
  
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  updateInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
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
        const data = await handleResponse(res);
        return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
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

  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await handleResponse(res);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
  },
  addUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify(user) });
    return await handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  getRejectMaster: async (): Promise<RejectItem[]> => {
    try {
      const res = await fetch(`${API_URL}/reject/master`);
      const data = await handleResponse(res);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
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
  deleteRejectMasterBulk: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/reject/master/bulk`, { 
        method: 'DELETE', 
        headers, 
        body: JSON.stringify({ ids }) 
    });
    return await handleResponse(res);
  },

  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    try {
      const res = await fetch(`${API_URL}/reject/transactions`);
      const data = await handleResponse(res);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    return await handleResponse(res);
  },

  getPlaylists: async (): Promise<Playlist[]> => {
    try {
      const res = await fetch(`${API_URL}/playlists`);
      const data = await handleResponse(res);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
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
  getPlaylistItems: async (playlistId: string): Promise<PlaylistItem[]> => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/items`);
      const data = await handleResponse(res);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (e) { return []; }
  },
  addPlaylistItem: async (playlistId: string, item: Partial<PlaylistItem>) => {
    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`, { method: 'POST', headers, body: JSON.stringify(item) });
    return await handleResponse(res);
  },
  deletePlaylistItem: async (itemId: string) => {
    const res = await fetch(`${API_URL}/playlists/items/${itemId}`, { method: 'DELETE' });
    return await handleResponse(res);
  },

  resetDatabase: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/system/reset`, { method: 'POST', headers });
      return await handleResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};
