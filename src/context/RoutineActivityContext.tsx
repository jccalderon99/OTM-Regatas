import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { RoutineActivity, RoutineRecord } from '../types/routine';
import { DEMO_ROUTINE_ACTIVITIES } from '../lib/routineActivities';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface RoutineActivityContextType {
  activities: RoutineActivity[];
  records: RoutineRecord[];
  getRecordsForCalendar: () => RoutineRecord[];
  addRoutineActivity: (data: Omit<RoutineActivity, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateRoutineActivity: (id: string, data: Partial<Pick<RoutineActivity, 'specialty' | 'sub_specialty' | 'activity'>>) => Promise<void>;
  deleteRoutineActivity: (id: string) => Promise<void>;
  createRoutineRecord: (data: Omit<RoutineRecord, 'id' | 'created_at' | 'technician' | 'technician_id'>) => Promise<void>;
  refreshRoutines: () => void;
}

const RoutineActivityContext = createContext<RoutineActivityContextType | null>(null);

export function RoutineActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isLive = isSupabaseConfigured();

  const [activities, setActivities] = useState<RoutineActivity[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_routine_activities');
    return saved ? JSON.parse(saved) : [...DEMO_ROUTINE_ACTIVITIES];
  });

  const [records, setRecords] = useState<RoutineRecord[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_routine_records');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_routine_activities', JSON.stringify(activities));
  }, [activities, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_routine_records', JSON.stringify(records));
  }, [records, isLive]);

  const fetchAll = useCallback(async () => {
    if (!isLive) return;
    const [actRes, recRes] = await Promise.all([
      supabase.from('routine_activities').select('*').order('specialty').order('sub_specialty'),
      supabase.from('routine_records').select('*, technician:profiles(*)').order('record_date', { ascending: false }),
    ]);
    if (actRes.data?.length) setActivities(actRes.data);
    else if (actRes.data) setActivities([]);
    if (recRes.data) setRecords(recRes.data);
  }, [isLive]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getRecordsForCalendar = useCallback(() => {
    if (!user) return [];
    if (user.role === 'technician') {
      return records.filter(r => r.technician_id === user.id);
    }
    return records;
  }, [records, user]);

  const addRoutineActivity = useCallback(async (data: Omit<RoutineActivity, 'id' | 'created_at' | 'updated_at'>) => {
    if (isLive) {
      const { data: row, error } = await supabase.from('routine_activities').insert(data).select().single();
      if (error) throw error;
      if (row) setActivities(prev => [...prev, row]);
    } else {
      const row: RoutineActivity = {
        ...data,
        id: `routine-act-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setActivities(prev => [...prev, row]);
    }
  }, [isLive]);

  const updateRoutineActivity = useCallback(async (id: string, data: Partial<Pick<RoutineActivity, 'specialty' | 'sub_specialty' | 'activity'>>) => {
    if (isLive) {
      const { data: row, error } = await supabase
        .from('routine_activities')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (row) setActivities(prev => prev.map(a => (a.id === id ? row : a)));
    } else {
      setActivities(prev =>
        prev.map(a =>
          a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
        )
      );
    }
  }, [isLive]);

  const deleteRoutineActivity = useCallback(async (id: string) => {
    if (isLive) {
      const { error } = await supabase.from('routine_activities').delete().eq('id', id);
      if (error) throw error;
    }
    setActivities(prev => prev.filter(a => a.id !== id));
  }, [isLive]);

  const createRoutineRecord = useCallback(async (
    data: Omit<RoutineRecord, 'id' | 'created_at' | 'technician' | 'technician_id'>
  ) => {
    if (!user) return;
    const payload = {
      ...data,
      technician_id: user.id,
      activities_executed: data.activities_executed || [],
      photos: data.photos || [],
      free_text_activity: data.free_text_activity || null,
    };

    if (isLive) {
      const { data: row, error } = await supabase
        .from('routine_records')
        .insert(payload)
        .select('*, technician:profiles(*)')
        .single();
      if (error) throw error;
      if (row) setRecords(prev => [row, ...prev]);
    } else {
      const row: RoutineRecord = {
        ...payload,
        id: `routine-rec-${Date.now()}`,
        created_at: new Date().toISOString(),
        technician: user,
      };
      setRecords(prev => [row, ...prev]);
    }
  }, [isLive, user]);

  return (
    <RoutineActivityContext.Provider
      value={{
        activities,
        records,
        getRecordsForCalendar,
        addRoutineActivity,
        updateRoutineActivity,
        deleteRoutineActivity,
        createRoutineRecord,
        refreshRoutines: fetchAll,
      }}
    >
      {children}
    </RoutineActivityContext.Provider>
  );
}

export function useRoutineActivity() {
  const ctx = useContext(RoutineActivityContext);
  if (!ctx) throw new Error('useRoutineActivity must be used within RoutineActivityProvider');
  return ctx;
}
