import React, { useState } from 'react';
import { OTMRequest, URGENCY_LABELS, MAINTENANCE_LABELS } from '../../types';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';

export default function TaskExecution({ otm, onBack }: { otm: OTMRequest; onBack: () => void }) {
  const { startTechnicianWork, finishTechnicianWork } = useOTM();
  const [notes, setNotes] = useState(otm.technician_notes || '');
  const [photos, setPhotos] = useState<{ name: string; type: string; url: string }[]>([]);
  const [completing, setCompleting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotos(p => [...p, { name: file.name, type: file.type, url }]);
    });
  };

  const handleStartWork = () => {
    startTechnicianWork(otm.id);
  };

  const handleComplete = () => {
    finishTechnicianWork(otm.id, notes, photos.map(p => ({ file_url: p.url, file_name: p.name })));
    setCompleting(true);
  };

  if (completing) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontWeight: 700 }}>Tarea Completada</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>La OTM {otm.otm_code} ha sido enviada para revisión del supervisor.</p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onBack}>Volver a Mis Tareas</button>
      </div>
    );
  }

  const isScheduled = otm.status === 'scheduled';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Volver</button>

      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-blue)' }}>{otm.otm_code}</span>
            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
              <StatusBadge status={otm.status} />
              <span className={`urgency-badge urgency-${otm.urgency}`}>{URGENCY_LABELS[otm.urgency]}</span>
              {otm.maintenance_type && (
                <span className="urgency-badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#cbd5e1' }}>
                  {MAINTENANCE_LABELS[otm.maintenance_type]}
                </span>
              )}
            </div>
          </div>
          {isScheduled && (
            <button className="btn btn-primary" onClick={handleStartWork}>▶ Iniciar Trabajo</button>
          )}
        </div>

        <div className="grid-2" style={{ gap: 12, fontSize: '0.85rem' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Solicitante:</span> {otm.requester_name}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Especialidad:</span> {otm.failure_type}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Área:</span> {otm.area_sector}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Ubicación Exacta:</span> {otm.exact_location || '—'}</div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {otm.description}
        </p>

        {otm.supervisor_notes && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(139,92,246,0.08)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Instrucciones del Supervisor</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.supervisor_notes}</p>
          </div>
        )}
      </div>

      {/* Work Section - only if in_progress */}
      {otm.status === 'in_progress' && (
        <div className="slide-up">
          {/* Notes */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>📝 Notas Técnicas</h3>
            <textarea className="form-textarea" placeholder="Describe el trabajo realizado, piezas reemplazadas, observaciones..." value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 120 }} />
          </div>

          {/* Photos */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>📷 Fotografías</h3>
            <label className="file-drop-zone" style={{ display: 'block' }}>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click para subir fotos (antes/después)</div>
            </label>
            {photos.length > 0 && (
              <div className="file-preview-grid">
                {photos.map((p, i) => (
                  <div key={i} className="file-preview-item">
                    <img src={p.url} alt={p.name} />
                    <button onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Complete */}
          <button className="btn btn-primary btn-lg w-full" onClick={handleComplete} disabled={notes.length < 5}>
            ✓ Completar Trabajo y Enviar a Supervisor
          </button>
        </div>
      )}
    </div>
  );
}
