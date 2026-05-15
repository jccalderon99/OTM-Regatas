import React, { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, OTMStatus, Urgency, URGENCY_LABELS, STATUS_LABELS } from '../../types';
import { DEMO_USERS } from '../../lib/demoData';
import { useAuth } from '../../context/AuthContext';

export default function OTMManagement() {
  const { user } = useAuth();
  const { otms, assignOTM, updateOTMStatus } = useOTM();
  const [statusFilter, setStatusFilter] = useState<OTMStatus | ''>('');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | ''>('');
  const [search, setSearch] = useState('');
  const [assignPanel, setAssignPanel] = useState<OTMRequest | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'urgency' | 'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Assignment form state
  const [assignTech, setAssignTech] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const technicians = DEMO_USERS.filter(u => u.role === 'technician');

  const urgencyOrder: Record<Urgency, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<OTMStatus, number> = { pending: 0, scheduled: 1, in_progress: 2, awaiting_conformity: 3, closed: 4, cancelled: 5 };

  let filtered = otms
    .filter(o => !statusFilter || o.status === statusFilter)
    .filter(o => !urgencyFilter || o.urgency === urgencyFilter)
    .filter(o => !search || o.otm_code.toLowerCase().includes(search.toLowerCase()) ||
      o.requester_name.toLowerCase().includes(search.toLowerCase()) ||
      o.area_sector.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase()));

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortField === 'urgency') cmp = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    else if (sortField === 'status') cmp = statusOrder[a.status] - statusOrder[b.status];
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleAssign = () => {
    if (!assignPanel || !assignTech || !assignDate) return;
    assignOTM(assignPanel.id, assignTech, assignDate, assignNotes);
    setAssignPanel(null);
    setAssignTech(''); setAssignDate(''); setAssignNotes('');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de OTMs</h1>
        <p className="page-subtitle">Administra, asigna y supervisa todas las órdenes de trabajo</p>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="🔍 Buscar por código, solicitante, área..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="form-select" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value as any)}>
          <option value="">Toda urgencia</option>
          {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} resultado(s)</span>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('created_at')}>Código {sortField === 'created_at' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th>Solicitante</th>
              <th>Área</th>
              <th>Especialidad</th>
              <th onClick={() => handleSort('urgency')}>Urgencia {sortField === 'urgency' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th onClick={() => handleSort('status')}>Estado {sortField === 'status' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th>Técnico</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(otm => {
              const tech = technicians.find(t => t.id === otm.technician_id);
              return (
                <tr key={otm.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{otm.otm_code}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{otm.requester_name}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{otm.area_sector}</td>
                  <td style={{ fontSize: '0.8rem' }}>{otm.failure_type}</td>
                  <td><span className={`urgency-badge urgency-${otm.urgency}`}>{URGENCY_LABELS[otm.urgency]}</span></td>
                  <td><StatusBadge status={otm.status} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tech?.full_name || '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      {otm.status === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setAssignPanel(otm)}>Asignar</button>
                      )}
                      {otm.status === 'pending' && (
                        <button className="btn btn-danger btn-sm" onClick={() => updateOTMStatus(otm.id, 'cancelled', 'Cancelado por supervisor')}>Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assignment Panel */}
      {assignPanel && (
        <>
          <div className="slide-panel-overlay" onClick={() => setAssignPanel(null)} />
          <div className="slide-panel">
            <div className="slide-panel-header">
              <h3 style={{ fontWeight: 700 }}>Asignar OTM</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setAssignPanel(null)}>✕</button>
            </div>

            <div className="glass-card" style={{ marginBottom: 20, padding: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{assignPanel.otm_code}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{assignPanel.failure_type} — {assignPanel.area_sector} {assignPanel.exact_location ? `(${assignPanel.exact_location})` : ''}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>{assignPanel.description}</p>
            </div>

            <div className="flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Técnico asignado *</label>
                <select className="form-select" value={assignTech} onChange={e => setAssignTech(e.target.value)}>
                  <option value="">Seleccionar técnico...</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha programada *</label>
                <input className="form-input" type="datetime-local" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Instrucciones / Notas</label>
                <textarea className="form-textarea" placeholder="Instrucciones para el técnico..." value={assignNotes} onChange={e => setAssignNotes(e.target.value)} />
              </div>
              <div className="flex gap-3" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setAssignPanel(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAssign} disabled={!assignTech || !assignDate}>✓ Asignar Técnico</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
