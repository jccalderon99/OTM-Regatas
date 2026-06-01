import React, { useState } from 'react';
import { useOTM } from '../context/OTMContext';
import { TechRequestType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  otmId?: string | null;
  otmCode?: string | null;
}

export default function TechRequestModal({ isOpen, onClose, otmId = null, otmCode = null }: Props) {
  const { createTechRequest } = useOTM();
  const [type, setType] = useState<TechRequestType>('material');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      await createTechRequest({
        request_type: type,
        description: description,
        otm_id: otmId,
        otm_code: otmCode,
      });
      setDescription('');
      onClose();
      alert('¡Solicitud enviada exitosamente al supervisor!');
    } catch (err) {
      console.error(err);
      alert('Hubo un error al enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabels: Record<TechRequestType, { label: string; icon: string; color: string; desc: string }> = {
    material: { label: 'Materiales', icon: '📦', color: '#0ea5e9', desc: 'Repuestos, insumos, pernos, etc.' },
    tool: { label: 'Herramientas', icon: '🔧', color: '#a855f7', desc: 'Equipos, llaves, instrumentos de medición.' },
    observation: { label: 'Observación de Máquina', icon: '⚙️', color: '#f59e0b', desc: 'Falla o desgaste detectado en máquina.' },
    other: { label: 'Otros', icon: '📝', color: '#64748b', desc: 'Cualquier otra necesidad u observación.' },
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
              🛠️ Requerimiento Técnico
            </span>
            <h3 className="modal-title" style={{ margin: '4px 0 0', fontSize: '1.25rem' }}>
              {otmCode ? `Reportar para ${otmCode}` : 'Nueva Solicitud / Observación'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {otmCode && (
            <div style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', padding: 12, borderRadius: 10, fontSize: '0.8rem', color: '#0369a1' }}>
              📌 Esta solicitud estará directamente vinculada al historial de la orden de trabajo <strong>{otmCode}</strong>.
            </div>
          )}

          {/* Request Type Selector */}
          <div className="form-group">
            <label className="form-label">Tipo de Requerimiento *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.keys(typeLabels) as TechRequestType[]).map(key => {
                const item = typeLabels[key];
                const isSelected = type === key;
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${isSelected ? item.color : 'var(--border)'}`,
                      background: isSelected ? `${item.color}06` : 'var(--bg-card)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="req_type"
                      checked={isSelected}
                      onChange={() => setType(key)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? item.color : 'var(--text-primary)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Detalle y Justificación *</label>
            <textarea
              className="form-textarea"
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe detalladamente lo que necesitas, las especificaciones del material, el código de la máquina u observación..."
              style={{ minHeight: 100, fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !description.trim()}
              style={{
                background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0284c7 100%)',
                border: 'none',
                boxShadow: '0 4px 12px var(--accent-blue-glow)',
                color: 'white',
              }}
            >
              {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
