import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return (
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    supabaseUrl.length > 0
  );
}

// Upload file to Supabase Storage Bucket 'claurv-panoramas'
export async function uploadPanoramaToSupabase(file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `panoramas/${fileName}`;

  const { error } = await supabase.storage
    .from('claurv-panoramas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('claurv-panoramas')
    .getPublicUrl(filePath);

  return publicUrl;
}
