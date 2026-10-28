import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { STORAGE_KEY, DEFAULT_SETTINGS, INITIAL_PRODUCTS, getLocalDateString } from '../lib/constants';

const PharmacyContext = createContext(null);

export function PharmacyProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cart, setCart] = useState([]);
  const [cartDraft, setCartDraft] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initial load: Local storage first, then sync with Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);

    // 1. Load from local cache for fast initial render
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.products && Array.isArray(parsed.products)) setProducts(parsed.products);
        if (parsed.transactions && Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) setStockMovements(parsed.stockMovements);
        if (parsed.settings) setSettings((prev) => ({ ...prev, ...parsed.settings }));
        if (parsed.cartDraft) setCartDraft(parsed.cartDraft);
      }
    } catch (e) {
      console.warn('Gagal membaca cache lokal:', e);
    }

    // 2. Sync with Supabase if connected
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient();
        const [medsRes, trxRes, setRes, movRes] = await Promise.all([
          client.from('medicines').select('*').order('name', { ascending: true }),
          client.from('transactions').select('*, transaction_items(*)').order('date_time', { ascending: false }),
          client.from('pharmacy_settings').select('*').eq('id', 1).maybeSingle(),
          client.from('stock_movements').select('*').order('date', { ascending: false }).limit(100)
        ]);

        if (medsRes.data && medsRes.data.length > 0) {
          const mappedMeds = medsRes.data.map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            category: m.category,
            unit: m.unit,
            price: Number(m.price),
            stock: Number(m.stock),
            minStock: Number(m.min_stock || 10),
            image: m.image_url || ''
          }));
          setProducts(mappedMeds);
        }

        if (trxRes.data && trxRes.data.length > 0) {
          const mappedTrx = trxRes.data.map((tx) => ({
            id: tx.code || tx.id,
            code: tx.code || tx.id,
            dateTime: tx.date_time,
            customer: tx.customer,
            cashier: tx.cashier_name,
            paymentMethod: tx.payment_method,
            subtotal: Number(tx.subtotal),
            discount: Number(tx.discount),
            total: Number(tx.total),
            amountTendered: Number(tx.amount_tendered),
            change: Number(tx.change),
            notes: tx.notes || '-',
            items: (tx.transaction_items || []).map((it) => ({
              id: it.medicine_id || it.id,
              code: it.medicine_code,
              name: it.medicine_name,
              unit: it.unit,
              price: Number(it.price),
              qty: Number(it.qty),
              subtotal: Number(it.subtotal)
            }))
          }));
          setTransactions(mappedTrx);
        }

        if (setRes.data) {
          setSettings((prev) => ({
            ...prev,
            pharmacyName: setRes.data.pharmacy_name,
            tagline: setRes.data.tagline,
            address: setRes.data.address,
            phone: setRes.data.phone,
            receiptFooter: setRes.data.receipt_footer
          }));
        }

        if (movRes.data && movRes.data.length > 0) {
          const mappedMov = movRes.data.map((m) => ({
            id: m.id,
            date: m.date,
            medicineId: m.medicine_id,
            medicineCode: m.medicine_code,
            medicineName: m.medicine_name,
            changeType: m.change_type === 'in' ? 'Restok' : m.change_type === 'out' ? 'Barang Rusak/Kedaluwarsa' : 'Koreksi Stok (Opname)',
            delta: m.delta,
            finalStock: m.final_stock,
            reason: m.reason,
            cashier: m.operator_name
          }));
          setStockMovements(mappedMov);
        }
      } catch (err) {
        console.warn('Sinkronisasi Supabase gagal:', err);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const payload = {
        updatedAt: new Date().toISOString(),
        products,
        transactions,
        stockMovements,
        settings,
        cartDraft
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Gagal menyimpan cache:', e);
    }
  }, [products, transactions, stockMovements, settings, cartDraft]);

  // Cart actions
  const addToCart = (product) => {
    if (product.stock <= 0) return false;

    setCart((prevCart) => {
      const existing = prevCart.find((it) => it.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          return prevCart;
        }
        return prevCart.map((it) =>
          it.id === product.id
            ? { ...it, qty: it.qty + 1, subtotal: (it.qty + 1) * it.price }
            : it
        );
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            code: product.code,
            name: product.name,
            unit: product.unit,
            price: product.price,
            maxStock: product.stock,
            image: product.image,
            qty: 1,
            subtotal: product.price
          }
        ];
      }
    });
    return true;
  };

  const updateCartQty = (productId, delta) => {
    setCart((prevCart) => {
      const item = prevCart.find((it) => it.id === productId);
      if (!item) return prevCart;

      const prod = products.find((p) => p.id === productId);
      const currentMax = prod ? prod.stock : item.maxStock;

      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prevCart.filter((it) => it.id !== productId);
      }
      if (newQty > currentMax) {
        return prevCart;
      }

      return prevCart.map((it) =>
        it.id === productId
          ? { ...it, qty: newQty, subtotal: newQty * it.price }
          : it
      );
    });
  };

  const setCartQty = (productId, qty) => {
    setCart((prevCart) => {
      const item = prevCart.find((it) => it.id === productId);
      if (!item) return prevCart;

      const prod = products.find((p) => p.id === productId);
      const currentMax = prod ? prod.stock : item.maxStock;

      let val = parseInt(qty, 10);
      if (isNaN(val)) return prevCart;
      if (val <= 0) {
        return prevCart.filter((it) => it.id !== productId);
      }
      if (val > currentMax) val = currentMax;

      return prevCart.map((it) =>
        it.id === productId
          ? { ...it, qty: val, subtotal: val * it.price }
          : it
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((it) => it.id !== productId));
  };

  const clearCart = () => setCart([]);

  const saveCartDraft = () => {
    if (cart.length === 0) return false;
    setCartDraft([...cart]);
    setCart([]);
    return true;
  };

  const loadCartDraft = () => {
    if (!cartDraft || cartDraft.length === 0) return false;
    setCart([...cartDraft]);
    setCartDraft(null);
    return true;
  };

  // Medicine CRUD
  const saveMedicine = async (medData) => {
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      const payload = {
        code: medData.code,
        name: medData.name,
        category: medData.category,
        unit: medData.unit,
        price: Number(medData.price),
        stock: Number(medData.stock),
        min_stock: Number(medData.minStock || 10),
        image_url: medData.image || null
      };

      if (medData.id && medData.id.includes('-') && medData.id.length > 20) {
        const { error } = await client.from('medicines').update(payload).eq('id', medData.id);
        if (error) throw error;
      } else {
        const { error } = await client.from('medicines').insert(payload);
        if (error) throw error;
      }
      await loadData();
      return;
    }

    // Local fallback
    if (medData.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === medData.id ? { ...p, ...medData } : p))
      );
    } else {
      const newMed = {
        id: medData.code,
        ...medData
      };
      setProducts((prev) => [...prev, newMed]);
    }
  };

  const deleteMedicine = async (medId) => {
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      let query = client.from('medicines').delete();
      if (medId.includes('-') && medId.length > 20) {
        query = query.eq('id', medId);
      } else {
        query = query.eq('code', medId);
      }
      const { error } = await query;
      if (error) throw error;
      await loadData();
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== medId));
    setCart((prev) => prev.filter((it) => it.id !== medId));
  };

  // Stock Adjustment (Restok, Rusak, Opname)
  const adjustStock = async (medicineId, actionType, amount, notes, operatorName) => {
    const prod = products.find((p) => p.id === medicineId);
    if (!prod) throw new Error('Obat tidak ditemukan');

    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      let rpcType = 'in';
      let delta = amount;

      if (actionType === 'damaged') {
        rpcType = 'out';
      } else if (actionType === 'correction') {
        rpcType = 'adjustment';
      }

      const { data, error } = await client.rpc('adjust_stock', {
        p_medicine_id: prod.id,
        p_change_type: rpcType,
        p_delta: delta,
        p_reason: notes,
        p_operator_name: operatorName
      });

      if (error) throw error;
      await loadData();
      return data;
    }

    // Local fallback
    let delta = amount;
    let typeLabel = 'Restok';

    if (actionType === 'damaged') {
      delta = -amount;
      typeLabel = 'Barang Rusak/Kedaluwarsa';
      if (prod.stock + delta < 0) {
        throw new Error('Jumlah pengurangan melebihi sisa stok saat ini!');
      }
    } else if (actionType === 'correction') {
      delta = amount - prod.stock;
      typeLabel = 'Koreksi Stok (Opname)';
    }

    const newStock = Math.max(0, prod.stock + delta);
    setProducts((prev) =>
      prev.map((p) => (p.id === medicineId ? { ...p, stock: newStock } : p))
    );

    setStockMovements((prev) => [
      {
        id: `MOV-${Date.now()}`,
        date: new Date().toISOString(),
        medicineId: prod.id,
        medicineName: prod.name,
        changeType: typeLabel,
        delta,
        finalStock: newStock,
        reason: notes,
        cashier: operatorName
      },
      ...prev
    ]);
  };

  // Atomic Checkout POS
  const processCheckout = async (checkoutPayload) => {
    const { customer, paymentMethod, amountTendered, discount, notes, cashierName } = checkoutPayload;

    // 1. Eksekusi melalui RPC Supabase jika backend aktif
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();

      // Cek sesi autentikasi Supabase secara ketat sebelum eksekusi RPC
      const { data: sessionData, error: sessionErr } = await client.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        throw new Error('Akses ditolak: Sesi login Supabase tidak ditemukan atau sudah berakhir. Silakan login kembali.');
      }

      const itemsPayload = cart.map((item) => ({
        medicine_id: (item.id && String(item.id).includes('-') && String(item.id).length > 20) ? item.id : null,
        medicine_code: item.code,
        qty: item.qty
      }));

      // Pastikan nominal uang diterima valid secara numerik
      const subtotalCalc = cart.reduce((sum, it) => sum + it.subtotal, 0);
      const effectiveTotal = Math.max(0, subtotalCalc - (Number(discount) || 0));
      const effectiveTendered = paymentMethod === 'Tunai' 
        ? Math.max(Number(amountTendered) || 0, effectiveTotal)
        : effectiveTotal;

      const { data, error } = await client.rpc('process_checkout', {
        p_customer: customer || 'Umum',
        p_payment_method: paymentMethod || 'Tunai',
        p_amount_tendered: effectiveTendered,
        p_discount: Number(discount || 0),
        p_notes: notes || '-',
        p_cashier_name: cashierName || sessionData.session.user.user_metadata?.full_name || 'Kasir',
        p_items: itemsPayload
      });

      if (error) {
        console.error('[processCheckout] Error dari database Supabase:', error);
        if (error.code === 'P0001') {
          // Pesan khusus dari RAISE EXCEPTION PostgreSQL
          throw new Error(error.message || 'Akses ditolak: Pengguna tidak terautentikasi atau stok obat tidak mencukupi.');
        } else if (error.code === '42501') {
          throw new Error('Akses ditolak: Akun Anda tidak memiliki izin untuk memproses penjualan.');
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('Koneksi ke server Supabase terputus. Periksa jaringan internet Anda.');
        }
        throw new Error(error.message || 'Gagal memproses transaksi kasir di database.');
      }

      if (!data?.invoice_code) {
        throw new Error('Database tidak mengembalikan kode invoice transaksi yang sah.');
      }

      const finalInvoiceCode = data.invoice_code;
      const finalTx = {
        id: finalInvoiceCode,
        code: finalInvoiceCode,
        dateTime: new Date().toISOString(),
        customer: customer || 'Umum',
        cashier: cashierName,
        paymentMethod,
        subtotal: Number(data.subtotal),
        discount: Number(data.discount),
        total: Number(data.total),
        amountTendered: Number(data.amount_tendered),
        change: Number(data.change),
        notes: notes || '-',
        items: JSON.parse(JSON.stringify(cart))
      };

      setTransactions((prev) => [finalTx, ...prev]);
      setCart([]);
      await loadData();
      return finalTx;
    }

    // 2. Local Fallback (HANYA digunakan jika project belum terhubung ke Supabase sama sekali)
    const now = new Date();
    const dateStr = getLocalDateString(now);
    const seq = String(transactions.length + 1).padStart(3, '0');
    const txCode = `TRX-${dateStr.replace(/-/g, '')}-${seq}`;

    const subtotal = cart.reduce((sum, it) => sum + it.subtotal, 0);
    const finalTotal = Math.max(0, subtotal - (Number(discount) || 0));
    const change = Math.max(0, Number(amountTendered) - finalTotal);

    const transaction = {
      id: txCode,
      code: txCode,
      dateTime: now.toISOString(),
      customer,
      cashier: cashierName,
      paymentMethod,
      subtotal,
      discount: Number(discount) || 0,
      total: finalTotal,
      amountTendered: Number(amountTendered),
      change,
      notes: notes || '-',
      items: JSON.parse(JSON.stringify(cart))
    };

    setProducts((prev) =>
      prev.map((p) => {
        const item = cart.find((it) => it.id === p.id);
        return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
      })
    );

    const saleMovements = cart.map((item, idx) => {
      const prod = products.find((p) => p.id === item.id);
      const currentStock = prod ? prod.stock : item.qty;
      const finalStock = Math.max(0, currentStock - item.qty);
      return {
        id: `MOV-${Date.now()}-${idx}-${item.id}`,
        createdAt: now.toISOString(),
        dateTime: now.toISOString(),
        medicineId: item.id,
        medicineName: item.name,
        medicineCode: item.code,
        changeType: 'SALE',
        deltaQty: -item.qty,
        delta: -item.qty,
        finalStock,
        operator: cashierName,
        reason: `Penjualan Kasir (${txCode})`
      };
    });
    setStockMovements((prev) => [...saleMovements, ...(prev || [])]);

    setTransactions((prev) => [transaction, ...prev]);
    setCart([]);
    return transaction;
  };

  const updatePharmacySettings = async (newSettings) => {
    setSettings(newSettings);
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient();
        await client.from('pharmacy_settings').upsert({
          id: 1,
          pharmacy_name: newSettings.pharmacyName,
          tagline: newSettings.tagline,
          address: newSettings.address,
          phone: newSettings.phone,
          receipt_footer: newSettings.receiptFooter
        });
      } catch (e) {
        console.warn('Gagal simpan settings ke Supabase:', e);
      }
    }
  };

  return (
    <PharmacyContext.Provider
      value={{
        products,
        transactions,
        stockMovements,
        settings,
        cart,
        cartDraft,
        activeView,
        globalSearch,
        isLoading,
        setActiveView,
        setGlobalSearch,
        loadData,
        addToCart,
        updateCartQty,
        setCartQty,
        removeFromCart,
        clearCart,
        saveCartDraft,
        loadCartDraft,
        saveMedicine,
        deleteMedicine,
        adjustStock,
        processCheckout,
        updatePharmacySettings
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}

export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) throw new Error('usePharmacy must be used within a PharmacyProvider');
  return context;
}
