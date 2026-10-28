import { createClient } from '@supabase/supabase-js';

// Konfigurasi Default Proyek Supabase
export const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://xyzcompany.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key'
};

export function getActiveSupabaseConfig() {
  const savedUrl = localStorage.getItem('sriredjeki_supabase_url');
  const savedKey = localStorage.getItem('sriredjeki_supabase_anon_key');

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const defaultUrl = (envUrl && envUrl.trim() !== '') ? envUrl.trim() : DEFAULT_SUPABASE_CONFIG.url;
  const defaultKey = (envKey && envKey.trim() !== '') ? envKey.trim() : DEFAULT_SUPABASE_CONFIG.anonKey;

  const url = (savedUrl && savedUrl.trim() !== '') ? savedUrl.trim() : defaultUrl;
  const anonKey = (savedKey && savedKey.trim() !== '') ? savedKey.trim() : defaultKey;

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  const config = getActiveSupabaseConfig();
  return Boolean(
    config.url &&
    config.anonKey &&
    config.url.startsWith('https://') &&
    !config.url.includes('xyzcompany') &&
    !config.anonKey.includes('dummy_anon_key')
  );
}

let clientInstance = null;

export function getSupabaseClient() {
  const { url, anonKey } = getActiveSupabaseConfig();
  try {
    if (!clientInstance) {
      clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
    }
    return clientInstance;
  } catch (err) {
    console.error('[Supabase Client Error]', err);
    return null;
  }
}

export function resetSupabaseClient(url, anonKey) {
  if (url && url.trim()) {
    localStorage.setItem('sriredjeki_supabase_url', url.trim());
  } else {
    localStorage.removeItem('sriredjeki_supabase_url');
  }

  if (anonKey && anonKey.trim()) {
    localStorage.setItem('sriredjeki_supabase_anon_key', anonKey.trim());
  } else {
    localStorage.removeItem('sriredjeki_supabase_anon_key');
  }

  clientInstance = null;
  return getSupabaseClient();
}
