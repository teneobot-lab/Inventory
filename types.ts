
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
  referenceNumber?: string; // Nomor Surat Jalan
  supplier?: string; // Nama Supplier (Khusus IN)
  notes: string;
  photos?: string[]; // Base64 strings
  items: TransactionItem[];
  performer: string;
}

export interface User {
  id: string;
  name: string;
  username: string; // Added
  password?: string; // Added (Optional because we might not want to display it)
  role: 'admin' | 'staff';
  email: string;
}

export interface AIInsight {
  summary: string;
  alerts: string[];
  recommendations: string[];
}

// --- REJECT MODULE TYPES ---

export interface RejectItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string; // Satuan Utama (misal: KG)
  conversions?: InventoryUnitConversion[]; // Konversi (misal: GR -> 0.001)
}

export interface RejectTransactionItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number; // Disimpan dalam baseUnit
  inputQuantity: number; // Qty yang diinput user
  inputUnit: string; // Unit yang dipilih user
  reason: string;
}

export interface RejectTransaction {
  id: string;
  date: string; // ISO String
  items: RejectTransactionItem[];
  createdAt: string;
}
