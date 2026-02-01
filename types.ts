
export interface InventoryUnitConversion {
  name: string;
  factor: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  conversions?: InventoryUnitConversion[];
  price: number;
  lastUpdated: string;
  status: 'active' | 'inactive'; // Added for Master Management
}

export type TransactionType = 'IN' | 'OUT';

export interface TransactionItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  referenceNumber?: string;
  supplier?: string;
  notes: string;
  photos?: string[];
  items: TransactionItem[];
  performer: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'staff';
  email: string;
}

// --- REJECT MODULE TYPES (STANDALONE) ---

export interface RejectItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  conversions?: InventoryUnitConversion[];
  status: 'active' | 'inactive';
}

export interface RejectTransactionItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number; // Stored in baseUnit
  inputQuantity: number; // User input
  inputUnit: string; // User selected unit
  reason: string;
}

export interface RejectTransaction {
  id: string;
  date: string;
  items: RejectTransactionItem[];
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt?: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  title: string;
  url: string;
  videoId: string;
  createdAt?: string;
}
