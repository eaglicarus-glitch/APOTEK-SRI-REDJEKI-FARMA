# KAMUS DATA (DATA DICTIONARY) DATABASE SUPABASE
## Project: Apotek Sri Redjeki Farma

Dokumen ini mendefinisikan seluruh struktur tabel, kolom, tipe data, batasan (*constraints*), indeks, dan relasi fisik pada database PostgreSQL / Supabase Apotek Sri Redjeki Farma.

---

### 1. Tabel: `public.profiles`
Tabel ekstensi satu-ke-satu (*1:1 extension*) untuk akun `auth.users` Supabase. Menyimpan informasi profil staf, username login, nama lengkap, dan peran (*Role-Based Access Control*).

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `UUID` | **PK, FK** | **NOT NULL** | - | Merujuk ke `auth.users(id)` dengan `ON DELETE CASCADE`. |
| `username` | `VARCHAR(50)` | - | **NOT NULL** | - | Username unik untuk login kasir/owner (`UNIQUE`). |
| `full_name` | `VARCHAR(100)` | - | **NOT NULL** | - | Nama lengkap petugas/apoteker yang tampil di struk dan dashboard. |
| `role` | `public.user_role` | - | **NOT NULL** | `'Kasir'` | Tipe ENUM: `'Kasir'` atau `'Apoteker / Owner'`. |
| `created_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu profil pertama kali dibuat. |
| `updated_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Diperbarui otomatis melalui trigger `set_profiles_updated_at`. |

**Indeks:**
- `idx_profiles_username` ON `username`
- `idx_profiles_role` ON `role`

---

### 2. Tabel: `public.medicines`
Tabel master data katalog obat dan persediaan stok fisik apotek.

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `UUID` | **PK** | **NOT NULL** | `uuid_generate_v4()` | Primary key identitas unik obat. |
| `code` | `VARCHAR(30)` | - | **NOT NULL** | - | Kode inventaris unik obat (contoh: `MED-001`) (`UNIQUE`). |
| `name` | `VARCHAR(150)` | - | **NOT NULL** | - | Nama dagang atau generik obat. |
| `category` | `VARCHAR(80)` | - | **NOT NULL** | - | Kelompok sediaan (Tablet, Kapsul, Salep, Sirup, dll). |
| `unit` | `VARCHAR(30)` | - | **NOT NULL** | `'Strip'` | Satuan penjualan (Strip, Botol, Tube, Box, Tablet). |
| `price` | `NUMERIC(15, 2)` | - | **NOT NULL** | - | Harga jual resmi apotek (`CHECK (price >= 0)`). |
| `stock` | `INTEGER` | - | **NOT NULL** | `0` | Sisa kuantitas fisik di apotek (`CHECK (stock >= 0)`). |
| `min_stock` | `INTEGER` | - | **NOT NULL** | `10` | Batas peringatan stok menipis (`CHECK (min_stock >= 0)`). |
| `image_url` | `TEXT` | - | NULL | `NULL` | Tautan gambar/foto obat (opsional). |
| `created_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu pembuatan data obat. |
| `updated_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu pembaruan data obat (trigger otomatis). |

**Indeks:**
- `idx_medicines_code` ON `code`
- `idx_medicines_category` ON `category`

---

### 3. Tabel: `public.transactions`
Tabel header transaksi penjualan kasir (Point of Sale).

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `UUID` | **PK** | **NOT NULL** | `uuid_generate_v4()` | Primary key identitas transaksi. |
| `code` | `VARCHAR(50)` | - | **NOT NULL** | - | Nomor invoice unik (contoh: `TRX-20261026-001`) (`UNIQUE`). |
| `date_time` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu penjualan diselesaikan. |
| `customer` | `VARCHAR(100)` | - | **NOT NULL** | `'Pelanggan Umum'` | Nama pembeli / pasien. |
| `cashier_name` | `VARCHAR(100)` | - | **NOT NULL** | - | Snapshot nama kasir yang mencetak struk. |
| `cashier_id` | `UUID` | **FK** | NULL | `NULL` | Merujuk ke `public.profiles(id)` dengan `ON DELETE SET NULL`. |
| `payment_method`| `VARCHAR(50)` | - | **NOT NULL** | `'Tunai'` | Cara pembayaran: Tunai, QRIS, Transfer, Debit. |
| `subtotal` | `NUMERIC(15, 2)` | - | **NOT NULL** | - | Total kotor sebelum diskon (`CHECK (subtotal >= 0)`). |
| `discount` | `NUMERIC(15, 2)` | - | **NOT NULL** | `0` | Nominal potongan harga (`CHECK (discount >= 0)`). |
| `total` | `NUMERIC(15, 2)` | - | **NOT NULL** | - | Total tagihan bersih (`CHECK (total >= 0)`). |
| `amount_tendered`| `NUMERIC(15, 2)` | - | **NOT NULL** | - | Uang diserahkan (`CHECK (amount_tendered >= total)`). |
| `change` | `NUMERIC(15, 2)` | - | **NOT NULL** | `0` | Uang kembalian (`CHECK (change >= 0)`). |
| `notes` | `TEXT` | - | NULL | `NULL` | Catatan transaksi kasir. |
| `created_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Audit timestamp penyimpanan baris. |

**Indeks:**
- `idx_transactions_code` ON `code`
- `idx_transactions_date` ON `date_time DESC`
- `idx_transactions_cashier` ON `cashier_id`

---

### 4. Tabel: `public.transaction_items`
Tabel rincian item obat yang dibeli dalam setiap transaksi penjualan (*Master-Detail*).

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `UUID` | **PK** | **NOT NULL** | `uuid_generate_v4()` | Primary key detail item. |
| `transaction_id`| `UUID` | **FK** | **NOT NULL** | - | Merujuk ke `public.transactions(id)` dengan `ON DELETE CASCADE`. |
| `medicine_id` | `UUID` | **FK** | NULL | `NULL` | Merujuk ke `public.medicines(id)` dengan `ON DELETE SET NULL`. |
| `medicine_code` | `VARCHAR(30)` | - | **NOT NULL** | - | Snapshot kode obat saat transaksi terjadi. |
| `medicine_name` | `VARCHAR(150)` | - | **NOT NULL** | - | Snapshot nama obat saat transaksi terjadi. |
| `unit` | `VARCHAR(30)` | - | **NOT NULL** | - | Snapshot satuan obat yang terjual. |
| `price` | `NUMERIC(15, 2)` | - | **NOT NULL** | - | Snapshot harga per unit saat transaksi (`CHECK (price >= 0)`). |
| `qty` | `INTEGER` | - | **NOT NULL** | - | Jumlah obat yang dibeli (`CHECK (qty > 0)`). |
| `subtotal` | `NUMERIC(15, 2)` | - | **NOT NULL** | - | Subtotal baris item (`CHECK (subtotal >= 0)`). |
| `created_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Timestamp audit penyimpanan. |

**Indeks:**
- `idx_trx_items_trx_id` ON `transaction_id`
- `idx_trx_items_medicine_id` ON `medicine_id`

---

### 5. Tabel: `public.stock_movements`
Tabel log audit riwayat mutasi persediaan stok obat (restok, barang rusak/kedaluwarsa, atau opname stok).

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `UUID` | **PK** | **NOT NULL** | `uuid_generate_v4()` | Primary key record audit mutasi stok. |
| `medicine_id` | `UUID` | **FK** | **NOT NULL** | - | Merujuk ke `public.medicines(id)` dengan `ON DELETE CASCADE`. |
| `medicine_code` | `VARCHAR(30)` | - | **NOT NULL** | - | Snapshot kode obat. |
| `medicine_name` | `VARCHAR(150)` | - | **NOT NULL** | - | Snapshot nama obat. |
| `date` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu pergerakan stok dilakukan. |
| `change_type` | `VARCHAR(20)` | - | **NOT NULL** | - | `CHECK (change_type IN ('in', 'out', 'adjustment'))`. |
| `delta` | `INTEGER` | - | **NOT NULL** | - | Selisih kuantitas stok (+ untuk masuk, - untuk keluar). |
| `final_stock` | `INTEGER` | - | **NOT NULL** | - | Sisa fisik stok setelah mutasi (`CHECK (final_stock >= 0)`). |
| `reason` | `TEXT` | - | **NOT NULL** | - | Keterangan alasan penyesuaian stok. |
| `operator_name` | `VARCHAR(100)` | - | **NOT NULL** | - | Snapshot nama staf/operator penyesuai. |
| `operator_id` | `UUID` | **FK** | NULL | `NULL` | Merujuk ke `public.profiles(id)` dengan `ON DELETE SET NULL`. |
| `created_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu audit mutasi stok dicatat. |

**Indeks:**
- `idx_stock_movements_med` ON `medicine_id`
- `idx_stock_movements_date` ON `date DESC`

---

### 6. Tabel: `public.pharmacy_settings`
Tabel konfigurasi identitas apotek (*Singleton Pattern*, selalu berisi tepat 1 baris record dengan ID 1).

| Nama Kolom | Tipe Data | PK/FK | Nullable | Nilai Default | Keterangan & Constraint |
|---|---|---|---|---|---|
| `id` | `INTEGER` | **PK** | **NOT NULL** | `1` | `CHECK (id = 1)` memastikan hanya ada 1 baris pengaturan. |
| `pharmacy_name` | `VARCHAR(150)` | - | **NOT NULL** | `'Apotek Sri Redjeki Farma'` | Nama resmi apotek untuk struk & header. |
| `tagline` | `VARCHAR(200)` | - | **NOT NULL** | `'Pelayanan Ramah, Cepat...'`| Slogan apotek. |
| `address` | `TEXT` | - | **NOT NULL** | `'Jl. Raya Sehat Walafiat...'`| Alamat fisik apotek. |
| `phone` | `VARCHAR(50)` | - | **NOT NULL** | `'0812-3456-7890'` | Nomor kontak / telepon apotek. |
| `receipt_footer`| `TEXT` | - | **NOT NULL** | `'Semoga Lekas Sembuh...'` | Teks ucapan di bagian bawah struk kasir. |
| `updated_at` | `TIMESTAMPTZ` | - | **NOT NULL** | `timezone('utc', now())` | Waktu pembaruan pengaturan terakhir. |

---

### 7. Rangkuman Foreign Key & Constraint Relasional

| Tabel Asal | Kolom FK | Tabel Tujuan | Kolom Tujuan | Constraint Name | On Delete | On Update |
|---|---|---|---|---|---|---|
| `public.profiles` | `id` | `auth.users` | `id` | `profiles_id_fkey` | `CASCADE` | `NO ACTION` |
| `public.transactions` | `cashier_id` | `public.profiles` | `id` | `transactions_cashier_id_fkey` | `SET NULL` | `NO ACTION` |
| `public.transaction_items` | `transaction_id`| `public.transactions`| `id` | `transaction_items_transaction_id_fkey` | `CASCADE` | `NO ACTION` |
| `public.transaction_items` | `medicine_id` | `public.medicines` | `id` | `transaction_items_medicine_id_fkey` | `SET NULL` | `NO ACTION` |
| `public.stock_movements` | `medicine_id` | `public.medicines` | `id` | `stock_movements_medicine_id_fkey` | `CASCADE` | `NO ACTION` |
| `public.stock_movements` | `operator_id` | `public.profiles` | `id` | `stock_movements_operator_id_fkey` | `SET NULL` | `NO ACTION` |
