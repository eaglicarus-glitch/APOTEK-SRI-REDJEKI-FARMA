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
  const [tagline, setTagline] = useState(settings.tagline || 'Pelayanan Ramah, Cepat, dan Terpercaya');
  const [address, setAddress] = useState(settings.address || 'Jl. Raya Sehat Walafiat No. 88, Jawa Timur');
  const [phone, setPhone] = useState(settings.phone || '0812-3456-7890');
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || 'Semoga Lekas Sembuh & Sehat Selalu');
  const [isSavingPharmacy, setIsSavingPharmacy] = useState(false);

  // Supabase Config State
  const activeConfig = getActiveSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(activeConfig.url.includes('xyzcompany') ? '' : activeConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(activeConfig.anonKey.includes('dummy_anon_key') ? '' : activeConfig.anonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [statusBadge, setStatusBadge] = useState(() => {
    return isSupabaseConfigured()
      ? { text: '🟢 Database Supabase PostgreSQL Aktif & Terhubung', bg: '#dcfce7', color: '#15803d' }
      : { text: '🟡 Belum Dikonfigurasi', bg: '#fef3c7', color: '#b45309' };
  });

  const handleSavePharmacy = async (e) => {
    e.preventDefault();
    if (!pharmacyName.trim()) {
      showToast('Nama apotek tidak boleh kosong!', 'warning');
      return;
    }

    setIsSavingPharmacy(true);
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
      showToast('Profil apotek dan konfigurasi cetak nota berhasil disimpan!', 'success');
    } catch (err) {
      showToast(`Gagal menyimpan pengaturan: ${err.message}`, 'danger');
    } finally {
      setIsSavingPharmacy(false);
    }
  };

  const handleSaveSupabaseConfig = async (e) => {
    e.preventDefault();

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      showToast('Project URL dan Anon Key Supabase wajib diisi!', 'warning');
      return;
    }

    if (!supabaseUrl.startsWith('https://')) {
      showToast('Project URL harus diawali dengan https://', 'warning');
      return;
    }

    resetSupabaseClient(supabaseUrl.trim(), supabaseKey.trim());
    showToast('Kredensial disimpan. Menguji koneksi...', 'info');
    await handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setStatusBadge({ text: '🔄 Menguji koneksi...', bg: '#f1f5f9', color: '#1e293b' });

    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('Client Supabase belum siap');

      const { error } = await client.from('pharmacy_settings').select('id, pharmacy_name').limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setStatusBadge({
        text: '🟢 Database Supabase PostgreSQL Aktif & Terhubung',
        bg: '#dcfce7',
        color: '#15803d'
      });
      showToast('Koneksi ke backend Supabase PostgreSQL berhasil diverifikasi!', 'success');
      await loadData();
    } catch (err) {
      setStatusBadge({
        text: '🔴 Gagal Terhubung: ' + (err.message || 'Error koneksi'),
        bg: '#fee2e2',
        color: '#b91c1c'
      });
      showToast(`Koneksi database gagal: ${err.message}`, 'danger');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <section id="view-settings" className="view-panel">
      {/* Header */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Pengaturan Sistem & Apotek</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Konfigurasi profil resmi apotek, format kop nota belanja, dan koneksi database Supabase
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Form Profil Apotek & Struk */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="card-clean-title" style={{ marginBottom: '4px' }}>Identitas Resmi Apotek</h3>
          <p className="card-clean-subtitle" style={{ marginBottom: '20px' }}>
            Data ini akan dicetak otomatis pada bagian kepala (header) dan kaki (footer) nota belanja kasir
          </p>

          <form onSubmit={handleSavePharmacy}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Nama Resmi Apotek *
              </label>
              <input
                type="text"
                className="form-control"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Slogan / Tagline
              </label>
              <input
                type="text"
                className="form-control"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Alamat Fisik Apotek *
              </label>
              <textarea
                className="form-control"
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Nomor Telepon / Kontak Apotek
              </label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Pesan Footer Nota Penjualan
              </label>
              <input
                type="text"
                className="form-control"
                value={receiptFooter}
                placeholder="Contoh: Semoga Lekas Sembuh & Sehat Selalu"
                onChange={(e) => setReceiptFooter(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingPharmacy}
              style={{ width: '100%' }}
            >
              {isSavingPharmacy ? 'Menyimpan Perubahan...' : 'Simpan Identitas Apotek'}
            </button>
          </form>
        </div>

        {/* Koneksi Supabase Backend */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="card-clean-title" style={{ marginBottom: '4px' }}>Integrasi Cloud Supabase</h3>
          <p className="card-clean-subtitle" style={{ marginBottom: '16px' }}>
            Koneksi database PostgreSQL, otentikasi peran staf kasir, dan transaksi atomik
          </p>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: statusBadge.bg,
              color: statusBadge.color,
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{statusBadge.text}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
              style={{ background: '#ffffff', borderColor: 'currentColor', color: 'inherit' }}
            >
              {testingConnection ? 'Menguji...' : 'Uji Koneksi'}
            </button>
          </div>

          <form onSubmit={handleSaveSupabaseConfig}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                className="form-control"
                value={supabaseUrl}
                placeholder="https://xyz.supabase.co"
                onChange={(e) => setSupabaseUrl(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Supabase Anon / Publishable Key
              </label>
              <input
                type="password"
                className="form-control"
                value={supabaseKey}
                placeholder="sb_publishable_... atau anon key"
                onChange={(e) => setSupabaseKey(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--muted-text)', marginTop: '4px', display: 'block' }}>
                Key publik aman digunakan di browser client untuk akses terenkripsi via Row Level Security (RLS).
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={testingConnection}
              style={{ width: '100%' }}
            >
              Perbarui Kredensial Supabase
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
