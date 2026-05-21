import { Profile } from './index';

export interface RoutineActivity {
  id: string;
  specialty: string;
  sub_specialty: string;
  activity: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoutineRecord {
  id: string;
  specialty: string;
  sub_specialty: string;
  activities_executed: string[];
  free_text_activity?: string | null;
  record_date: string;
  start_time: string;
  end_time: string;
  photos: string[];
  technician_id: string;
  created_at?: string;
  technician?: Profile;
}

export const ROUTINE_EVENT_COLOR = '#a855f7';

export function routineEventTitle(specialty: string, subSpecialty: string): string {
  return `[Rutinario] ${specialty} - ${subSpecialty}`;
}

export function parseRoutineHour(timeStr: string): number {
  const [h] = timeStr.split(':').map(Number);
  return Number.isFinite(h) ? h : 8;
}
