import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/constants';
import ReceiptModal from './ReceiptModal';

export default function PosView() {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    setCartQty,
    removeFromCart,
    clearCart,
    processCheckout,
    globalSearch
  } = usePharmacy();

  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState(globalSearch || '');
  const [discount, setDiscount] = useState(0);

  // Sync with global search from header
  React.useEffect(() => {
    if (globalSearch) {
      setSearchQuery(globalSearch);
    }
  }, [globalSearch]);

  // Modal Pembayaran State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [customerName, setCustomerName] = useState('Umum');
  const [tenderedStr, setTenderedStr] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Struk Modal State
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Kategori sesuai mockup
  const categories = ['Semua', 'Tablet', 'Kapsul', 'Sirup', 'Salep', 'Lainnya'];

  // Filter katalog produk
  const filteredProducts = products.filter((p) => {
    const matchCat =
      selectedCategory === 'Semua' ||
      (selectedCategory === 'Lainnya'
        ? !['Tablet', 'Kapsul', 'Sirup', 'Salep'].includes(p.category)
        : p.category === selectedCategory);

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const cartSubtotal = cart.reduce((sum, it) => sum + it.subtotal, 0);
  const effectiveDiscount = Math.min(cartSubtotal, Math.max(0, Number(discount) || 0));
  const cartTotal = Math.max(0, cartSubtotal - effectiveDiscount);

  const tenderedAmount = useMemo(() => {
    if (paymentMethod !== 'Tunai') return cartTotal;
    const num = Number(tenderedStr.replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 0 : num;
  }, [paymentMethod, tenderedStr, cartTotal]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} telah habis!`, 'danger');
      return;
    }
    const success = addToCart(product);
    if (!success) {
      showToast(`Jumlah di keranjang sudah mencapai sisa stok (${product.stock})!`, 'warning');
    }
  };

  const handleOpenPayModal = () => {
    if (cart.length === 0) {
      showToast('Keranjang belanja masih kosong!', 'warning');
      return;
    }
    setPaymentMethod('Tunai');
    setTenderedStr(new Intl.NumberFormat('id-ID').format(cartTotal));
    setCustomerName('Umum');
    setIsPayModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (paymentMethod === 'Tunai' && tenderedAmount < cartTotal) {
      showToast('Jumlah uang yang diterima kurang dari total belanja!', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const tx = await processCheckout({
        customer: customerName.trim() || 'Umum',
        paymentMethod,
        amountTendered: tenderedAmount,
        discount: effectiveDiscount,
        notes: '-',
        cashierName: currentUser?.name || 'Kasir Utama'
      });

      setIsPayModalOpen(false);
      setLastTransaction(tx);
      setIsReceiptOpen(true);
      showToast('Transaksi kasir berhasil diproses!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal memproses transaksi kasir!', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="view-pos" className="view-panel pos-view-clean">
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Penjualan</h1>
        </div>
      </div>

      <div className="pos-main-split">
        {/* Kolom Kiri: Katalog Obat */}
        <div className="pos-catalog-column">
          {/* Input Pencarian */}
          <div className="pos-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="pos-search-input"
              className="pos-search-input"
              placeholder="Cari obat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Kategori Horizontal Pills */}
          <div className="category-pills-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List Produk Horizontal Cards */}
          <div className="pos-products-list">
            {filteredProducts.length === 0 ? (
              <div className="empty-catalog-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>Tidak ada obat ditemukan.</p>
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`pos-product-row-card ${p.stock <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => p.stock > 0 && handleAddToCart(p)}
                >
                  <div className="product-row-thumb">
                    {p.image ? (
                      <img src={p.image} alt={p.name} />
                    ) : (
                      <div className="product-thumb-placeholder">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="4" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="product-row-info">
                    <div className="product-row-name">{p.name}</div>
                    <div className="product-row-sub">{p.category} - {p.unit}</div>
                  </div>
                  <div className="product-row-price">
                    {formatRupiah(p.price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Keranjang Kasir Sesuai Mockup */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <h3 className="cart-title">Keranjang</h3>
            {cart.length > 0 && (
              <button
                type="button"
                className="btn-clear-cart"
                onClick={clearCart}
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="pos-cart-items-wrap">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <p>Keranjang kosong</p>
                <span>Pilih obat di katalog untuk menambahkan</span>
              </div>
            ) : (
              cart.map((item) => {
                const itemProduct = products.find((p) => p.id === item.id);
                const itemImage = item.image || itemProduct?.image;
                return (
                  <div key={item.id} className="pos-cart-item-row">
                    <div className="cart-item-thumb">
                      {itemImage ? (
                        <img src={itemImage} alt={item.name} />
                      ) : (
                        <div className="cart-thumb-box">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="1.8">
                            <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                            <path d="m8.5 8.5 7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="cart-item-content">
                      <div className="cart-item-top-row">
                        <div className="cart-item-name" title={item.name}>{item.name}</div>
                      </div>
                      <div className="cart-item-bottom-row">
                        <div className="cart-item-qty-actions">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            title="Kurangi kuantitas"
                            aria-label="Kurang"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            min="1"
                            onChange={(e) => setCartQty(item.id, e.target.value)}
                            aria-label="Jumlah"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            title="Tambah kuantitas"
                            aria-label="Tambah"
                          >
                            +
                          </button>
                        </div>
                        <div className="cart-item-actions-right">
                          <span className="cart-item-price-val">{formatRupiah(item.subtotal)}</span>
                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => removeFromCart(item.id)}
                            title="Hapus pesanan"
                            aria-label="Hapus pesanan"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })            )}
          </div>

          {/* Ringkasan & Tombol Simpan / Bayar */}
          <div className="pos-cart-summary">
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{formatRupiah(cartSubtotal)}</span>
            </div>
            <div className="summary-line" style={{ alignItems: 'center' }}>
              <span>Diskon (Rp)</span>
              <input
                type="number"
                min="0"
                style={{ width: '85px', padding: '2px 6px', textAlign: 'right', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}
                value={discount === 0 ? '' : discount}
                placeholder="0"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDiscount(isNaN(val) || val < 0 ? 0 : val);
                }}
              />
            </div>
            <div className="summary-line total-line">
              <span>Total</span>
              <span className="total-amount">{formatRupiah(cartTotal)}</span>
            </div>

            <div className="pos-action-buttons">
              <button
                type="button"
                className="btn btn-primary btn-block btn-cart-pay"
                onClick={handleOpenPayModal}
                disabled={cart.length === 0}
              >
                Bayar ({formatRupiah(cartTotal)})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PEMBAYARAN PERSIS SEPERTI DI MOCKUP (BOTTOM CENTER) */}
      {isPayModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-checkout-custom">
            <div className="modal-header">
              <h3 className="modal-title">Pembayaran</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsPayModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} noValidate>
              <div className="modal-body">
                <div className="modal-split-layout">
                  {/* Kolom Kiri: Data Pelanggan, Metode, Catatan */}
                  <div>
                    {/* Nama Pelanggan */}
                    <div className="form-group">
                      <label htmlFor="checkout-customer">Nama Pelanggan</label>
                      <input
                        type="text"
                        id="checkout-customer"
                        className="form-control"
                        placeholder="Contoh: Pelanggan Umum"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>

                    {/* Pilih Metode Pembayaran (Segmented Cards) */}
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label>Pilih Metode Pembayaran</label>
                      <div className="payment-method-grid">
                        <button
                          type="button"
                          className={`method-btn ${paymentMethod === 'Tunai' ? 'active' : ''}`}
                          onClick={() => setPaymentMethod('Tunai')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <circle cx="12" cy="12" r="2" />
                            <path d="M6 12h.01M18 12h.01" />
                          </svg>
                          <span>Tunai</span>
                        </button>

                        <button
                          type="button"
                          className={`method-btn ${paymentMethod === 'Debit' ? 'active' : ''}`}
                          onClick={() => setPaymentMethod('Debit')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                          <span>Debit</span>
                        </button>

                        <button
                          type="button"
                          className={`method-btn ${paymentMethod === 'QRIS' ? 'active' : ''}`}
                          onClick={() => setPaymentMethod('QRIS')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>QRIS</span>
                        </button>
                      </div>
                    </div>

                    {/* Nominal Diterima jika Tunai */}
                    {paymentMethod === 'Tunai' && (
                      <div className="form-group" style={{ marginTop: '14px' }}>
                        <label htmlFor="checkout-tendered">Uang Tunai Diterima (Rp)</label>
                        <input
                          type="text"
                          id="checkout-tendered"
                          className="form-control"
                          value={tenderedStr}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setTenderedStr(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                          }}
                          placeholder="Masukkan nominal uang"
                        />
                        {/* Quick Cash Chips */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => setTenderedStr(new Intl.NumberFormat('id-ID').format(cartTotal))}
                          >
                            Uang Pas
                          </button>
                          {[10000, 20000, 50000, 100000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => setTenderedStr(new Intl.NumberFormat('id-ID').format(amt))}
                            >
                              {formatRupiah(amt)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Kolom Kanan: Ringkasan Transaksi & Kembalian */}
                  <div>
                    <div className="checkout-summary-card">
                      <h4 className="summary-card-title">Ringkasan Transaksi</h4>
                      <div className="summary-item-line">
                        <span>{cart.reduce((s, i) => s + i.qty, 0)} Item</span>
                        <span>{formatRupiah(cartSubtotal)}</span>
                      </div>
                      <div className="summary-item-line">
                        <span>Diskon</span>
                        <span>{effectiveDiscount > 0 ? `-${formatRupiah(effectiveDiscount)}` : 'Rp 0'}</span>
                      </div>
                      <div className="summary-divider" />
                      <div className="summary-item-line total-item-line">
                        <span>Total Pembayaran</span>
                        <span className="total-highlight">{formatRupiah(cartTotal)}</span>
                      </div>

                      {paymentMethod === 'Tunai' && (
                        <>
                          <div className="summary-divider" />
                          <div className="summary-item-line">
                            <span>Uang Diterima</span>
                            <span className="fw-bold">{formatRupiah(tenderedAmount)}</span>
                          </div>
                          <div
                            className="summary-item-line"
                            style={{
                              color: tenderedAmount >= cartTotal ? 'var(--success-text)' : 'var(--danger-text)',
                              fontWeight: '600'
                            }}
                          >
                            <span>{tenderedAmount >= cartTotal ? 'Kembalian' : 'Kurang'}</span>
                            <span>
                              {tenderedAmount >= cartTotal
                                ? formatRupiah(tenderedAmount - cartTotal)
                                : `-${formatRupiah(cartTotal - tenderedAmount)}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPayModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRUK CETAK THERMAL NOTA */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={lastTransaction}
        onClose={() => setIsReceiptOpen(false)}
      />
    </section>
  );
}
