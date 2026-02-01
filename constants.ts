
import { InventoryItem, Transaction, User } from './types';

export const INITIAL_ITEMS: InventoryItem[] = [
  { 
    id: '1', name: 'Laptop Gaming X1', sku: 'ELEC-001', category: 'Electronics', 
    stock: 12, minStock: 5, unit: 'unit', conversions: [], 
    price: 15000000, lastUpdated: '2023-10-25' 
  },
  { 
    id: '2', name: 'Mouse Wireless Pro', sku: 'ACC-002', category: 'Accessories', 
    stock: 45, minStock: 10, unit: 'pcs', 
    conversions: [{ name: 'Box', factor: 10 }], 
    price: 250000, lastUpdated: '2023-10-26' 
  },
  { 
    id: '3', name: 'Monitor 24 Inch', sku: 'ELEC-003', category: 'Electronics', 
    stock: 3, minStock: 8, unit: 'unit', conversions: [], 
    price: 2100000, lastUpdated: '2023-10-20' 
  },
  { 
    id: '4', name: 'Keyboard Mechanical', sku: 'ACC-004', category: 'Accessories', 
    stock: 20, minStock: 5, unit: 'pcs', conversions: [], 
    price: 850000, lastUpdated: '2023-10-22' 
  },
  { 
    id: '5', name: 'USB Hub Type-C', sku: 'ACC-005', category: 'Accessories', 
    stock: 2, minStock: 15, unit: 'pcs', conversions: [], 
    price: 150000, lastUpdated: '2023-10-15' 
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
    id: 'TX-1001', 
    type: 'IN', 
    date: '2023-10-01T10:00:00', 
    referenceNumber: 'SJ-001',
    notes: 'Initial Stock', 
    performer: 'Admin',
    items: [
      { itemId: '1', itemName: 'Laptop Gaming X1', sku: 'ELEC-001', quantity: 10, unit: 'unit' }
    ]
  },
  { 
    id: 'TX-1002', 
    type: 'IN', 
    date: '2023-10-02T11:00:00', 
    referenceNumber: 'SJ-002',
    notes: 'Vendor delivery', 
    performer: 'Admin',
    items: [
      { itemId: '2', itemName: 'Mouse Wireless Pro', sku: 'ACC-002', quantity: 50, unit: 'pcs' }
    ]
  },
  { 
    id: 'TX-1003', 
    type: 'OUT', 
    date: '2023-10-05T14:30:00', 
    notes: 'Sales Order #101', 
    performer: 'Staff',
    items: [
      { itemId: '2', itemName: 'Mouse Wireless Pro', sku: 'ACC-002', quantity: 5, unit: 'pcs' }
    ]
  }
];

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Budi Santoso',
  username: 'admin',
  password: 'password123',
  role: 'admin',
  email: 'admin@inventory.com'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Budi Santoso',
    username: 'admin',
    password: 'password123',
    role: 'admin',
    email: 'admin@inventory.com'
  },
  {
    id: 'u2',
    name: 'Siti Aminah',
    username: 'staff01',
    password: 'staffpassword',
    role: 'staff',
    email: 'siti@inventory.com'
  }
];
