# Apotek Sri Redjeki Farma 🏥

Sistem Informasi Manajemen Apotek & Kasir (Point of Sale / POS) modern berbasis web, dirancang khusus untuk operasional apotek yang cepat, akurat, dan terintegrasi dengan backend cloud database Supabase.

---

## 📌 Fitur Utama

- **Point of Sale (POS) & Kasir Cepat**: Pencarian obat instan, kalkulasi subtotal otomatis, diskon, kembalian, dan cetak struk belanja thermal/nota resmi.
- **Manajemen Inventaris Obat**: Pendataan obat lengkap (nama, kategori, satuan, harga, stok fisik, batas minimum restok).
- **Mutasi & Penyesuaian Stok**: Pencatatan riwayat keluar-masuk obat (restok, kadaluarsa/rusak, dan stock opname).
- **Laporan & Analitik**: Rekapitulasi penjualan harian, tren pendapatan, dan obat terlaris.
- **Autentikasi & RBAC (Role-Based Access Control)**:
  - **Kasir**: Akses transaksi kasir, daftar obat, dan cetak nota.
  - **Apoteker / Owner**: Akses penuh seluruh modul (laporan keuangan, stok opname, pengaturan apotek).
- **Database Atomik & Aman**: Dilengkapi PostgreSQL Stored Procedures (Atomic RPC) untuk transaksi kasir bebas race-condition serta Row Level Security (RLS).

---

## 🛠️ Teknologi yang Digunakan

- **Frontend Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling**: Modern CSS3 (Responsive Design, Clean Dashboard UI)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Supabase Auth, Row Level Security)
- **Linter & Code Quality**: [Oxlint](https://oxc.rs/)

---

## 📋 Persyaratan Sistem

Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi 18.0.0 atau lebih baru (Disarankan Node.js 20+)
- **npm** atau **pnpm** / **yarn**
- Akun dan project aktif di [Supabase](https://supabase.com/)

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repository

```bash
git clone https://github.com/eaglicarus-glitch/APOTEK-SRI-REDJEKI-FARMA.git
cd APOTEK-SRI-REDJEKI-FARMA
```

### 2. Pasang Dependency

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Salin file contoh template `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` dan masukkan URL serta Anon Key dari proyek Supabase Anda:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
```

### 4. Menjalankan Server Pengembangan (Dev)

```bash
npm run dev
```

Aplikasi akan berjalan secara lokal di `http://localhost:5173`.

---

## 🗄️ Konfigurasi & Migrasi Database Supabase

Seluruh skema database PostgreSQL, tabel, tipe ENUM, RPC functions, trigger, dan kebijakan RLS telah disediakan secara lengkap pada file:
- `schema.sql`: Skema utama DDL, fungsi atomik checkout, trigger profil, dan RLS policies.
- `supabase_repair_migration.sql`: Script pemeliharaan / perbaikan sinkronisasi profil dan auth.
- `ERD_Apotek_Sri_Redjeki_Farma.mmd`: Diagram Entity Relationship dalam format Mermaid.
- `Data_Dictionary_Apotek_Sri_Redjeki_Farma.md`: Kamus data spesifikasi tabel dan relasi.

### Langkah Migrasi:
1. Masuk ke Dashboard Supabase project Anda.
2. Buka menu **SQL Editor**.
3. Buat query baru, salin seluruh isi file `schema.sql`, lalu klik **Run**.

---

## 🧪 Pemeriksaan Kualitas & Build

- **Menjalankan Linter**:
  ```bash
  npm run lint
  ```
- **Membuat Bundle Produksi (Build)**:
  ```bash
  npm run build
  ```
- **Preview Hasil Build Produksi**:
  ```bash
  npm run preview
  ```

---

## 🔒 Keamanan & Kebijakan Data
- Kredensial rahasia seperti `service_role` key, password database direct, atau token admin tidak boleh disertakan pada repository publik.
- File `.env` dan `.env.local` telah dimasukkan ke dalam `.gitignore` untuk mencegah kebocoran data.

---

## 📄 Lisensi
Hak Cipta © 2026 Apotek Sri Redjeki Farma. Semua hak dilindungi undang-undang.
