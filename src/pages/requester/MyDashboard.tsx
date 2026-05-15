import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, URGENCY_LABELS, OTMStatus } from '../../types';
import ConformityModal from '../../components/ConformityModal';

export default function MyDashboard() {
  const { user } = useAuth();
  const { getOTMsForCurrentUser } = useOTM();
  const [selectedOTM, setSelectedOTM] = useState<OTMRequest | null>(null);
  const [filter, setFilter] = useState<OTMStatus | ''>('');
  const [showConformity, setShowConformity] = useState<OTMRequest | null>(null);

  const otms = getOTMsForCurrentUser();
  const filtered = filter ? otms.filter(o => o.status === filter) : otms;

  const counts = {
    total: otms.length,
    pending: otms.filter(o => o.status === 'pending').length,
    active: otms.filter(o => ['scheduled', 'in_progress'].includes(o.status)).length,
    awaiting: otms.filter(o => o.status === 'awaiting_conformity').length,
    closed: otms.filter(o => o.status === 'closed').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis Solicitudes</h1>
        <p className="page-subtitle">📍 Área: {user?.area_sector} — Seguimiento en tiempo real de tus OTMs</p>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total', value: counts.total, color: 'var(--accent-blue)' },
          { label: 'Pendientes', value: counts.pending, color: 'var(--accent-amber)' },
          { label: 'En Curso', value: counts.active, color: 'var(--accent-blue)' },
          { label: 'Por Confirmar', value: counts.awaiting, color: 'var(--accent-emerald)' },
        ].map(c => (
          <div key={c.label} className="kpi-card" style={{ '--kpi-color': c.color } as any}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="scheduled">Programado</option>
          <option value="in_progress">En Progreso</option>
          <option value="awaiting_conformity">Esperando Conformidad</option>
          <option value="closed">Cerrado</option>
        </select>
      </div>

      {/* OTM List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No hay solicitudes</div>
          <div className="empty-state-text">Crea una nueva solicitud para comenzar</div>
        </div>
      ) : (
        <div className="flex-col gap-3">
          {filtered.map(otm => (
            <div key={otm.id} className="glass-card" style={{ cursor: 'pointer', padding: 20 }}
              onClick={() => setSelectedOTM(selectedOTM?.id === otm.id ? null : otm)}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{otm.otm_code}</span>
                    <StatusBadge status={otm.status} />
                    <span className={`urgency-badge urgency-${otm.urgency}`}>{URGENCY_LABELS[otm.urgency]}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>{otm.failure_type} — {otm.asset || 'Sin activo especificado'}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(otm.created_at).toLocaleDateString('es')}</span>
              </div>

              {/* Expanded Details */}
              {selectedOTM?.id === otm.id && (
                <div className="slide-up" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{otm.description}</p>
                  {otm.exact_location && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {otm.exact_location}</div>}
                  {otm.supervisor_notes && (
                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(139,92,246,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Notas del Supervisor</div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.supervisor_notes}</p>
                    </div>
                  )}
                  {otm.technician_notes && (
                    <div style={{ marginTop: 8, padding: 12, background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Notas del Técnico</div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.technician_notes}</p>
                    </div>
                  )}
                  {otm.status === 'awaiting_conformity' && (
                    <button className="btn btn-primary" style={{ marginTop: 16 }}
                      onClick={e => { e.stopPropagation(); setShowConformity(otm); }}>
                      ✓ Dar Conformidad
                    </button>
                  )}
                  {otm.status === 'closed' && otm.conformity_rating && (
                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(100,116,139,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Conformidad</div>
                      <div style={{ marginTop: 4 }}>{'⭐'.repeat(otm.conformity_rating)}{'☆'.repeat(5 - otm.conformity_rating)}</div>
                      {otm.conformity_notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.conformity_notes}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showConformity && (
        <ConformityModal otm={showConformity} onClose={() => setShowConformity(null)} />
      )}
    </div>
  );
}
