// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useAuth } from '../../context/AuthContext';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import StatusBadge from '../../components/StatusBadge';
import ReportModal from '../../components/ReportModal';

type DateFilterType = 'today' | 'week' | 'month' | '3months' | 'year' | 'custom';

export default function CommandCenter() {
  const { user } = useAuth();
  const { otms, users, supervisors, techRequests = [], updateTechRequestStatus } = useOTM();
  const { records } = useRoutineActivity();

  // Tab State
  const [activeTab, setActiveTab] = useState<'operations' | 'efficiency' | 'quality' | 'preventive' | 'tech-requests'>('operations');

  // Interactive Drill-down State
  const [activeDrillDownFilter, setActiveDrillDownFilter] = useState<{ type: string; value: string; label: string } | null>(null);
  const [selectedDrillDownOTM, setSelectedDrillDownOTM] = useState<string | null>(null);
  const [selectedDrillDownRoutine, setSelectedDrillDownRoutine] = useState<string | null>(null);

  // Filters State
  const [supervisorFilter, setSupervisorFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Expandable Tech State
  const [expandedTechs, setExpandedTechs] = useState<Record<string, boolean>>({});

  // Report Generation States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'basic' | 'executive' | 'detailed'>('executive');
  const [showReportDropdown, setShowReportDropdown] = useState(false);

  // Tech Requests State
  const [selectedRequestForResponse, setSelectedRequestForResponse] = useState<any | null>(null);
  const [newRequestStatus, setNewRequestStatus] = useState<any>('pending');
  const [supervisorResponseText, setSupervisorResponseText] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  const [techReqTypeFilter, setTechReqTypeFilter] = useState('');
  const [techReqStatusFilter, setTechReqStatusFilter] = useState('');
  const [techReqSearch, setTechReqSearch] = useState('');

  const technicians = useMemo(() => users.filter(u => u.role === 'technician'), [users]);

  // Date boundaries
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

  // Filtered OTMs
  const filteredOTMs = useMemo(() => {
    let filtered = otms;
    if (supervisorFilter) {
      filtered = filtered.filter(o => o.supervisor_id === supervisorFilter);
    }
    
    return filtered.filter(o => {
      const created = new Date(o.created_at);
      return created >= dateLimits.start && created <= dateLimits.end;
    });
  }, [otms, supervisorFilter, dateLimits]);

  // Filtered Routine Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const d = new Date(r.record_date + 'T12:00:00');
      return d >= dateLimits.start && d <= dateLimits.end;
    });
  }, [records, dateLimits]);

  const currentSupervisorName = supervisorFilter
    ? supervisors.find(s => s.id === supervisorFilter)?.full_name
    : user?.full_name;

  // Vibrant palette
  const vibrant = {
    blue: '#0ea5e9',   // Sky 500
    coral: '#f43f5e',  // Coral/Rose 500
    orange: '#f97316', // Orange 500
    green: '#10b981',  // Emerald 500
    yellow: '#eab308', // Yellow 500
    purple: '#a855f7', // Purple 500
    indigo: '#6366f1',
    slate: '#64748b'
  };

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const baseOtms = useMemo(() => {
    return supervisorFilter ? otms.filter(o => o.supervisor_id === supervisorFilter) : otms;
  }, [otms, supervisorFilter]);

  // General KPIs and lists
  const activeStatuses = ['pending', 'scheduled', 'in_progress', 'rq', 'awaiting_supervisor', 'awaiting_conformity'];
  const activeOTMs = useMemo(() => filteredOTMs.filter(o => activeStatuses.includes(o.status)), [filteredOTMs]);

  // Overdue OTMs
  const maxDays: Record<string, number> = { high: 2, medium: 5, low: 10 };
  const nowMs = Date.now();
  const overdueOTMs = useMemo(() => {
    return activeOTMs.filter(o => {
      const created = new Date(o.created_at).getTime();
      const limit = maxDays[o.urgency] || 10;
      return (nowMs - created) / 86400000 > limit;
    });
  }, [activeOTMs, nowMs]);

  const highPriority = useMemo(() => activeOTMs.filter(o => o.urgency === 'high'), [activeOTMs]);
  const inProgress = useMemo(() => filteredOTMs.filter(o => o.status === 'in_progress'), [filteredOTMs]);
  const rqOTMs = useMemo(() => filteredOTMs.filter(o => o.status === 'rq'), [filteredOTMs]);

  // Total vs Closed this month (absolute)
  const newThisMonth = useMemo(() => baseOtms.filter(o => new Date(o.created_at) >= monthStart), [baseOtms, monthStart]);
  const closedThisMonth = useMemo(() => baseOtms.filter(o => o.closed_at && new Date(o.closed_at) >= monthStart), [baseOtms, monthStart]);

  // ================= TAB DATA COMPUTATIONS =================

  // --- TAB 1: OPERACIONES ---
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

  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOTMs.filter(o => o.status !== 'cancelled').forEach(o => {
      map[o.area_sector] = (map[o.area_sector] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredOTMs]);
  const maxArea = Math.max(...areaData.map(a => a[1]), 1);

  const priorityData = useMemo(() => {
    const map: Record<string, number> = { high: 0, medium: 0, low: 0 };
    filteredOTMs.forEach(o => {
      if (o.urgency && o.urgency in map) map[o.urgency]++;
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
  const doughnutItems = useMemo(() => {
    accumulatedCircumference = 0;
    return priorityData.items.map(item => {
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

  // SVG Helper
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


  // --- TAB 2: EFICIENCIA Y DESEMPEÑO ---
  const avgResponseTime = useMemo(() => {
    const valid = filteredOTMs.filter(o => o.job_start_time && o.created_at);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, o) => {
      const start = new Date(o.job_start_time).getTime();
      const created = new Date(o.created_at).getTime();
      return acc + (start - created);
    }, 0);
    return Number((sum / valid.length / 3600000).toFixed(1));
  }, [filteredOTMs]);

  const avgExecutionTime = useMemo(() => {
    const valid = filteredOTMs.filter(o => o.net_execution_time !== null && o.net_execution_time !== undefined);
    if (valid.length > 0) {
      return Number((valid.reduce((acc, o) => acc + o.net_execution_time, 0) / valid.length).toFixed(1));
    }
    const fallback = filteredOTMs.filter(o => o.job_start_time && o.job_end_time);
    if (fallback.length === 0) return 0;
    const sum = fallback.reduce((acc, o) => {
      const start = new Date(o.job_start_time).getTime();
      const end = new Date(o.job_end_time).getTime();
      return acc + (end - start);
    }, 0);
    return Number((sum / fallback.length / 3600000).toFixed(1));
  }, [filteredOTMs]);

  const techData = useMemo(() => {
    const map: Record<string, { id: string; name: string; closed: number; scheduled: number; inProgress: number }> = {};
    filteredOTMs.forEach(o => {
      if (o.technician_id) {
        if (!map[o.technician_id]) {
          const t = technicians.find(t => t.id === o.technician_id);
          map[o.technician_id] = { id: o.technician_id, name: t?.full_name || o.technician_id, closed: 0, scheduled: 0, inProgress: 0 };
        }
        if (o.status === 'scheduled') map[o.technician_id].scheduled++;
        else if (o.status === 'in_progress') map[o.technician_id].inProgress++;
        else if (o.status === 'closed') map[o.technician_id].closed++;
      }
    });
    return Object.values(map).sort((a, b) => b.scheduled - a.scheduled);
  }, [filteredOTMs, technicians]);
  
  const maxTechScheduled = Math.max(...techData.map(t => t.scheduled), 1);
  const maxTechSub = Math.max(...techData.map(t => Math.max(t.closed, t.inProgress)), 1);

  const toggleTech = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTechs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const specialtyTimeData = useMemo(() => {
    const map: Record<string, { estimated: number; real: number; count: number }> = {};
    filteredOTMs.forEach(o => {
      const spec = o.failure_type || 'Otros';
      if (!map[spec]) map[spec] = { estimated: 0, real: 0, count: 0 };
      const est = o.estimated_time || 0;
      let real = o.net_execution_time || 0;
      if (!real && o.job_start_time && o.job_end_time) {
        real = (new Date(o.job_end_time).getTime() - new Date(o.job_start_time).getTime()) / 3600000;
      }
      if (est > 0 || real > 0) {
        map[spec].estimated += est;
        map[spec].real += real;
        map[spec].count++;
      }
    });
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        estimated: Number(data.estimated.toFixed(1)),
        real: Number(data.real.toFixed(1)),
        count: data.count
      }))
      .filter(item => item.estimated > 0 || item.real > 0)
      .sort((a, b) => b.real - a.real)
      .slice(0, 6);
  }, [filteredOTMs]);


  // --- TAB 3: CALIDAD Y SATISFACCIÓN ---
  const conformityOTMs = useMemo(() => {
    return filteredOTMs.filter(o => o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating > 0);
  }, [filteredOTMs]);

  const avgCSAT = useMemo(() => {
    if (conformityOTMs.length === 0) return 0;
    return Number((conformityOTMs.reduce((acc, o) => acc + o.conformity_rating!, 0) / conformityOTMs.length).toFixed(1));
  }, [conformityOTMs]);

  const totalConformidades = conformityOTMs.length;

  const feedbackRate = useMemo(() => {
    const closedCount = filteredOTMs.filter(o => o.status === 'closed').length;
    if (closedCount === 0) return 0;
    return Math.round((conformityOTMs.filter(o => o.status === 'closed').length / closedCount) * 100);
  }, [filteredOTMs, conformityOTMs]);

  const areaSatisfaction = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    filteredOTMs.forEach(o => {
      if (o.conformity_rating && o.area_sector) {
        if (!map[o.area_sector]) map[o.area_sector] = { sum: 0, count: 0 };
        map[o.area_sector].sum += o.conformity_rating;
        map[o.area_sector].count++;
      }
    });
    return Object.entries(map)
      .map(([area, data]) => ({
        area,
        rating: Number((data.sum / data.count).toFixed(1)),
        count: data.count
      }))
      .sort((a, b) => b.rating - a.rating || b.count - a.count)
      .slice(0, 8);
  }, [filteredOTMs]);

  const criticalFeedback = useMemo(() => {
    return filteredOTMs
      .filter(o => o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating <= 3 && o.conformity_rating > 0)
      .sort((a, b) => (a.conformity_rating || 0) - (b.conformity_rating || 0))
      .slice(0, 5);
  }, [filteredOTMs]);


  // --- TAB 4: PREVENTIVOS Y RECURSOS ---
  const totalRoutines = filteredRecords.length;
  const completedRoutines = useMemo(() => filteredRecords.filter(r => r.status === 'completed').length, [filteredRecords]);
  const routineCompliance = useMemo(() => {
    if (totalRoutines === 0) return 100;
    return Math.round((completedRoutines / totalRoutines) * 100);
  }, [totalRoutines, completedRoutines]);

  const totalContractor = useMemo(() => filteredOTMs.filter(o => o.assignment_type === 'contractor').length, [filteredOTMs]);
  
  const outsourcingRate = useMemo(() => {
    const assigned = filteredOTMs.filter(o => o.assignment_type).length;
    if (assigned === 0) return 0;
    return Math.round((totalContractor / assigned) * 100);
  }, [filteredOTMs, totalContractor]);

  const routineProgressData = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    filteredRecords.forEach(r => {
      const spec = r.specialty || 'General';
      if (!map[spec]) map[spec] = { total: 0, completed: 0 };
      map[spec].total++;
      if (r.status === 'completed') map[spec].completed++;
    });
    return Object.entries(map).map(([specialty, data]) => ({
      specialty,
      total: data.total,
      completed: data.completed,
      percent: Math.round((data.completed / data.total) * 100)
    })).sort((a, b) => b.total - a.total);
  }, [filteredRecords]);

  const maintenanceData = useMemo(() => {
    const map: Record<string, number> = { corrective: 0, preventive: 0, emergency: 0, support: 0 };
    filteredOTMs.forEach(o => {
      if (o.maintenance_type && o.maintenance_type in map) map[o.maintenance_type]++;
    });
    return Object.entries(map).map(([type, count]) => ({
      type,
      label: type === 'corrective' ? 'Correctivo' : type === 'preventive' ? 'Preventivo' : type === 'emergency' ? 'Emergencia' : 'Soporte',
      count
    }));
  }, [filteredOTMs]);
  const maxMaintenance = Math.max(...maintenanceData.map(m => m.count), 1);

  const workforceData = useMemo(() => {
    const own = filteredOTMs.filter(o => o.assignment_type === 'own').length;
    const contractor = filteredOTMs.filter(o => o.assignment_type === 'contractor').length;
    const total = own + contractor;
    return { own, contractor, total };
  }, [filteredOTMs]);


  // ================= DRILL-DOWN FILTERS LOGIC =================
  const drillDownOTMs = useMemo(() => {
    if (!activeDrillDownFilter) return [];
    const { type, value } = activeDrillDownFilter;
    switch (type) {
      case 'urgency':
        return filteredOTMs.filter(o => o.urgency === value);
      case 'area':
        return filteredOTMs.filter(o => o.area_sector === value);
      case 'technician':
        return filteredOTMs.filter(o => o.technician_id === value);
      case 'maintenance_type':
        return filteredOTMs.filter(o => o.maintenance_type === value);
      case 'assignment_type':
        return filteredOTMs.filter(o => o.assignment_type === value);
      case 'date_created':
        return filteredOTMs.filter(o => {
          const d = new Date(o.created_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === Number(value);
        });
      case 'date_closed':
        return filteredOTMs.filter(o => {
          if (!o.closed_at) return false;
          const d = new Date(o.closed_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === Number(value);
        });
      case 'kpi_overdue':
        return overdueOTMs;
      case 'kpi_high':
        return highPriority;
      case 'kpi_in_progress':
        return inProgress;
      case 'kpi_rq':
        return rqOTMs;
      case 'kpi_active':
        return activeOTMs;
      case 'kpi_new':
        return baseOtms.filter(o => new Date(o.created_at) >= monthStart);
      case 'kpi_closed':
        return baseOtms.filter(o => o.closed_at && new Date(o.closed_at) >= monthStart);
      case 'quality_rating':
        return filteredOTMs.filter(o => o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating > 0 && (value === 'critical' ? o.conformity_rating <= 3 : String(o.conformity_rating) === value));
      default:
        return [];
    }
  }, [activeDrillDownFilter, filteredOTMs, overdueOTMs, highPriority, inProgress, rqOTMs, activeOTMs, baseOtms, monthStart]);

  const drillDownRoutines = useMemo(() => {
    if (!activeDrillDownFilter || activeDrillDownFilter.type !== 'routine_specialty') return [];
    return filteredRecords.filter(r => r.specialty === activeDrillDownFilter.value);
  }, [activeDrillDownFilter, filteredRecords]);


  // Handler helper
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value as DateFilterType);
    if (e.target.value !== 'custom') {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const clearDrillDown = () => {
    setActiveDrillDownFilter(null);
    setSelectedDrillDownOTM(null);
    setSelectedDrillDownRoutine(null);
  };

  const applyDrillDown = (type: string, value: string, label: string) => {
    setActiveDrillDownFilter({ type, value, label });
    setSelectedDrillDownOTM(null);
    setSelectedDrillDownRoutine(null);
    // Smooth scroll down to details
    setTimeout(() => {
      const el = document.getElementById('drilldown-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div>

      {/* Filters Banner */}
      <div className="glass-card" style={{ position: 'relative', zIndex: 20, marginBottom: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 200, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0, color: 'var(--text-muted)' }}>Elegir Supervisor:</label>
            <select className="form-select" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={supervisorFilter} onChange={e => { setSupervisorFilter(e.target.value); clearDrillDown(); }}>
              <option value="">Todos los Supervisores</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          {/* Generar Reporte Dropdown */}
          <div style={{ position: 'relative', alignSelf: 'flex-end' }}>
            <button
              onClick={() => setShowReportDropdown(!showReportDropdown)}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                height: '38px',
                cursor: 'pointer',
                borderRadius: '8px',
                color: 'white'
              }}
            >
              <span>📊</span>
              <span>Generar Reporte</span>
              <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>▼</span>
            </button>
            
            {showReportDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowReportDropdown(false)} />
                <div className="slide-down glass-card" style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
                  minWidth: '220px', padding: '6px', display: 'flex', flexDirection: 'column',
                  gap: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)', borderRadius: '8px'
                }}>
                  {[
                    { type: 'basic', label: '📄 Reporte Básico', desc: 'Resumen rápido de 1 Página' },
                    { type: 'executive', label: '📈 Reporte Ejecutivo', desc: 'Presentación de 3 Páginas' },
                    { type: 'detailed', label: '📋 Reporte Detallado', desc: 'Auditoría completa de 4 Páginas' }
                  ].map(opt => (
                    <button
                      key={opt.type}
                      onClick={() => {
                        setReportType(opt.type as any);
                        setReportModalOpen(true);
                        setShowReportDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px', textAlign: 'left', background: 'transparent',
                        border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex',
                        flexDirection: 'column', gap: '2px', transition: 'background 0.2s',
                        width: '100%'
                      }}
                      className="report-opt-btn"
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0, color: 'var(--text-muted)' }}>Periodo:</label>
            <select className="form-select" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={dateFilter} onChange={e => { handleDateFilterChange(e); clearDrillDown(); }}>
              <option value="today">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="3months">Últimos 3 Meses</option>
              <option value="year">Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0, color: 'var(--text-muted)' }}>Desde:</label>
            <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: '0.8rem' }} 
              value={customStart} onChange={e => { setCustomStart(e.target.value); setDateFilter('custom'); clearDrillDown(); }} />
          </div>
          <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', margin: 0, color: 'var(--text-muted)' }}>Hasta:</label>
            <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: '0.8rem' }} 
              value={customEnd} onChange={e => { setCustomEnd(e.target.value); setDateFilter('custom'); clearDrillDown(); }} />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'operations', label: 'Operaciones', icon: '📊', desc: 'Demanda y flujo general' },
          { id: 'efficiency', label: 'Eficiencia', icon: '⚡', desc: 'Desempeño y tiempos' },
          { id: 'quality', label: 'Calidad y CSAT', icon: '⭐', desc: 'Satisfacción y actas' },
          { id: 'preventive', label: 'Preventivos', icon: '🛡️', desc: 'Planificados y contratas' },
          { id: 'tech-requests', label: 'Solicitudes Técnicos', icon: '🔧', desc: 'Requerimientos de personal' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                clearDrillDown();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: isActive ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                cursor: 'pointer',
                background: isActive ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                color: isActive ? vibrant.blue : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                minWidth: 140,
                textAlign: 'left'
              }}
              className="tab-button"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', fontWeight: isActive ? 800 : 600 }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
              <span style={{ fontSize: '0.65rem', color: isActive ? vibrant.blue : 'var(--text-muted)', fontWeight: 400 }}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Contents */}

      {/* ================= TAB 1: OPERACIONES ================= */}
      {activeTab === 'operations' && (
        <div className="tab-fade">
          {/* KPI Cards */}
          <div className="kpi-mobile-small" style={{ marginBottom: 28 }}>
            {[
              { label: 'OTMs En Curso', value: activeOTMs.length, color: vibrant.blue, icon: '📊', type: 'kpi_active', labelDesc: 'En proceso o programadas' },
              { label: 'Alta Prioridad', value: highPriority.length, color: vibrant.orange, icon: '🔥', type: 'kpi_high', labelDesc: 'Urgencia crítica' },
              { label: 'RQ Suministros/Serv.', value: rqOTMs.length, color: vibrant.yellow, icon: '📦', type: 'kpi_rq', labelDesc: 'En espera de logísitica' },
              { label: 'Creadas vs Cerradas', value: `${newThisMonth.length} / ${closedThisMonth.length}`, color: vibrant.purple, icon: '📈', type: 'kpi_new', labelDesc: 'Balance absoluto del mes' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="kpi-card hover-glow"
                style={{ 
                  '--kpi-color': kpi.color,
                  boxShadow: `0 8px 24px ${kpi.color}10`,
                  border: `1px solid ${kpi.color}22`,
                  cursor: 'pointer',
                } as any}
                onClick={() => applyDrillDown(kpi.type, 'all', kpi.label)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value" style={{ fontSize: '1.6rem', fontWeight: 900 }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.labelDesc}</div>
                  </div>
                  <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid-3" style={{ marginBottom: 28 }}>
            {/* Daily Balance */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Balance Diario (Línea)
              </h3>
              <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ width: 12, height: 4, borderRadius: 2, background: vibrant.blue, display: 'inline-block' }}></span> Creadas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ width: 12, height: 4, borderRadius: 2, background: vibrant.green, display: 'inline-block' }}></span> Cerradas
                </span>
              </div>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '170px' }}>
                <defs>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={vibrant.blue} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={vibrant.blue} stopOpacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={vibrant.green} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={vibrant.green} stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                  <line key={i} x1={padL} x2={chartW - padR} y1={toY(f * maxDaily)} y2={toY(f * maxDaily)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                ))}
                {[0, Math.ceil(maxDaily / 2), maxDaily].map((v, i) => (
                  <text key={i} x={padL - 6} y={toY(v) + 3} fill="#64748b" fontSize="9" fontWeight="700" textAnchor="end">{v}</text>
                ))}
                <path d={createdAreaPath} fill="url(#createdGrad)" />
                <path d={resolvedAreaPath} fill="url(#resolvedGrad)" />
                <path d={createdPath} fill="none" stroke={vibrant.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={resolvedPath} fill="none" stroke={vibrant.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {dailyData.map((d, i) => (
                  <React.Fragment key={i}>
                    <circle cx={toX(i)} cy={toY(d.created)} r="4.5" fill={vibrant.blue} stroke="#ffffff" strokeWidth="2" style={{ cursor: 'pointer' }}
                      onClick={() => applyDrillDown('date_created', String(d.date.getTime()), `Creadas el ${d.label}`)} />
                    <circle cx={toX(i)} cy={toY(d.resolved)} r="4.5" fill={vibrant.green} stroke="#ffffff" strokeWidth="2" style={{ cursor: 'pointer' }}
                      onClick={() => applyDrillDown('date_closed', String(d.date.getTime()), `Cerradas el ${d.label}`)} />
                    {i % 2 === 0 && <text x={toX(i)} y={chartH - 4} fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">{d.label}</text>}
                  </React.Fragment>
                ))}
              </svg>
            </div>

            {/* Area Breakdown */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Distribución por Área (Club)
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '200px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {areaData.length > 0 ? areaData.map(([area, count], i) => {
                    const areaColors = [vibrant.blue, vibrant.green, vibrant.orange, vibrant.purple, vibrant.coral, vibrant.yellow];
                    const color = areaColors[i % areaColors.length];
                    return (
                      <div key={area} style={{ cursor: 'pointer' }} onClick={() => applyDrillDown('area', area, `Área: ${area}`)} className="tech-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{area}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${(count / maxArea) * 100}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.6s ease' }}></div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>Sin datos disponibles</div>
                  )}
                </div>
              </div>
            </div>

            {/* Priority Doughnut */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Prioridad de Actividades
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, height: '150px' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                  <svg viewBox="0 0 100 100" className="animated-doughnut" style={{ width: '100%', height: '100%' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
                    {doughnutItems.map(item => item.count > 0 && (
                      <circle key={item.key} cx="50" cy="50" r="40" fill="none" stroke={item.color} strokeWidth="11" strokeDasharray={item.strokeDasharray} strokeDashoffset={item.strokeDashoffset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.6s ease', cursor: 'pointer' }}
                        onClick={() => applyDrillDown('urgency', item.key, `Urgencia: ${item.label}`)} />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{priorityData.total}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>OTMs</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {doughnutItems.map((item) => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => applyDrillDown('urgency', item.key, `Urgencia: ${item.label}`)}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1.1 }}>{item.label}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.count} ({item.percent}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: EFICIENCIA ================= */}
      {activeTab === 'efficiency' && (
        <div className="tab-fade">
          {/* KPI Cards */}
          <div className="kpi-mobile-small" style={{ marginBottom: 28 }}>
            {[
              { label: 'OTMs Vencidas', value: overdueOTMs.length, color: vibrant.coral, icon: '⏰', type: 'kpi_overdue', labelDesc: 'SLA excedido' },
              { label: 'Promedio de Respuesta', value: `${avgResponseTime}h`, color: vibrant.blue, icon: '⏱️', type: 'kpi_active', labelDesc: 'Creación ➔ Inicio' },
              { label: 'Tiempo Neto Ejecución', value: `${avgExecutionTime}h`, color: vibrant.green, icon: '🔧', type: 'kpi_active', labelDesc: 'En horas hombre' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="kpi-card hover-glow"
                style={{ 
                  '--kpi-color': kpi.color,
                  boxShadow: `0 8px 24px ${kpi.color}10`,
                  border: `1px solid ${kpi.color}22`,
                  cursor: kpi.type === 'kpi_overdue' ? 'pointer' : 'default',
                } as any}
                onClick={kpi.type === 'kpi_overdue' ? () => applyDrillDown(kpi.type, 'all', kpi.label) : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value" style={{ fontSize: '1.6rem', fontWeight: 900 }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.labelDesc}</div>
                  </div>
                  <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            {/* OTMs por Técnico */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Carga por Técnico (Programado / En Proceso)
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '280px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {techData.length > 0 ? techData.map((t) => {
                    const isExpanded = expandedTechs[t.id];
                    return (
                      <div key={t.id} style={{ cursor: 'pointer' }} onClick={() => applyDrillDown('technician', t.id, `Técnico: ${t.name}`)} className="tech-row">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                onClick={(e) => toggleTech(t.id, e)}
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', fontSize: '0.6rem', padding: '4px', cursor: 'pointer' }}>▶</span>
                              {t.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.scheduled} programadas</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${(t.scheduled / maxTechScheduled) * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${vibrant.blue}, ${vibrant.purple})`, transition: 'width 0.6s ease' }}></div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="slide-down" style={{ marginTop: 8, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>✔️ Cerradas</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: vibrant.purple }}>{t.closed}</span>
                              </div>
                              <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 2.5, overflow: 'hidden' }}>
                                <div style={{ width: `${(t.closed / maxTechSub) * 100}%`, height: '100%', background: vibrant.purple, borderRadius: 2.5 }}></div>
                              </div>
                            </div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⚙️ En Proceso</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: vibrant.green }}>{t.inProgress}</span>
                              </div>
                              <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 2.5, overflow: 'hidden' }}>
                                <div style={{ width: `${(t.inProgress / maxTechSub) * 100}%`, height: '100%', background: vibrant.green, borderRadius: 2.5 }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>No hay técnicos programados</div>
                  )}
                </div>
              </div>
            </div>

            {/* Estimated vs Real Specialty times */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Tiempos Estimados vs Reales por Especialidad
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '280px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {specialtyTimeData.length > 0 ? specialtyTimeData.map(spec => (
                    <div key={spec.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }} onClick={() => applyDrillDown('area', spec.name, `Tiempos de Especialidad: ${spec.name}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{spec.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({spec.count} OTMs con tiempos)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                        {/* Estimated Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 80, fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>Estimado:</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${(spec.estimated / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`, height: '100%', background: vibrant.blue, borderRadius: 3 }}></div>
                          </div>
                          <span style={{ width: 45, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{spec.estimated}h</span>
                        </div>
                        {/* Real Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 80, fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>Real:</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${(spec.real / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`,
                              height: '100%',
                              background: spec.real > spec.estimated ? vibrant.coral : vibrant.green,
                              borderRadius: 3
                            }}></div>
                          </div>
                          <span style={{ width: 45, fontSize: '0.7rem', fontWeight: 700, color: spec.real > spec.estimated ? vibrant.coral : vibrant.green }}>{spec.real}h</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>No hay registros de tiempo en este periodo</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CALIDAD ================= */}
      {activeTab === 'quality' && (
        <div className="tab-fade">
          {/* KPI Cards */}
          <div className="kpi-mobile-small" style={{ marginBottom: 28 }}>
            {[
              { label: 'Satisfacción Global', value: `${avgCSAT} / 5.0 ⭐`, color: vibrant.yellow, icon: '⭐', type: 'rated_all', labelDesc: 'Feedback del solicitante' },
              { label: 'Total Conformidades', value: totalConformidades, color: vibrant.green, icon: '✍️', type: 'rated_all', labelDesc: 'Actas firmadas en el periodo' },
              { label: 'Tasa de Feedback', value: `${feedbackRate}%`, color: vibrant.purple, icon: '💬', type: 'rated_all', labelDesc: 'De OTMs cerradas totales' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="kpi-card hover-glow"
                style={{ 
                  '--kpi-color': kpi.color,
                  boxShadow: `0 8px 24px ${kpi.color}10`,
                  border: `1px solid ${kpi.color}22`,
                  cursor: 'pointer',
                } as any}
                onClick={() => applyDrillDown('quality_rating', 'all', 'OTMs con Calificación')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value" style={{ fontSize: '1.6rem', fontWeight: 900 }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.labelDesc}</div>
                  </div>
                  <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            {/* Satisfaction Ranking */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Satisfacción Promedio por Área (Club)
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '280px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {areaSatisfaction.length > 0 ? areaSatisfaction.map(item => (
                    <div key={item.area} style={{ cursor: 'pointer' }} onClick={() => applyDrillDown('area', item.area, `Satisfacción en ${item.area}`)} className="tech-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.area}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.rating} ⭐</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({item.count} conformidades)</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(item.rating / 5) * 100}%`, height: '100%', borderRadius: 3, background: item.rating >= 4 ? vibrant.green : item.rating >= 3 ? vibrant.orange : vibrant.coral, transition: 'width 0.6s ease' }}></div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>No hay actas de conformidad para computar ranking</div>
                  )}
                </div>
              </div>
            </div>

            {/* Critical Feedback Alerts */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: vibrant.coral, marginBottom: 20 }}>
                ⚠️ Alertas de Feedback Crítico (≤ 3 Estrellas)
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '280px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {criticalFeedback.length > 0 ? criticalFeedback.map(o => (
                    <div
                      key={o.id}
                      className="glass-card tech-row"
                      style={{ 
                        padding: 12, 
                        borderLeft: `4px solid ${vibrant.coral}`, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 6, 
                        cursor: 'pointer', 
                        background: 'rgba(244, 63, 94, 0.03)',
                        borderRadius: '0 8px 8px 0'
                      }}
                      onClick={() => applyDrillDown('quality_rating', 'critical', `Feedback Crítico (≤3 estrellas)`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{o.otm_code}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e' }}>{'⭐'.repeat(o.conformity_rating)}{'☆'.repeat(5 - o.conformity_rating)}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{o.conformity_notes || 'Sin comentarios adicionales'}"
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        <span>📍 {o.area_sector}</span>
                        <span>Solicitante: {o.requester_name}</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: vibrant.green, fontSize: '0.8rem', textAlign: 'center', padding: '50px 0', fontWeight: 600 }}>
                      ✨ ¡Gran Trabajo! No se registraron calificaciones bajas en el periodo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PREVENTIVOS ================= */}
      {activeTab === 'preventive' && (
        <div className="tab-fade">
          {/* KPI Cards */}
          <div className="kpi-mobile-small" style={{ marginBottom: 28 }}>
            {[
              { label: 'Cumplimiento Preventivos', value: `${routineCompliance}%`, color: vibrant.purple, icon: '🛡️', type: 'routine_compliance', labelDesc: 'Rutinas Completadas vs Totales' },
              { label: 'Trabajos Tercerizados', value: totalContractor, color: vibrant.blue, icon: '🏗️', type: 'assignment_contractor', labelDesc: 'Ejecutados por Contratistas' },
              { label: 'Tasa de Tercerización', value: `${outsourcingRate}%`, color: vibrant.indigo, icon: '📈', type: 'assignment_contractor', labelDesc: 'Terceros vs Asignaciones Totales' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="kpi-card hover-glow"
                style={{ 
                  '--kpi-color': kpi.color,
                  boxShadow: `0 8px 24px ${kpi.color}10`,
                  border: `1px solid ${kpi.color}22`,
                  cursor: kpi.type === 'assignment_contractor' ? 'pointer' : 'default',
                } as any}
                onClick={kpi.type === 'assignment_contractor' ? () => applyDrillDown('assignment_type', 'contractor', 'Trabajos de Mantenimiento por Terceros') : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value" style={{ fontSize: '1.6rem', fontWeight: 900 }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.labelDesc}</div>
                  </div>
                  <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-3" style={{ marginBottom: 28 }}>
            {/* Progress of Routines by Specialty */}
            <div className="glass-card hover-glow" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Cumplimiento de Rutinas por Especialidad (Rutinarios)
              </h3>
              <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none', maxHeight: '250px', overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {routineProgressData.length > 0 ? routineProgressData.map(item => (
                    <div key={item.specialty} style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }} onClick={() => applyDrillDown('routine_specialty', item.specialty, `Actividades Rutinarias: ${item.specialty}`)} className="tech-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.specialty}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{item.completed} / {item.total} completadas ({item.percent}%)</span>
                      </div>
                      <div style={{ height: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${item.percent}%`, height: '100%', background: `linear-gradient(90deg, ${vibrant.purple}, ${vibrant.indigo})`, borderRadius: 6, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>No hay registros de rutinas planificadas en el periodo</div>
                  )}
                </div>
              </div>
            </div>

            {/* Maintenance types */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Tipos de Trabajo
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: 10, paddingBottom: 15 }}>
                {maintenanceData.map((m, i) => {
                  const colors = [vibrant.blue, vibrant.green, vibrant.orange, vibrant.purple];
                  const color = colors[i % colors.length];
                  const heightPercent = (m.count / maxMaintenance) * 100;
                  return (
                    <div key={m.type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                      onClick={() => applyDrillDown('maintenance_type', m.type, `Tipo de Mantenimiento: ${m.label}`)}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{m.count}</span>
                      <div style={{ width: '24px', height: `${heightPercent || 4}%`, background: `linear-gradient(180deg, ${color}, ${color}cc)`, borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease', boxShadow: `0 4px 12px ${color}1a` }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 8, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            {/* Workforce Own vs Contractor split */}
            <div className="glass-card hover-glow">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Fuerza Laboral (Personal Propio vs Contratistas)
              </h3>
              <div style={{ padding: '10px 0' }}>
                <div style={{ height: 26, borderRadius: 13, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                  <div
                    onClick={() => applyDrillDown('assignment_type', 'own', 'OTMs Asignadas a Personal Propio')}
                    style={{
                      width: `${workforceData.total > 0 ? (workforceData.own / workforceData.total) * 100 : 50}%`,
                      background: `linear-gradient(90deg, ${vibrant.blue}, #0284c7)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      transition: 'width 0.6s ease'
                    }}
                    title="Personal Propio"
                  >
                    {workforceData.total > 0 ? `${Math.round((workforceData.own / workforceData.total) * 100)}%` : 'Propio'}
                  </div>
                  <div
                    onClick={() => applyDrillDown('assignment_type', 'contractor', 'OTMs Asignadas a Contratistas')}
                    style={{
                      width: `${workforceData.total > 0 ? (workforceData.contractor / workforceData.total) * 100 : 50}%`,
                      background: `linear-gradient(90deg, ${vibrant.purple}, #7e22ce)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      transition: 'width 0.6s ease'
                    }}
                    title="Contratistas"
                  >
                    {workforceData.total > 0 ? `${Math.round((workforceData.contractor / workforceData.total) * 100)}%` : 'Contratistas'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => applyDrillDown('assignment_type', 'own', 'OTMs Asignadas a Personal Propio')}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: vibrant.blue }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Propio ({workforceData.own} OTMs)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => applyDrillDown('assignment_type', 'contractor', 'OTMs Asignadas a Contratistas')}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: vibrant.purple }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contratas ({workforceData.contractor} OTMs)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General instruction card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 40px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛡️</div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Cumplimiento Preventivo Activo</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 300 }}>
                Haga clic en las barras de avance por Especialidad para desplegar el listado de actividades rutinarias del periodo filtrado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SOLICITUDES DE TÉCNICOS ================= */}
      {activeTab === 'tech-requests' && (() => {
        const filteredRequests = techRequests.filter(r => {
          if (techReqTypeFilter && r.request_type !== techReqTypeFilter) return false;
          if (techReqStatusFilter && r.status !== techReqStatusFilter) return false;
          if (techReqSearch) {
            const term = techReqSearch.toLowerCase();
            return (
              r.technician_name.toLowerCase().includes(term) ||
              r.description.toLowerCase().includes(term) ||
              (r.otm_code || '').toLowerCase().includes(term)
            );
          }
          return true;
        });

        const getStatusBadge = (status: string) => {
          const configs: Record<string, { label: string; bg: string; color: string }> = {
            pending: { label: 'Pendiente', bg: '#fef3c7', color: '#b45309' },
            approved: { label: 'Aprobado', bg: '#e0f2fe', color: '#0369a1' },
            rejected: { label: 'Rechazado', bg: '#fee2e2', color: '#b91c1c' },
            attended: { label: 'Atendido', bg: '#d1fae5', color: '#047857' },
          };
          const c = configs[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
          return (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: c.bg, color: c.color, border: `1.5px solid ${c.color}22`, textTransform: 'uppercase' }}>
              {c.label}
            </span>
          );
        };

        const getTypeDetails = (type: string) => {
          const configs: Record<string, { label: string; icon: string; color: string }> = {
            material: { label: 'Materiales', icon: '📦', color: '#0ea5e9' },
            tool: { label: 'Herramienta', icon: '🔧', color: '#a855f7' },
            observation: { label: 'Obs. Máquina', icon: '⚙️', color: '#f59e0b' },
            other: { label: 'Otro', icon: '📝', color: '#64748b' },
          };
          return configs[type] || { label: type, icon: '📝', color: '#64748b' };
        };

        return (
          <div className="tab-fade">
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📋 Requerimientos y Alertas del Personal Técnico ({filteredRequests.length})
                </h3>
                
                {/* Search & Filters */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar por técnico, OTM o detalle..."
                    value={techReqSearch}
                    onChange={e => setTechReqSearch(e.target.value)}
                    style={{ width: 240, padding: '6px 12px', fontSize: '0.85rem', marginBottom: 0 }}
                  />
                  <select
                    className="form-select"
                    value={techReqTypeFilter}
                    onChange={e => setTechReqTypeFilter(e.target.value)}
                    style={{ width: 150, padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="material">📦 Materiales</option>
                    <option value="tool">🔧 Herramientas</option>
                    <option value="observation">⚙️ Obs. Máquina</option>
                    <option value="other">📝 Otros</option>
                  </select>
                  <select
                    className="form-select"
                    value={techReqStatusFilter}
                    onChange={e => setTechReqStatusFilter(e.target.value)}
                    style={{ width: 150, padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    <option value="">Todos los estados</option>
                    <option value="pending">🟨 Pendiente</option>
                    <option value="approved">🟦 Aprobado</option>
                    <option value="rejected">🟥 Rechazado</option>
                    <option value="attended">🟩 Atendido</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="glass-card empty-state" style={{ padding: '48px 20px' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🔧</div>
                <h4 className="empty-state-title" style={{ fontSize: '1rem', marginTop: 10 }}>Sin solicitudes encontradas</h4>
                <p className="empty-state-text" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                  No se encontraron solicitudes que coincidan con los filtros seleccionados.
                </p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'white', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Técnico / Especialidad</th>
                      <th>Tipo</th>
                      <th>Detalle de Requerimiento</th>
                      <th>OTM Asociada</th>
                      <th>Estado</th>
                      <th>Comentarios de Supervisión</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(req => {
                      const typeConfig = getTypeDetails(req.request_type);
                      return (
                        <tr key={req.id}>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(req.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{req.technician_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{req.specialty.replace(/^\d+\.\s*/, '')}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: typeConfig.color }}>
                              {typeConfig.icon} {typeConfig.label}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{req.description}</div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {req.otm_code ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'rgba(14,165,233,0.06)', padding: '3px 8px', borderRadius: 6 }}>
                                {req.otm_code}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>
                          <td>{getStatusBadge(req.status)}</td>
                          <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {req.supervisor_response ? (
                              <div style={{ fontStyle: 'italic', color: 'var(--accent-emerald)', borderLeft: '2px solid var(--accent-emerald)', paddingLeft: 6 }}>
                                {req.supervisor_response}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>Sin responder</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                setSelectedRequestForResponse(req);
                                setNewRequestStatus(req.status);
                                setSupervisorResponseText(req.supervisor_response || '');
                                setIsResponseModalOpen(true);
                              }}
                              style={{
                                background: 'rgba(14, 165, 233, 0.08)',
                                border: '1px solid rgba(14, 165, 233, 0.15)',
                                color: 'var(--accent-blue)',
                                borderRadius: 8,
                                fontWeight: 700,
                                padding: '6px 12px',
                                fontSize: '0.75rem'
                              }}
                            >
                              ✍️ Responder
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}


      {/* ================= GLOBAL DRILL-DOWN PANEL ================= */}
      {activeDrillDownFilter && (
        <div id="drilldown-panel" className="slide-down glass-card" style={{ marginTop: 12, padding: 24, borderTop: `4px solid ${vibrant.blue}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: vibrant.blue, letterSpacing: '0.05em' }}>
                📍 Detalle Operativo de Actividades
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {activeDrillDownFilter.label}
              </h3>
            </div>
            <button
              onClick={clearDrillDown}
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              <span>❌</span> Limpiar Filtro
            </button>
          </div>

          {/* Render Routine Records Drill-down */}
          {activeDrillDownFilter.type === 'routine_specialty' ? (
            <div>
              {drillDownRoutines.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No se encontraron actividades rutinarias registradas en este sub-grupo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {drillDownRoutines.map(rec => {
                    const isExpanded = selectedDrillDownRoutine === rec.id;
                    return (
                      <div
                        key={rec.id}
                        className="glass-card tech-row"
                        style={{ padding: '16px 20px', borderLeft: `4px solid ${vibrant.purple}`, borderRadius: '0 8px 8px 0', cursor: 'pointer' }}
                        onClick={() => setSelectedDrillDownRoutine(isExpanded ? null : rec.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: vibrant.purple }}>🛡️ {rec.specialty}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>— {rec.sub_specialty}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              📅 {new Date(rec.record_date + 'T12:00:00').toLocaleDateString('es-ES')} | ⏱️ {rec.start_time} - {rec.end_time || 'En curso'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Técnico: {technicians.find(t => t.id === rec.technician_id)?.full_name || rec.technician_id}
                            </span>
                            <span style={{ background: rec.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: rec.status === 'completed' ? vibrant.green : vibrant.yellow, padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700 }}>
                              {rec.status === 'completed' ? 'Completado' : 'En Curso'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="slide-down" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {rec.notes && (
                              <div>
                                <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>Notas:</strong>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{rec.notes}</p>
                              </div>
                            )}
                            
                            {/* Answers List */}
                            {rec.answers && Object.keys(rec.answers).length > 0 && (
                              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                                <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>📋 Respuestas de la Ficha Técnica:</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {Object.entries(rec.answers).map(([key, val]) => (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: 4, fontSize: '0.75rem' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Photos */}
                            {rec.photos && rec.photos.length > 0 && (
                              <div>
                                <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>📷 Fotos de Registro:</strong>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {rec.photos.map((p, idx) => (
                                    <a key={idx} href={p} target="_blank" rel="noreferrer" style={{ display: 'block', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                      <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Evidencia de Rutina" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Render OTMs Drill-down list */
            <div>
              {drillDownOTMs.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No se encontraron OTMs que correspondan a esta combinación de filtros.
                </div>
              ) : (
                <div className="flex-col gap-3 scrollable-list-container" style={{ padding: '4px 10px', maxHeight: '500px', overflowY: 'auto' }}>
                  {drillDownOTMs.map(otm => {
                    const urgencyColors = { high: vibrant.coral, medium: vibrant.orange, low: vibrant.green };
                    const urgencyColor = urgencyColors[otm.urgency] || '#cbd5e1';
                    const isExpanded = selectedDrillDownOTM === otm.id;
                    return (
                      <div
                        key={otm.id}
                        className="glass-card dashboard-list-card"
                        style={{
                          cursor: 'pointer',
                          padding: '16px 20px',
                          borderLeft: `4px solid ${urgencyColor}`,
                          borderRadius: '0 8px 8px 0',
                          transition: 'all 0.25s ease'
                        }}
                        onClick={() => setSelectedDrillDownOTM(isExpanded ? null : otm.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: vibrant.blue }}>{otm.otm_code}</span>
                              <StatusBadge status={otm.status} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Urgercia: {otm.urgency.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              {otm.failure_type} | {new Date(otm.created_at).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>📍 {otm.area_sector}</span>
                            <span>Solicitado por: {otm.requester_name}</span>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="slide-down" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}><strong>Descripción:</strong> {otm.description}</p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Sede/Ubicación: {otm.location || 'Sede Principal'} — {otm.exact_location}<br />
                              Mantenimiento: {otm.maintenance_type ? otm.maintenance_type.toUpperCase() : 'NO DEFINIDO'}
                            </div>

                            {/* OTM Attachments */}
                            {otm.attachments && otm.attachments.length > 0 && (
                              <div>
                                <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>Evidencia Fotográfica:</strong>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                  {otm.attachments.map(att => (
                                    <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                      <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Evidencia" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Estimated Times vs execution */}
                            {(otm.estimated_time || otm.net_execution_time) && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                                <div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Tiempo Estimado</span>
                                  <strong style={{ fontSize: '0.85rem', color: vibrant.blue }}>{otm.estimated_time || '—'} horas</strong>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Tiempo de Ejecución Registrado</span>
                                  <strong style={{ fontSize: '0.85rem', color: otm.net_execution_time > otm.estimated_time ? vibrant.coral : vibrant.green }}>
                                    {otm.net_execution_time || '—'} horas
                                  </strong>
                                </div>
                              </div>
                            )}

                            {/* RQ progress */}
                            {otm.rq_type && (
                              <div style={{ padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>📋 {otm.rq_type === 'supply' ? 'REQUERIMIENTO DE SUMINISTRO' : 'REQUERIMIENTO DE SERVICIO'}</span>
                                  {otm.rq_date && <span>📅 {new Date(otm.rq_date).toLocaleDateString('es-ES')}</span>}
                                </div>
                                {otm.rq_type === 'supply' && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                                    Material: <strong>{otm.rq_materials}</strong> | Cantidad: <strong>{otm.rq_quantities}</strong>
                                  </div>
                                )}
                                {otm.rq_type === 'service' && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                                    Servicio: <strong>{otm.rq_service_desc}</strong> | Tipo: <strong>{otm.rq_magnitude === 'integral' ? 'Integral' : 'Puntual'}</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Assignee information */}
                            {otm.assignment_type === 'own' && otm.technician_id && (
                              <div style={{ padding: 12, background: 'rgba(14,165,233,0.06)', borderRadius: 8, border: '1px solid rgba(14,165,233,0.12)' }}>
                                <strong style={{ fontSize: '0.75rem', color: vibrant.blue, display: 'block' }}>🔧 Personal Asignado:</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                                  Técnico: <strong>{users.find(u => u.id === otm.technician_id)?.full_name || '—'}</strong> 
                                  {otm.scheduled_date && ` | Programado para el: ${new Date(otm.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES')}`}
                                </span>
                              </div>
                            )}

                            {otm.assignment_type === 'contractor' && (
                              <div style={{ padding: 12, background: 'rgba(168,85,247,0.06)', borderRadius: 8, border: '1px solid rgba(168,85,247,0.12)' }}>
                                <strong style={{ fontSize: '0.75rem', color: vibrant.purple, display: 'block' }}>🏗️ Servicio Tercerizado:</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                                  Contratista: <strong>{otm.contractor_name || '—'}</strong>
                                  {otm.contractor_date && ` | Fecha Programada: ${new Date(otm.contractor_date + 'T12:00:00').toLocaleDateString('es-ES')}`}
                                </span>
                              </div>
                            )}

                            {/* Conformity score details */}
                            {otm.status === 'closed' && otm.conformity_rating && (
                              <div style={{ padding: 12, background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.12)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.75rem', color: vibrant.green }}>✍️ Conformidad del Solicitante:</strong>
                                  <span>{'⭐'.repeat(otm.conformity_rating)}{'☆'.repeat(5 - otm.conformity_rating)} ({otm.conformity_rating} / 5)</span>
                                </div>
                                {otm.conformity_notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>"{otm.conformity_notes}"</p>}
                                {otm.conformity_date && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Fecha de Cierre: {new Date(otm.conformity_date).toLocaleDateString('es-ES')}</span>}
                              </div>
                            )}

                            {/* Supervisor / Technician Notes */}
                            {otm.supervisor_notes && (
                              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderLeft: '2px solid var(--text-muted)', borderRadius: '0 4px 4px 0' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Notas del Supervisor:</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{otm.supervisor_notes}</p>
                              </div>
                            )}
                            {otm.technician_notes && (
                              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderLeft: '2px solid var(--text-muted)', borderRadius: '0 4px 4px 0' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Notas del Técnico en Ejecución:</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{otm.technician_notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Modal Integration */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        otms={filteredOTMs}
        records={filteredRecords}
        type={reportType}
        dateLimits={dateLimits}
        supervisorFilter={supervisorFilter}
        supervisorName={currentSupervisorName}
        users={users}
      />

      {/* Supervisor Response Modal */}
      {isResponseModalOpen && selectedRequestForResponse && (
        <div className="modal-overlay" onClick={() => setIsResponseModalOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>
                  ✍️ Responder a Técnico
                </span>
                <h3 className="modal-title" style={{ margin: '4px 0 0', fontSize: '1.2rem' }}>
                  Solicitud de {selectedRequestForResponse.technician_name}
                </h3>
              </div>
              <button onClick={() => setIsResponseModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>Detalle de Solicitud:</strong>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{selectedRequestForResponse.description}</div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateTechRequestStatus(selectedRequestForResponse.id, newRequestStatus, supervisorResponseText);
              setIsResponseModalOpen(false);
              setSelectedRequestForResponse(null);
              alert('¡Respuesta guardada y notificada al técnico!');
            }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label">Asignar Estado</label>
                <select 
                  className="form-select"
                  value={newRequestStatus}
                  onChange={e => setNewRequestStatus(e.target.value as any)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="pending">🟨 Pendiente</option>
                  <option value="approved">🟦 Aprobado</option>
                  <option value="rejected">🟥 Rechazado</option>
                  <option value="attended">🟩 Atendido</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Comentarios / Respuesta</label>
                <textarea
                  className="form-textarea"
                  value={supervisorResponseText}
                  onChange={e => setSupervisorResponseText(e.target.value)}
                  placeholder="Escribe la respuesta del supervisor (ej: 'Aprobado, favor retirar de almacén', 'Revisar OTM primero', etc.)"
                  style={{ minHeight: 90, fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsResponseModalOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                    color: 'white',
                  }}
                >
                  Guardar Respuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled components */}
      <style>{`
        .tab-fade {
          animation: tabFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-button:hover {
          background: rgba(14, 165, 233, 0.05) !important;
          color: var(--accent-blue) !important;
        }
        .tech-row {
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .tech-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .hover-glow {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(14, 165, 233, 0.08) !important;
          border-color: rgba(14, 165, 233, 0.3) !important;
        }
        .dashboard-list-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dashboard-list-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }
        .slide-down {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          overflow: hidden;
          transform-origin: top;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: scaleY(0.95); }
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
        .report-opt-btn:hover {
          background: rgba(124, 58, 237, 0.08) !important;
        }
        .report-opt-btn:hover span {
          color: var(--accent-purple) !important;
        }
      `}</style>
    </div>
  );
}
