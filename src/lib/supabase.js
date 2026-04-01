import { createClient } from '@supabase/supabase-js';

// Vite exposes environment variables prefixed with VITE_ via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and ANON_KEY must be defined in environment variables');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);