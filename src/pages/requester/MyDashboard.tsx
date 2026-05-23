// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import StatusBadge from '../../components/StatusBadge';
import { OTMRequest, URGENCY_LABELS, OTMStatus } from '../../types';
import ConformityModal from '../../components/ConformityModal';

export default function MyDashboard() {
  const { user } = useAuth();
  const { getOTMsForCurrentUser, users: allUsers } = useOTM();
  const [selectedOTM, setSelectedOTM] = useState<OTMRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<OTMStatus | ''>('');
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'area'>(user?.role === 'jefatura' ? 'area' : 'mine');
  const [dateRange, setDateRange] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showConformity, setShowConformity] = useState<OTMRequest | null>(null);

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
      const matchDate = new Date(o.created_at) >= dateLimit;
      return matchStatus && matchScope && matchUser && matchDate;
    });
  }, [otms, statusFilter, scopeFilter, selectedUser, dateLimit, user]);

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
          { label: 'Suministros (RQ)', value: counts.rq, color: vibrant.orange, icon: '📦' },
          { label: 'Por Confirmar', value: counts.awaiting, color: vibrant.green, icon: '✅' },
        ].map((c, i) => (
          <div key={i} className="kpi-card" style={{
            '--kpi-color': c.color,
            boxShadow: `0 8px 24px ${c.color}18`,
            border: `1px solid ${c.color}22`
          } as any}>
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
              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Visualizar</label>
                <select className="form-select" value={scopeFilter} onChange={e => setScopeFilter(e.target.value as any)}>
                  <option value="mine">Mis Solicitudes</option>
                  <option value="area">Toda el Área</option>
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
                  <option value="rq">Requerimiento (RQ)</option>
                  <option value="scheduled">Programado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="awaiting_supervisor">Finalizado - Visto Bueno</option>
                  <option value="awaiting_conformity">Esperando Conformidad</option>
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

          {filtered.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No hay solicitudes</div>
              <div className="empty-state-text">Ajusta los filtros para ver más resultados</div>
            </div>
          ) : (
            <div className="flex-col gap-3 scrollable-list-container" style={{ padding: '4px 10px', maxHeight: 'calc(100vh - 400px)', minHeight: 400 }}>
              {filtered.map(otm => {
                const urgencyColors = { high: '#f43f5e', medium: '#f97316', low: '#10b981' };
                const urgencyColor = urgencyColors[otm.urgency] || '#cbd5e1';
                return (
                  <div key={otm.id} className="glass-card dashboard-list-card" style={{
                    cursor: 'pointer',
                    padding: '20px 20px 20px 24px',
                    marginBottom: 12,
                    borderLeft: `4px solid ${urgencyColor}`,
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease'
                  }}
                  onClick={() => setSelectedOTM(selectedOTM?.id === otm.id ? null : otm)}>
                    <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{otm.otm_code}</span>
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
                    <div className="slide-up" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{otm.description}</p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Área: {otm.area_sector} | Solicitante: {otm.requester_name}<br />
                        📍 {otm.location || 'Sede Principal'} — {otm.exact_location}
                      </div>

                      {/* Images */}
                      {otm.attachments && otm.attachments.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {otm.attachments.map(att => (
                            <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                              <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Adjunto" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* RQ Progress */}
                      {otm.rq_type && (
                        <div style={{ marginTop: 12, padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                            📋 {otm.rq_type === 'supply' ? 'RQ SUMINISTRO' : 'RQ SERVICIO'}
                            {otm.rq_date && <span style={{ float: 'right', fontWeight: 400, fontSize: '0.7rem' }}>📅 {new Date(otm.rq_date).toLocaleDateString('es')}</span>}
                          </div>
                          {otm.rq_type === 'supply' && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Material: {otm.rq_materials} — Cant: {otm.rq_quantities}
                            </div>
                          )}
                          {otm.rq_type === 'service' && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Servicio: {otm.rq_service_desc} — Magnitud: {otm.rq_magnitude === 'puntual' ? 'Puntual' : 'Integral'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assignment Progress */}
                      {otm.assignment_type === 'own' && otm.technician_id && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(78,181,230,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🔧 ASIGNADO</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Técnico: {allUsers.find(u => u.id === otm.technician_id)?.full_name || '—'}
                            {otm.scheduled_date && ` — 📅 ${new Date(otm.scheduled_date).toLocaleDateString('es')}`}
                          </div>
                        </div>
                      )}

                      {otm.assignment_type === 'contractor' && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(78,181,230,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🏗️ ASIGNADO (Tercero)</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Contrata: {otm.contractor_name}
                            {otm.contractor_date && ` — 📅 ${new Date(otm.contractor_date).toLocaleDateString('es')}`}
                          </div>
                        </div>
                      )}

                      {/* Cancellation */}
                      {otm.status === 'cancelled' && otm.cancellation_reason && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(225,29,72,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)' }}>❌ CANCELADO</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Motivo: {otm.cancellation_reason === 'other' ? otm.cancellation_detail : 
                              otm.cancellation_reason === 'not_maintenance' ? 'No pertenece a mantenimiento' :
                              otm.cancellation_reason === 'wrong_request' ? 'Solicitud errónea' :
                              otm.cancellation_reason === 'duplicate' ? 'Solicitud duplicada' : otm.cancellation_reason}
                          </div>
                        </div>
                      )}

                      {otm.supervisor_notes && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(139,92,246,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>Notas del Supervisor</div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.supervisor_notes}</p>
                        </div>
                      )}
                      {otm.technician_notes && (
                        <div style={{ marginTop: 8, padding: 12, background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Notas del Técnico</div>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{otm.technician_notes}</p>
                            </div>
                            {otm.attachments && otm.attachments.some(a => a.phase === 'execution') && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
                                {otm.attachments.filter(a => a.phase === 'execution').map(att => (
                                  <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Ejecución" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
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
