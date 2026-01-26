import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from '../types';

const API_URL = '/api';

const headers = {
  'Content-Type': 'application/json',
};

export const api = {
  // Check Backend Status
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch (e) {
      console.error("Server Check Failed:", e);
      return false;
    }
  },

  // Auth
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

  // Inventory
  getInventory: async (): Promise<InventoryItem[]> => {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        if(!res.ok) throw new Error("Failed to fetch inventory");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory`, { method: 'POST', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Failed to add inventory item");
  },
  updateInventory: async (item: InventoryItem) => {
    const res = await fetch(`${API_URL}/inventory/${item.id}`, { method: 'PUT', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Failed to update inventory item");
  },
  deleteInventory: async (id: string) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete inventory item");
  },

  // Transactions (FULL CRUD)
  getTransactions: async (): Promise<Transaction[]> => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        if(!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    if (!res.ok) throw new Error("Failed to save transaction to database");
  },
  updateTransaction: async (tx: Transaction) => {
    const res = await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
    if (!res.ok) throw new Error("Failed to update transaction");
  },
  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete transaction");
  },

  // Reject Module
  getRejectMaster: async (): Promise<RejectItem[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-master`);
        if(!res.ok) throw new Error("Failed to fetch reject master");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addRejectMaster: async (item: RejectItem) => {
    const res = await fetch(`${API_URL}/reject-master`, { method: 'POST', headers, body: JSON.stringify(item) });
    if (!res.ok) throw new Error("Failed to add reject master");
  },
  deleteRejectMaster: async (id: string) => {
    const res = await fetch(`${API_URL}/reject-master/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete reject master");
  },
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-transactions`);
        if(!res.ok) throw new Error("Failed to fetch reject transactions");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    const res = await fetch(`${API_URL}/reject-transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
    if (!res.ok) throw new Error("Failed to add reject transaction");
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch(`${API_URL}/users`);
        if(!res.ok) throw new Error("Failed to fetch users");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(user) });
    if (!res.ok) throw new Error("Failed to add user");
  },
  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify(user) });
    if (!res.ok) throw new Error("Failed to update user");
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete user");
  }
};