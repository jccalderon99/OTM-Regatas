import React from 'react';
import { RoutineRecord } from '../types/routine';
import { routineEventTitle, ROUTINE_EVENT_COLOR } from '../types/routine';

export default function RoutineDetailModal({
  record,
  onClose,
}: {
  record: RoutineRecord;
  onClose: () => void;
}) {
  const techName = record.technician?.full_name || 'Técnico';

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: 520, padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          onClick={onClose}
        >
          ✕
        </button>
        <div style={{ display: 'inline-block', padding: '4px 10px', background: `${ROUTINE_EVENT_COLOR}22`, color: ROUTINE_EVENT_COLOR, borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, marginBottom: 12 }}>
          Actividad rutinaria
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
          {routineEventTitle(record.specialty, record.sub_specialty)}
        </h2>
        <div style={{ display: 'grid', gap: 14, marginBottom: 20, fontSize: '0.9rem' }}>
          <div>
            <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Técnico</strong>
            <span style={{ fontWeight: 600 }}>{techName}</span>
          </div>
          <div>
            <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Fecha</strong>
            <span style={{ fontWeight: 600 }}>
              {new Date(record.record_date + 'T12:00:00').toLocaleDateString('es-PE', { dateStyle: 'long' })}
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Horario</strong>
            <span style={{ fontWeight: 600 }}>{record.start_time} — {record.end_time}</span>
          </div>
          {record.activities_executed.length > 0 && (
            <div>
              <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 8 }}>Actividades realizadas</strong>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {record.activities_executed.map((a, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {record.free_text_activity && (
            <div>
              <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4 }}>Descripción</strong>
              <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {record.free_text_activity}
              </div>
            </div>
          )}
          {record.photos.length > 0 && (
            <div>
              <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 8 }}>Fotos</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {record.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="btn btn-secondary w-full" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
