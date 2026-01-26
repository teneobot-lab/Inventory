import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from '../types';

// We use relative path '/api'. 
// In Production: Vercel Rewrites will proxy this to http://165.245.187.238:3010/api
// In Development: Vite Proxy will send this to http://localhost:3010/api
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
        if(!res.ok) throw new Error("Failed to fetch");
        return res.json();
    } catch (e) { console.error(e); return []; }
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
        if(!res.ok) throw new Error("Failed to fetch");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addTransaction: async (tx: Transaction) => {
    await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
  },
  updateTransaction: async (tx: Transaction) => {
    await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
  },
  deleteTransaction: async (id: string) => {
    await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
  },

  // Reject Module
  getRejectMaster: async (): Promise<RejectItem[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-master`);
        if(!res.ok) throw new Error("Failed to fetch");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addRejectMaster: async (item: RejectItem) => {
    await fetch(`${API_URL}/reject-master`, { method: 'POST', headers, body: JSON.stringify(item) });
  },
  deleteRejectMaster: async (id: string) => {
    await fetch(`${API_URL}/reject-master/${id}`, { method: 'DELETE' });
  },
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    try {
        const res = await fetch(`${API_URL}/reject-transactions`);
        if(!res.ok) throw new Error("Failed to fetch");
        return res.json();
    } catch (e) { console.error(e); return []; }
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    await fetch(`${API_URL}/reject-transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch(`${API_URL}/users`);
        if(!res.ok) throw new Error("Failed to fetch");
        return res.json();
    } catch (e) { console.error(e); return []; }
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