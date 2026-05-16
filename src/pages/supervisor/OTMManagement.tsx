import React, { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, OTMStatus, Urgency, URGENCY_LABELS, STATUS_LABELS, CANCELLATION_LABELS } from '../../types';
import { useAuth } from '../../context/AuthContext';

type ManageAction = 'none' | 'assign' | 'rq' | 'cancel';
type AssignSubAction = 'none' | 'own' | 'contractor';
type RQSubAction = 'none' | 'supply' | 'service';

export default function OTMManagement() {
  const { user } = useAuth();
  const { otms, assignOTM, assignContractor, assignSupervisor, createRQ, cancelOTM, updateOTMStatus, users, supervisors } = useOTM();
  const [statusFilter, setStatusFilter] = useState<OTMStatus | ''>('');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | ''>('');
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

  const technicians = users.filter(u => u.role === 'technician').sort((a, b) => a.full_name.localeCompare(b.full_name));

  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
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
    setContractorName(''); setContractorDate(''); setContractorDetail('');
    setRQMaterials(''); setRQQuantities(''); setRQServiceDesc(''); setRQMagnitude('puntual');
    setCancelReason(''); setCancelDetail('');
  };

  const handleAssignOwn = () => {
    if (!manageOTM || !assignTech || !assignDate) return;
    assignOTM(manageOTM.id, assignTech, assignDate, assignNotes);
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

  const urgencyIcons: Record<string, string> = { low: '🛠️', medium: '👷', high: '💥' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de OTMs</h1>
        <p className="page-subtitle">Administra, asigna y supervisa todas las órdenes de trabajo</p>
      </div>

      {/* Filters */}
      <div className="filter-bar responsive-actions" style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="🔍 Buscar código, solicitante, área..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300, flex: 1, minWidth: 180 }} />
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="form-select" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value as any)}>
          <option value="">Toda urgencia</option>
          {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} resultado(s)</span>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('created_at')}>Código {sortField === 'created_at' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th>Solicitante</th>
              <th>Especialidad</th>
              <th onClick={() => handleSort('urgency')}>Urg. {sortField === 'urgency' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th onClick={() => handleSort('status')}>Estado {sortField === 'status' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</th>
              <th>Supervisor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(otm => {
              const sup = supervisors.find(s => s.id === otm.supervisor_id);
              return (
                <tr key={otm.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{otm.otm_code}</span></td>
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
                    <select
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: 130 }}
                      value={otm.supervisor_id || ''}
                      onChange={e => assignSupervisor(otm.id, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => openManage(otm)}>Gestionar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                📍 {manageOTM.area_sector}{manageOTM.exact_location ? ` — ${manageOTM.exact_location}` : ''}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 10 }}>{manageOTM.description}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={manageOTM.status} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {manageOTM.urgency === 'high' ? 'Alta' : manageOTM.urgency === 'medium' ? 'Media' : 'Baja'}
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
            {manageOTM.assignment_type === 'own' && manageOTM.technician_id && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(78,181,230,0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🔧 ASIGNADO (Personal Propio)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Técnico: {users.find(u => u.id === manageOTM.technician_id)?.full_name || '—'}
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

            {/* Action Buttons */}
            {action === 'none' && manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, minWidth: 100 }} onClick={() => setAction('assign')}>🔧 ASIGNAR</button>
                <button className="btn btn-secondary" style={{ flex: 1, minWidth: 100, borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => setAction('rq')}>📋 RQ</button>
                <button className="btn btn-danger" style={{ flex: 1, minWidth: 100 }} onClick={() => setAction('cancel')}>❌ CANCELAR</button>
              </div>
            )}

            {/* Modify button for already processed OTMs */}
            {action === 'none' && (manageOTM.rq_type || manageOTM.assignment_type) && manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && (
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
                      <button className="btn btn-secondary" onClick={() => { setAction('none'); setAssignSub('none'); }}>Volver</button>
                      <button className="btn btn-primary" onClick={handleAssignOwn} disabled={!assignTech || !assignDate}>✓ Aceptar</button>
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

          </div>
        </>
      )}
    </div>
  );
}
