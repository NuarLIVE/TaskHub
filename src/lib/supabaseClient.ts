import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || (window as any).SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any).SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Supabase env missing');
}

// Create a single client instance
const supabaseClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'freelance-hub-auth'
  },
  realtime: { params: { eventsPerSecond: 2 } }
});

export function getSupabase(): SupabaseClient {
  return supabaseClient;
}

export async function resetSupabase(): Promise<SupabaseClient> {
  return supabaseClient;
}
