import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars!');
}

// ONE single client — used for everything
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sunsure-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

// Admin operations done via regular client with service key only when needed
export const supabaseAdmin = null;
