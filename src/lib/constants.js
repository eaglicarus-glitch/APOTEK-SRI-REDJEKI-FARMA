export const STORAGE_KEY = 'APOTEK_SRI_REDJEKI_DATA_V1';
export const SESSION_KEY = 'APOTEK_SRI_REDJEKI_SESSION';

export const DEFAULT_SETTINGS = {
  pharmacyName: 'Apotek Sri Redjeki Farma',
  tagline: 'Sehat Bersama, Hidup Lebih Baik',
  address: 'Jl. Raya No. 123, Kec. Sidoarjo',
  phone: '0812-3456-7890',
  receiptFooter: 'Terima Kasih, Semoga Sehat Selalu',
  defaultMinStock: 10,
  cashierName: 'Kasir Utama'
};

export const INITIAL_USERS = [
  { id: 'USR-001', username: 'kasir', name: 'Kasir Utama', role: 'Kasir', password: '1234' },
  { id: 'USR-002', username: 'owner', name: 'Apoteker / Owner', role: 'Apoteker / Owner', password: '1234' },
  { id: 'USR-003', username: 'admin', name: 'Apoteker / Owner', role: 'Apoteker / Owner', password: '1234' }
];

export function normalizeMedicineCategory(cat, name = '', unit = '') {
  if (!cat || typeof cat !== 'string') return 'Tablet';
  const c = cat.toLowerCase().trim();
  const n = (name || '').toLowerCase();
  const u = (unit || '').toLowerCase();

  // Direct match
  if (c === 'tablet') return 'Tablet';
  if (c === 'kapsul') return 'Kapsul';
  if (c === 'sirup') return 'Sirup';
  if (c === 'salep') return 'Salep';
  if (c === 'lainnya') return 'Lainnya';

  // Specific clues in name or unit
  if (n.includes('sirup') || u.includes('sirup') || (u.includes('botol') && n.includes('syrup'))) return 'Sirup';
  if (n.includes('salep') || u.includes('tube') || n.includes('cream') || n.includes('gel')) return 'Salep';
  if (n.includes('kapsul') || u.includes('kapsul') || n.includes('capsule')) return 'Kapsul';
  if (n.includes('tablet') || u.includes('tablet') || u.includes('strip')) return 'Tablet';

  // Map known medicine names from database (Obat Keras, Obat Bebas, dll)
  if (n.includes('amoxicillin') || n.includes('omeprazole')) return 'Kapsul';
  if (n.includes('betadine')) return 'Salep';
  if (n.includes('paracetamol') || n.includes('antasida') || n.includes('cetirizine') || n.includes('ibuprofen') || n.includes('vitamin c')) return 'Tablet';

  return 'Tablet';
}

export const INITIAL_PRODUCTS = [
  {
    id: 'MED-001',
    code: 'MED-001',
    name: 'Paracetamol 500mg',
    category: 'Tablet',
    unit: 'Strip',
    price: 6500,
    stock: 120,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-002',
    code: 'MED-002',
    name: 'Amoxicillin 500mg',
    category: 'Kapsul',
    unit: 'Strip',
    price: 12000,
    stock: 45,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-003',
    code: 'MED-003',
    name: 'Vitamin C 500mg',
    category: 'Tablet',
    unit: 'Botol',
    price: 35000,
    stock: 30,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-004',
    code: 'MED-004',
    name: 'Antasida Doen',
    category: 'Tablet',
    unit: 'Strip',
    price: 5000,
    stock: 85,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-005',
    code: 'MED-005',
    name: 'Cetirizine 10mg',
    category: 'Tablet',
    unit: 'Strip',
    price: 8500,
    stock: 60,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-006',
    code: 'MED-006',
    name: 'Ibuprofen 400mg',
    category: 'Tablet',
    unit: 'Strip',
    price: 9000,
    stock: 40,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-007',
    code: 'MED-007',
    name: 'Omeprazole 20mg',
    category: 'Kapsul',
    unit: 'Strip',
    price: 18000,
    stock: 25,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-008',
    code: 'MED-008',
    name: 'Betadine Salep 10g',
    category: 'Salep',
    unit: 'Tube',
    price: 22000,
    stock: 18,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-009',
    code: 'MED-009',
    name: 'Sanmol Sirup 60ml',
    category: 'Sirup',
    unit: 'Botol',
    price: 24000,
    stock: 20,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'
  }
];

export function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatRupiah(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

export function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hr = String(date.getHours()).padStart(2, '0');
  const mn = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${hr}:${mn}`;
}
