import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if Supabase is properly configured.
 * Force demo mode for now by returning false as requested by the user.
 * Change this to return the boolean expression below when ready for live mode.
 */
export function isSupabaseConfigured(): boolean {
  // Para volver a modo Supabase real, cambia esto a true (o descomenta la validación)
  const forceDemo = true; 
  if (forceDemo) return false;

  return (
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
}

