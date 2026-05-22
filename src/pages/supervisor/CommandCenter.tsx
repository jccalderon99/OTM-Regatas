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

  // ---- Chart: OTMs by Technician (Base metric: Scheduled OTMs within filter) ----
  const techData = useMemo(() => {
    const map: Record<string, { id: string; name: string; closed: number; scheduled: number; inProgress: number }> = {};
    
    // Initialize with technicians who have any OTM in the filtered set
    filteredOTMs.forEach(o => {
      if (o.technician_id) {
        if (!map[o.technician_id]) {
          const t = technicians.find(t => t.id === o.technician_id);
          map[o.technician_id] = { id: o.technician_id, name: t?.full_name || o.technician_id, closed: 0, scheduled: 0, inProgress: 0 };
        }
        
        if (o.status === 'scheduled') {
          map[o.technician_id].scheduled++;
        } else if (o.status === 'in_progress') {
          map[o.technician_id].inProgress++;
        } else if (o.status === 'closed') {
          map[o.technician_id].closed++;
        }
      }
    });

    return Object.values(map).sort((a, b) => b.scheduled - a.scheduled);
  }, [filteredOTMs, technicians]);
  
  const maxTechScheduled = Math.max(...techData.map(t => t.scheduled), 1);
  const maxTechSub = Math.max(...techData.map(t => Math.max(t.closed, t.inProgress)), 1);

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
  const chartH = 200;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const toX = (i: number) => padL + (i / (dailyData.length - 1 || 1)) * innerW;
  const toY = (v: number) => padT + innerH - (v / (maxDaily || 1)) * innerH;



  // Vibrant palette
  const vibrant = {
    blue: '#0ea5e9',   // Sky 500
    coral: '#f43f5e',  // Coral/Rose 500
    orange: '#f97316', // Orange 500
    green: '#10b981',  // Emerald 500
    yellow: '#eab308', // Yellow 500
    purple: '#a855f7', // Purple 500
  };

  // ---- Chart: OTMs by Maintenance Type ----
  const maintenanceData = useMemo(() => {
    const map: Record<string, number> = {
      corrective: 0,
      preventive: 0,
      emergency: 0,
      support: 0,
    };
    filteredOTMs.forEach(o => {
      if (o.maintenance_type && o.maintenance_type in map) {
        map[o.maintenance_type]++;
      }
    });
    return Object.entries(map).map(([type, count]) => ({
      type,
      label: type === 'corrective' ? 'Correctivo' : type === 'preventive' ? 'Preventivo' : type === 'emergency' ? 'Emergencia' : 'Soporte',
      count
    }));
  }, [filteredOTMs]);
  
  const maxMaintenance = Math.max(...maintenanceData.map(m => m.count), 1);

  // ---- Chart: OTMs by Priority ----
  const priorityData = useMemo(() => {
    const map: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };
    filteredOTMs.forEach(o => {
      if (o.urgency && o.urgency in map) {
        map[o.urgency]++;
      }
    });
    const total = Object.values(map).reduce((sum, val) => sum + val, 0);
    return {
      total,
      items: [
        { key: 'high', label: 'Alta', count: map.high, color: vibrant.coral },
        { key: 'medium', label: 'Media', count: map.medium, color: vibrant.orange },
        { key: 'low', label: 'Baja', count: map.low, color: vibrant.green },
      ]
    };
  }, [filteredOTMs]);

  const doughnutCircumference = 251.2;
  let accumulatedCircumference = 0;
  
  const doughnutItems = priorityData.items.map(item => {
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

  const getCurvePath = (data: number[]) => {
    if (data.length === 0) return '';
    let path = `M ${toX(0)},${toY(data[0])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = toX(i);
      const y0 = toY(data[i]);
      const x1 = toX(i + 1);
      const y1 = toY(data[i + 1]);
      const cpX1 = x0 + (x1 - x0) / 2;
      const cpX2 = x1 - (x1 - x0) / 2;
      path += ` C ${cpX1},${y0} ${cpX2},${y1} ${x1},${y1}`;
    }
    return path;
  };

  const getAreaPath = (data: number[]) => {
    if (data.length === 0) return '';
    const curve = getCurvePath(data);
    const lastX = toX(data.length - 1);
    const firstX = toX(0);
    const bottomY = toY(0);
    return `${curve} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  };

  const createdPath = getCurvePath(dailyData.map(d => d.created));
  const resolvedPath = getCurvePath(dailyData.map(d => d.resolved));
  const createdAreaPath = getAreaPath(dailyData.map(d => d.created));
  const resolvedAreaPath = getAreaPath(dailyData.map(d => d.resolved));

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
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {user.role === 'admin'
            ? `Admin ${(user.full_name || '').split(' ')[0]}`
            : `Supervisor ${(currentSupervisorName || '').split(' ').slice(0, 2).join(' ')}`}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Panel analítico de operaciones de mantenimiento — Club de Regatas Lima</p>
      </div>

      {/* Filters Banner */}
      <div className="glass-card" style={{ marginBottom: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
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

      {/* KPI Cards */}
      <div className="kpi-mobile-small" style={{ marginBottom: 32 }}>
        {[
          { label: 'En Curso', value: activeOTMs.length, color: vibrant.blue, icon: '📊' },
          { label: 'Vencidas', value: overdueOTMs.length, color: vibrant.coral, icon: '⏰' },
          { label: 'Alta Prioridad', value: highPriority.length, color: vibrant.orange, icon: '🔥' },
          { label: 'En Proceso', value: inProgress.length, color: vibrant.green, icon: '⚙️' },
          { label: 'RQ', value: rqOTMs.length, color: vibrant.yellow, icon: '📋' },
          { label: 'Total vs Cerradas', value: `${newThisMonth.length} / ${closedThisMonth.length}`, color: vibrant.purple, icon: '📈' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ 
            '--kpi-color': kpi.color,
            boxShadow: `0 8px 24px ${kpi.color}18`,
            border: `1px solid ${kpi.color}22`
          } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{kpi.value}</div>
              </div>
              <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {/* OTMs by Technician */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            OTMs por Técnico (Programadas)
          </h3>
          <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '235px', overflowY: 'auto', paddingRight: 12 }}>
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{t.scheduled} programadas</span>
                    </div>
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(t.scheduled / maxTechScheduled) * 100}%`, height: '100%', borderRadius: 5,
                        background: `linear-gradient(90deg, ${vibrant.blue}, ${vibrant.purple})`,
                        transition: 'width 0.6s ease'
                      }}></div>
                    </div>
                  </div>
                  
                  {/* Expanded load breakdown */}
                  {isExpanded && (
                    <div className="slide-down" style={{ marginTop: 8, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>✔️ Cerradas</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: vibrant.purple }}>{t.closed}</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(t.closed / maxTechSub) * 100}%`, height: '100%', background: vibrant.purple, borderRadius: 3 }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>⚙️ En Proceso</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: vibrant.green }}>{t.inProgress}</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(t.inProgress / maxTechSub) * 100}%`, height: '100%', background: vibrant.green, borderRadius: 3 }}></div>
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

        {/* Maintenance Type Bar Chart */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            Tipo de Mantenimiento
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: 10, paddingBottom: 15 }}>
            {maintenanceData.map((m, i) => {
              const colors = [vibrant.blue, vibrant.green, vibrant.orange, vibrant.purple];
              const color = colors[i % colors.length];
              const heightPercent = (m.count / maxMaintenance) * 100;
              return (
                <div key={m.type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    {m.count}
                  </span>
                  <div style={{
                    width: '28px',
                    height: `${heightPercent || 4}%`,
                    background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.6s ease',
                    boxShadow: `0 4px 12px ${color}33`,
                  }} />
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: 8, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Balance Line Chart */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            Total vs Cerradas
          </h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              <span style={{ width: 12, height: 4, borderRadius: 2, background: vibrant.blue, display: 'inline-block' }}></span> Creadas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              <span style={{ width: 12, height: 4, borderRadius: 2, background: vibrant.green, display: 'inline-block' }}></span> Cerradas
            </span>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '180px', maxHeight: '180px' }}>
            <defs>
              <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={vibrant.blue} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={vibrant.blue} stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={vibrant.green} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={vibrant.green} stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <line key={i} x1={padL} x2={chartW - padR} y1={toY(f * maxDaily)} y2={toY(f * maxDaily)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            {/* Y-axis labels */}
            {[0, Math.ceil(maxDaily / 2), maxDaily].map((v, i) => (
              <text key={i} x={padL - 6} y={toY(v) + 3} fill="#64748b" fontSize="9" fontWeight="700" textAnchor="end">{v}</text>
            ))}
            
            {/* Areas */}
            <path d={createdAreaPath} fill="url(#createdGrad)" />
            <path d={resolvedAreaPath} fill="url(#resolvedGrad)" />

            {/* Created line */}
            <path d={createdPath} fill="none" stroke={vibrant.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Resolved line */}
            <path d={resolvedPath} fill="none" stroke={vibrant.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Data points */}
            {dailyData.map((d, i) => (
              <React.Fragment key={i}>
                <circle cx={toX(i)} cy={toY(d.created)} r="3.5" fill={vibrant.blue} stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={toX(i)} cy={toY(d.resolved)} r="3.5" fill={vibrant.green} stroke="#ffffff" strokeWidth="1.5" />
                {i % 2 === 0 && <text x={toX(i)} y={chartH - 4} fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">{d.label}</text>}
              </React.Fragment>
            ))}
          </svg>
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Area Breakdown Chart */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            Solicitudes por Área — Distribución del Club
          </h3>
          <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '235px', overflowY: 'auto', paddingRight: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {areaData.length > 0 ? areaData.map(([area, count], i) => {
                const areaColors = [vibrant.blue, vibrant.green, vibrant.orange, vibrant.purple, vibrant.coral, vibrant.yellow];
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
        </div>

        {/* Priority Doughnut Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', marginBottom: 20 }}>
            Prioridad de Actividades
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, gap: 16, padding: '10px 0' }}>
            {/* Doughnut SVG */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg viewBox="0 0 100 100" className="animated-doughnut" style={{ width: '100%', height: '100%' }}>
                {/* Background track */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                
                {/* Segments */}
                {doughnutItems.map((item, idx) => (
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
              
              {/* Center Labels */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>
                  {priorityData.total}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                  OTMs
                </span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: '120px' }}>
              {doughnutItems.map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, display: 'inline-block', boxShadow: `0 2px 6px ${item.color}44` }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
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
      </div>
      
      <style>{`
        .tech-row:hover { background: rgba(241, 245, 249, 0.5); }
        .slide-down { animation: slideDown 0.3s ease-out forwards; overflow: hidden; transform-origin: top; }
        @keyframes slideDown {
          from { opacity: 0; transform: scaleY(0); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes rotateDoughnut {
          from { transform: rotate(-90deg) scale(0.9); opacity: 0; }
          to { transform: rotate(270deg) scale(1); opacity: 1; }
        }
        .animated-doughnut {
          transform-origin: center;
          animation: rotateDoughnut 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
