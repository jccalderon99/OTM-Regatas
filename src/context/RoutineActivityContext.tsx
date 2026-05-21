import React, { createContext, useContext, useState, useCallback } from 'react';
import { RoutineRecord, RoutineActivity } from '../types/routine';

interface RoutineActivityContextType {
  activities: RoutineActivity[];
  records: RoutineRecord[];
  addRoutineActivity: (activity: Partial<RoutineActivity>) => Promise<void>;
  updateRoutineActivity: (id: string, fields: Partial<RoutineActivity>) => Promise<void>;
  deleteRoutineActivity: (id: string) => Promise<void>;
  createRoutineRecord: (record: Partial<RoutineRecord>) => Promise<void>;
  getRecordsForCalendar: (dateRange: { start: Date; end: Date }) => RoutineRecord[];
}

const RoutineActivityContext = createContext<RoutineActivityContextType | null>(null);

export function RoutineActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<RoutineActivity[]>([]);
  const [records, setRecords] = useState<RoutineRecord[]>([]);

  const addRoutineActivity = useCallback(async (activity: Partial<RoutineActivity>) => {
    const newAct: RoutineActivity = {
      id: `act-${Date.now()}`,
      specialty: activity.specialty || '',
      sub_specialty: activity.sub_specialty || '',
      activity: activity.activity || '',
      description: activity.description || '',
      questions: activity.questions || [],
    };
    setActivities(prev => [...prev, newAct]);
  }, []);

  const updateRoutineActivity = useCallback(async (id: string, fields: Partial<RoutineActivity>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
  }, []);

  const deleteRoutineActivity = useCallback(async (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  const createRoutineRecord = useCallback(async (record: Partial<RoutineRecord>) => {
    const newRec: RoutineRecord = {
      id: `rec-${Date.now()}`,
      user_id: 'current-user',
      technician_id: record.technician_id || 'current-user',
      specialty: record.specialty || '',
      sub_specialty: record.sub_specialty || '',
      activities_executed: record.activities_executed || [],
      free_text_activity: record.free_text_activity || null,
      record_date: record.record_date || new Date().toISOString().slice(0, 10),
      start_time: record.start_time || '08:00',
      end_time: record.end_time || '09:00',
      photos: record.photos || [],
      status: 'completed',
      notes: '',
      created_at: new Date().toISOString(),
    };
    setRecords(prev => [...prev, newRec]);
  }, []);

  const getRecordsForCalendar = useCallback((dateRange: { start: Date; end: Date }) => {
    return records.filter(r => {
      const d = new Date(r.record_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [records]);

  return (
    <RoutineActivityContext.Provider value={{ activities, records, addRoutineActivity, updateRoutineActivity, deleteRoutineActivity, createRoutineRecord, getRecordsForCalendar }}>
      {children}
    </RoutineActivityContext.Provider>
  );
}

export function useRoutineActivity() {
  const ctx = useContext(RoutineActivityContext);
  if (!ctx) throw new Error('useRoutineActivity must be used within RoutineActivityProvider');
  return ctx;
}
