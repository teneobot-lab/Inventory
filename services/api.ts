
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

export const api = {
  checkConnection: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // Request ke /api/health
      const res = await fetch(`${API_URL}/health`, { 
        method: 'GET', 
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        return data.status === 'online';
      }
      return false;
    } catch (e) {
      console.warn("API Connection Check Failed:", e);
      return false;
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
    return data.success ? data.user : null;
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        if(!res.ok) return [];
        return res.json();
    } catch (e) { return []; }
  },
  
  addInventory: async (item: InventoryItem) => {
    await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
  },
  updateInventory: async (item: InventoryItem) => {
    await fetch(`${API_URL}/inventory/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
  },
  deleteInventory: async (id: string) => {
    await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        if(!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Server returned error:", res.status, errData);
            return [];
        }
        return res.json();
    } catch (e) { 
        console.error("Network error fetching transactions:", e); 
        return []; 
    }
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan transaksi");
    }
  },
  updateTransaction: async (tx: Transaction) => {
    await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Gagal menghapus transaksi");
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return res.ok ? res.json() : [];
  },
  addUser: async (user: User) => {
    await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
  },
  updateUser: async (user: User) => {
    await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify(user) });
  },
  deleteUser: async (id: string) => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
  },

  // Reject Master Data
  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject/master`);
    return res.ok ? res.json() : [];
  },
  addRejectMaster: async (item: RejectItem) => {
    await fetch(`${API_URL}/reject/master`, { method: 'POST', headers, body: JSON.stringify(item) });
  },
  deleteRejectMaster: async (id: string) => {
    await fetch(`${API_URL}/reject/master/${id}`, { method: 'DELETE' });
  },

  // Reject Transactions
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject/transactions`);
    return res.ok ? res.json() : [];
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    await fetch(`${API_URL}/reject/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
  },

  // System
  resetDatabase: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const res = await fetch(`${API_URL}/system/reset`, { method: 'POST', headers });
    return res.json();
  }
};
