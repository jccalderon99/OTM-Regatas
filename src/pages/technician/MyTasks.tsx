import { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { URGENCY_LABELS, MAINTENANCE_LABELS } from '../../types';
import TaskExecution from './TaskExecution';

const OtiStatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string, bg: string, color: string }> = {
    scheduled: { label: 'Programado', bg: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' },
    in_progress: { label: 'En Proceso', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
    completed: { label: 'Completado', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
  };
  const config = configs[status] || { label: status, bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: '12px',
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}22`,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {config.label}
    </span>
  );
};

export default function MyTasks() {
  const { getOTMsForCurrentUser, getOTIsForCurrentUser, updateOTIStatus } = useOTM();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const otms = getOTMsForCurrentUser();
  const otis = getOTIsForCurrentUser();

  // OTM splits
  const activeOTMs = otms.filter(o => ['scheduled', 'in_progress'].includes(o.status));
  const completedOTMs = otms.filter(o => ['awaiting_supervisor', 'awaiting_conformity', 'closed'].includes(o.status));

  // OTI splits
  const activeOTIs = otis.filter(o => ['scheduled', 'in_progress'].includes(o.status));
  const completedOTIs = otis.filter(o => o.status === 'completed');

  const OTMList = tab === 'active' ? activeOTMs : completedOTMs;
  const OTIList = tab === 'active' ? activeOTIs : completedOTIs;

  if (activeTaskId) {
    const otm = otms.find(o => o.id === activeTaskId);
    if (otm) return <TaskExecution otm={otm} onBack={() => setActiveTaskId(null)} />;
  }

  const urgencyColors = { high: '#f43f5e', medium: '#f97316', low: '#10b981' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis Tareas</h1>
        <p className="page-subtitle">Visualiza y gestiona tus Órdenes de Trabajo asignadas (OTM y OTI)</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab premium-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Activas ({activeOTMs.length + activeOTIs.length})
        </button>
        <button className={`tab premium-tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
          Completadas ({completedOTMs.length + completedOTIs.length})
        </button>
      </div>

      <div className="tasks-columns-grid">
        {/* OTM Column */}
        <div className="tasks-column">
          <h2 className="column-title">🔧 Mantenimiento (OTM) ({OTMList.length})</h2>
          
          {OTMList.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title" style={{ fontSize: '0.9rem' }}>Sin OTMs en esta sección</div>
            </div>
          ) : (
            <div className="flex-col gap-3 scrollable-list-container" style={{ maxHeight: 'calc(100vh - 300px)', padding: 4 }}>
              {OTMList.map(otm => {
                const urgencyColor = urgencyColors[otm.urgency] || '#cbd5e1';
                return (
                  <div 
                    key={otm.id} 
                    className="glass-card technician-task-card" 
                    style={{
                      padding: '20px 20px 20px 24px',
                      cursor: tab === 'active' ? 'pointer' : 'default',
                      borderLeft: `4px solid ${urgencyColor}`,
                      marginBottom: 12,
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease'
                    }}
                    onClick={() => tab === 'active' && setActiveTaskId(otm.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0ea5e9' }}>{otm.otm_code}</span>
                          <StatusBadge status={otm.status} />
                          <span className={`urgency-badge urgency-${otm.urgency}`}>{URGENCY_LABELS[otm.urgency]}</span>
                          {otm.maintenance_type && (
                            <span className="urgency-badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#cbd5e1' }}>
                              {MAINTENANCE_LABELS[otm.maintenance_type]}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                          <span style={{ fontWeight: 600 }}>{otm.requester_name}</span> — {otm.failure_type}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Área: {otm.area_sector}<br />
                          📍 {otm.location || 'Sede Principal'} — {otm.exact_location || 'Ubicación no especificada'}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>{otm.description.slice(0, 100)}{otm.description.length > 100 ? '...' : ''}</p>
                      </div>
                      {tab === 'active' && <span style={{ fontSize: '1.2rem', color: '#0ea5e9', fontWeight: 700 }}>→</span>}
                    </div>
                    {otm.supervisor_notes && (
                      <div style={{ marginTop: 12, padding: 10, background: 'rgba(139,92,246,0.08)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--accent-purple)' }}>Supervisor:</strong> {otm.supervisor_notes}
                      </div>
                    )}
                    {otm.scheduled_date && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        📅 Programado: {new Date(otm.scheduled_date).toLocaleString('es')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OTI Column */}
        <div className="tasks-column">
          <h2 className="column-title">📝 Internas (OTI) ({OTIList.length})</h2>
          
          {OTIList.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title" style={{ fontSize: '0.9rem' }}>Sin OTIs en esta sección</div>
            </div>
          ) : (
            <div className="flex-col gap-3 scrollable-list-container" style={{ maxHeight: 'calc(100vh - 300px)', padding: 4 }}>
              {OTIList.map(oti => (
                <div 
                  key={oti.id} 
                  className="glass-card technician-task-card" 
                  style={{
                    padding: '20px',
                    borderLeft: `4px solid #8b5cf6`,
                    marginBottom: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#8b5cf6' }}>{oti.oti_code}</span>
                        <OtiStatusBadge status={oti.status} />
                        <span className="urgency-badge" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#c084fc' }}>
                          {oti.specialty}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                      <span style={{ fontWeight: 600 }}>Supervisor: {oti.supervisor_name}</span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      📍 {oti.location} — <strong style={{ color: 'var(--text-secondary)' }}>{oti.exact_location || 'Sin ubicación exacta'}</strong>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                      {oti.description}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>📅 Programación: {new Date(oti.scheduled_date).toLocaleString('es')}</span>
                      {oti.estimated_time !== null && (
                        <span>⏳ Est.: {oti.estimated_time} {oti.estimated_time === 1 ? 'hora' : 'horas'}</span>
                      )}
                    </div>

                    {oti.image_url && (
                      <div style={{ marginTop: 12 }}>
                        <a href={oti.image_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={oti.image_url} 
                            alt="Adjunto OTI" 
                            style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} 
                          />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions for active tab */}
                  {tab === 'active' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {oti.status === 'scheduled' ? (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderColor: '#ea580c' }}
                          onClick={() => updateOTIStatus(oti.id, 'in_progress')}
                        >
                          ▶ Iniciar Trabajo
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#059669' }}
                          onClick={() => updateOTIStatus(oti.id, 'completed')}
                        >
                          ✓ Completar Trabajo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .premium-tab {
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-tab:hover {
          color: var(--text-primary);
        }
        .premium-tab.active {
          color: #0ea5e9;
          border-bottom-color: #0ea5e9;
          text-shadow: 0 0 1px rgba(14, 165, 233, 0.1);
        }
        .tasks-columns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 24px;
        }
        .tasks-column {
          display: flex;
          flex-direction: column;
        }
        .column-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 14px;
          color: var(--text-primary);
          border-bottom: 2px solid var(--border);
          padding-bottom: 8px;
        }
        .technician-task-card {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .technician-task-card:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }
        @media(max-width: 768px) {
          .tasks-columns-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
