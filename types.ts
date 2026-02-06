
export type UnitType = 'BASE' | 'CONVERSION';

export interface UnitConversion {
  id: string;
  name: string;
  factor: number; // Factor to convert to base unit
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'staff';
  email: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  unit: string; // Display unit / base unit name
  conversions: UnitConversion[];
  price: number;
  minStock: number;
  stock: number; // Current stock level
  lastUpdated?: string;
}

export type LedgerType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  itemId: string;
  warehouseId: string;
  type: LedgerType;
  quantity: number; // Always in BASE UNIT
  referenceId: string; // ID of the transaction
  batchNumber?: string;
  expiryDate?: string;
  timestamp: string;
  performer: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';
  date: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceNumber: string;
  supplier?: string; // Added for inbound tracking
  notes: string;
  items: TransactionLineItem[];
  performer: string;
  photos?: string[]; // Added for documentation
}

export interface TransactionLineItem {
  itemId: string;
  itemName: string;
  sku?: string; // Added for lookup
  quantity: number; // Input quantity
  unit: string; // Selected unit name
  factor: number; // Factor at time of transaction
  baseQuantity: number; // quantity * factor
  batchNumber?: string;
}

// --- Reject Module Types ---
export interface RejectItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  conversions: UnitConversion[];
}

export interface RejectTransactionItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number; // Base unit
  inputQuantity: number;
  inputUnit: string;
  reason: string;
}

export interface RejectTransaction {
  id: string;
  date: string;
  items: RejectTransactionItem[];
  createdAt: string;
}

// --- Media Player Types ---
export interface Playlist {
  id: string;
  name: string;
  createdAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  title: string;
  url: string;
  videoId: string;
  createdAt: string;
}
