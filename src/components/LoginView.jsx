import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ApotekLogo from './ApotekLogo';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Harap isi username dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      showToast(
        `Selamat datang, ${res.user.name} (${res.user.role})!`,
        'success'
      );
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa username dan password Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="view-login" className="login-wrapper">
      {/* Kolom Kiri: Branding & Visual Farmasi */}
      <div className="login-left-panel">
        <div className="login-branding-hero">
          <div className="login-logo-container">
            <ApotekLogo size={78} />
          </div>
          <div className="login-brand-text">
            <span className="brand-kicker">APOTEK</span>
            <h1 className="brand-main-title">SRI REDJEKI FARMA</h1>
            <div className="brand-tagline-wrap">
              <span className="tagline-bullet" />
              <p className="login-brand-tagline">Sehat Bersama, Hidup Lebih Baik</p>
            </div>
          </div>
        </div>

        {/* Visual Farmasi Fotorealistik (Menggantikan SVG Artificial) */}
        <div className="login-photo-container" aria-hidden="true">
          <img
            src="/pharmacy_pills_bg.jpg"
            alt="Farmasi Visual"
            className="login-photo-img"
          />
          <div className="login-photo-overlay" />
        </div>
      </div>

      {/* Kolom Kanan: Kartu Form Login Bersih */}
      <div className="login-right-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Selamat Datang</h2>
            <p className="login-card-subtitle">Silakan login untuk melanjutkan</p>
          </div>

          {errorMsg && (
            <div id="login-error" className="login-error-msg" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="login-username"
                  className="form-control with-icon"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  className="form-control with-icon"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Tampilkan atau sembunyikan password"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              className="btn btn-primary btn-block btn-login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memverifikasi...' : 'Login'}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--secondary-text)' }}>
            <div style={{ fontWeight: '700', color: 'var(--primary-text)', marginBottom: '6px' }}>
              Pilihan Akun Uji:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span>Kasir: <code style={{ color: 'var(--primary-text)' }}>kasir</code> / <code style={{ color: 'var(--primary-text)' }}>kasir123</code></span>
              <button
                type="button"
                onClick={() => { setUsername('kasir'); setPassword('kasir123'); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-emerald, #059669)', cursor: 'pointer', fontWeight: '700', padding: 0 }}
              >
                Gunakan
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Owner: <code style={{ color: 'var(--primary-text)' }}>owner</code> / <code style={{ color: 'var(--primary-text)' }}>owner123</code></span>
              <button
                type="button"
                onClick={() => { setUsername('owner'); setPassword('owner123'); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-emerald, #059669)', cursor: 'pointer', fontWeight: '700', padding: 0 }}
              >
                Gunakan
              </button>
            </div>
          </div>

          <div className="login-footer-branding">
            <ApotekLogo size={20} />
            <span>Apotek Sri Redjeki Farma</span>
          </div>
        </div>
      </div>
    </section>
  );
}
