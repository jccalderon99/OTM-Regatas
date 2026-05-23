import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { RoutineRecord, RoutineActivity } from '../types/routine';
import { routineActivities } from '../lib/routineActivities';

interface RoutineActivityContextType {
  activities: RoutineActivity[];
  records: RoutineRecord[];
  addRoutineActivity: (activity: Partial<RoutineActivity>) => Promise<void>;
  updateRoutineActivity: (id: string, fields: Partial<RoutineActivity>) => Promise<void>;
  deleteRoutineActivity: (id: string) => Promise<void>;
  createRoutineRecord: (record: Partial<RoutineRecord>) => Promise<void>;
  startRoutineActivity: (specialty: string, subSpecialty: string, technicianId: string) => Promise<RoutineRecord>;
  finishRoutineActivity: (recordId: string, answers: Record<string, any>, photos: string[]) => Promise<void>;
  getRecordsForCalendar: (dateRange: { start: Date; end: Date }) => RoutineRecord[];
}

const RoutineActivityContext = createContext<RoutineActivityContextType | null>(null);

export function RoutineActivityProvider({ children }: { children: React.ReactNode }) {
  // Initialize activities with our real catalog list
  const [activities, setActivities] = useState<RoutineActivity[]>(() => {
    const saved = localStorage.getItem('otm_routine_activities');
    return saved ? JSON.parse(saved) : routineActivities;
  });

  const [records, setRecords] = useState<RoutineRecord[]>(() => {
    const saved = localStorage.getItem('otm_routine_records');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist activities
  useEffect(() => {
    localStorage.setItem('otm_routine_activities', JSON.stringify(activities));
  }, [activities]);

  // Persist records
  useEffect(() => {
    localStorage.setItem('otm_routine_records', JSON.stringify(records));
  }, [records]);

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
      user_id: record.user_id || 'current-user',
      technician_id: record.technician_id || 'current-user',
      specialty: record.specialty || '',
      sub_specialty: record.sub_specialty || '',
      activities_executed: record.activities_executed || [],
      free_text_activity: record.free_text_activity || null,
      answers: record.answers || {},
      record_date: record.record_date || new Date().toISOString().slice(0, 10),
      start_time: record.start_time || '08:00',
      end_time: record.end_time || '09:00',
      photos: record.photos || [],
      status: record.status || 'completed',
      notes: record.notes || '',
      created_at: new Date().toISOString(),
    };
    setRecords(prev => [...prev, newRec]);
  }, []);

  const startRoutineActivity = useCallback(async (specialty: string, subSpecialty: string, technicianId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toISOString().slice(0, 10);

    const newRec: RoutineRecord = {
      id: `rec-${Date.now()}`,
      user_id: technicianId,
      technician_id: technicianId,
      specialty,
      sub_specialty: subSpecialty,
      activities_executed: [],
      free_text_activity: null,
      answers: {},
      record_date: dateStr,
      start_time: timeStr,
      end_time: '',
      photos: [],
      status: 'in_progress',
      notes: '',
      created_at: now.toISOString(),
    };

    setRecords(prev => [...prev, newRec]);
    return newRec;
  }, []);

  const finishRoutineActivity = useCallback(async (recordId: string, answers: Record<string, any>, photos: string[]) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          answers,
          photos,
          end_time: timeStr,
          status: 'completed' as const
        };
      }
      return r;
    }));
  }, []);

  const getRecordsForCalendar = useCallback((dateRange: { start: Date; end: Date }) => {
    return records.filter(r => {
      if (r.status !== 'completed') return false; // Only show completed routines on calendar
      const d = new Date(r.record_date + 'T12:00:00');
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [records]);

  return (
    <RoutineActivityContext.Provider value={{
      activities,
      records,
      addRoutineActivity,
      updateRoutineActivity,
      deleteRoutineActivity,
      createRoutineRecord,
      startRoutineActivity,
      finishRoutineActivity,
      getRecordsForCalendar
    }}>
      {children}
    </RoutineActivityContext.Provider>
  );
}

export function useRoutineActivity() {
  const ctx = useContext(RoutineActivityContext);
  if (!ctx) throw new Error('useRoutineActivity must be used within RoutineActivityProvider');
  return ctx;
}
