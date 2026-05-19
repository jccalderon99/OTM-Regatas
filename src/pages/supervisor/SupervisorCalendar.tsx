import React, { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOTM, setSelectedOTM] = useState<any>(null);

  const scheduledOTMs = useMemo(() => otms.filter(o => 
    o.scheduled_date && o.technician_id && 
    (o.status === 'scheduled' || o.status === 'in_progress' || o.status === 'awaiting_supervisor' || o.status === 'awaiting_conformity' || o.status === 'closed')
  ), [otms]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const formatName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 3) {
      // Assuming Format: LastName(s) FirstName(s) like "Diaz Sifuentes Ciro"
      const firstName = parts[parts.length - 1];
      const lastName = parts[0];
      return `${firstName} ${lastName}`;
    } else {
      return fullName;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Calendario General de Mantenimiento</h1>
          <div className="flex items-center gap-2" style={{ background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', minHeight: 0, height: 'auto' }} onClick={prevMonth}>&lt;</button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 140, textAlign: 'center', color: 'var(--text-primary)' }}>
              {currentDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', minHeight: 0, height: 'auto' }} onClick={nextMonth}>&gt;</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          {Object.entries(SPECS_COLORS).map(([spec, color]) => (
            <div key={spec} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} /> {spec.split('. ')[1] || spec}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 800, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
          {days.map((day, i) => {
            if (!day) return <div key={i} style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.01)' }} />;
            
            const isToday = isCurrentMonth && day === today.getDate();
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dayOTMs = scheduledOTMs.filter(o => o.scheduled_date?.startsWith(dateStr));

            return (
              <div key={i} style={{ 
                borderRight: '1px solid var(--border)', 
                borderBottom: '1px solid var(--border)', 
                padding: 6,
                background: isToday ? 'rgba(14, 165, 233, 0.05)' : 'transparent'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 6,
                  width: 24, height: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent-blue)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.8rem'
                }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayOTMs.map(o => {
                    const isDone = o.status === 'closed' || o.status === 'awaiting_supervisor' || o.status === 'awaiting_conformity';
                    const baseColor = SPECS_COLORS[o.failure_type] || SPECS_COLORS['09. Otros'];
                    const techUser = users.find(u => u.id === o.technician_id);
                    const techName = techUser?.full_name || 'Desconocido';
                    
                    return (
                      <div key={o.id} 
                        onClick={() => setSelectedOTM(o)}
                        style={{
                        background: isDone ? `${baseColor}20` : baseColor,
                        color: isDone ? baseColor : 'white',
                        borderLeft: `3px solid ${baseColor}`,
                        padding: '6px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        opacity: isDone ? 0.7 : 1,
                        cursor: 'pointer',
                        boxShadow: isDone ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <span style={{ fontSize: '0.8rem' }}>{formatName(techName)}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.9 }}>{o.otm_code}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

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
            <div style={{ display: 'inline-block', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, marginBottom: 20 }}>
              Estado: <span style={{ color: 'var(--accent-blue)' }}>{selectedOTM.status.toUpperCase()}</span>
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
                <div style={{ fontWeight: 600 }}>
                  {(() => {
                    const tUser = users.find(u => u.id === selectedOTM.technician_id);
                    return tUser ? tUser.full_name : 'Desconocido';
                  })()}
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Descripción del Problema</strong>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {selectedOTM.description}
                </div>
              </div>
              {(() => {
                const images = selectedOTM.attachments ? selectedOTM.attachments.map((a: any) => a.file_url) : [];
                if (images.length === 0) return null;
                return (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 8 }}>Imágenes Adjuntas</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {images.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt={`Evidencia ${idx}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                      ))}
                    </div>
                  </div>
                );
              })()}
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
