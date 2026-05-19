// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useAuth } from '../../context/AuthContext';

type DateFilterType = 'today' | 'week' | 'month' | '3months' | 'year' | 'custom';

export default function CommandCenter() {
  const { user } = useAuth();
  const { otms, users, supervisors } = useOTM();
  const [supervisorFilter, setSupervisorFilter] = useState<string>('');
  
  // Date Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Tech Chart Interaction
  const [expandedTechs, setExpandedTechs] = useState<Record<string, boolean>>({});

  const technicians = useMemo(() => users.filter(u => u.role === 'technician'), [users]);

  // Resolve Date Limits
  const dateLimits = useMemo(() => {
    if (dateFilter === 'custom') {
      const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(0);
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
      return { start, end };
    }
    
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const start = new Date(now);
    
    if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
    else if (dateFilter === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    }
    else if (dateFilter === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
    else if (dateFilter === '3months') { start.setMonth(start.getMonth() - 3); start.setHours(0, 0, 0, 0); }
    else if (dateFilter === 'year') { start.setMonth(start.getMonth() - 12); start.setHours(0, 0, 0, 0); }
    
    return { start, end };
  }, [dateFilter, customStart, customEnd]);

  // Filter OTMs by selected supervisor AND date
  const filteredOTMs = useMemo(() => {
    let filtered = otms;
    if (supervisorFilter) {
      filtered = filtered.filter(o => o.supervisor_id === supervisorFilter);
    }
    
    return filtered.filter(o => {
      // Use created_at as base date reference for inclusion in dashboard
      const created = new Date(o.created_at);
      return created >= dateLimits.start && created <= dateLimits.end;
    });
  }, [otms, supervisorFilter, dateLimits]);

  const currentSupervisorName = supervisorFilter
    ? supervisors.find(s => s.id === supervisorFilter)?.full_name
    : user?.full_name;

  // ---- KPI Calculations ----
  const activeStatuses = ['pending', 'scheduled', 'in_progress', 'rq', 'awaiting_supervisor', 'awaiting_conformity'];
  const activeOTMs = filteredOTMs.filter(o => activeStatuses.includes(o.status));

  // Overdue: exceeded max time per priority
  const maxDays: Record<string, number> = { high: 2, medium: 5, low: 10 };
  const nowMs = Date.now();
  const overdueOTMs = activeOTMs.filter(o => {
    const created = new Date(o.created_at).getTime();
    const limit = maxDays[o.urgency] || 10;
    return (nowMs - created) / 86400000 > limit;
  });

  const highPriority = activeOTMs.filter(o => o.urgency === 'high');
  const inProgress = filteredOTMs.filter(o => o.status === 'in_progress');
  const rqOTMs = filteredOTMs.filter(o => o.status === 'rq');

  // New vs Closed this month (absolute metric based on current calendar month, keeping the requested card logic)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  // Re-evaluating against all otms for this specific KPI to be absolute
  const baseOtms = supervisorFilter ? otms.filter(o => o.supervisor_id === supervisorFilter) : otms;
  const newThisMonth = baseOtms.filter(o => new Date(o.created_at) >= monthStart);
  const closedThisMonth = baseOtms.filter(o => o.closed_at && new Date(o.closed_at) >= monthStart);

  // ---- Chart: OTMs by Technician (Base metric: Closed OTMs within filter) ----
  const techData = useMemo(() => {
    const map: Record<string, { id: string; name: string; closed: number; scheduled: number; inProgress: number }> = {};
    
    // Base metric: Closed OTMs (filtered by date)
    filteredOTMs.filter(o => o.status === 'closed').forEach(o => {
      if (o.technician_id) {
        if (!map[o.technician_id]) {
          const t = technicians.find(t => t.id === o.technician_id);
          map[o.technician_id] = { id: o.technician_id, name: t?.full_name || o.technician_id, closed: 0, scheduled: 0, inProgress: 0 };
        }
        map[o.technician_id].closed++;
      }
    });

    // Sub metrics: Absolute current load (ignoring date filter so supervisor always sees actual pending work)
    baseOtms.forEach(o => {
      if (o.technician_id && (o.status === 'scheduled' || o.status === 'in_progress')) {
        if (!map[o.technician_id]) {
          const t = technicians.find(t => t.id === o.technician_id);
          map[o.technician_id] = { id: o.technician_id, name: t?.full_name || o.technician_id, closed: 0, scheduled: 0, inProgress: 0 };
        }
        if (o.status === 'scheduled') map[o.technician_id].scheduled++;
        if (o.status === 'in_progress') map[o.technician_id].inProgress++;
      }
    });

    return Object.values(map).sort((a, b) => b.closed - a.closed).slice(0, 10);
  }, [filteredOTMs, baseOtms, technicians]);
  
  const maxTechClosed = Math.max(...techData.map(t => t.closed), 1);
  const maxTechLoad = Math.max(...techData.map(t => Math.max(t.scheduled, t.inProgress)), 1);

  const toggleTech = (id: string) => {
    setExpandedTechs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ---- Chart: Daily Balance (last 14 days based on dateLimits.end) ----
  const dailyData = useMemo(() => {
    const days: { label: string; created: number; resolved: number; date: Date }[] = [];
    const endDate = new Date(dateLimits.end);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const created = baseOtms.filter(o => {
        const cd = new Date(o.created_at);
        return cd >= d && cd < nextD;
      }).length;
      const resolved = baseOtms.filter(o => {
        if (!o.closed_at) return false;
        const cd = new Date(o.closed_at);
        return cd >= d && cd < nextD;
      }).length;
      days.push({ label: dayLabel, created, resolved, date: d });
    }
    return days;
  }, [baseOtms, dateLimits.end]);
  const maxDaily = Math.max(...dailyData.map(d => Math.max(d.created, d.resolved)), 1);

  // ---- Chart: OTMs by Area ----
  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOTMs.filter(o => o.status !== 'cancelled').forEach(o => {
      map[o.area_sector] = (map[o.area_sector] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredOTMs]);
  const maxArea = Math.max(...areaData.map(a => a[1]), 1);

  // SVG Line Chart helper
  const chartW = 440;
  const chartH = 160;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const toX = (i: number) => padL + (i / (dailyData.length - 1 || 1)) * innerW;
  const toY = (v: number) => padT + innerH - (v / (maxDaily || 1)) * innerH;

  const createdPath = dailyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.created)}`).join(' ');
  const resolvedPath = dailyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.resolved)}`).join(' ');

  // Pastel palette
  const pastel = {
    blue: '#a3c4f3',
    coral: '#f4a5a0',
    orange: '#f9c49a',
    green: '#a8d8b9',
    yellow: '#f5e6a3',
    purple: '#c4b5e0',
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value as DateFilterType);
    if (e.target.value !== 'custom') {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const handleCustomDateChange = () => {
    setDateFilter('custom');
  };

  return (
    <div>
      {/* Filters Banner */}
      <div className="glass-card" style={{ marginBottom: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-blue)', lineHeight: 1 }}>CRL</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 800 }}>1875</div>
          </div>
          <div className="form-group" style={{ minWidth: 200, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0 }}>Elegir Supervisor:</label>
            <select className="form-select" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={supervisorFilter} onChange={e => setSupervisorFilter(e.target.value)}>
              <option value="">Todos los Supervisores</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0 }}>Periodo:</label>
            <select className="form-select" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={dateFilter} onChange={handleDateFilterChange}>
              <option value="today">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="3months">Últimos 3 Meses</option>
              <option value="year">Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0 }}>Desde:</label>
            <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: '0.8rem' }} 
              value={customStart} onChange={e => { setCustomStart(e.target.value); handleCustomDateChange(); }} />
          </div>
          <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0 }}>Hasta:</label>
            <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: '0.8rem' }} 
              value={customEnd} onChange={e => { setCustomEnd(e.target.value); handleCustomDateChange(); }} />
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          BIENVENIDO {user.role === 'admin' ? 'ADMIN' : 'SUPERVISOR'} {(currentSupervisorName || '').toUpperCase()}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Panel analítico de operaciones de mantenimiento — Club de Regatas Lima</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-mobile-small" style={{ marginBottom: 32 }}>
        {[
          { label: 'En Curso', value: activeOTMs.length, color: pastel.blue, icon: '📊' },
          { label: 'Vencidas', value: overdueOTMs.length, color: pastel.coral, icon: '⏰' },
          { label: 'Alta Prioridad', value: highPriority.length, color: pastel.orange, icon: '🔥' },
          { label: 'En Proceso', value: inProgress.length, color: pastel.green, icon: '⚙️' },
          { label: 'RQ', value: rqOTMs.length, color: pastel.yellow, icon: '📋' },
          { label: 'Total vs Cerradas', value: `${newThisMonth.length} / ${closedThisMonth.length}`, color: pastel.purple, icon: '📈' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ '--kpi-color': kpi.color } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{kpi.value}</div>
              </div>
              <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* OTMs by Technician */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            OTMs por Técnico (Cerradas)
          </h3>
          <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: 420, paddingRight: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {techData.length > 0 ? techData.map((t, i) => {
              const isExpanded = expandedTechs[t.id];
              return (
                <div key={t.id}>
                  <div 
                    onClick={() => toggleTech(t.id)}
                    style={{ cursor: 'pointer', padding: '4px 0', borderRadius: 6, transition: 'background 0.2s' }}
                    className="tech-row"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', fontSize: '0.6rem' }}>▶</span>
                        {t.name.split(' ').slice(0, 2).join(' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{t.closed} cerradas</span>
                    </div>
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(t.closed / maxTechClosed) * 100}%`, height: '100%', borderRadius: 5,
                        background: `linear-gradient(90deg, ${pastel.blue}, ${pastel.purple})`,
                        transition: 'width 0.6s ease'
                      }}></div>
                    </div>
                  </div>
                  
                  {/* Expanded load breakdown */}
                  {isExpanded && (
                    <div className="slide-down" style={{ marginTop: 8, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>📅 Programadas</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: pastel.purple }}>{t.scheduled}</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(t.scheduled / maxTechLoad) * 100}%`, height: '100%', background: pastel.purple, borderRadius: 3 }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>⚙️ En Proceso</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: pastel.green }}>{t.inProgress}</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(t.inProgress / maxTechLoad) * 100}%`, height: '100%', background: pastel.green, borderRadius: 3 }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>No hay datos para el periodo</div>
            )}
            </div>
          </div>
        </div>

        {/* Daily Balance Line Chart */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            Total vs Cerradas
          </h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b' }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: pastel.blue, display: 'inline-block' }}></span> Creadas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b' }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: pastel.green, display: 'inline-block' }}></span> Cerradas
            </span>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <line key={i} x1={padL} x2={chartW - padR} y1={toY(f * maxDaily)} y2={toY(f * maxDaily)} stroke="#f1f5f9" strokeWidth="1" />
            ))}
            {/* Y-axis labels */}
            {[0, Math.ceil(maxDaily / 2), maxDaily].map((v, i) => (
              <text key={i} x={padL - 4} y={toY(v) + 3} fill="#94a3b8" fontSize="7" textAnchor="end">{v}</text>
            ))}
            {/* Created line */}
            <path d={createdPath} fill="none" stroke={pastel.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Resolved line */}
            <path d={resolvedPath} fill="none" stroke={pastel.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Data points */}
            {dailyData.map((d, i) => (
              <React.Fragment key={i}>
                <circle cx={toX(i)} cy={toY(d.created)} r="3" fill={pastel.blue} />
                <circle cx={toX(i)} cy={toY(d.resolved)} r="3" fill={pastel.green} />
                {i % 2 === 0 && <text x={toX(i)} y={chartH - 6} fill="#94a3b8" fontSize="6" textAnchor="middle">{d.label}</text>}
              </React.Fragment>
            ))}
          </svg>
        </div>
      </div>

      {/* Area Breakdown Chart */}
      <div className="glass-card">
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
          Solicitudes por Área — Distribución del Club
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {areaData.length > 0 ? areaData.map(([area, count], i) => {
            const areaColors = [pastel.blue, pastel.green, pastel.orange, pastel.purple, pastel.coral, pastel.yellow];
            const color = areaColors[i % areaColors.length];
            return (
              <div key={area}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{area}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{count}</span>
                </div>
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / maxArea) * 100}%`, height: '100%', borderRadius: 5,
                    background: color, transition: 'width 0.6s ease'
                  }}></div>
                </div>
              </div>
            );
          }) : (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>Sin datos disponibles en el periodo</div>
          )}
        </div>
      </div>
      
      <style>{`
        .tech-row:hover { background: rgba(241, 245, 249, 0.5); }
        .slide-down { animation: slideDown 0.3s ease-out forwards; overflow: hidden; transform-origin: top; }
        @keyframes slideDown {
          from { opacity: 0; transform: scaleY(0); }
          to { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
