// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, URGENCY_LABELS, OTMStatus, LOCATIONS, RQ_STATUS_LABELS } from '../../types';
import ConformityModal from '../../components/ConformityModal';
import { useRQ } from '../../context/RQContext';

export default function MyDashboard() {
  const { user } = useAuth();
  const { getOTMsForCurrentUser, users: allUsers, respondToDerivation, addOTMComment, isOTMUnread, markAsRead } = useOTM();
  const { getRQByOtmId } = useRQ();
  const [selectedOTM, setSelectedOTM] = useState<OTMRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<OTMStatus | ''>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'area'>(user?.role === 'jefatura' ? 'area' : 'mine');
  const [dateRange, setDateRange] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showConformity, setShowConformity] = useState<OTMRequest | null>(null);

  // Derivaciones y Comentarios
  const [activeTab, setActiveTab] = useState<'my_area' | 'derived'>('my_area');
  const [deriveResponseAction, setDeriveResponseAction] = useState<'none' | 'accept' | 'reject'>('none');
  const [deriveResponseNotes, setDeriveResponseNotes] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Listen for Toast click focusing on specific OTM
  React.useEffect(() => {
    const handleFocusOtm = (e: CustomEvent<{ otmId: string }>) => {
      const otmsList = getOTMsForCurrentUser();
      const targetOtm = otmsList.find(o => o.id === e.detail.otmId);
      if (targetOtm) {
        const isDerived = targetOtm.status === 'derived' && targetOtm.derived_to_area === user?.area_sector;
        if (isDerived) {
          setActiveTab('derived');
        } else {
          setActiveTab('my_area');
        }
        setSelectedOTM(targetOtm);
        markAsRead(targetOtm.id);
        
        setTimeout(() => {
          const el = document.getElementById(`otm-card-${targetOtm.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    window.addEventListener('focus_otm_changed' as any, handleFocusOtm as any);
    return () => {
      window.removeEventListener('focus_otm_changed' as any, handleFocusOtm as any);
    };
  }, [user, markAsRead, getOTMsForCurrentUser]);

  const handleRespondToDerivation = async (otmId: string) => {
    if (deriveResponseAction === 'none') return;
    const status = deriveResponseAction === 'accept' ? 'accepted' : 'rejected';
    await respondToDerivation(otmId, status, deriveResponseNotes.trim());
    
    setSelectedOTM(prev => prev ? {
      ...prev,
      derived_status: status,
      derived_response_notes: deriveResponseNotes.trim(),
      derived_response_at: new Date().toISOString(),
      status: status === 'rejected' ? 'pending' : 'derived'
    } : null);

    setDeriveResponseAction('none');
    setDeriveResponseNotes('');
  };

  const handleAddComment = async (otmId: string) => {
    if (!newCommentText.trim()) return;
    await addOTMComment(otmId, newCommentText.trim());

    setSelectedOTM(prev => prev ? {
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

  const otms = getOTMsForCurrentUser();
  
  // Filtering logic
  const dateLimit = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    if (dateRange === 'week') d.setDate(d.getDate() - 7);
    else if (dateRange === 'month') d.setMonth(d.getMonth() - 1);
    else if (dateRange === '3months') d.setMonth(d.getMonth() - 3);
    else if (dateRange === '6months') d.setMonth(d.getMonth() - 6);
    else if (dateRange === 'year') d.setFullYear(d.getFullYear() - 1);
    else return new Date(0);
    return d;
  }, [dateRange]);

  const filtered = useMemo(() => {
    return otms.filter(o => {
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchScope = scopeFilter === 'area' ? true : o.requester_id === user?.id;
      const matchUser = !selectedUser || o.requester_id === selectedUser;
      const matchLocation = !locationFilter || o.location === locationFilter;
      const matchDate = new Date(o.created_at) >= dateLimit;
      return matchStatus && matchScope && matchUser && matchLocation && matchDate;
    });
  }, [otms, statusFilter, scopeFilter, selectedUser, locationFilter, dateLimit, user]);

  const activeLocations = useMemo(() => {
    const currentOtmLocations = new Set(otms.map(o => o.location).filter(Boolean) as string[]);
    const orderedList = LOCATIONS.filter(loc => currentOtmLocations.has(loc));
    const extraList = Array.from(currentOtmLocations).filter(loc => !LOCATIONS.includes(loc));
    return [...orderedList, ...extraList];
  }, [otms]);

  const areaPeople = useMemo(() => {
    return allUsers.filter(u => u.area_sector === user?.area_sector && u.role === 'requester');
  }, [allUsers, user]);

  const counts = {
    total: filtered.length,
    pending: filtered.filter(o => o.status === 'pending').length,
    active: filtered.filter(o => ['scheduled', 'in_progress', 'rq', 'awaiting_supervisor'].includes(o.status)).length,
    rq: filtered.filter(o => o.status === 'rq').length,
    awaiting: filtered.filter(o => o.status === 'awaiting_conformity').length,
    closed: filtered.filter(o => o.status === 'closed').length,
  };

  const showDerivedTab = user?.role === 'jefatura' && user?.area_sector !== '22. MANTENIMIENTO';
  const derivedOTMs = useMemo(() => {
    return otms.filter(o => o.status === 'derived' && o.derived_to_area === user?.area_sector);
  }, [otms, user]);

  const listOTMs = showDerivedTab && activeTab === 'derived' ? derivedOTMs : filtered;

  // Chart Data preparation
  const priorityData = useMemo(() => {
    const high = filtered.filter(o => o.urgency === 'high').length;
    const medium = filtered.filter(o => o.urgency === 'medium').length;
    const low = filtered.filter(o => o.urgency === 'low').length;
    return { high, medium, low, total: high + medium + low };
  }, [filtered]);

  const specialtyData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(o => {
      map[o.failure_type] = (map[o.failure_type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const vibrant = {
    blue: '#0ea5e9',   // Sky 500
    coral: '#f43f5e',  // Coral/Rose 500
    orange: '#f97316', // Orange 500
    green: '#10b981',  // Emerald 500
    yellow: '#eab308', // Yellow 500
    purple: '#a855f7', // Purple 500
  };

  const doughnutCircumference = 251.2;
  
  const priorityItems = useMemo(() => {
    const items = [
      { key: 'high', label: 'Alta', count: priorityData.high, color: vibrant.coral },
      { key: 'medium', label: 'Media', count: priorityData.medium, color: vibrant.orange },
      { key: 'low', label: 'Baja', count: priorityData.low, color: vibrant.green },
    ];
    let accumulatedCircumference = 0;
    return items.map(item => {
      const percent = priorityData.total > 0 ? item.count / priorityData.total : 0;
      const strokeLength = percent * doughnutCircumference;
      const currentOffset = -accumulatedCircumference;
      accumulatedCircumference += strokeLength;
      return {
        ...item,
        percent: Math.round(percent * 100),
        strokeDasharray: `${strokeLength} ${doughnutCircumference}`,
        strokeDashoffset: currentOffset,
      };
    });
  }, [priorityData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{user?.role === 'jefatura' ? 'Dashboard de Jefatura' : 'Mis Solicitudes'}</h1>
        <p className="page-subtitle">📍 Área: {user?.area_sector} — {user?.role === 'jefatura' ? 'Supervisión de carga de trabajo del área' : 'Seguimiento de tus solicitudes'}</p>
      </div>

      <div className="kpi-mobile-small" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: counts.total, color: vibrant.blue, icon: '📊' },
          { label: 'Pendientes', value: counts.pending, color: vibrant.yellow, icon: '⏳' },
          { label: 'En Curso', value: counts.active, color: vibrant.purple, icon: '⚙️' },
          { label: 'Con requerimiento', value: counts.rq, color: vibrant.orange, icon: '📦' },
          { label: 'Para conformidad', value: counts.awaiting, color: vibrant.green, icon: '✅' },
          ...(showDerivedTab ? [{ label: 'Derivadas a mi Área', value: derivedOTMs.length, color: '#f97316', icon: '📥', onClick: () => { setActiveTab('derived'); setSelectedOTM(null); } }] : [])
        ].map((c, i) => (
          <div 
            key={i} 
            className="kpi-card" 
            onClick={c.onClick}
            style={{
              '--kpi-color': c.color,
              boxShadow: `0 8px 24px ${c.color}18`,
              border: `1px solid ${c.color}22`,
              cursor: c.onClick ? 'pointer' : 'default',
              transition: c.onClick ? 'transform 0.2s ease, box-shadow 0.2s ease' : 'none'
            } as any}
            onMouseOver={c.onClick ? (e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${c.color}30`; }) : undefined}
            onMouseOut={c.onClick ? (e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c.color}18`; }) : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div className="kpi-label">{c.label}</div>
                <div className="kpi-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{c.value}</div>
              </div>
              <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid" style={{ marginBottom: 28 }}>
        <div className="responsive-chart-container dashboard-charts-col">
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Distribución por Prioridad</h3>
            <div className="flex items-center justify-around py-4 flex-wrap gap-4">
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <svg viewBox="0 0 100 100" className="animated-doughnut" style={{ width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                  {priorityItems.map(item => (
                    item.count > 0 && (
                      <circle
                        key={item.key}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="11"
                        strokeDasharray={item.strokeDasharray}
                        strokeDashoffset={item.strokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                    )
                  ))}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>
                    {priorityData.total}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    OTMs
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: '110px' }}>
                {priorityItems.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', boxShadow: `0 2px 6px ${item.color}44` }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                        {item.count} ({item.percent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Top Especialidades</h3>
            <div className="flex-col gap-3">
              {specialtyData.slice(0, 5).map(([name, count], i) => {
                const colors = [vibrant.blue, vibrant.green, vibrant.orange, vibrant.purple, vibrant.coral];
                const color = colors[i % colors.length];
                const maxCount = Math.max(...specialtyData.map(s => s[1]), 1);
                return (
                  <div key={name}>
                    <div className="flex justify-between" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#475569' }}>{name}</span>
                      <span style={{ fontWeight: 800, color: '#1e293b' }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        width: `${(count / maxCount) * 100}%`,
                        borderRadius: 4,
                        transition: 'width 0.6s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dashboard-list-col">
          <div className="glass-card" style={{ marginBottom: 20, padding: 16 }}>
            <div className="flex flex-wrap gap-4 items-center">
              {user?.role === 'jefatura' && (
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Visualizar</label>
                  <select className="form-select" value={scopeFilter} onChange={e => setScopeFilter(e.target.value as any)}>
                    <option value="mine">Mis Solicitudes</option>
                    <option value="area">Toda el Área</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Área (Filtro)</label>
                <select className="form-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                  <option value="">Todas las áreas</option>
                  {activeLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              {user?.role === 'jefatura' && (
                <div className="form-group" style={{ minWidth: 180 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Personal del Área</label>
                  <select className="form-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                    <option value="">Todo el personal</option>
                    {areaPeople.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Estado</label>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="rq">Con requerimiento</option>
                  <option value="scheduled">Programado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="awaiting_supervisor">Finalizado - Visto Bueno</option>
                  <option value="awaiting_conformity">Para conformidad</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>

              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Periodo</label>
                <select className="form-select" value={dateRange} onChange={e => setDateRange(e.target.value as any)}>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="3months">Últimos 3 meses</option>
                  <option value="6months">Últimos 6 meses</option>
                  <option value="year">Este año</option>
                </select>
              </div>
            </div>
          </div>

          {showDerivedTab && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <button
                className={`btn btn-sm ${activeTab === 'my_area' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setActiveTab('my_area'); setSelectedOTM(null); }}
              >
                 Solicitudes de mi Área ({filtered.length})
                 {filtered.some(o => isOTMUnread(o)) && <span className="pulsing-red-dot" />}
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'derived' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', borderRadius: 20, borderColor: activeTab === 'derived' ? 'var(--accent-orange)' : 'transparent', color: activeTab === 'derived' ? 'var(--accent-orange)' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setActiveTab('derived'); setSelectedOTM(null); }}
              >
                ➡️ Derivadas a mi Área ({derivedOTMs.length})
                {derivedOTMs.some(o => isOTMUnread(o)) && <span className="pulsing-red-dot" />}
              </button>
            </div>
          )}

          {listOTMs.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No hay solicitudes</div>
              <div className="empty-state-text">Ajusta los filtros para ver más resultados</div>
            </div>
          ) : (
            <div className="flex-col gap-3 scrollable-list-container" style={{ padding: '4px 10px', maxHeight: 'calc(100vh - 400px)', minHeight: 400 }}>
              {listOTMs.map(otm => {
                const urgencyColors = { high: '#f43f5e', medium: '#f97316', low: '#10b981' };
                const urgencyColor = urgencyColors[otm.urgency] || '#cbd5e1';
                return (
                  <div 
                    key={otm.id} 
                    id={`otm-card-${otm.id}`}
                    className="glass-card dashboard-list-card" 
                    style={{
                      cursor: 'pointer',
                      padding: '20px 20px 20px 24px',
                      marginBottom: 12,
                      borderLeft: `4px solid ${urgencyColor}`,
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      position: 'relative'
                    }}
                    onClick={() => {
                      const isClosing = selectedOTM?.id === otm.id;
                      setSelectedOTM(isClosing ? null : otm);
                      if (!isClosing) {
                        markAsRead(otm.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{otm.otm_code}</span>
                        {isOTMUnread(otm) && <span className="pulsing-red-dot" />}
                        <StatusBadge status={otm.status} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {otm.failure_type} | {new Date(otm.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(otm.created_at).toLocaleDateString('es')}</div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedOTM?.id === otm.id && (
                    <div className="slide-up" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                      
                      {/* 2. Ubicación */}
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📍</span>
                        <span>{otm.location || 'Sede Principal'} — {otm.exact_location || 'Ubicación exacta no especificada'}</span>
                      </div>

                      {/* 3. Área / Solicitante */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        <strong>Área:</strong> {otm.area_sector} &nbsp;/&nbsp; <strong>Solicitante:</strong> {otm.requester_name}
                      </div>

                      {/* 4. Descripción */}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                        <strong>Descripción:</strong> {otm.description}
                      </div>

                      {/* 5. Especialidad / Prioridad */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 12 }}>
                        <span><strong>Especialidad:</strong> {otm.failure_type}</span>
                        <span>•</span>
                        <span><strong>Prioridad:</strong> <span style={{ color: otm.urgency === 'high' ? 'var(--accent-rose)' : otm.urgency === 'medium' ? 'var(--accent-gold)' : 'var(--accent-emerald)', fontWeight: 700 }}>{URGENCY_LABELS[otm.urgency]}</span></span>
                      </div>

                      {/* 6. Imágenes Adjuntas */}
                      {otm.attachments && otm.attachments.some(att => att.phase === 'request' || att.file_type === 'before_photo') && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Imágenes de la Solicitud</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {otm.attachments.filter(att => att.phase === 'request' || att.file_type === 'before_photo').map(att => (
                              <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                                <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Adjunto solicitud" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. Sección RQ (Requerimientos) */}
                      {(() => {
                        const linkedRQ = getRQByOtmId(otm.id);
                        const hasRQ = linkedRQ || otm.rq_type;
                        if (!hasRQ) return null;

                        const rqType = linkedRQ ? linkedRQ.type : otm.rq_type;
                        const rqStatus = linkedRQ ? linkedRQ.status : 'in_approval';
                        const rqStatusLabel = linkedRQ ? RQ_STATUS_LABELS[linkedRQ.status] : 'En Aprobación';
                        const rqNumber = linkedRQ ? linkedRQ.rq_number : null;
                        const sapNumber = linkedRQ ? linkedRQ.sap_number : null;
                        const dateString = linkedRQ ? new Date(linkedRQ.created_at).toLocaleDateString('es') : (otm.rq_date ? new Date(otm.rq_date).toLocaleDateString('es') : null);

                        return (
                          <div style={{ marginTop: 12, marginBottom: 16, padding: 12, background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.15)', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                📋 RQ {rqType === 'supply' ? 'SUMINISTRO' : 'SERVICIO'}
                              </span>
                              <span className={`badge`} style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 700, 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                backgroundColor: rqStatus === 'attended' ? 'rgba(16, 185, 129, 0.12)' : rqStatus === 'rejected' ? 'rgba(244, 63, 94, 0.12)' : rqStatus === 'in_logistics' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                                color: rqStatus === 'attended' ? '#34d399' : rqStatus === 'rejected' ? '#fb7185' : rqStatus === 'in_logistics' ? '#a78bfa' : '#f59e0b',
                                border: `1px solid ${
                                  rqStatus === 'attended' ? 'rgba(52, 211, 153, 0.3)' : 
                                  rqStatus === 'rejected' ? 'rgba(251, 113, 133, 0.3)' : 
                                  rqStatus === 'in_logistics' ? 'rgba(167, 139, 250, 0.3)' : 
                                  'rgba(245, 158, 11, 0.3)'
                                }`
                              }}>
                                {rqStatusLabel}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {rqNumber && <div><strong>N° RQ:</strong> {rqNumber}</div>}
                              {sapNumber && <div><strong>N° SAP / Solped:</strong> {sapNumber}</div>}
                              {dateString && <div><strong>Fecha Solicitud:</strong> {dateString}</div>}
                              
                              {rqType === 'supply' ? (
                                <div style={{ marginTop: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Materiales Solicitados:</div>
                                  {linkedRQ?.materials && linkedRQ.materials.length > 0 ? (
                                    <ul style={{ paddingLeft: 16, margin: 0, listStyleType: 'disc' }}>
                                      {linkedRQ.materials.map((m, idx) => (
                                        <li key={idx} style={{ fontSize: '0.75rem' }}>
                                          {m.name} — {m.quantity} {m.unit}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div style={{ fontSize: '0.75rem' }}>{otm.rq_materials || 'No especificados'} — {otm.rq_quantities || ''}</div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ marginTop: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Detalle del Servicio:</div>
                                  <div style={{ fontSize: '0.75rem' }}>{linkedRQ ? linkedRQ.description : (otm.rq_service_desc || 'No especificado')}</div>
                                  {otm.rq_magnitude && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Magnitud: {otm.rq_magnitude === 'puntual' ? 'Puntual' : 'Integral'}</div>}
                                </div>
                              )}
                              
                              {linkedRQ?.observations && linkedRQ.observations.length > 0 && (
                                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Obs: {linkedRQ.observations[linkedRQ.observations.length - 1].text}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 7.5. Sección Derivación (Para solicitante/visualización) */}
                      {otm.status === 'derived' && (
                        <div style={{ marginTop: 12, marginBottom: 16, padding: 12, background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ➡️ DERIVADO A OTRA ÁREA
                            </span>
                            <span className="badge" style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              backgroundColor: otm.derived_status === 'accepted' ? 'rgba(16, 185, 129, 0.12)' : otm.derived_status === 'rejected' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                              color: otm.derived_status === 'accepted' ? '#34d399' : otm.derived_status === 'rejected' ? '#fb7185' : '#f59e0b',
                              border: `1px solid ${
                                otm.derived_status === 'accepted' ? 'rgba(52, 211, 153, 0.3)' : 
                                otm.derived_status === 'rejected' ? 'rgba(251, 113, 133, 0.3)' : 
                                'rgba(245, 158, 11, 0.3)'
                              }`
                            }}>
                              {otm.derived_status === 'accepted' ? 'Aceptado' : otm.derived_status === 'rejected' ? 'Rechazado' : 'Pendiente revisión'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div><strong>Área Competente:</strong> {otm.derived_to_area}</div>
                            <div><strong>Jefatura encargada:</strong> {otm.derived_to_jefatura_name}</div>
                            {otm.derived_notes && (
                              <div style={{ marginTop: 4, padding: 6, background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                                <strong>Nota de Derivación:</strong> {otm.derived_notes}
                              </div>
                            )}
                            {otm.derived_response_notes && (
                              <div style={{ marginTop: 4, padding: 6, background: otm.derived_status === 'accepted' ? 'rgba(16,185,129,0.02)' : 'rgba(225,29,72,0.02)', borderRadius: 4, border: `1px solid ${otm.derived_status === 'accepted' ? 'rgba(16,185,129,0.1)' : 'rgba(225,29,72,0.1)'}`, fontSize: '0.75rem' }}>
                                <strong>Respuesta de Jefatura:</strong> {otm.derived_response_notes}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Acciones de Derivación para Jefatura Externa */}
                      {otm.status === 'derived' && otm.derived_to_area === user?.area_sector && otm.derived_status === 'pending' && (
                        <div style={{ marginTop: 12, marginBottom: 16, padding: 12, background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-orange)', marginBottom: 8 }}>
                            Acciones de Derivación:
                          </div>
                          {deriveResponseAction === 'none' ? (
                            <div className="flex gap-2">
                              <button className="btn btn-sm btn-primary" style={{ backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)', fontSize: '0.75rem', flex: 1 }} onClick={() => setDeriveResponseAction('accept')}>
                                ✓ Aceptar Solicitud
                              </button>
                              <button className="btn btn-sm btn-danger" style={{ fontSize: '0.75rem', flex: 1 }} onClick={() => setDeriveResponseAction('reject')}>
                                ✗ Rechazar Solicitud
                              </button>
                            </div>
                          ) : (
                            <div className="flex-col gap-2 slide-up">
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>
                                {deriveResponseAction === 'accept' ? 'Nota de aceptación (opcional):' : 'Nota de descargo / motivo de rechazo *:'}
                              </label>
                              <textarea
                                className="form-textarea"
                                style={{ fontSize: '0.75rem', minHeight: 50 }}
                                placeholder="Escribe un comentario..."
                                value={deriveResponseNotes}
                                onChange={e => setDeriveResponseNotes(e.target.value)}
                              />
                              <div className="flex gap-2 justify-end" style={{ marginTop: 4 }}>
                                <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => { setDeriveResponseAction('none'); setDeriveResponseNotes(''); }}>
                                  Cancelar
                                </button>
                                <button
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: '0.75rem', backgroundColor: deriveResponseAction === 'accept' ? 'var(--accent-emerald)' : 'var(--accent-rose)', borderColor: deriveResponseAction === 'accept' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}
                                  onClick={() => handleRespondToDerivation(otm.id)}
                                  disabled={deriveResponseAction === 'reject' && !deriveResponseNotes.trim()}
                                >
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 8. Sección Asignado */}
                      {(() => {
                        const hasRescheduled = otm.reschedule_history && otm.reschedule_history.length > 0;
                        const originalDate = hasRescheduled ? otm.reschedule_history[0].scheduled_date : otm.scheduled_date;
                        const originalTechName = hasRescheduled 
                          ? otm.reschedule_history[0].technician_name 
                          : (allUsers.find(u => u.id === otm.technician_id)?.full_name || 'Pendiente');

                        const supervisorName = allUsers.find(u => u.id === otm.supervisor_id)?.full_name || 'Pendiente';

                        if (otm.assignment_type === 'contractor') {
                          return (
                            <div style={{ marginTop: 8, marginBottom: 12, padding: 12, background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.15)', borderRadius: 8 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                🏗️ Asignado a Contratista (Tercero)
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <strong>Contratista:</strong> {otm.contractor_name || 'No especificado'}<br />
                                <strong>Supervisor:</strong> {supervisorName}<br />
                                {otm.contractor_date && <span>📅 <strong>Fecha Programada:</strong> {new Date(otm.contractor_date).toLocaleDateString('es')}</span>}
                                {otm.contractor_detail && <p style={{ fontSize: '0.75rem', marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 4 }}><strong>Detalles:</strong> {otm.contractor_detail}</p>}
                              </div>
                            </div>
                          );
                        }

                        if (otm.scheduled_date || hasRescheduled) {
                          return (
                            <div style={{ marginTop: 8, marginBottom: 12, padding: 12, background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.15)', borderRadius: 8 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                🔧 Asignación Original
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <strong>Supervisor:</strong> {supervisorName}<br />
                                <strong>Técnico:</strong> {originalTechName}<br />
                                {originalDate && <span>📅 <strong>Fecha Programada:</strong> {new Date(originalDate).toLocaleString('es')}</span>}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* 9. Sección Reprogramación */}
                      {otm.reschedule_history && otm.reschedule_history.length > 0 && (
                        <div style={{ marginTop: 8, marginBottom: 12, padding: 12, background: 'rgba(249, 115, 22, 0.05)', border: '1px dashed rgba(249, 115, 22, 0.3)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            🔄 Solicitud Reprogramada
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <strong>Técnico Actual:</strong> {allUsers.find(u => u.id === otm.technician_id)?.full_name || 'Pendiente'}<br />
                            <strong>Nueva Fecha:</strong> {otm.scheduled_date ? new Date(otm.scheduled_date).toLocaleString('es') : 'Pendiente'}<br />
                            <div style={{ marginTop: 4, fontSize: '0.75rem', padding: 6, background: '#fdf8f6', borderRadius: 4, color: '#7c2d12' }}>
                              <strong>Motivo de Reprogramación:</strong> {otm.reschedule_history[otm.reschedule_history.length - 1].reason}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 10. Notas del Técnico / Supervisor */}
                      {otm.technician_notes && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notas del Técnico</div>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{otm.technician_notes}</p>
                            </div>
                            {otm.attachments && otm.attachments.some(a => a.phase === 'execution' || a.file_type === 'after_photo') && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
                                {otm.attachments.filter(a => a.phase === 'execution' || a.file_type === 'after_photo').map(att => (
                                  <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Ejecución" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {otm.supervisor_notes && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notas del Supervisor</div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{otm.supervisor_notes}</p>
                        </div>
                      )}

                      {otm.status === 'cancelled' && otm.cancellation_reason && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(225,29,72,0.05)', border: '1px solid rgba(225,29,72,0.15)', borderRadius: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>❌ CANCELADO</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <strong>Motivo:</strong> {otm.cancellation_reason === 'other' ? otm.cancellation_detail : 
                              otm.cancellation_reason === 'not_maintenance' ? 'No pertenece a mantenimiento' :
                              otm.cancellation_reason === 'wrong_request' ? 'Solicitud errónea' :
                              otm.cancellation_reason === 'duplicate' ? 'Solicitud duplicada' : otm.cancellation_reason}
                          </div>
                        </div>
                      )}

                      {/* 11. Conformidad */}
                      {otm.status === 'awaiting_conformity' && (
                        <button className="btn btn-primary w-full" style={{ marginTop: 12 }}
                          onClick={e => { e.stopPropagation(); setShowConformity(otm); }}>
                          ✓ Dar Conformidad
                        </button>
                      )}
                      {otm.status === 'closed' && otm.conformity_rating && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(100,116,139,0.05)', border: '1px solid rgba(100,116,139,0.15)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Conformidad del Servicio</div>
                          <div style={{ fontSize: '1rem', marginBottom: 4 }}>{'⭐'.repeat(otm.conformity_rating)}{'☆'.repeat(5 - otm.conformity_rating)}</div>
                          {otm.conformity_notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>"{otm.conformity_notes}"</p>}
                        </div>
                      )}

                      {/* Sección de Comentarios / Aclaraciones */}
                      <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.01)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          💬 Mensajes y Aclaraciones
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', marginBottom: 8, paddingRight: 4 }}>
                          {(!otm.comments || otm.comments.length === 0) ? (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                              No hay mensajes en esta solicitud.
                            </div>
                          ) : (
                            otm.comments.map(c => {
                              const isMe = c.user_id === user?.id;
                              return (
                                <div key={c.id} style={{
                                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                                  maxWidth: '85%',
                                  background: isMe ? 'rgba(14, 165, 233, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                  border: `1px solid ${isMe ? 'rgba(14, 165, 233, 0.2)' : 'var(--border)'}`,
                                  padding: '6px 8px',
                                  borderRadius: '10px',
                                  borderTopRightRadius: isMe ? '2px' : '10px',
                                  borderTopLeftRadius: isMe ? '10px' : '2px',
                                  fontSize: '0.7rem',
                                  marginLeft: isMe ? 'auto' : '0',
                                  marginRight: isMe ? '0' : 'auto'
                                }}>
                                  <div style={{ fontWeight: 700, color: isMe ? 'var(--accent-blue)' : 'var(--text-primary)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                                    <span>{c.user_name}</span>
                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 400 }}>({c.user_role === 'admin' ? 'Admin' : c.user_role === 'supervisor' ? 'Superv.' : c.user_role === 'jefatura' ? 'Jefe' : 'Solict.'})</span>
                                  </div>
                                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{c.text}</p>
                                  <div style={{ textAlign: 'right', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2 }}>
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
                            style={{ fontSize: '0.75rem', height: '28px', flex: 1 }}
                            placeholder="Escribe un mensaje o consulta..."
                            value={newCommentText}
                            onChange={e => setNewCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newCommentText.trim()) {
                                handleAddComment(otm.id);
                              }
                            }}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ height: '28px', padding: '0 10px', fontSize: '0.7rem' }}
                            onClick={() => handleAddComment(otm.id)}
                            disabled={!newCommentText.trim()}
                          >
                            Enviar
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {showConformity && (
        <ConformityModal otm={showConformity} onClose={() => setShowConformity(null)} />
      )}

      <style>{`
        @keyframes rotateDoughnut {
          from { transform: rotate(-90deg) scale(0.9); opacity: 0; }
          to { transform: rotate(270deg) scale(1); opacity: 1; }
        }
        .animated-doughnut {
          transform-origin: center;
          animation: rotateDoughnut 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .dashboard-list-card {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dashboard-list-card:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}
