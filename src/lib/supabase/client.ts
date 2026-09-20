import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey };
    }

    try {
      const storedUrl = localStorage.getItem('vlab_supabase_url');
      const storedKey = localStorage.getItem('vlab_supabase_key');
      if (storedUrl && storedKey) {
        return { url: storedUrl, anonKey: storedKey };
      }
    } catch (e) {}
  } else {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey };
    }
  }

  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: { persistSession: false }
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}
