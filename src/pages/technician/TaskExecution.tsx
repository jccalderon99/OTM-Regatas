import React, { useState } from 'react';
import { OTMRequest, URGENCY_LABELS, MAINTENANCE_LABELS } from '../../types';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { uploadToCloudinary } from '../../lib/cloudinary';
import TechRequestModal from '../../components/TechRequestModal';

export default function TaskExecution({ otm, onBack }: { otm: OTMRequest; onBack: () => void }) {
  const { startTechnicianWork, pauseTechnicianWork, resumeTechnicianWork, finishTechnicianWork } = useOTM();
  const [notes, setNotes] = useState(otm.technician_notes || '');
  const [photos, setPhotos] = useState<{ name: string; type: string; url: string; file?: File }[]>([]);
  const [completing, setCompleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isPaused = !!(otm.pauses && otm.pauses.length > 0 && otm.pauses[otm.pauses.length - 1].resumed_at === null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotos(p => [...p, { name: file.name, type: file.type, url, file }]);
    });
  };

  const handleStartWork = () => {
    startTechnicianWork(otm.id);
  };

  const handlePauseWork = () => {
    if (confirm('¿Deseas posponer esta orden de trabajo? El cronómetro se detendrá hasta que la retomes.')) {
      pauseTechnicianWork(otm.id);
    }
  };

  const handleResumeWork = () => {
    resumeTechnicianWork(otm.id);
  };

  const handleComplete = async () => {
    setUploading(true);
    try {
      // Upload photos to Cloudinary (compressed)
      const uploaded = await Promise.all(
        photos.map(async p => {
          if (p.file) {
            const result = await uploadToCloudinary(p.file, 'otm-regatas/execution');
            return { file_url: result.url, file_name: p.name };
          }
          return { file_url: p.url, file_name: p.name };
        })
      );
      await finishTechnicianWork(otm.id, notes, uploaded);
      setCompleting(true);
    } catch (err) {
      console.error('Error al completar:', err);
      alert('Error al subir fotos. Intente de nuevo.');
    } finally {
      setUploading(false);
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 0 }}>← Volver</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(true)} style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)', color: '#d97706' }}>
          ⚠️ Reportar Necesidad / Obs.
        </button>
      </div>

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
          {otm.status === 'in_progress' && (
            isPaused ? (
              <button className="btn" style={{ background: '#f59e0b', color: 'white', fontWeight: 600 }} onClick={handleResumeWork}>▶ Retomar Trabajo</button>
            ) : (
              <button className="btn btn-secondary" style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={handlePauseWork}>⏸️ Posponer</button>
            )
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
        <div className="slide-up" style={{ opacity: isPaused ? 0.6 : 1, pointerEvents: isPaused ? 'none' : 'auto', transition: 'all 0.3s ease' }}>
          {isPaused && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem', textAlign: 'center', fontWeight: 500 }}>
              ⚠️ TRABAJO POSPUESTO: Haz clic en el botón de arriba <strong>"▶ Retomar Trabajo"</strong> para reactivar y registrar tu ejecución.
            </div>
          )}
          
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
          <button className="btn btn-primary btn-lg w-full" onClick={handleComplete} disabled={notes.length < 5 || uploading}>
            {uploading ? '⏳ Subiendo fotos...' : '✓ Completar Trabajo y Enviar a Supervisor'}
          </button>
        </div>
      )}
      <TechRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        otmId={otm.id}
        otmCode={otm.otm_code}
      />
    </div>
  );
}
