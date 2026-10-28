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

export const DEFAULT_MEDICINE_CATEGORIES = [
  'Obat Bebas',
  'Obat Bebas Terbatas',
  'Obat Keras',
  'Obat Luar',
  'Vitamin & Suplemen',
  'Alat Kesehatan',
  'Herbal & Jamu',
  'Lainnya'
];

export const INITIAL_PRODUCTS = [
  {
    id: 'MED-001',
    code: 'MED-001',
    name: 'Paracetamol 500mg',
    category: 'Obat Bebas',
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
    category: 'Obat Keras',
    unit: 'Tablet',
    price: 12000,
    stock: 45,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'MED-003',
    code: 'MED-003',
    name: 'Vitamin C 500mg',
    category: 'Vitamin & Suplemen',
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
    category: 'Obat Bebas',
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
    category: 'Obat Bebas Terbatas',
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
    category: 'Obat Bebas Terbatas',
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
    category: 'Obat Keras',
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
    category: 'Obat Luar',
    unit: 'Tube',
    price: 22000,
    stock: 18,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&auto=format&fit=crop&q=60'
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
