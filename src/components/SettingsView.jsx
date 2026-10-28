import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useToast } from '../context/ToastContext';

export default function SettingsView() {
  const { settings, updatePharmacySettings } = usePharmacy();
  const { showToast } = useToast();

  // Settings Form State
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName || 'Apotek Sri Redjeki Farma');
  const [tagline, setTagline] = useState(settings.tagline || 'Sehat Bersama, Hidup Lebih Baik');
  const [address, setAddress] = useState(settings.address || 'Jl. Raya No. 123, Kec. Sidoarjo');
  const [phone, setPhone] = useState(settings.phone || '0812-3456-7890');
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || 'Terima Kasih, Semoga Sehat Selalu');

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

  return (
    <section id="view-settings" className="view-panel">
      {/* Header Halaman */}
      <div className="content-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="content-title">Pengaturan Sistem Apotek</h1>
        </div>
      </div>

      {/* Profil Apotek Card */}
      <div style={{ maxWidth: '640px' }}>
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
      </div>
    </section>
  );
}
