import { useState, useMemo, useEffect } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useAuth } from '../../context/AuthContext';
import { useRQ } from '../../context/RQContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, OTMStatus, Urgency, URGENCY_LABELS, STATUS_LABELS, CANCELLATION_LABELS, MAINTENANCE_LABELS, RQ_STATUS_LABELS, AREAS, FAILURE_TYPES } from '../../types';
import ConformityActa from '../../components/ConformityActa';
import ManualExecutionForm from '../../components/ManualExecutionForm';

type ManageAction = 'none' | 'assign' | 'rq' | 'cancel' | 'derive';
type AssignSubAction = 'none' | 'own' | 'contractor';
type RQSubAction = 'none' | 'supply' | 'service';

interface OTMManagementProps {
  onNavigate?: (view: string) => void;
}

export default function OTMManagement({ onNavigate }: OTMManagementProps) {
  const { otms, assignOTM, assignContractor, assignSupervisor, createRQ, cancelOTM, updateOTMFields, approveWork, users, supervisors, statusLogs, deriveOTM, addOTMComment, markAsRead, isOTMUnread, registerManualExecution } = useOTM();
  const { user } = useAuth();
  const { createRQRecord, getRQByOtmId } = useRQ();
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
  const [actaOTM, setActaOTM] = useState<OTMRequest | null>(null);
  const [action, setAction] = useState<ManageAction>('none');
  const [assignSub, setAssignSub] = useState<AssignSubAction>('none');
  const [rqSub, setRQSub] = useState<RQSubAction>('none');
  const [showManualForm, setShowManualForm] = useState(false);

  // Assign own fields
  const [assignTech, setAssignTech] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignEstimatedTime, setAssignEstimatedTime] = useState('');

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

  // New multi-material RQ states
  const [rqMaterialsList, setRqMaterialsList] = useState<{ name: string; unit: string; quantity: number }[]>([]);
  const [currentMatName, setCurrentMatName] = useState('');
  const [currentMatUnit, setCurrentMatUnit] = useState('Unidades');
  const [currentMatQty, setCurrentMatQty] = useState(1);
  const [rqNumberInput, setRqNumberInput] = useState('');

  // Reschedule states
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleTech, setRescheduleTech] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Contractor execution states
  const [contractorStartDate, setContractorStartDate] = useState('');
  const [contractorEndDate, setContractorEndDate] = useState('');
  const [contractorWorkDesc, setContractorWorkDesc] = useState('');

  // Derivación y Comentarios
  const [deriveArea, setDeriveArea] = useState('');
  const [deriveNotes, setDeriveNotes] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const handleDeriveSubmit = async () => {
    if (!manageOTM || !deriveArea || !deriveNotes.trim()) return;
    await deriveOTM(manageOTM.id, deriveArea, deriveNotes.trim());
    setManageOTM(null);
    setAction('none');
    setDeriveArea('');
    setDeriveNotes('');
  };

  const handleAddCommentSubmit = async () => {
    if (!manageOTM || !newCommentText.trim()) return;
    await addOTMComment(manageOTM.id, newCommentText.trim());
    
    setManageOTM(prev => prev ? {
      ...prev,
      comments: [...(prev.comments || []), {
        id: `comment-${Date.now()}`,
        otm_id: prev.id,
        user_id: user?.id || '',
        user_name: user?.full_name || '',
        user_role: user?.role || '',
        text: newCommentText.trim(),
        created_at: new Date().toISOString()
      }]
    } : null);
    
    setNewCommentText('');
  };

  const technicians = users.filter(u => u.role === 'technician').sort((a, b) => a.full_name.localeCompare(b.full_name));

  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const statusOrder: Record<OTMStatus, number> = { pending: 0, scheduled: 1, in_progress: 2, rq: 3, awaiting_supervisor: 4, awaiting_conformity: 5, closed: 6, cancelled: 7, derived: 8 };

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
    markAsRead(otm.id);
    setAction('none');
    setAssignSub('none');
    setRQSub('none');
    setAssignTech(''); setAssignDate(''); setAssignNotes(''); setAssignEstimatedTime(otm.estimated_time ? String(otm.estimated_time) : '');
    const currentTechs = otm.assigned_technicians?.map(t => t.technician_id) || (otm.technician_id ? [otm.technician_id] : []);
    setSelectedTechs(currentTechs);
    setContractorName(''); setContractorDate(''); setContractorDetail('');
    setRQMaterials(''); setRQQuantities(''); setRQServiceDesc(''); setRQMagnitude('puntual');
    setCancelReason(''); setCancelDetail('');
    setEditTechNotes(otm.technician_notes || '');
    setEditTechStart(otm.job_start_time ? new Date(otm.job_start_time).toISOString().slice(0, 16) : '');
    setEditTechEnd(otm.job_end_time ? new Date(otm.job_end_time).toISOString().slice(0, 16) : '');
    
    // Reset new states
    setRqMaterialsList([]);
    setRqNumberInput('');
    setShowRescheduleForm(false);
    setRescheduleTech('');
    setRescheduleDate('');
    setRescheduleReason('');
    setContractorStartDate(otm.job_start_time ? new Date(otm.job_start_time).toISOString().slice(0, 16) : '');
    setContractorEndDate(otm.job_end_time ? new Date(otm.job_end_time).toISOString().slice(0, 16) : '');
    setContractorWorkDesc(otm.technician_notes || '');
    setDeriveArea('');
    setDeriveNotes('');
    setNewCommentText('');
    setShowManualForm(false);
  };

  useEffect(() => {
    const pendingOtmId = localStorage.getItem('selected_otm_id_for_management');
    if (pendingOtmId) {
      const targetOtm = otms.find(o => o.id === pendingOtmId);
      if (targetOtm) {
        openManage(targetOtm);
      }
      localStorage.removeItem('selected_otm_id_for_management');
    }
  }, [otms]);

  useEffect(() => {
    const handleFocusOtm = (e: CustomEvent<{ otmId: string }>) => {
      const targetOtm = otms.find(o => o.id === e.detail.otmId);
      if (targetOtm) {
        openManage(targetOtm);
        setTimeout(() => {
          const el = document.getElementById(`otm-row-${targetOtm.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    window.addEventListener('focus_otm_changed' as any, handleFocusOtm as any);
    return () => {
      window.removeEventListener('focus_otm_changed' as any, handleFocusOtm as any);
    };
  }, [otms]);

  const handleAssignOwn = () => {
    if (!manageOTM || selectedTechs.length === 0 || !assignDate) return;
    const estTimeNum = assignEstimatedTime ? parseInt(assignEstimatedTime, 10) : undefined;
    assignOTM(manageOTM.id, selectedTechs, assignDate, assignNotes, estTimeNum);
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
    setManageOTM(prev => prev ? { ...prev, rq_type: rqSub === 'supply' ? 'supply' : 'service', rq_materials: rqMaterials || null, rq_quantities: rqQuantities || null, rq_service_desc: rqServiceDesc || null, rq_magnitude: rqSub === 'service' ? rqMagnitude : null } : null);
  };

  const handleCreateRQGlobal = () => {
    if (!manageOTM || !user) return;
    
    const descriptionText = rqSub === 'supply'
      ? `RQ Suministro para OTM ${manageOTM.otm_code}`
      : rqServiceDesc;
      
    const materialsData = rqSub === 'supply' ? rqMaterialsList : undefined;

    createRQRecord({
      otm_id: manageOTM.id,
      otm_code: manageOTM.otm_code,
      supervisor_id: user.id,
      supervisor_name: user.full_name,
      type: rqSub === 'supply' ? 'supply' : 'service',
      description: descriptionText,
      materials: materialsData,
      rq_number: rqNumberInput || null,
      sap_number: null,
      observations: [
        {
          id: `obs-${Date.now()}`,
          text: 'Requerimiento creado desde el panel de gestión.',
          date: new Date().toISOString()
        }
      ]
    });

    setAction('none');
    setRQSub('none');
    setRqMaterialsList([]);
    setRqNumberInput('');
    
    const matsText = materialsData ? materialsData.map(m => m.name).join(', ') : '';
    const qtysText = materialsData ? materialsData.map(m => `${m.quantity} ${m.unit}`).join(', ') : '';
    
    setManageOTM(prev => prev ? {
      ...prev,
      rq_type: rqSub === 'supply' ? 'supply' : 'service',
      rq_date: new Date().toISOString(),
      rq_materials: rqSub === 'supply' ? matsText : null,
      rq_quantities: rqSub === 'supply' ? qtysText : null,
      rq_service_desc: rqSub === 'service' ? rqServiceDesc : null,
      status: 'rq'
    } : null);
  };

  const handleReschedule = () => {
    if (!manageOTM || !rescheduleTech || !rescheduleDate || !rescheduleReason.trim()) return;

    const previousSchedule = {
      id: `resched-${Date.now()}`,
      technician_id: manageOTM.technician_id,
      technician_name: users.find(u => u.id === manageOTM.technician_id)?.full_name || 'Desconocido',
      scheduled_date: manageOTM.scheduled_date || '',
      rescheduled_at: new Date().toISOString(),
      reason: rescheduleReason.trim()
    };

    const newHistory = manageOTM.reschedule_history 
      ? [...manageOTM.reschedule_history, previousSchedule] 
      : [previousSchedule];

    const primaryTechId = rescheduleTech;
    const mappedAssigned = [{
      technician_id: rescheduleTech,
      technician: users.find(u => u.id === rescheduleTech)
    }];

    updateOTMFields(manageOTM.id, {
      technician_id: primaryTechId,
      assigned_technicians: mappedAssigned,
      scheduled_date: rescheduleDate,
      reschedule_history: newHistory,
      is_rescheduled: true
    });

    setShowRescheduleForm(false);
    setRescheduleReason('');
    setRescheduleTech('');
    setRescheduleDate('');

    setManageOTM(prev => prev ? {
      ...prev,
      technician_id: primaryTechId,
      assigned_technicians: mappedAssigned,
      scheduled_date: rescheduleDate,
      reschedule_history: newHistory,
      is_rescheduled: true
    } : null);
  };

  const handleContractorClose = () => {
    if (!manageOTM || !contractorStartDate || !contractorEndDate || !contractorWorkDesc.trim()) return;

    const s = new Date(contractorStartDate).toISOString();
    const e = new Date(contractorEndDate).toISOString();

    approveWork(manageOTM.id, contractorWorkDesc, s, e);

    setContractorStartDate('');
    setContractorEndDate('');
    setContractorWorkDesc('');

    setManageOTM(prev => prev ? {
      ...prev,
      status: 'awaiting_conformity',
      job_start_time: s,
      job_end_time: e,
      technician_notes: contractorWorkDesc
    } : null);
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
          <tr key={otm.id} id={`otm-row-${otm.id}`}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{otm.otm_code}</span>
                {isOTMUnread(otm) && <span className="pulsing-red-dot" title="Nuevas actualizaciones / comentarios sin leer" />}
              </div>
            </td>
            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {new Date(otm.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
            </td>
            <td style={{ fontSize: '0.85rem' }}>{otm.requester_name}</td>
            <td>
              <select className="form-select" style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: 155 }}
                value={otm.failure_type}
                onChange={e => updateOTMFields(otm.id, { failure_type: e.target.value })}>
                {FAILURE_TYPES.map(ft => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
            </td>
            <td>
              <select className="form-select" style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: 155, fontWeight: 600 }}
                value={otm.urgency}
                onChange={e => updateOTMFields(otm.id, { urgency: e.target.value as Urgency })}>
                {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} {k === 'high' ? '💥' : k === 'medium' ? '👷' : '🛠️'}
                  </option>
                ))}
              </select>
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

            <div className="slide-panel-content" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 60, overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
              
              {/* Fase 1: Información de la OTM */}
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FASE 1: DETALLES SOLICITUD</span>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-blue)' }}>{manageOTM.otm_code}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Área:</strong> {manageOTM.area_sector} | <strong>Solicitante:</strong> {manageOTM.requester_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  📍 <strong>Ubicación:</strong> {manageOTM.location || 'Sede Principal'} — {manageOTM.exact_location}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 10, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
                  <strong>Descripción:</strong> {manageOTM.description}
                </p>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={manageOTM.status} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Prioridad: {URGENCY_LABELS[manageOTM.urgency]}
                    <span style={{ fontSize: '1.2rem' }}>{urgencyIcons[manageOTM.urgency] || '🛠️'}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{manageOTM.failure_type}</span>
                </div>
                
                {/* Images */}
                {manageOTM.attachments && manageOTM.attachments.some(a => a.phase === 'request' || a.file_type === 'before_photo') && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {manageOTM.attachments.filter(a => a.phase === 'request' || a.file_type === 'before_photo').map(att => (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Adjunto" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Fase 2: Requerimientos (RQ) */}
              {(() => {
                const linkedRQ = getRQByOtmId(manageOTM.id);
                const hasRQ = linkedRQ || manageOTM.rq_type;
                
                return (
                  <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-purple)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>FASE 2: REQUERIMIENTOS (RQ)</div>
                    
                    {hasRQ ? (
                      <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>
                            📋 RQ {linkedRQ ? (linkedRQ.type === 'supply' ? 'SUMINISTRO' : 'SERVICIO') : (manageOTM.rq_type === 'supply' ? 'SUMINISTRO' : 'SERVICIO')}
                          </strong>
                          {linkedRQ && (
                            <span className="badge" style={{ 
                              fontSize: '0.7rem', 
                              padding: '2px 6px',
                              backgroundColor: linkedRQ.status === 'attended' ? 'rgba(16, 185, 129, 0.12)' : linkedRQ.status === 'rejected' ? 'rgba(244, 63, 94, 0.12)' : linkedRQ.status === 'in_logistics' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                              color: linkedRQ.status === 'attended' ? '#34d399' : linkedRQ.status === 'rejected' ? '#fb7185' : linkedRQ.status === 'in_logistics' ? '#a78bfa' : '#f59e0b',
                              border: `1px solid ${
                                linkedRQ.status === 'attended' ? 'rgba(52, 211, 153, 0.3)' : 
                                linkedRQ.status === 'rejected' ? 'rgba(251, 113, 133, 0.3)' : 
                                linkedRQ.status === 'in_logistics' ? 'rgba(167, 139, 250, 0.3)' : 
                                'rgba(245, 158, 11, 0.3)'
                              }`
                            }}>
                              {RQ_STATUS_LABELS[linkedRQ.status]}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {linkedRQ ? (
                            linkedRQ.type === 'supply' ? (
                              <ul style={{ margin: 0, paddingLeft: 14 }}>
                                {linkedRQ.materials?.map((m, i) => (
                                  <li key={i}>{m.name} — {m.quantity} {m.unit}</li>
                                ))}
                              </ul>
                            ) : (
                              <div>{linkedRQ.description}</div>
                            )
                          ) : (
                            manageOTM.rq_type === 'supply' ? (
                              <div>{manageOTM.rq_materials} — {manageOTM.rq_quantities}</div>
                            ) : (
                              <div>{manageOTM.rq_service_desc}</div>
                            )
                          )}

                        </div>
                        {onNavigate && linkedRQ && (
                          <button 
                            className="btn btn-secondary w-full" 
                            style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--accent-purple)', borderColor: 'rgba(124,58,237,0.2)' }}
                            onClick={() => {
                              setManageOTM(null);
                              localStorage.setItem('selected_rq_id_for_log', linkedRQ.id);
                              onNavigate('rq-log');
                            }}
                          >
                            🔗 Ir a Bitácora RQ
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {action !== 'rq' ? (
                          <button className="btn btn-secondary w-full" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', fontSize: '0.8rem' }} onClick={() => { setAction('rq'); setRQSub('supply'); }}>
                            + Registrar Requerimiento (RQ)
                          </button>
                        ) : (
                          <div className="slide-up" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                              <button className={`btn btn-sm ${rqSub === 'supply' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setRQSub('supply')}>Suministro</button>
                              <button className={`btn btn-sm ${rqSub === 'service' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setRQSub('service')}>Servicio</button>
                            </div>

                            {rqSub === 'supply' && (
                              <div className="flex-col gap-3">
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 6 }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Añadir Materiales:</div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Nombre del Material</label>
                                    <input className="form-input" style={{ fontSize: '0.75rem' }} value={currentMatName} onChange={e => setCurrentMatName(e.target.value)} placeholder="Ej: Tubería PVC 1/2" />
                                  </div>
                                  <div className="grid-2" style={{ marginTop: 6 }}>
                                    <div className="form-group">
                                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Unidad Medida</label>
                                      <select className="form-select" style={{ fontSize: '0.75rem', padding: '4px 6px' }} value={currentMatUnit} onChange={e => setCurrentMatUnit(e.target.value)}>
                                        <option value="Unidades">Unidades</option>
                                        <option value="Metros">Metros</option>
                                        <option value="Kilogramos">Kilogramos</option>
                                        <option value="Galones">Galones</option>
                                        <option value="Rollos">Rollos</option>
                                        <option value="Bolsas">Bolsas</option>
                                        <option value="Otros">Otros</option>
                                      </select>
                                    </div>
                                    <div className="form-group">
                                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Cantidad</label>
                                      <input className="form-input" style={{ fontSize: '0.75rem' }} type="number" min="1" value={currentMatQty} onChange={e => setCurrentMatQty(parseInt(e.target.value, 10) || 1)} />
                                    </div>
                                  </div>
                                  <button className="btn btn-secondary btn-sm w-full" style={{ marginTop: 8, fontSize: '0.75rem' }} onClick={() => {
                                    if (currentMatName.trim()) {
                                      setRqMaterialsList(prev => [...prev, { name: currentMatName.trim(), unit: currentMatUnit, quantity: currentMatQty }]);
                                      setCurrentMatName('');
                                      setCurrentMatQty(1);
                                    }
                                  }}>
                                    + Añadir a la lista
                                  </button>
                                </div>

                                {rqMaterialsList.length > 0 && (
                                  <div style={{ maxHeight: 120, overflowY: 'auto', background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
                                    {rqMaterialsList.map((m, idx) => (
                                      <div key={idx} className="flex justify-between items-center" style={{ fontSize: '0.75rem', borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
                                        <span>{m.name} ({m.quantity} {m.unit})</span>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-rose)', padding: '2px 4px', fontSize: '0.7rem' }} onClick={() => setRqMaterialsList(prev => prev.filter((_, i) => i !== idx))}>Quitar</button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Número de RQ (Opcional)</label>
                                  <input className="form-input" style={{ fontSize: '0.75rem' }} placeholder="Ej: RQ-10042" value={rqNumberInput} onChange={e => setRqNumberInput(e.target.value)} />
                                </div>

                                <div className="flex gap-2">
                                  <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Cancelar</button>
                                  <button className="btn btn-primary btn-sm" onClick={handleCreateRQGlobal} disabled={rqMaterialsList.length === 0}>✓ Registrar RQ</button>
                                </div>
                              </div>
                            )}

                            {rqSub === 'service' && (
                              <div className="flex-col gap-3">
                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Descripción del Servicio</label>
                                  <textarea className="form-textarea" style={{ fontSize: '0.75rem', minHeight: 60 }} placeholder="Escribe los detalles del servicio..." value={rqServiceDesc} onChange={e => setRQServiceDesc(e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Magnitud</label>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${rqMagnitude === 'puntual' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setRQMagnitude('puntual')}>Puntual</button>
                                    <button className={`btn btn-sm ${rqMagnitude === 'integral' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setRQMagnitude('integral')}>Integral</button>
                                  </div>
                                </div>

                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Número de RQ (Opcional)</label>
                                  <input className="form-input" style={{ fontSize: '0.75rem' }} placeholder="Ej: RQ-10042" value={rqNumberInput} onChange={e => setRqNumberInput(e.target.value)} />
                                </div>

                                <div className="flex gap-2">
                                  <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Cancelar</button>
                                  <button className="btn btn-primary btn-sm" onClick={handleCreateRQGlobal} disabled={!rqServiceDesc.trim()}>✓ Registrar RQ</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Fase 3: Asignación / Derivación */}
              <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-blue)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>
                  {manageOTM.status === 'derived' ? 'INFORMACIÓN DE DERIVACIÓN' : 'FASE 3: ASIGNACIÓN'}
                </div>
                
                {manageOTM.status === 'derived' ? (
                  <div style={{ background: 'rgba(249, 115, 22, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(249, 115, 22, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--accent-orange)' }}>
                        ➡️ DERIVADA A OTRA ÁREA
                      </strong>
                      <span className="badge" style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        backgroundColor: manageOTM.derived_status === 'accepted' ? 'rgba(16, 185, 129, 0.12)' : manageOTM.derived_status === 'rejected' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                        color: manageOTM.derived_status === 'accepted' ? '#34d399' : manageOTM.derived_status === 'rejected' ? '#fb7185' : '#f59e0b',
                        border: `1px solid ${
                          manageOTM.derived_status === 'accepted' ? 'rgba(52, 211, 153, 0.3)' : 
                          manageOTM.derived_status === 'rejected' ? 'rgba(251, 113, 133, 0.3)' : 
                          'rgba(245, 158, 11, 0.3)'
                        }`
                      }}>
                        {manageOTM.derived_status === 'accepted' ? 'Aceptada' : manageOTM.derived_status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><strong>Área de Destino:</strong> {manageOTM.derived_to_area}</div>
                      <div><strong>Jefatura responsable:</strong> {manageOTM.derived_to_jefatura_name || 'Sin especificar'}</div>
                      <div><strong>Fecha de derivación:</strong> {manageOTM.derived_at ? new Date(manageOTM.derived_at).toLocaleDateString('es') : '-'}</div>
                      <div style={{ marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        <strong>Nota de Mantenimiento:</strong><br />
                        {manageOTM.derived_notes}
                      </div>
                      {manageOTM.derived_response_notes && (
                        <div style={{ marginTop: 4, background: manageOTM.derived_status === 'accepted' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)', padding: 6, borderRadius: 4, border: `1px solid ${manageOTM.derived_status === 'accepted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}` }}>
                          <strong>Respuesta de Jefatura Destino:</strong><br />
                          {manageOTM.derived_response_notes}
                        </div>
                      )}
                    </div>
                  </div>
                ) : !manageOTM.assignment_type ? (
                  <div>
                    {action !== 'assign' && action !== 'derive' ? (
                      <div className="flex gap-2">
                        <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => { setAction('assign'); setAssignSub('own'); }}>
                          🔧 Asignar Trabajo
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }} onClick={() => { setAction('derive'); }}>
                          ➡️ Derivar Área
                        </button>
                      </div>
                    ) : action === 'derive' ? (
                      <div className="flex-col gap-3 slide-up" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-orange)' }}>Derivar a otra Área</h4>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Área de Destino *</label>
                          <select className="form-select" style={{ fontSize: '0.75rem' }} value={deriveArea} onChange={e => setDeriveArea(e.target.value)}>
                            <option value="">Seleccionar área...</option>
                            {AREAS.filter(a => a !== '22. MANTENIMIENTO').map(area => (
                              <option key={area} value={area}>{area}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Comentario de derivación *</label>
                          <textarea className="form-textarea" style={{ fontSize: '0.75rem', minHeight: 60 }} placeholder="Explique por qué se deriva a esta área..." value={deriveNotes} onChange={e => setDeriveNotes(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Volver</button>
                          <button className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }} onClick={handleDeriveSubmit} disabled={!deriveArea || !deriveNotes.trim()}>Derivar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="slide-up flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          <button className={`btn btn-sm ${assignSub === 'own' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setAssignSub('own')}>Personal Propio</button>
                          <button className={`btn btn-sm ${assignSub === 'contractor' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setAssignSub('contractor')}>Contratista</button>
                        </div>

                        {assignSub === 'own' && (
                          <div className="flex-col gap-3">
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Técnicos a Asignar</label>
                              <div className="flex gap-2">
                                <select className="form-select" style={{ flex: 1, fontSize: '0.75rem' }} value={assignTech} onChange={e => setAssignTech(e.target.value)}>
                                  <option value="">Seleccionar técnico...</option>
                                  {technicians.filter(t => !selectedTechs.includes(t.id)).map(t => (
                                    <option key={t.id} value={t.id}>{t.full_name} ({t.position})</option>
                                  ))}
                                </select>
                                <button className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }} onClick={() => {
                                  if (assignTech && !selectedTechs.includes(assignTech)) {
                                    setSelectedTechs(prev => [...prev, assignTech]);
                                    setAssignTech('');
                                  }
                                }} disabled={!assignTech}>
                                  +
                                </button>
                              </div>
                            </div>

                            {selectedTechs.length > 0 && (
                              <div style={{ background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
                                {selectedTechs.map(techId => {
                                  const tech = users.find(u => u.id === techId);
                                  return (
                                    <div key={techId} className="flex justify-between items-center" style={{ fontSize: '0.75rem', padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
                                      <span>{tech?.full_name}</span>
                                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-rose)', padding: '2px 4px', fontSize: '0.7rem' }} onClick={() => setSelectedTechs(prev => prev.filter(id => id !== techId))}>X</button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Fecha y Hora Programada</label>
                              <input className="form-input" type="datetime-local" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
                            </div>
                            
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Tiempo Estimado (minutos)</label>
                              <input className="form-input" type="number" min="1" placeholder="Ej: 60" value={assignEstimatedTime} onChange={e => setAssignEstimatedTime(e.target.value)} />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Instrucciones / Notas</label>
                              <textarea className="form-textarea" style={{ fontSize: '0.75rem' }} value={assignNotes} onChange={e => setAssignNotes(e.target.value)} />
                            </div>

                            <div className="flex gap-2">
                              <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Volver</button>
                              <button className="btn btn-primary btn-sm" onClick={handleAssignOwn} disabled={selectedTechs.length === 0 || !assignDate}>Asignar</button>
                            </div>
                          </div>
                        )}

                        {assignSub === 'contractor' && (
                          <div className="flex-col gap-3">
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Nombre Contratista *</label>
                              <input className="form-input" style={{ fontSize: '0.75rem' }} value={contractorName} onChange={e => setContractorName(e.target.value)} placeholder="Ej: Pinturas CRL SAC" />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Fecha de Ejecución *</label>
                              <input className="form-input" type="datetime-local" value={contractorDate} onChange={e => setContractorDate(e.target.value)} />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Detalle de Trabajo</label>
                              <textarea className="form-textarea" style={{ fontSize: '0.75rem' }} value={contractorDetail} onChange={e => setContractorDetail(e.target.value)} />
                            </div>

                            <div className="flex gap-2">
                              <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Volver</button>
                              <button className="btn btn-primary btn-sm" onClick={handleAssignContractor} disabled={!contractorName || !contractorDate}>Asignar Contratista</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'rgba(14, 165, 233, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                    {manageOTM.assignment_type === 'own' ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Tipo:</strong> Personal Propio<br />
                        <strong>Supervisor:</strong> {supervisors.find(s => s.id === manageOTM.supervisor_id)?.full_name || 'Sin Supervisor'}<br />
                        <strong>Técnico(s):</strong> {manageOTM.assigned_technicians && manageOTM.assigned_technicians.length > 0 
                          ? manageOTM.assigned_technicians.map(t => t.technician?.full_name).join(', ')
                          : (users.find(u => u.id === manageOTM.technician_id)?.full_name || 'No asignado')}<br />
                        {manageOTM.scheduled_date && <span>📅 <strong>Fecha Prog:</strong> {new Date(manageOTM.scheduled_date).toLocaleString('es')}</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Tipo:</strong> Contratista Tercero<br />
                        <strong>Contratista:</strong> {manageOTM.contractor_name}<br />
                        {manageOTM.contractor_date && <span>📅 <strong>Fecha Prog:</strong> {new Date(manageOTM.contractor_date).toLocaleString('es')}</span>}
                      </div>
                    )}
                    {manageOTM.status === 'scheduled' && (
                      <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 8, fontSize: '0.75rem' }} onClick={() => {
                        setAction('assign');
                        setAssignSub(manageOTM.assignment_type || 'own');
                      }}>
                        ✏️ Modificar Asignación
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Fase 4: Reprogramación */}
              {manageOTM.assignment_type === 'own' && (manageOTM.status === 'scheduled' || manageOTM.status === 'in_progress') && (
                <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-orange)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>FASE 4: REPROGRAMACIÓN</div>
                  
                  {!showRescheduleForm ? (
                    <button className="btn btn-secondary w-full" style={{ color: 'var(--accent-orange)', borderColor: 'var(--accent-orange)', fontSize: '0.8rem' }} onClick={() => {
                      setShowRescheduleForm(true);
                      setRescheduleTech(manageOTM.technician_id || '');
                      setRescheduleDate(manageOTM.scheduled_date ? new Date(manageOTM.scheduled_date).toISOString().slice(0, 16) : '');
                      setRescheduleReason('');
                    }}>
                      🔄 Reprogramar OTM
                    </button>
                  ) : (
                    <div className="slide-up flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Nuevo Técnico</label>
                        <select className="form-select" style={{ fontSize: '0.75rem' }} value={rescheduleTech} onChange={e => setRescheduleTech(e.target.value)}>
                          <option value="">Seleccionar técnico...</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Nueva Fecha y Hora</label>
                        <input className="form-input" type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Motivo de la Reprogramación *</label>
                        <textarea className="form-textarea" style={{ fontSize: '0.75rem' }} placeholder="Escribe el motivo..." value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} />
                      </div>

                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowRescheduleForm(false)}>Cancelar</button>
                        <button className="btn btn-primary btn-sm" onClick={handleReschedule} disabled={!rescheduleTech || !rescheduleDate || !rescheduleReason.trim()}>Confirmar</button>
                      </div>
                    </div>
                  )}

                  {manageOTM.reschedule_history && manageOTM.reschedule_history.length > 0 && (
                    <div style={{ marginTop: 10, padding: 8, background: '#fdf8f6', borderRadius: 6, border: '1px solid #ffedd5', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-orange)', marginBottom: 4 }}>Historial de Reprogramación:</div>
                      {manageOTM.reschedule_history.map((h, i) => (
                        <div key={h.id} style={{ borderBottom: '1px solid #ffedd5', paddingBottom: 4, marginBottom: 4 }}>
                          <strong>Original:</strong> {new Date(h.scheduled_date).toLocaleString('es')} - {h.technician_name}<br />
                          <strong>Motivo:</strong> {h.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fase 5: Ejecución Técnica */}
              {manageOTM.assignment_type && (
                <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-emerald)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>FASE 5: EJECUCIÓN TÉCNICA</div>
                  
                  {manageOTM.assignment_type === 'own' ? (
                    <div>
                      {(manageOTM.status === 'awaiting_supervisor' || manageOTM.status === 'awaiting_conformity' || manageOTM.status === 'closed') && manageOTM.technician_notes ? (
                        <div className="flex-col gap-3">
                          {manageOTM.status === 'awaiting_supervisor' ? (
                            <div className="flex-col gap-3">
                              <div className="grid-2">
                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Inicio Trabajo</label>
                                  <input className="form-input" type="datetime-local" style={{ fontSize: '0.75rem' }} value={editTechStart} onChange={e => setEditTechStart(e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Fin Trabajo</label>
                                  <input className="form-input" type="datetime-local" style={{ fontSize: '0.75rem' }} value={editTechEnd} onChange={e => setEditTechEnd(e.target.value)} />
                                </div>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem' }}>Comentario del Técnico (Editable)</label>
                                <textarea className="form-textarea" style={{ fontSize: '0.75rem', minHeight: 60 }} value={editTechNotes} onChange={e => setEditTechNotes(e.target.value)} />
                              </div>

                              <button className="btn btn-primary w-full" style={{ fontSize: '0.8rem' }} onClick={handleApprove}>
                                ✓ Dar Visto Bueno (Aprobar)
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <strong>Comentarios Técnico:</strong> {manageOTM.technician_notes}<br />
                              {manageOTM.job_start_time && <div>🕒 <strong>Ejecución:</strong> {new Date(manageOTM.job_start_time).toLocaleString('es')} - {new Date(manageOTM.job_end_time || '').toLocaleString('es')}</div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        showManualForm ? (
                          <ManualExecutionForm 
                            otm={manageOTM}
                            role="supervisor"
                            onSubmit={async (data) => {
                              await registerManualExecution(manageOTM.id, data);
                              setShowManualForm(false);
                              setManageOTM(null); // or refresh data
                            }}
                            onCancel={() => setShowManualForm(false)}
                          />
                        ) : (
                          <div className="flex-col gap-3">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Esperando que el técnico inicie o finalice las labores.
                            </div>
                            <button className="btn btn-secondary w-full" onClick={() => setShowManualForm(true)}>
                              ✏️ Completar Datos (Regularizar)
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div>
                      {manageOTM.status === 'scheduled' || manageOTM.status === 'in_progress' ? (
                        <div className="flex-col gap-3">
                          <div className="grid-2">
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Fecha Inicio Real</label>
                              <input className="form-input" type="datetime-local" style={{ fontSize: '0.75rem' }} value={contractorStartDate} onChange={e => setContractorStartDate(e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Fecha Fin Real</label>
                              <input className="form-input" type="datetime-local" style={{ fontSize: '0.75rem' }} value={contractorEndDate} onChange={e => setContractorEndDate(e.target.value)} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Descripción de Trabajos Realizados</label>
                            <textarea className="form-textarea" style={{ fontSize: '0.75rem', minHeight: 60 }} value={contractorWorkDesc} onChange={e => setContractorWorkDesc(e.target.value)} placeholder="Informe de los trabajos..." />
                          </div>

                          <button className="btn btn-primary w-full" style={{ fontSize: '0.8rem' }} onClick={handleContractorClose} disabled={!contractorStartDate || !contractorEndDate || !contractorWorkDesc.trim()}>
                            ✓ Registrar y Aprobar Ejecución
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Informe Contratista:</strong> {manageOTM.technician_notes}<br />
                          {manageOTM.job_start_time && <div>🕒 <strong>Ejecución:</strong> {new Date(manageOTM.job_start_time).toLocaleString('es')} - {new Date(manageOTM.job_end_time || '').toLocaleString('es')}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fase 6: Conformidad */}
              {(manageOTM.status === 'closed' || manageOTM.status === 'awaiting_conformity') && (
                <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-gold)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>FASE 6: CONFORMIDAD</div>
                  
                  {manageOTM.status === 'closed' ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Calificación:</strong> {'⭐'.repeat(manageOTM.conformity_rating || 0)}{'☆'.repeat(5 - (manageOTM.conformity_rating || 0))}<br />
                      <strong>Fecha:</strong> {manageOTM.conformity_date && new Date(manageOTM.conformity_date).toLocaleString()}<br />
                      {manageOTM.conformity_notes && <div><strong>Comentarios:</strong> "{manageOTM.conformity_notes}"</div>}
                      {manageOTM.conformity_signature_url && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 4, borderRadius: 4, display: 'inline-block' }}>
                            <img src={manageOTM.conformity_signature_url} style={{ maxHeight: 50 }} alt="Firma" />
                          </div>
                        </div>
                      )}
                      <button className="btn btn-primary w-full" style={{ marginTop: 12, fontSize: '0.8rem' }} onClick={() => setActaOTM(manageOTM)}>
                        📄 Generar Acta de Conformidad
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      Trabajo aprobado. Esperando conformidad y firma del solicitante.
                    </div>
                  )}
                </div>
              )}

              {/* Historial del Proceso / Auditoría */}
              {(manageOTM.status === 'closed' || manageOTM.status === 'awaiting_conformity' || manageOTM.status === 'awaiting_supervisor' || manageOTM.status === 'in_progress' || manageOTM.status === 'rq' || manageOTM.status === 'derived') && (
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.01)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                    ⏳ Historial del Proceso
                  </div>
                  
                  <div className="timeline">
                    {statusLogs
                      .filter(l => l.otm_id === manageOTM.id)
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((log, index, arr) => {
                        const changerName = log.changed_by_profile?.full_name || users.find(u => u.id === log.changed_by)?.full_name || 'Sistema';
                        const isLast = index === arr.length - 1;
                        
                        return (
                          <div key={log.id} className="timeline-item" style={{ paddingBottom: isLast ? 0 : 20 }}>
                            <div className={`timeline-dot ${isLast ? 'active' : 'completed'}`} />
                            <div className="timeline-time">
                              {new Date(log.created_at).toLocaleString('es')} — <strong style={{ color: 'var(--text-secondary)' }}>{changerName}</strong>
                            </div>
                            <div className="timeline-label" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                              {log.previous_status ? `${STATUS_LABELS[log.previous_status as OTMStatus] || log.previous_status} ➔ ` : ''}
                              <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                                {STATUS_LABELS[log.new_status as OTMStatus] || log.new_status}
                              </span>
                            </div>
                            {log.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                                Nota: {log.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Sección de Comentarios / Aclaraciones */}
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  💬 Mensajes y Aclaraciones
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                  {(!manageOTM.comments || manageOTM.comments.length === 0) ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                      No hay mensajes en esta solicitud.
                    </div>
                  ) : (
                    manageOTM.comments.map(c => {
                      const isMe = c.user_id === user?.id;
                      return (
                        <div key={c.id} style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isMe ? 'rgba(14, 165, 233, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isMe ? 'rgba(14, 165, 233, 0.2)' : 'var(--border)'}`,
                          padding: '8px 10px',
                          borderRadius: '12px',
                          borderTopRightRadius: isMe ? '2px' : '12px',
                          borderTopLeftRadius: isMe ? '12px' : '2px',
                          fontSize: '0.75rem',
                          marginLeft: isMe ? 'auto' : '0',
                          marginRight: isMe ? '0' : 'auto'
                        }}>
                          <div style={{ fontWeight: 700, color: isMe ? 'var(--accent-blue)' : 'var(--text-primary)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                            <span>{c.user_name}</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 400 }}>({c.user_role === 'admin' ? 'Admin' : c.user_role === 'supervisor' ? 'Superv.' : c.user_role === 'jefatura' ? 'Jefe' : 'Solict.'})</span>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{c.text}</p>
                          <div style={{ textAlign: 'right', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(c.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '32px', flex: 1 }}
                    placeholder="Escribe un mensaje o consulta..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCommentText.trim()) {
                        handleAddCommentSubmit();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem' }}
                    onClick={handleAddCommentSubmit}
                    disabled={!newCommentText.trim()}
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {/* Sub-panel cancel action */}
              {action === 'cancel' && (
                <div className="slide-up" style={{ padding: 12, background: 'rgba(225,29,72,0.02)', borderRadius: 8, border: '1px solid rgba(225,29,72,0.1)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--accent-rose)' }}>Cancelar Solicitud</h4>
                  <div className="flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Motivo de cancelación *</label>
                      <select className="form-select" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                        <option value="">Seleccionar motivo...</option>
                        {Object.entries(CANCELLATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    {cancelReason === 'other' && (
                      <div className="form-group slide-up">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Especifique el motivo *</label>
                        <textarea className="form-textarea" style={{ fontSize: '0.75rem' }} placeholder="Escriba el motivo..." value={cancelDetail} onChange={e => setCancelDetail(e.target.value)} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setAction('none')}>Volver</button>
                      <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={!cancelReason || (cancelReason === 'other' && !cancelDetail)}>✓ Confirmar Cancelación</button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Floating Cancel Button (Bottom Right) */}
            {manageOTM.status !== 'cancelled' && manageOTM.status !== 'closed' && manageOTM.status !== 'awaiting_conformity' && action !== 'cancel' && (
              <div style={{ position: 'sticky', bottom: -28, left: 0, right: 0, background: 'linear-gradient(transparent, var(--bg-card) 20%)', padding: '40px 0 20px', marginTop: 10, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                <button className="btn btn-danger" 
                  style={{ pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)', padding: '10px 20px', fontSize: '0.8rem' }} 
                  onClick={() => setAction('cancel')}>
                  ❌ CANCELAR SOLICITUD
                </button>
              </div>
            )}

          </div>
        </>
      )}

      {actaOTM && (
        <ConformityActa 
          otm={actaOTM} 
          onClose={() => {
            setActaOTM(null);
            setManageOTM(null);
          }} 
        />
      )}
    </div>
  );
}
