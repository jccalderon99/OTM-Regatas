import React, { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, OTMStatus, Urgency, URGENCY_LABELS, STATUS_LABELS, CANCELLATION_LABELS, MAINTENANCE_LABELS } from '../../types';
import { useAuth } from '../../context/AuthContext';

type ManageAction = 'none' | 'assign' | 'rq' | 'cancel';
type AssignSubAction = 'none' | 'own' | 'contractor';
type RQSubAction = 'none' | 'supply' | 'service';

export default function OTMManagement() {
  const { user } = useAuth();
  const { otms, assignOTM, assignContractor, assignSupervisor, createRQ, cancelOTM, updateOTMFields, approveWork, users, supervisors } = useOTM();
  const [statusFilter, setStatusFilter] = useState<OTMStatus | ''>('');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | ''>('');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('');
  const [fromDateFilter, setFromDateFilter] = useState<string>('');
  const [toDateFilter, setToDateFilter] = useState<string>('');
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'urgency' | 'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Manage panel state
  const [manageOTM, setManageOTM] = useState<OTMRequest | null>(null);
  const [action, setAction] = useState<ManageAction>('none');
  const [assignSub, setAssignSub] = useState<AssignSubAction>('none');
  const [rqSub, setRQSub] = useState<RQSubAction>('none');

  // Assign own fields
  const [assignTech, setAssignTech] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Assign contractor fields
  const [contractorName, setContractorName] = useState('');
  const [contractorDate, setContractorDate] = useState('');
  const [contractorDetail, setContractorDetail] = useState('');

  // RQ fields
  const [rqMaterials, setRQMaterials] = useState('');
  const [rqQuantities, setRQQuantities] = useState('');
  const [rqServiceDesc, setRQServiceDesc] = useState('');
  const [rqMagnitude, setRQMagnitude] = useState<'puntual' | 'integral'>('puntual');

  // Cancel fields
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');

  // Supervisor Approval fields
  const [editTechNotes, setEditTechNotes] = useState('');
  const [editTechStart, setEditTechStart] = useState('');
  const [editTechEnd, setEditTechEnd] = useState('');

  const technicians = users.filter(u => u.role === 'technician').sort((a, b) => a.full_name.localeCompare(b.full_name));

  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const statusOrder: Record<OTMStatus, number> = { pending: 0, scheduled: 1, in_progress: 2, rq: 3, awaiting_supervisor: 4, awaiting_conformity: 5, closed: 6, cancelled: 7 };

  let filtered = otms
    .filter(o => !statusFilter || o.status === statusFilter)
    .filter(o => !urgencyFilter || o.urgency === urgencyFilter)
    .filter(o => !supervisorFilter || o.supervisor_id === supervisorFilter)
    .filter(o => {
      if (!fromDateFilter) return true;
      const oDate = new Date(o.updated_at).toISOString().slice(0, 10);
      return oDate >= fromDateFilter;
    })
    .filter(o => {
      if (!toDateFilter) return true;
      const oDate = new Date(o.updated_at).toISOString().slice(0, 10);
      return oDate <= toDateFilter;
    })
    .filter(o => !search || o.otm_code.toLowerCase().includes(search.toLowerCase()) ||
      o.requester_name.toLowerCase().includes(search.toLowerCase()) ||
      o.area_sector.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase()));

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortField === 'urgency') cmp = (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
    else if (sortField === 'status') cmp = statusOrder[a.status] - statusOrder[b.status];
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const openManage = (otm: OTMRequest) => {
    setManageOTM(otm);
    setAction('none');
    setAssignSub('none');
    setRQSub('none');
    setAssignTech(''); setAssignDate(''); setAssignNotes('');
    const currentTechs = otm.assigned_technicians?.map(t => t.technician_id) || (otm.technician_id ? [otm.technician_id] : []);
    setSelectedTechs(currentTechs);
    setContractorName(''); setContractorDate(''); setContractorDetail('');
    setRQMaterials(''); setRQQuantities(''); setRQServiceDesc(''); setRQMagnitude('puntual');
    setCancelReason(''); setCancelDetail('');
    setEditTechNotes(otm.technician_notes || '');
    setEditTechStart(otm.job_start_time ? new Date(otm.job_start_time).toISOString().slice(0, 16) : '');
    setEditTechEnd(otm.job_end_time ? new Date(otm.job_end_time).toISOString().slice(0, 16) : '');
  };

  const handleAssignOwn = () => {
    if (!manageOTM || selectedTechs.length === 0 || !assignDate) return;
    assignOTM(manageOTM.id, selectedTechs, assignDate, assignNotes);
    setManageOTM(null);
  };

  const handleAssignContractor = () => {
    if (!manageOTM || !contractorName || !contractorDate) return;
    assignContractor(manageOTM.id, contractorName, contractorDate, contractorDetail);
    setManageOTM(null);
  };

  const handleRQ = () => {
    if (!manageOTM) return;
    if (rqSub === 'supply') {
      createRQ(manageOTM.id, 'supply', { materials: rqMaterials, quantities: rqQuantities });
    } else if (rqSub === 'service') {
      createRQ(manageOTM.id, 'service', { serviceDesc: rqServiceDesc, magnitude: rqMagnitude });
    }
    setAction('none');
    // Refresh the panel OTM
    setManageOTM(prev => prev ? { ...prev, rq_type: rqSub === 'supply' ? 'supply' : 'service', rq_materials: rqMaterials || null, rq_quantities: rqQuantities || null, rq_service_desc: rqServiceDesc || null, rq_magnitude: rqSub === 'service' ? rqMagnitude : null } : null);
  };

  const handleCancel = () => {
    if (!manageOTM || !cancelReason) return;
    cancelOTM(manageOTM.id, cancelReason, cancelReason === 'other' ? cancelDetail : undefined);
    setManageOTM(null);
  };

  const handleApprove = () => {
    if (!manageOTM) return;
    const s = editTechStart ? new Date(editTechStart).toISOString() : undefined;
    const e = editTechEnd ? new Date(editTechEnd).toISOString() : undefined;
    approveWork(manageOTM.id, editTechNotes, s, e);
    setManageOTM(null);
  };

  const urgencyIcons: Record<string, string> = { low: '🛠️', medium: '👷', high: '💥' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de OTMs</h1>
        <p className="page-subtitle">Administra, asigna y supervisa todas las órdenes de trabajo</p>
      </div>

      {/* Filters */}
      <div className="filter-bar responsive-actions" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input className="form-input" placeholder="🔍 Buscar código, solicitante, área..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300, flex: '1 1 200px' }} />
        <select className="form-select" value={supervisorFilter} onChange={e => setSupervisorFilter(e.target.value)} style={{ flex: '1 1 150px' }}>
          <option value="">Todos los Supervisores</option>
          {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ flex: '1 1 150px' }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="form-select" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value as any)} style={{ flex: '1 1 150px' }}>
          <option value="">Toda urgencia</option>
          {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Modificado Desde:</span>
          <input className="form-input" type="date" value={fromDateFilter} onChange={e => setFromDateFilter(e.target.value)} style={{ width: 130, padding: '6px 8px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Hasta:</span>
          <input className="form-input" type="date" value={toDateFilter} onChange={e => setToDateFilter(e.target.value)} style={{ width: 130, padding: '6px 8px' }} />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>{filtered.length} resultado(s)</span>
      </div>

      {/* Table */}
      {(() => {
        const assignedOTMs = supervisorFilter ? filtered.filter(o => o.supervisor_id === supervisorFilter) : filtered;
        const unassignedOTMs = supervisorFilter ? filtered.filter(o => !o.supervisor_id) : [];
        const supName = supervisorFilter ? supervisors.find(s => s.id === supervisorFilter)?.full_name : null;

        const renderTableRows = (rows: typeof filtered) => rows.map(otm => (
          <tr key={otm.id}>
            <td><span style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{otm.otm_code}</span></td>
            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {new Date(otm.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
            </td>
            <td style={{ fontSize: '0.85rem' }}>{otm.requester_name}</td>
            <td style={{ fontSize: '0.8rem' }}>{otm.failure_type}</td>
            <td title={URGENCY_LABELS[otm.urgency]}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {otm.urgency === 'high' ? 'Alta' : otm.urgency === 'medium' ? 'Media' : 'Baja'}
                <span style={{ fontSize: '1.2rem' }}>{urgencyIcons[otm.urgency] || '❓'}</span>
              </span>
            </td>
            <td><StatusBadge status={otm.status} /></td>
            <td>
              <select className="form-select" style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: 110 }}
                value={otm.maintenance_type || ''}
                onChange={e => updateOTMFields(otm.id, { maintenance_type: e.target.value as any })}>
                <option value="">Sin definir</option>
                {Object.entries(MAINTENANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
            <td>
              <select className="form-select" style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: 130 }}
                value={otm.supervisor_id || ''}
                onChange={e => assignSupervisor(otm.id, e.target.value)}>
                <option value="">Sin asignar</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </td>
            <td>
              <button className="btn btn-primary btn-sm" onClick={() => openManage(otm)}>Gestionar</button>
            </td>
          </tr>
        ));

        const tableHead = (
          <thead>
            <tr>
              <th>Código</th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                Fecha Creación {sortField === 'created_at' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th>Solicitante</th>
              <th>Especialidad</th>
              <th onClick={() => handleSort('urgency')} style={{ cursor: 'pointer' }}>
                Urg. {sortField === 'urgency' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Estado {sortField === 'status' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th>Tipo Manten.</th>
              <th>Supervisor</th>
              <th>Acciones</th>
            </tr>
          </thead>
        );

        return (
          <>
            {supName && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 12 }}>📋 OTMs asignadas a: {supName} ({assignedOTMs.length})</div>}
            <div className="scrollable-list-container">
              <div className="data-table-wrapper">
                <table className="data-table">
                  {tableHead}
                  <tbody>{renderTableRows(assignedOTMs)}</tbody>
                </table>
              </div>
            </div>

            {supervisorFilter && unassignedOTMs.length > 0 && (
              <>
                <div style={{ margin: '28px 0 12px', padding: '12px 20px', background: 'rgba(245,158,11,0.06)', border: '1px dashed var(--accent-amber)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>Sin Supervisor Asignado ({unassignedOTMs.length})</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>Estas solicitudes requieren asignación de supervisor</span>
                </div>
                <div className="scrollable-list-container">
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      {tableHead}
                      <tbody>{renderTableRows(unassignedOTMs)}</tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* GESTIONAR Panel */}
      {manageOTM && (
        <>
          <div className="slide-panel-overlay" onClick={() => setManageOTM(null)} />
          <div className="slide-panel">
            <div className="slide-panel-header">
              <h3 style={{ fontWeight: 700 }}>Gestionar OTM</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setManageOTM(null)}>✕</button>
            </div>

            {/* OTM Info */}
            <div className="glass-card" style={{ marginBottom: 20, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-blue)' }}>{manageOTM.otm_code}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                Área: {manageOTM.area_sector} | Solicitante: {manageOTM.requester_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                📍 {manageOTM.location || 'Sede Principal'} — {manageOTM.exact_location}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 10 }}>{manageOTM.description}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={manageOTM.status} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Prioridad: {URGENCY_LABELS[manageOTM.urgency]}
                  <span style={{ fontSize: '1.2rem' }}>{urgencyIcons[manageOTM.urgency]}</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{manageOTM.failure_type}</span>
              </div>
              
              {/* Images */}
              {manageOTM.attachments && manageOTM.attachments.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {manageOTM.attachments.map(att => (
                    <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Adjunto" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Existing RQ info */}
            {manageOTM.rq_type && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  📋 {manageOTM.rq_type === 'supply' ? 'RQ SUMINISTRO' : 'RQ SERVICIO'}
                  {manageOTM.rq_date && <span style={{ float: 'right', fontWeight: 400, fontSize: '0.7rem' }}>📅 {new Date(manageOTM.rq_date).toLocaleDateString('es')}</span>}
                </div>
                {manageOTM.rq_type === 'supply' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Material: {manageOTM.rq_materials} — Cant: {manageOTM.rq_quantities}
                  </div>
                )}
                {manageOTM.rq_type === 'service' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Servicio: {manageOTM.rq_service_desc} — Magnitud: {manageOTM.rq_magnitude === 'puntual' ? 'Puntual' : 'Integral'}
                  </div>
                )}
              </div>
            )}

            {/* Existing Assignment Info */}
            {manageOTM.assignment_type === 'own' && (manageOTM.assigned_technicians?.length || manageOTM.technician_id) && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(78,181,230,0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🔧 ASIGNADO (Personal Propio)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Personal: {manageOTM.assigned_technicians && manageOTM.assigned_technicians.length > 0 
                    ? manageOTM.assigned_technicians.map(t => t.technician?.full_name || users.find(u => u.id === t.technician_id)?.full_name).filter(Boolean).join(', ')
                    : (users.find(u => u.id === manageOTM.technician_id)?.full_name || '—')}
                  {manageOTM.scheduled_date && ` — 📅 ${new Date(manageOTM.scheduled_date).toLocaleDateString('es')}`}
                </div>
              </div>
            )}
            {manageOTM.assignment_type === 'contractor' && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(78,181,230,0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🏗️ ASIGNADO (Tercero)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Contrata: {manageOTM.contractor_name}
                  {manageOTM.contractor_date && ` — 📅 ${new Date(manageOTM.contractor_date).toLocaleDateString('es')}`}
                </div>
              </div>
            )}

            {/* Technician Work Data & Approval */}
            {(manageOTM.status === 'awaiting_supervisor' || manageOTM.status === 'awaiting_conformity' || manageOTM.status === 'closed') && manageOTM.technician_notes && (
              <div style={{ marginBottom: 16, padding: 16, background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: 12 }}>
                  ✅ Trabajo Finalizado por Técnico
                </div>
                
                {manageOTM.status === 'awaiting_supervisor' ? (
                  <div className="flex-col gap-3">
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Inicio Trabajo</label>
                        <input className="form-input" type="datetime-local" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={editTechStart} onChange={e => setEditTechStart(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Fin Trabajo</label>
                        <input className="form-input" type="datetime-local" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={editTechEnd} onChange={e => setEditTechEnd(e.target.value)} />
                      </div>
                    </div>
                    
                    {editTechStart && editTechEnd && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Tiempo total: {Math.round((new Date(editTechEnd).getTime() - new Date(editTechStart).getTime()) / 60000)} minutos
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Comentario del Técnico (Editable)</label>
                      <textarea className="form-textarea" style={{ fontSize: '0.8rem', minHeight: 60 }} value={editTechNotes} onChange={e => setEditTechNotes(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-col gap-2">
                    {manageOTM.job_start_time && manageOTM.job_end_time && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        🕒 {new Date(manageOTM.job_start_time).toLocaleString('es')} - {new Date(manageOTM.job_end_time).toLocaleString('es')} 
                        <span style={{ marginLeft: 8, fontWeight: 600 }}>
                          ({Math.round((new Date(manageOTM.job_end_time).getTime() - new Date(manageOTM.job_start_time).getTime()) / 60000)} min)
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: 10, borderRadius: 6 }}>
                      {manageOTM.technician_notes}
                    </div>
                  </div>
                )}

                {manageOTM.attachments && manageOTM.attachments.filter(a => a.phase === 'execution').length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Fotos de ejecución:</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {manageOTM.attachments.filter(a => a.phase === 'execution').map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Adjunto" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {manageOTM.status === 'awaiting_supervisor' && (
                  <button className="btn btn-primary w-full" style={{ marginTop: 16 }} onClick={handleApprove}>
                    ✓ Aprobado (Dar Visto Bueno)
                  </button>
                )}
              </div>
            )}

            {action === 'none' && manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && manageOTM.status !== 'awaiting_supervisor' && manageOTM.status !== 'awaiting_conformity' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, minWidth: 100 }} onClick={() => setAction('assign')}>🔧 ASIGNAR</button>
                <button className="btn btn-secondary" style={{ flex: 1, minWidth: 100, borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => setAction('rq')}>📋 RQ</button>
              </div>
            )}

            {/* Modify button for already processed OTMs */}
            {action === 'none' && (manageOTM.rq_type || manageOTM.assignment_type) && manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && manageOTM.status !== 'awaiting_supervisor' && manageOTM.status !== 'awaiting_conformity' && (
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setAction('assign')} style={{ marginRight: 8 }}>✏️ Modificar Asignación</button>
              </div>
            )}

            {/* === ASSIGN SUB-PANEL === */}
            {action === 'assign' && (
              <div className="slide-up">
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Tipo de Personal</h4>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button className={`btn ${assignSub === 'own' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setAssignSub('own')}>
                    👤 Personal Propio
                  </button>
                  <button className={`btn ${assignSub === 'contractor' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setAssignSub('contractor')}>
                    🏗️ Personal Tercero
                  </button>
                </div>

                {assignSub === 'own' && (
                  <div className="flex-col gap-4 slide-up">
                    <div className="form-group">
                      <label className="form-label">Seleccionar Personal</label>
                      <div className="flex gap-2">
                        <select className="form-select" style={{ flex: 1 }} value={assignTech} onChange={e => setAssignTech(e.target.value)}>
                          <option value="">Seleccionar técnico...</option>
                          {technicians.filter(t => !selectedTechs.includes(t.id)).map(t => (
                            <option key={t.id} value={t.id}>{t.full_name} ({t.position || 'Técnico'})</option>
                          ))}
                        </select>
                        <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} type="button" onClick={() => {
                          if (assignTech && !selectedTechs.includes(assignTech)) {
                            setSelectedTechs(prev => [...prev, assignTech]);
                            setAssignTech('');
                          }
                        }} disabled={!assignTech}>
                          Agregar persona
                        </button>
                      </div>
                    </div>

                    {/* Lista de Personal Agregado */}
                    {selectedTechs.length > 0 && (
                      <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Personal Asignado ({selectedTechs.length}):</label>
                        <div className="flex-col gap-2" style={{ marginTop: 8 }}>
                          {selectedTechs.map(techId => {
                            const tech = users.find(u => u.id === techId);
                            return (
                              <div key={techId} className="flex justify-between items-center" style={{ background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem' }}>{tech?.full_name || 'Técnico Desconocido'}</span>
                                <button className="btn btn-icon btn-ghost btn-sm" type="button" style={{ color: 'var(--accent-rose)', padding: '2px 6px', height: 'auto', minWidth: 'auto' }} onClick={() => {
                                  setSelectedTechs(prev => prev.filter(id => id !== techId));
                                }}>
                                  Eliminar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Fecha programada *</label>
                      <input className="form-input" type="datetime-local" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Instrucciones / Notas</label>
                      <textarea className="form-textarea" placeholder="Instrucciones para el técnico..." value={assignNotes} onChange={e => setAssignNotes(e.target.value)} />
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 8 }}>
                      <button className="btn btn-secondary" onClick={() => { setAction('none'); setAssignSub('none'); }}>Volver</button>
                      <button className="btn btn-primary" onClick={handleAssignOwn} disabled={selectedTechs.length === 0 || !assignDate}>✓ Aceptar</button>
                    </div>
                  </div>
                )}

                {assignSub === 'contractor' && (
                  <div className="flex-col gap-4 slide-up">
                    <div className="form-group">
                      <label className="form-label">Nombre de la contrata *</label>
                      <input className="form-input" placeholder="Ej: Servicios Eléctricos SAC" value={contractorName} onChange={e => setContractorName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha de ejecución *</label>
                      <input className="form-input" type="datetime-local" value={contractorDate} onChange={e => setContractorDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Detalle del trabajo</label>
                      <textarea className="form-textarea" placeholder="Describe el trabajo que realizará el tercero..." value={contractorDetail} onChange={e => setContractorDetail(e.target.value)} />
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 8 }}>
                      <button className="btn btn-secondary" onClick={() => { setAction('none'); setAssignSub('none'); }}>Volver</button>
                      <button className="btn btn-primary" onClick={handleAssignContractor} disabled={!contractorName || !contractorDate}>✓ Aceptar</button>
                    </div>
                  </div>
                )}

                {assignSub === 'none' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAction('none')}>← Volver</button>
                )}
              </div>
            )}

            {/* === RQ SUB-PANEL === */}
            {action === 'rq' && (
              <div className="slide-up">
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Tipo de Requerimiento</h4>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button className={`btn ${rqSub === 'supply' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRQSub('supply')}>
                    📦 RQ Suministro
                  </button>
                  <button className={`btn ${rqSub === 'service' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRQSub('service')}>
                    🔧 RQ Servicio
                  </button>
                </div>

                {rqSub === 'supply' && (
                  <div className="flex-col gap-4 slide-up">
                    <div className="form-group">
                      <label className="form-label">Material / Producto *</label>
                      <textarea className="form-textarea" placeholder="Ej: Tubería PVC 2 pulgadas, Pegamento, Cinta teflón..." value={rqMaterials} onChange={e => setRQMaterials(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cantidades *</label>
                      <input className="form-input" placeholder="Ej: 3 metros, 2 unidades, 1 galón..." value={rqQuantities} onChange={e => setRQQuantities(e.target.value)} />
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 8 }}>
                      <button className="btn btn-secondary" onClick={() => { setAction('none'); setRQSub('none'); }}>Volver</button>
                      <button className="btn btn-primary" onClick={handleRQ} disabled={!rqMaterials || !rqQuantities}>✓ Guardar</button>
                    </div>
                  </div>
                )}

                {rqSub === 'service' && (
                  <div className="flex-col gap-4 slide-up">
                    <div className="form-group">
                      <label className="form-label">Servicio solicitado *</label>
                      <textarea className="form-textarea" placeholder="Describe el servicio que se solicita..." value={rqServiceDesc} onChange={e => setRQServiceDesc(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Magnitud *</label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className={`btn ${rqMagnitude === 'puntual' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRQMagnitude('puntual')}>Puntual</button>
                        <button className={`btn ${rqMagnitude === 'integral' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRQMagnitude('integral')}>Integral</button>
                      </div>
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 8 }}>
                      <button className="btn btn-secondary" onClick={() => { setAction('none'); setRQSub('none'); }}>Volver</button>
                      <button className="btn btn-primary" onClick={handleRQ} disabled={!rqServiceDesc}>✓ Guardar</button>
                    </div>
                  </div>
                )}

                {rqSub === 'none' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAction('none')}>← Volver</button>
                )}
              </div>
            )}

            {/* === CANCEL SUB-PANEL === */}
            {action === 'cancel' && (
              <div className="slide-up">
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12, color: 'var(--accent-rose)' }}>Cancelar Solicitud</h4>
                <div className="flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label">Motivo de cancelación *</label>
                    <select className="form-select" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                      <option value="">Seleccionar motivo...</option>
                      {Object.entries(CANCELLATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  {cancelReason === 'other' && (
                    <div className="form-group slide-up">
                      <label className="form-label">Especifique el motivo *</label>
                      <textarea className="form-textarea" placeholder="Escriba el motivo de la cancelación..." value={cancelDetail} onChange={e => setCancelDetail(e.target.value)} />
                    </div>
                  )}
                  <div className="flex gap-3" style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setAction('none')}>Volver</button>
                    <button className="btn btn-danger" onClick={handleCancel} disabled={!cancelReason || (cancelReason === 'other' && !cancelDetail)}>✓ Confirmar Cancelación</button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Cancel Button (Bottom Right) */}
            {manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && manageOTM.status !== 'awaiting_conformity' && action !== 'cancel' && (
              <div style={{ position: 'sticky', bottom: -28, left: 0, right: 0, background: 'linear-gradient(transparent, var(--bg-card) 20%)', padding: '40px 0 20px', marginTop: 40, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                <button className="btn btn-danger" 
                  style={{ pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)', padding: '12px 24px' }} 
                  onClick={() => setAction('cancel')}>
                  ❌ CANCELAR SOLICITUD
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
