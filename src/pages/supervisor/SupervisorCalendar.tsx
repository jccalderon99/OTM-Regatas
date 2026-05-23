import React, { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { RoutineRecord, routineEventTitle, ROUTINE_EVENT_COLOR, parseRoutineHour } from '../../types/routine';
import RoutineDetailModal from '../../components/RoutineDetailModal';
import StatusBadge from '../../components/StatusBadge';
import {
  filterOtmsForCalendar,
  getOtmCalendarDate,
  getOtmTechnicianName,
  otmMatchesCalendarCell,
} from '../../lib/calendarUtils';

const SPECS_COLORS: Record<string, string> = {
  '01. Operador de Calderos': '#ef4444', // Red
  '02. Piscinero': '#3b82f6', // Blue
  '03. Electricista': '#eab308', // Yellow
  '04. Carpintero': '#8B4513', // Brown
  '05. Jardinero': '#22c55e', // Green
  '06. Gasfitero': '#06b6d4', // Cyan
  '07. Albañil': '#f97316', // Orange
  '08. Pintor': '#ec4899', // Pink
  '09. Otros': '#64748b', // Slate
};

export default function SupervisorCalendar({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { otms, users } = useOTM();
  const { getRecordsForCalendar } = useRoutineActivity();
  const [selectedTechFilter, setSelectedTechFilter] = useState('');
  const [selectedSpecFilter, setSelectedSpecFilter] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOTM, setSelectedOTM] = useState<any>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineRecord | null>(null);

  const mapRoutineSpecToOTMSpec = (routineSpec: string): string => {
    if (routineSpec === 'Calderos') return '01. Operador de Calderos';
    if (routineSpec === 'Piscinas') return '02. Piscinero';
    if (routineSpec === 'Electricidad') return '03. Electricista';
    if (routineSpec === 'Jardinería') return '05. Jardinero';
    if (routineSpec === 'Gasfitería') return '06. Gasfitero';
    return routineSpec;
  };

  const technicians = useMemo(() => users.filter(u => u.role === 'technician'), [users]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);

  const routineRecords = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return getRecordsForCalendar({ start: weekStart, end: weekEnd });
  }, [getRecordsForCalendar, weekStart]);

  const calendarOTMs = useMemo(() => filterOtmsForCalendar(otms), [otms]);

  const filteredOTMs = useMemo(() => {
    return calendarOTMs.filter(o => {
      const matchTech = !selectedTechFilter || o.technician_id === selectedTechFilter || (o.assigned_technicians && o.assigned_technicians.some(t => t.technician_id === selectedTechFilter));
      const matchSpec = !selectedSpecFilter || o.failure_type === selectedSpecFilter;
      return matchTech && matchSpec;
    });
  }, [calendarOTMs, selectedTechFilter, selectedSpecFilter]);

  const filteredRoutines = useMemo(() => {
    return routineRecords.filter(r => {
      const matchTech = !selectedTechFilter || r.technician_id === selectedTechFilter;
      let matchSpec = true;
      if (selectedSpecFilter) {
        const mappedOTMSpec = mapRoutineSpecToOTMSpec(r.specialty);
        matchSpec = mappedOTMSpec === selectedSpecFilter;
      }
      return matchTech && matchSpec;
    });
  }, [routineRecords, selectedTechFilter, selectedSpecFilter]);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  
  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  
  const goToday = () => setCurrentDate(new Date());

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `Del ${start.getDate()} al ${end.getDate()} de ${monthNames[end.getMonth()]}`;
    }
    return `Del ${start.getDate()} de ${monthNames[start.getMonth()]} al ${end.getDate()} de ${monthNames[end.getMonth()]}`;
  };

  const todayDate = new Date();
  
  const startHour = 6;
  const endHour = 22;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const formatName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 3) {
      const firstName = parts[parts.length - 1];
      const lastName = parts[0];
      return `${firstName} ${lastName}`;
    }
    return fullName;
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 0 }}>
              Semana actual - {formatWeekRange()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontWeight: 600 }} onClick={goToday}>
              Hoy
            </button>
            <div style={{ background: 'var(--bg-secondary)', padding: '4px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex' }}>
              <button className="btn btn-ghost" style={{ padding: '4px 12px' }} onClick={prevWeek}>&lt;</button>
              <button className="btn btn-ghost" style={{ padding: '4px 12px' }} onClick={nextWeek}>&gt;</button>
            </div>
          </div>
        </div>

        {/* Calendar Filters */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>👷 FILTRAR TÉCNICO:</label>
            <select 
              value={selectedTechFilter} 
              onChange={e => setSelectedTechFilter(e.target.value)}
              className="form-input" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: 220, height: 'auto', background: 'var(--bg-card)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="">Todos los técnicos</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🛠️ FILTRAR ESPECIALIDAD:</label>
            <select 
              value={selectedSpecFilter} 
              onChange={e => setSelectedSpecFilter(e.target.value)}
              className="form-input" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: 220, height: 'auto', background: 'var(--bg-card)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="">Todas las especialidades</option>
              {Object.keys(SPECS_COLORS).map(spec => (
                <option key={spec} value={spec}>{spec.split('. ')[1] || spec}</option>
              ))}
            </select>
          </div>

          {(selectedTechFilter || selectedSpecFilter) && (
            <button 
              className="btn btn-ghost" 
              style={{ alignSelf: 'flex-end', fontSize: '0.8rem', padding: '6px 12px', height: 'auto', color: '#ef4444', fontWeight: 600 }}
              onClick={() => { setSelectedTechFilter(''); setSelectedSpecFilter(''); }}
            >
              ❌ Limpiar Filtros
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          {Object.entries(SPECS_COLORS).map(([spec, color]) => (
            <div key={spec} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} /> {spec.split('. ')[1] || spec}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: ROUTINE_EVENT_COLOR }} /> Rutinario
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 1000, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 60, borderRight: '1px solid var(--border)' }}></div>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === todayDate.toDateString();
              return (
                <div key={i} style={{ 
                  flex: 1, 
                  padding: '12px', 
                  textAlign: 'center', 
                  borderRight: '1px solid var(--border)',
                  background: isToday ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                }}>
                  <div style={{ fontWeight: 600, color: isToday ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {dayNames[i]} <span style={{ 
                      display: 'inline-block', 
                      width: 24, height: 24, 
                      borderRadius: '50%', 
                      background: isToday ? 'var(--accent-blue)' : 'transparent',
                      color: isToday ? 'white' : 'inherit',
                      lineHeight: '24px',
                      marginLeft: 4
                    }}>{d.getDate()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {hours.map(hour => (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border)', minHeight: 80 }}>
                {/* Time Column */}
                <div style={{ 
                  width: 60, 
                  borderRight: '1px solid var(--border)', 
                  textAlign: 'right', 
                  padding: '8px 4px 0 0', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  color: 'var(--text-muted)' 
                }}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
                
                {/* Day Columns */}
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === todayDate.toDateString();
                  
                  // Find OTMs that fall in this hour
                  const cellOTMs = filteredOTMs.filter(o => otmMatchesCalendarCell(o, d, hour));

                  const cellRoutines = filteredRoutines.filter(r => {
                    const rDate = new Date(r.record_date + 'T12:00:00');
                    return rDate.getFullYear() === d.getFullYear() &&
                           rDate.getMonth() === d.getMonth() &&
                           rDate.getDate() === d.getDate() &&
                            parseRoutineHour(r.start_time || '00:00') === hour;
                  });

                  return (
                    <div key={i} style={{ 
                      flex: 1, 
                      borderRight: '1px solid var(--border)', 
                      padding: 4,
                      background: isToday ? 'rgba(14, 165, 233, 0.02)' : 'transparent',
                      position: 'relative'
                    }}>
                      {/* Current time indicator */}
                      {isToday && todayDate.getHours() === hour && (
                        <div style={{
                          position: 'absolute',
                          top: `${(todayDate.getMinutes() / 60) * 100}%`,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: 'red',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }} />
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {cellRoutines.map(r => {
                          const techName = r.technician?.full_name || users.find(u => u.id === r.technician_id)?.full_name || 'Técnico';
                          return (
                            <div
                              key={r.id}
                              onClick={() => setSelectedRoutine(r)}
                              style={{
                                background: ROUTINE_EVENT_COLOR,
                                color: 'white',
                                padding: '6px 8px',
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                borderLeft: '4px solid rgba(255,255,255,0.5)',
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: '0.65rem' }}>{routineEventTitle(r.specialty, r.sub_specialty)}</div>
                              <span style={{ fontSize: '0.6rem', opacity: 0.9 }}>{r.start_time} · { (users.find(u => u.id === r.technician_id)?.full_name || 'Técnico').split(' ').slice(0, 2).join(' ') }</span>
                            </div>
                          );
                        })}
                        {cellOTMs.map(o => {
                          const isDone = o.status === 'closed' || o.status === 'awaiting_supervisor' || o.status === 'awaiting_conformity';
                          const baseColor = SPECS_COLORS[o.failure_type] || SPECS_COLORS['09. Otros'];
                          const techName = getOtmTechnicianName(o, users);
                          
                          return (
                            <div key={o.id} 
                              onClick={() => setSelectedOTM(o)}
                              style={{
                                background: isDone ? `${baseColor}99` : baseColor,
                                color: 'white',
                                padding: '6px 8px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: isDone ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                borderLeft: `4px solid ${isDone ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'}`
                              }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 800 }}>{o.otm_code}</span>
                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: 4 }}>
                                  {formatName(techName)}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                {getOtmCalendarDate(o)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {o.otm_code}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRoutine && (
        <RoutineDetailModal record={selectedRoutine} onClose={() => setSelectedRoutine(null)} />
      )}

      {/* Modal Detalles OTM */}
      {selectedOTM && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(2px)'
        }} onClick={() => setSelectedOTM(null)}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: 500, padding: 32, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setSelectedOTM(null)}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              {selectedOTM.otm_code}
            </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Estado:</span>
                <StatusBadge status={selectedOTM.status} />
              </div>
            <div style={{ display: 'grid', gap: 16, marginBottom: 24, fontSize: '0.9rem' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Ubicación</strong>
                <div style={{ fontWeight: 600 }}>Área: {selectedOTM.area_sector} | Solicitante: {selectedOTM.requester_name}</div>
                <div style={{ fontWeight: 600 }}>📍 {selectedOTM.location || 'Sede Principal'} - {selectedOTM.exact_location}</div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Especialidad</strong>
                <div style={{ fontWeight: 600, color: SPECS_COLORS[selectedOTM.failure_type] || '#000' }}>{selectedOTM.failure_type}</div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Técnico Asignado</strong>
                <div style={{ fontWeight: 600 }}>{getOtmTechnicianName(selectedOTM, users)}</div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Fecha Programada</strong>
                <div style={{ fontWeight: 600 }}>
                  {(getOtmCalendarDate(selectedOTM) || new Date(selectedOTM.scheduled_date!)).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Descripción del Problema</strong>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {selectedOTM.description}
                </div>
              </div>
            </div>

            <button 
              className="btn btn-secondary w-full"
              style={{ fontSize: '1rem', padding: 12 }}
              onClick={() => setSelectedOTM(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

