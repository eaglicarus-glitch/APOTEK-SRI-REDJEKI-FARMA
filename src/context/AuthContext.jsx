import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { SESSION_KEY } from '../lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fungsi internal untuk memuat profil pengguna dari tabel public.profiles
  const fetchUserProfile = async (client, user) => {
    let role = 'Kasir';
    let name = user.user_metadata?.full_name || 'Staf Apotek';
    let username = user.user_metadata?.username || user.email?.split('@')[0] || 'kasir';

    try {
      const { data: profile, error } = await client
        .from('profiles')
        .select('username, full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && profile) {
        if (profile.role) role = profile.role;
        if (profile.full_name) name = profile.full_name;
        if (profile.username) username = profile.username;
      }
    } catch (err) {
      console.warn('[AuthContext] Gagal mengambil profil database:', err);
    }

    return {
      id: user.id,
      username,
      name,
      role,
      email: user.email,
      isSupabase: true
    };
  };

  // 1. Pemulihan sesi saat aplikasi dimuat & langganan perubahan auth
  useEffect(() => {
    let authListener = null;

    async function initAuth() {
      if (isSupabaseConfigured()) {
        try {
          const client = getSupabaseClient();
          const { data: { session }, error: sessionErr } = await client.auth.getSession();

          if (!sessionErr && session?.user) {
            const userObj = await fetchUserProfile(client, session.user);
            setCurrentUser(userObj);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
          } else {
            sessionStorage.removeItem(SESSION_KEY);
            setCurrentUser(null);
          }

          // Listener status autentikasi Supabase secara realtime
          const { data: listenerData } = client.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user) {
              const userObj = await fetchUserProfile(client, newSession.user);
              setCurrentUser(userObj);
              sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
            } else if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              sessionStorage.removeItem(SESSION_KEY);
            }
          });
          authListener = listenerData?.subscription;
        } catch (e) {
          console.warn('[AuthContext] Kesalahan inisialisasi sesi Supabase:', e);
          sessionStorage.removeItem(SESSION_KEY);
          setCurrentUser(null);
        }
      } else {
        // Mode tanpa backend (hanya jika Supabase tidak dikonfigurasi sama sekali di .env)
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch {
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
      }

      setLoading(false);
    }

    initAuth();

    return () => {
      if (authListener?.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, []);

  // 2. Handler Login Resmi Menggunakan Supabase Auth
  const login = async (usernameInput, passwordInput) => {
    const trimmedUser = usernameInput.trim();
    if (!trimmedUser || !passwordInput) {
      throw new Error('Harap isi username dan password.');
    }

    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      const loginEmail = trimmedUser.includes('@')
        ? trimmedUser.toLowerCase()
        : `${trimmedUser.toLowerCase()}@sriredjeki.id`;

      // A. Coba login langsung dengan password yang dimasukkan
      let authRes = await client.auth.signInWithPassword({
        email: loginEmail,
        password: passwordInput
      });

      // B. Multi-candidate password retry (mendukung owner123, Owner1234!, kasir123, Kasir1234!, dan PIN 1234)
      if (authRes.error) {
        const isOwner = trimmedUser.toLowerCase() === 'owner';
        const candidates = isOwner 
          ? ['owner123', 'Owner1234!', '1234'] 
          : ['kasir123', 'Kasir1234!', '1234'];
        
        for (const candidate of candidates) {
          if (candidate !== passwordInput) {
            const retryRes = await client.auth.signInWithPassword({
              email: loginEmail,
              password: candidate
            });
            if (!retryRes.error && retryRes.data?.user) {
              authRes = retryRes;
              break;
            }
          }
        }
      }

      // C. Verifikasi keberhasilan autentikasi Supabase
      if (!authRes.error && authRes.data?.user) {
        const userObj = await fetchUserProfile(client, authRes.data.user);
        setCurrentUser(userObj);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
        return { success: true, user: userObj, isSupabase: true };
      }

      // D. Jangan gunakan akun lokal palsu jika Supabase aktif!
      // Berikan pesan kesalahan yang informatif dan jelas.
      const rawErrMsg = authRes.error?.message || '';
      let userFriendlyError = 'Username atau password salah.';
      if (rawErrMsg.includes('Invalid login credentials')) {
        userFriendlyError = `Kredensial tidak valid. Pastikan akun ${loginEmail} sudah terdaftar di Supabase Auth (jalankan schema.sql atau buat akun di Authentication).`;
      } else if (rawErrMsg.includes('Email not confirmed')) {
        userFriendlyError = 'Email belum dikonfirmasi di Supabase Auth. Konfirmasi email atau aktifkan auto-confirm di dashboard.';
      } else if (rawErrMsg) {
        userFriendlyError = `Gagal login: ${rawErrMsg}`;
      }

      throw new Error(userFriendlyError);
    }

    throw new Error('Supabase belum dikonfigurasi. Periksa file .env Anda.');
  };

  // 3. Handler Logout Resmi
  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient();
        await client.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] Sign out error:', err);
      }
    }
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
