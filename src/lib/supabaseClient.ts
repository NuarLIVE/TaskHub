import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

console.log('[ENV] VITE_SUPABASE_URL:', url);

// Защита от HMR – один клиент на всё приложение
const g = globalThis as any;
if (!g.__sb_kxpzz) {
  g.__sb_kxpzz = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-kxpzz-auth',
    },
    db: { schema: 'public' },
  });
  console.log('[SUPABASE] Client initialized');
}

export const supabase = g.__sb_kxpzz;

// Legacy compatibility
export function getSupabase() {
  return supabase;
}

export async function resetSupabase() {
  return supabase;
}
