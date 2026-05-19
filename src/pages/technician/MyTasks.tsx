import React, { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { URGENCY_LABELS, MAINTENANCE_LABELS } from '../../types';
import TaskExecution from './TaskExecution';

export default function MyTasks() {
  const { getOTMsForCurrentUser } = useOTM();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const otms = getOTMsForCurrentUser();
  const active = otms.filter(o => ['scheduled', 'in_progress'].includes(o.status));
  const completed = otms.filter(o => ['awaiting_conformity', 'closed'].includes(o.status));
  const list = tab === 'active' ? active : completed;

  if (activeTaskId) {
    const otm = otms.find(o => o.id === activeTaskId);
    if (otm) return <TaskExecution otm={otm} onBack={() => setActiveTaskId(null)} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis Tareas</h1>
        <p className="page-subtitle">Órdenes de trabajo asignadas a ti</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Activas ({active.length})
        </button>
        <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
          Completadas ({completed.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{tab === 'active' ? '✅' : '📋'}</div>
          <div className="empty-state-title">{tab === 'active' ? 'No tienes tareas activas' : 'Sin tareas completadas aún'}</div>
        </div>
      ) : (
        <div className="flex-col gap-3 scrollable-list-container" style={{ padding: 10, maxHeight: 'calc(100vh - 300px)' }}>
          {list.map(otm => (
            <div key={otm.id} className="glass-card" style={{ padding: 20, cursor: tab === 'active' ? 'pointer' : 'default' }}
              onClick={() => tab === 'active' && setActiveTaskId(otm.id)}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{otm.otm_code}</span>
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
                    📍 {otm.location || 'Sede Principal'} — {otm.exact_location}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>{otm.description.slice(0, 120)}{otm.description.length > 120 ? '...' : ''}</p>
                </div>
                {tab === 'active' && <span style={{ fontSize: '1.2rem' }}>→</span>}
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
          ))}
        </div>
      )}
    </div>
  );
}
