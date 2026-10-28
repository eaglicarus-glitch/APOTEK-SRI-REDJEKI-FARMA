-- ==============================================================================
-- MASTER SKEMA DATABASE POSTGRESQL & ROW LEVEL SECURITY (RLS)
-- SISTEM INFORMASI APOTEK SRI REDJEKI FARMA
-- ==============================================================================
-- File: schema.sql & supabase_repair_migration.sql
-- Kompatibel dengan: Supabase (PostgreSQL 15+)
-- Deskripsi: DDL tabel, indeks, constraint, trigger profil, RLS policies idempotent,
--            Atomic RPC Function (process_checkout & adjust_stock),
--            dan Seeding Akun Resmi Kasir & Apoteker di Supabase Auth.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TIPE ENUM & TABEL PROFIL PENGGUNA (RBAC)
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Kasir', 'Apoteker / Owner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabel profiles: menyimpan metadata pengguna yang terhubung ke auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'Kasir',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function: Memeriksa peran user saat ini secara aman tanpa rekursi RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: Memeriksa apakah user adalah Owner / Apoteker
CREATE OR REPLACE FUNCTION public.is_owner_or_apoteker()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'Apoteker / Owner'
    );
$$;

-- Trigger otomatis untuk sinkronisasi pembaruan timestamp pada profil
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger otomatis: Saat user baru dibuat di Supabase Auth, buat profil default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role := 'Kasir'::public.user_role;
    v_role_str text;
BEGIN
    v_role_str := new.raw_user_meta_data->>'role';
    IF v_role_str = 'Apoteker / Owner' THEN
        v_role := 'Apoteker / Owner'::public.user_role;
    ELSE
        v_role := 'Kasir'::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, username, full_name, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'full_name', 'Staf Apotek'),
        v_role
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 3. TABEL MASTER OBAT & INVENTARIS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'Strip',
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_medicines_code ON public.medicines(code);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON public.medicines(category);

DROP TRIGGER IF EXISTS set_medicines_updated_at ON public.medicines;
CREATE TRIGGER set_medicines_updated_at
    BEFORE UPDATE ON public.medicines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 4. TABEL TRANSAKSI PENJUALAN KASIR (HEADER & DETAIL)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    date_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    customer VARCHAR(100) NOT NULL DEFAULT 'Pelanggan Umum',
    cashier_name VARCHAR(100) NOT NULL,
    cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Tunai',
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total NUMERIC(15, 2) NOT NULL CHECK (total >= 0),
    amount_tendered NUMERIC(15, 2) NOT NULL CHECK (amount_tendered >= total),
    change NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (change >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_code ON public.transactions(code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON public.transactions(cashier_id);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    medicine_code VARCHAR(30) NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    qty INTEGER NOT NULL CHECK (qty > 0),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_trx_items_trx_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trx_items_medicine_id ON public.transaction_items(medicine_id);


-- ==============================================================================
-- 5. TABEL RIWAYAT PERUBAHAN STOK (AUDIT MUTASI STOK)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    medicine_code VARCHAR(30) NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('in', 'out', 'adjustment')),
    delta INTEGER NOT NULL,
    final_stock INTEGER NOT NULL CHECK (final_stock >= 0),
    reason TEXT NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_med ON public.stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(date DESC);


-- ==============================================================================
-- 6. TABEL PENGATURAN APOTEK (SINGLETON)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pharmacy_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    pharmacy_name VARCHAR(150) NOT NULL DEFAULT 'Apotek Sri Redjeki Farma',
    tagline VARCHAR(200) NOT NULL DEFAULT 'Pelayanan Ramah, Cepat, dan Terpercaya',
    address TEXT NOT NULL DEFAULT 'Jl. Raya Sehat Walafiat No. 88, Jawa Barat',
    phone VARCHAR(50) NOT NULL DEFAULT '0812-3456-7890',
    receipt_footer TEXT NOT NULL DEFAULT 'Semoga Lekas Sembuh & Terima Kasih Atas Kunjungan Anda',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.pharmacy_settings (id, pharmacy_name, tagline, address, phone, receipt_footer)
VALUES (
    1,
    'Apotek Sri Redjeki Farma',
    'Pelayanan Ramah, Cepat, dan Terpercaya',
    'Jl. Raya Sehat Walafiat No. 88, Jawa Barat',
    '0812-3456-7890',
    'Semoga Lekas Sembuh & Terima Kasih Atas Kunjungan Anda'
) ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES — IDEMPOTENT (ANTI-42710)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Kebijakan Tabel `profiles`
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owner can read all profiles" ON public.profiles;
CREATE POLICY "Owner can read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_owner_or_apoteker());

DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
CREATE POLICY "Users can update own name"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- B. Kebijakan Tabel `medicines`
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read medicines" ON public.medicines;
CREATE POLICY "Authenticated users can read medicines"
    ON public.medicines FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anon users can read medicines" ON public.medicines;
CREATE POLICY "Anon users can read medicines"
    ON public.medicines FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Only owner can insert medicines" ON public.medicines;
CREATE POLICY "Only owner can insert medicines"
    ON public.medicines FOR INSERT
    TO authenticated
    WITH CHECK (public.is_owner_or_apoteker());

DROP POLICY IF EXISTS "Only owner can update medicines catalog" ON public.medicines;
CREATE POLICY "Only owner can update medicines catalog"
    ON public.medicines FOR UPDATE
    TO authenticated
    USING (public.is_owner_or_apoteker())
    WITH CHECK (public.is_owner_or_apoteker());

DROP POLICY IF EXISTS "Only owner can delete medicines" ON public.medicines;
CREATE POLICY "Only owner can delete medicines"
    ON public.medicines FOR DELETE
    TO authenticated
    USING (public.is_owner_or_apoteker());

-- ------------------------------------------------------------------------------
-- C. Kebijakan Tabel `transactions` & `transaction_items`
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.transactions;
CREATE POLICY "Authenticated users can read transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can read transaction items" ON public.transaction_items;
CREATE POLICY "Authenticated users can read transaction items"
    ON public.transaction_items FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.transactions;
CREATE POLICY "Authenticated users can insert transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert transaction items" ON public.transaction_items;
CREATE POLICY "Authenticated users can insert transaction items"
    ON public.transaction_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- D. Kebijakan Tabel `stock_movements`
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can read stock movements"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can record stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can record stock movements"
    ON public.stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- E. Kebijakan Tabel `pharmacy_settings`
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read pharmacy settings" ON public.pharmacy_settings;
CREATE POLICY "Authenticated users can read pharmacy settings"
    ON public.pharmacy_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anon users can read pharmacy settings" ON public.pharmacy_settings;
CREATE POLICY "Anon users can read pharmacy settings"
    ON public.pharmacy_settings FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Only owner can update pharmacy settings" ON public.pharmacy_settings;
CREATE POLICY "Only owner can update pharmacy settings"
    ON public.pharmacy_settings FOR UPDATE
    TO authenticated
    USING (public.is_owner_or_apoteker())
    WITH CHECK (public.is_owner_or_apoteker());


-- ==============================================================================
-- 8. FUNGSI DATABASE ATOMIK (RPC): `process_checkout`
-- ==============================================================================
-- Menjamin transaksi atomik ACID, row locking (FOR UPDATE) untuk anti race condition,
-- verifikasi autentikasi auth.uid() resmi, validasi RBAC profil kasir,
-- kalkulasi harga resmi dari database, dan mutasi stok otomatis.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_customer VARCHAR,
    p_payment_method VARCHAR,
    p_amount_tendered NUMERIC,
    p_discount NUMERIC,
    p_notes TEXT,
    p_cashier_name VARCHAR,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cashier_id UUID;
    v_cashier_role user_role;
    v_item RECORD;
    v_med RECORD;
    v_subtotal NUMERIC(15, 2) := 0;
    v_total NUMERIC(15, 2) := 0;
    v_change NUMERIC(15, 2) := 0;
    v_invoice_code VARCHAR(50);
    v_transaction_id UUID;
    v_new_stock INTEGER;
    v_item_subtotal NUMERIC(15, 2);
    v_item_count INTEGER;
BEGIN
    -- 1. Validasi Autentikasi Pengguna Resmi Supabase
    v_cashier_id := auth.uid();
    IF v_cashier_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak terautentikasi.';
    END IF;

    -- 2. Validasi Hak Akses & Peran Kasir / Owner dari Database Profiles
    SELECT role INTO v_cashier_role FROM public.profiles WHERE id = v_cashier_id;
    IF v_cashier_role IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Profil staf kasir tidak ditemukan di database.';
    END IF;

    -- 3. Validasi Keranjang Belanja
    v_item_count := jsonb_array_length(p_items);
    IF v_item_count IS NULL OR v_item_count = 0 THEN
        RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong.';
    END IF;

    -- 4. Kunci Baris Obat (FOR UPDATE) & Validasi Harga serta Ketersediaan Stok
    FOR v_item IN 
        SELECT 
            (value->>'medicine_id')::UUID AS med_id,
            (value->>'medicine_code')::VARCHAR AS med_code,
            (value->>'qty')::INTEGER AS qty
        FROM jsonb_array_elements(p_items)
    LOOP
        IF v_item.qty <= 0 THEN
            RAISE EXCEPTION 'Jumlah pembelian untuk setiap item obat harus lebih dari 0.';
        END IF;

        -- Ambil data obat terbaru dengan PESSIMISTIC ROW LOCK (FOR UPDATE)
        SELECT id, code, name, unit, price, stock 
        INTO v_med 
        FROM public.medicines 
        WHERE (v_item.med_id IS NOT NULL AND id = v_item.med_id) 
           OR (code = v_item.med_code)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Obat dengan kode "%" tidak ditemukan dalam database.', v_item.med_code;
        END IF;

        IF v_med.stock < v_item.qty THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk obat "%" (Sisa di apotek: %, Diminta: %).', v_med.name, v_med.stock, v_item.qty;
        END IF;

        -- Subtotal dihitung menggunakan harga resmi dari database (anti manipulasi client)
        v_item_subtotal := v_med.price * v_item.qty;
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    -- 5. Kalkulasi Total Akhir & Kembalian
    v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));
    
    IF p_amount_tendered < v_total THEN
        RAISE EXCEPTION 'Uang pembayaran (Rp %) kurang dari total tagihan (Rp %).', 
            TO_CHAR(p_amount_tendered, 'FM999,999,999'), TO_CHAR(v_total, 'FM999,999,999');
    END IF;

    v_change := p_amount_tendered - v_total;

    -- 6. Generate Nomor Faktur Unik
    v_invoice_code := 'TRX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));

    -- 7. Simpan Transaksi Header
    INSERT INTO public.transactions (
        code,
        date_time,
        customer,
        cashier_name,
        cashier_id,
        payment_method,
        subtotal,
        discount,
        total,
        amount_tendered,
        change,
        notes
    ) VALUES (
        v_invoice_code,
        timezone('utc'::text, now()),
        COALESCE(NULLIF(TRIM(p_customer), ''), 'Pelanggan Umum'),
        COALESCE(NULLIF(TRIM(p_cashier_name), ''), 'Kasir'),
        v_cashier_id,
        COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Tunai'),
        v_subtotal,
        COALESCE(p_discount, 0),
        v_total,
        p_amount_tendered,
        v_change,
        COALESCE(p_notes, '-')
    ) RETURNING id INTO v_transaction_id;

    -- 8. Simpan Detail Item, Kurangi Stok, dan Catat Audit Mutasi Stok
    FOR v_item IN 
        SELECT 
            (value->>'medicine_id')::UUID AS med_id,
            (value->>'medicine_code')::VARCHAR AS med_code,
            (value->>'qty')::INTEGER AS qty
        FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, code, name, unit, price, stock 
        INTO v_med 
        FROM public.medicines 
        WHERE (v_item.med_id IS NOT NULL AND id = v_item.med_id) 
           OR (code = v_item.med_code);

        v_item_subtotal := v_med.price * v_item.qty;
        v_new_stock := v_med.stock - v_item.qty;

        -- Detail transaksi
        INSERT INTO public.transaction_items (
            transaction_id,
            medicine_id,
            medicine_code,
            medicine_name,
            unit,
            price,
            qty,
            subtotal
        ) VALUES (
            v_transaction_id,
            v_med.id,
            v_med.code,
            v_med.name,
            v_med.unit,
            v_med.price,
            v_item.qty,
            v_item_subtotal
        );

        -- Pengurangan stok atomik
        UPDATE public.medicines 
        SET stock = v_new_stock 
        WHERE id = v_med.id;

        -- Mutasi stok keluar (sale)
        INSERT INTO public.stock_movements (
            medicine_id,
            medicine_code,
            medicine_name,
            date,
            change_type,
            delta,
            final_stock,
            reason,
            operator_name,
            operator_id
        ) VALUES (
            v_med.id,
            v_med.code,
            v_med.name,
            timezone('utc'::text, now()),
            'out',
            -v_item.qty,
            v_new_stock,
            'Penjualan Kasir: ' || v_invoice_code,
            COALESCE(p_cashier_name, 'Kasir'),
            v_cashier_id
        );
    END LOOP;

    -- 9. Kembalikan payload hasil transaksi sukses
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'invoice_code', v_invoice_code,
        'total', v_total,
        'subtotal', v_subtotal,
        'discount', COALESCE(p_discount, 0),
        'amount_tendered', p_amount_tendered,
        'change', v_change,
        'message', 'Transaksi kasir berhasil disimpan dan stok obat diperbarui secara atomik.'
    );
END;
$$;


-- ==============================================================================
-- 9. FUNGSI DATABASE (RPC): `adjust_stock` (UNTUK KELOLA STOK APOTEKER)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.adjust_stock(
    p_medicine_id UUID,
    p_change_type VARCHAR,
    p_delta INTEGER,
    p_reason TEXT,
    p_operator_name VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_med RECORD;
    v_final_stock INTEGER;
    v_actual_delta INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak terautentikasi.';
    END IF;

    IF NOT public.is_owner_or_apoteker() THEN
        RAISE EXCEPTION 'Hanya Apoteker / Owner yang dapat melakukan penyesuaian stok inventaris.';
    END IF;

    SELECT id, code, name, unit, price, stock 
    INTO v_med 
    FROM public.medicines 
    WHERE id = p_medicine_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Obat tidak ditemukan.';
    END IF;

    IF p_change_type = 'in' THEN
        v_actual_delta := ABS(p_delta);
        v_final_stock := v_med.stock + v_actual_delta;
    ELSIF p_change_type = 'out' THEN
        v_actual_delta := -ABS(p_delta);
        v_final_stock := v_med.stock - ABS(p_delta);
        IF v_final_stock < 0 THEN
            RAISE EXCEPTION 'Stok tidak boleh bernilai negatif.';
        END IF;
    ELSIF p_change_type = 'adjustment' THEN
        v_final_stock := p_delta;
        IF v_final_stock < 0 THEN
            RAISE EXCEPTION 'Nilai stok baru tidak boleh negatif.';
        END IF;
        v_actual_delta := v_final_stock - v_med.stock;
    ELSE
        RAISE EXCEPTION 'Tipe mutasi stok tidak valid.';
    END IF;

    UPDATE public.medicines
    SET stock = v_final_stock
    WHERE id = v_med.id;

    INSERT INTO public.stock_movements (
        medicine_id,
        medicine_code,
        medicine_name,
        date,
        change_type,
        delta,
        final_stock,
        reason,
        operator_name,
        operator_id
    ) VALUES (
        v_med.id,
        v_med.code,
        v_med.name,
        timezone('utc'::text, now()),
        p_change_type,
        v_actual_delta,
        v_final_stock,
        COALESCE(p_reason, 'Penyesuaian stok manual'),
        COALESCE(p_operator_name, 'Apoteker / Owner'),
        v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'medicine_id', v_med.id,
        'old_stock', v_med.stock,
        'new_stock', v_final_stock,
        'message', 'Stok obat ' || v_med.name || ' berhasil diperbarui.'
    );
END;
$$;


-- ==============================================================================
-- 10. HAK AKSES FUNGSI (GRANTS)
-- ==============================================================================

REVOKE EXECUTE ON FUNCTION public.process_checkout FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_checkout TO authenticated;

REVOKE EXECUTE ON FUNCTION public.adjust_stock FROM public, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock TO authenticated;


-- ==============================================================================
-- 11. SEED DATA AWAL: AKUN RESMI APOTEK (SUPABASE AUTH & PROFILES)
-- ==============================================================================
-- Akun yang disediakan:
-- 1. Kasir   : kasir@sriredjeki.id / Kasir1234! (atau 1234)
-- 2. Apoteker: owner@sriredjeki.id / Owner1234! (atau 1234)
-- ==============================================================================

DO $$
DECLARE
    v_kasir_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
    v_owner_id UUID := 'a0000000-0000-0000-0000-000000000002'::UUID;
    v_encrypted_kasir_pw TEXT;
    v_encrypted_owner_pw TEXT;
BEGIN
    -- 1. Bersihkan phone bernilai string kosong menjadi NULL agar tidak bentrok dengan users_phone_key
    UPDATE auth.users SET phone = NULL WHERE phone = '';

    -- 2. Bersihkan semua nilai NULL pada kolom token auth.users yang menyebabkan error schema
    UPDATE auth.users
    SET 
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        is_sso_user = COALESCE(is_sso_user, false),
        is_anonymous = COALESCE(is_anonymous, false),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE confirmation_token IS NULL 
       OR recovery_token IS NULL 
       OR email_change_token_new IS NULL
       OR email_change IS NULL;

    v_encrypted_kasir_pw := crypt('kasir123', gen_salt('bf'));
    v_encrypted_owner_pw := crypt('owner123', gen_salt('bf'));

    -- A. Akun Kasir
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kasir@sriredjeki.id') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone,
            phone_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
            is_sso_user,
            is_anonymous
        ) VALUES (
            v_kasir_id,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'kasir@sriredjeki.id',
            v_encrypted_kasir_pw,
            now(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            '{"username":"kasir","full_name":"Kasir Utama","role":"Kasir"}'::JSONB,
            now(),
            now(),
            'authenticated',
            'authenticated',
            '', '', '', '', NULL, '', '', '', '', false, false
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = v_encrypted_kasir_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            phone = NULL,
            phone_change = '',
            phone_change_token = '',
            email_change_token_current = '',
            reauthentication_token = '',
            is_sso_user = false,
            is_anonymous = false
        WHERE email = 'kasir@sriredjeki.id';
    END IF;

    -- B. Akun Apoteker / Owner
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner@sriredjeki.id') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone,
            phone_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
            is_sso_user,
            is_anonymous
        ) VALUES (
            v_owner_id,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'owner@sriredjeki.id',
            v_encrypted_owner_pw,
            now(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            '{"username":"owner","full_name":"Apoteker Pengelola","role":"Apoteker / Owner"}'::JSONB,
            now(),
            now(),
            'authenticated',
            'authenticated',
            '', '', '', '', NULL, '', '', '', '', false, false
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = v_encrypted_owner_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            phone = NULL,
            phone_change = '',
            phone_change_token = '',
            email_change_token_current = '',
            reauthentication_token = '',
            is_sso_user = false,
            is_anonymous = false
        WHERE email = 'owner@sriredjeki.id';
    END IF;

    -- C. Sinkronisasi Data Profil di public.profiles
    INSERT INTO public.profiles (id, username, full_name, role)
    SELECT id, 'kasir', 'Kasir Utama', 'Kasir'::public.user_role
    FROM auth.users WHERE email = 'kasir@sriredjeki.id'
    ON CONFLICT (id) DO UPDATE SET 
        role = 'Kasir'::public.user_role, 
        full_name = 'Kasir Utama';

    INSERT INTO public.profiles (id, username, full_name, role)
    SELECT id, 'owner', 'Apoteker Pengelola', 'Apoteker / Owner'::public.user_role
    FROM auth.users WHERE email = 'owner@sriredjeki.id'
    ON CONFLICT (id) DO UPDATE SET 
        role = 'Apoteker / Owner'::public.user_role, 
        full_name = 'Apoteker Pengelola';
END $$;


-- ==============================================================================
-- 12. SEED DATA AWAL: KATALOG OBAT LENGKAP APOTEK
-- ==============================================================================

INSERT INTO public.medicines (code, name, category, unit, price, stock, min_stock, image_url)
VALUES 
    ('MED-001', 'Paracetamol 500mg', 'Tablet', 'Strip', 6500, 120, 20, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'),
    ('MED-002', 'Amoxicillin 500mg', 'Kapsul', 'Strip', 12000, 45, 15, 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60'),
    ('MED-003', 'Vitamin C 500mg', 'Tablet', 'Botol', 35000, 30, 10, 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&auto=format&fit=crop&q=60'),
    ('MED-004', 'Antasida Doen', 'Tablet', 'Strip', 5000, 85, 20, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&auto=format&fit=crop&q=60'),
    ('MED-005', 'Cetirizine 10mg', 'Tablet', 'Strip', 8500, 60, 15, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&auto=format&fit=crop&q=60'),
    ('MED-006', 'Ibuprofen 400mg', 'Tablet', 'Strip', 9000, 40, 15, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'),
    ('MED-007', 'Omeprazole 20mg', 'Kapsul', 'Strip', 18000, 25, 10, 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60'),
    ('MED-008', 'Betadine Salep 10g', 'Salep', 'Tube', 22000, 18, 10, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&auto=format&fit=crop&q=60')
ON CONFLICT (code) DO NOTHING;

-- SELESAI. Migrasi ini 100% Idempotent dan aman dijalankan berulang kali.
