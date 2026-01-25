
import { InventoryItem, Transaction, User, RejectItem, RejectTransaction } from '../types';

const API_URL = 'http://localhost:3010/api';

const headers = {
  'Content-Type': 'application/json',
};

export const api = {
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
      console.error(e);
      return null;
    }
  },

  // Inventory
  getInventory: async (): Promise<InventoryItem[]> => {
    const res = await fetch(`${API_URL}/inventory`);
    return res.json();
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
    const res = await fetch(`${API_URL}/transactions`);
    return res.json();
  },
  addTransaction: async (tx: Transaction) => {
    await fetch(`${API_URL}/transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
  },
  updateTransaction: async (tx: Transaction) => {
    await fetch(`${API_URL}/transactions/${tx.id}`, { method: 'PUT', headers, body: JSON.stringify(tx) });
  },

  // Reject Module
  getRejectMaster: async (): Promise<RejectItem[]> => {
    const res = await fetch(`${API_URL}/reject-master`);
    return res.json();
  },
  addRejectMaster: async (item: RejectItem) => {
    await fetch(`${API_URL}/reject-master`, { method: 'POST', headers, body: JSON.stringify(item) });
  },
  deleteRejectMaster: async (id: string) => {
    await fetch(`${API_URL}/reject-master/${id}`, { method: 'DELETE' });
  },
  getRejectTransactions: async (): Promise<RejectTransaction[]> => {
    const res = await fetch(`${API_URL}/reject-transactions`);
    return res.json();
  },
  addRejectTransaction: async (tx: RejectTransaction) => {
    await fetch(`${API_URL}/reject-transactions`, { method: 'POST', headers, body: JSON.stringify(tx) });
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
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
