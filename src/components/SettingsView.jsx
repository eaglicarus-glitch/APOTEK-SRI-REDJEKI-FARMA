import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useToast } from '../context/ToastContext';
import {
  getActiveSupabaseConfig,
  isSupabaseConfigured,
  resetSupabaseClient,
  getSupabaseClient
} from '../lib/supabaseClient';

export default function SettingsView() {
  const { settings, updatePharmacySettings, loadData } = usePharmacy();
  const { showToast } = useToast();

  // Settings Form State
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName || 'Apotek Sri Redjeki Farma');
  const [tagline, setTagline] = useState(settings.tagline || 'Sehat Bersama, Hidup Lebih Baik');
  const [address, setAddress] = useState(settings.address || 'Jl. Raya No. 123, Kec. Sidoarjo');
  const [phone, setPhone] = useState(settings.phone || '0812-3456-7890');
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || 'Terima Kasih, Semoga Sehat Selalu');

  // Supabase Config State
  const activeConfig = getActiveSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(activeConfig.url.includes('xyzcompany') ? '' : activeConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(activeConfig.anonKey.includes('dummy_anon_key') ? '' : activeConfig.anonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [statusBadge, setStatusBadge] = useState(() => {
    return isSupabaseConfigured()
      ? { text: '🟢 Terhubung ke Supabase (Aktif)', bg: '#DCFCE7', color: '#15803D' }
      : { text: '🟡 Belum Dikonfigurasi', bg: '#FFEDD5', color: '#C2410C' };
  });

  const handleSavePharmacy = async (e) => {
    e.preventDefault();
    if (!pharmacyName.trim()) {
      showToast('Nama apotek tidak boleh kosong!', 'warning');
      return;
    }

    const updated = {
      ...settings,
      pharmacyName: pharmacyName.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      receiptFooter: receiptFooter.trim()
    };

    try {
      await updatePharmacySettings(updated);
      showToast('Profil apotek dan pengaturan struk berhasil diperbarui!', 'success');
    } catch (err) {
      showToast(`Gagal menyimpan pengaturan: ${err.message}`, 'danger');
    }
  };

  const handleSaveSupabaseConfig = async (e) => {
    e.preventDefault();

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      showToast('Project URL dan Public Key wajib diisi!', 'warning');
      return;
    }

    if (!supabaseUrl.startsWith('https://')) {
      showToast('Project URL harus diawali dengan https://', 'warning');
      return;
    }

    resetSupabaseClient(supabaseUrl.trim(), supabaseKey.trim());
    showToast('Kredensial Supabase disimpan. Menguji koneksi...', 'info');
    await handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setStatusBadge({ text: '🔄 Menguji koneksi...', bg: '#F1F5F9', color: '#1E293B' });

    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('Client Supabase belum siap');

      const { error } = await client.from('pharmacy_settings').select('id, pharmacy_name').limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setStatusBadge({
        text: '🟢 Terhubung ke Supabase (Aktif)',
        bg: '#DCFCE7',
        color: '#15803D'
      });
      showToast('Sukses! Terhubung ke database PostgreSQL Supabase.', 'success');
      await loadData();
    } catch (err) {
      setStatusBadge({
        text: '🔴 Gagal Terhubung: ' + (err.message || 'Error'),
        bg: '#FEE2E2',
        color: '#B91C1C'
      });
      showToast('Gagal terhubung ke Supabase: ' + err.message, 'danger');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <section id="view-settings" className="view-panel">
      {/* Header Halaman */}
      <div className="content-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="content-title">Pengaturan Sistem Apotek</h1>
        </div>
      </div>

      {/* 2-Kolom Grid: Profil Apotek & Integrasi Supabase */}
      <div className="dashboard-two-columns">
        {/* Kolom Kiri: Profil & Format Struk */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Profil &amp; Identitas Apotek</h3>
          </div>

          <form onSubmit={handleSavePharmacy} noValidate>
            <div className="form-group">
              <label htmlFor="settings-pharmacy-name">Nama Apotek *</label>
              <input
                type="text"
                id="settings-pharmacy-name"
                className="form-control"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-tagline">Tagline / Slogan</label>
              <input
                type="text"
                id="settings-tagline"
                className="form-control"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-address">Alamat Fisik Apotek *</label>
              <textarea
                id="settings-address"
                className="form-control"
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-phone">No. Telepon / WhatsApp *</label>
              <input
                type="text"
                id="settings-phone"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-receipt-footer">Teks Footer Nota Penjualan</label>
              <textarea
                id="settings-receipt-footer"
                className="form-control"
                rows="2"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
              Simpan Profil Apotek
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Integrasi Database Supabase */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Integrasi Database Supabase</h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '20px',
                backgroundColor: statusBadge.bg,
                color: statusBadge.color
              }}
            >
              {statusBadge.text}
            </span>
          </div>

          <form onSubmit={handleSaveSupabaseConfig} noValidate>
            <div className="form-group">
              <label htmlFor="settings-supabase-url">Supabase Project URL</label>
              <input
                type="text"
                id="settings-supabase-url"
                className="form-control"
                placeholder="https://your-project-id.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-supabase-key">Supabase Public / Anon Key</label>
              <input
                type="password"
                id="settings-supabase-key"
                className="form-control"
                placeholder="sb_publishable_... atau eyJhbGciOi..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? 'Menguji...' : 'Uji Koneksi'}
              </button>
              <button type="submit" className="btn btn-primary">
                Simpan Kredensial
              </button>
            </div>
          </form>

          {/* Kartu Informasi Konfigurasi Database */}
          <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
            <div style={{ fontWeight: '600', color: '#0F2238', marginBottom: '4px' }}>
              Informasi PostgreSQL &amp; Migrasi Schema
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Database PostgreSQL terpasang dengan Row Level Security (RLS) dan Stored Procedure atomik (<code>process_checkout</code> &amp; <code>adjust_stock</code>). Eksekusi script <code>schema.sql</code> di Supabase SQL Editor untuk sinkronisasi tabel penuh.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
