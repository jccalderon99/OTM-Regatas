import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useOTM } from '../context/OTMContext';

export function useRealtimeOTM() {
  const { refreshOTMs } = useOTM();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'otm_requests' },
        (payload) => {
          console.log('Realtime change received!', payload);
          refreshOTMs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshOTMs]);
}
