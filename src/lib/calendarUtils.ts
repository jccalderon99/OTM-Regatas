import { OTMRequest, OTMStatus } from '../types';

export const CALENDAR_OTM_STATUSES: OTMStatus[] = [
  'scheduled',
  'in_progress',
  'awaiting_supervisor',
  'awaiting_conformity',
  'closed',
];

/** Fecha/hora para ubicar la OTM en la grilla semanal */
export function getOtmCalendarDate(otm: OTMRequest): Date | null {
  if (otm.job_start_time) return new Date(otm.job_start_time);
  if (otm.scheduled_date) return new Date(otm.scheduled_date);
  if (CALENDAR_OTM_STATUSES.includes(otm.status)) return new Date(otm.updated_at);
  return null;
}

export function getOtmCalendarHour(otm: OTMRequest): number {
  const d = getOtmCalendarDate(otm);
  if (!d) return 8;
  const h = d.getHours();
  if (h === 0 && d.getMinutes() === 0) return 8;
  return h;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function otmMatchesCalendarCell(otm: OTMRequest, day: Date, hour: number): boolean {
  const oDate = getOtmCalendarDate(otm);
  if (!oDate) return false;
  return isSameCalendarDay(oDate, day) && getOtmCalendarHour(otm) === hour;
}

export function getOtmTechnicianName(
  otm: OTMRequest,
  users: { id: string; full_name: string }[]
): string {
  if (otm.technician_id) {
    return users.find(u => u.id === otm.technician_id)?.full_name || 'Técnico';
  }
  const assigned = otm.assigned_technicians?.[0]?.technician?.full_name;
  if (assigned) return assigned;
  const firstId = otm.assigned_technicians?.[0]?.technician_id;
  if (firstId) return users.find(u => u.id === firstId)?.full_name || 'Técnico';
  return 'Sin asignar';
}

export function filterOtmsForCalendar(otms: OTMRequest[]): OTMRequest[] {
  return otms.filter(o => {
    if (!CALENDAR_OTM_STATUSES.includes(o.status)) return false;
    return !!getOtmCalendarDate(o);
  });
}
