import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

export const api = {
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch (e) {
      console.error("Server Check Failed:", e);
      return false;
    }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      return data.success ? data.user : null;
    } catch (e) {
      console.error("Connection Error:", e);
      return null;
    }
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        if(!res.ok) throw new Error("Failed to fetch inventory");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },

  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Gagal menambah barang ke database");
  },

  updateInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Gagal update barang di database");
  },

  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Gagal menghapus barang dari database");
  },

  getTransactions: async (): Promise<Transaction[]> => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        if(!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },

  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify(tx) 
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Gagal menyimpan transaksi ke database");
    }
  },

  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${tx.id}`, { 
      method: 'PUT', 
      headers, 
      body: JSON.stringify(tx) 
    });
    if (!res.ok) throw new Error("Gagal memperbarui transaksi");
  },

  // Reject Module
  getRejectMaster: async (): Promise<RejectItem[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-master`);
        return res.ok ? res.json() : [];
    } catch (e) { return []; }
  },

  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject-master`, { method: 'POST', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Gagal menambah master reject");
  },

  deleteRejectMaster: async (id: string) => {
    const res = await fetch(`${API_URL}/reject-master/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Gagal menghapus master reject");
  },

  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-transactions`);
        return res.ok ? res.json() : [];
    } catch (e) { return []; }
  },

  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject-transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    if (!res.ok) throw new Error("Gagal menyimpan transaksi reject");
  },

  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch(`${API_URL}/users`);
        return res.ok ? res.json() : [];
    } catch (e) { return []; }
  },

  addUser: async (user: User) => {
    await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
  },

  updateUser: async (user: User) => {
    await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify(user) });
  },

  deleteUser: async (id: string) => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
  }
};