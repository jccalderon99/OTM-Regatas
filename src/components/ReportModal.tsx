// @ts-nocheck
import React, { useMemo } from 'react';
import { OTMRequest } from '../types';
import { RoutineRecord } from '../types/routine';
import StatusBadge from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  otms: OTMRequest[];
  records: RoutineRecord[];
  type: 'basic' | 'executive' | 'detailed';
  dateLimits: { start: Date; end: Date };
  supervisorFilter: string;
  supervisorName: string;
  users: any[];
}

export default function ReportModal({
  isOpen,
  onClose,
  otms,
  records,
  type,
  dateLimits,
  supervisorFilter,
  supervisorName,
  users
}: Props) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const reportTitle = useMemo(() => {
    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const month = monthNames[dateLimits.end.getMonth()];
    const year = dateLimits.end.getFullYear();
    return `${month} ${year}`;
  }, [dateLimits]);

  // Vibrant palette for print compatibility (high contrast)
  const colors = {
    blue: '#0284c7',   // Sky 600
    rose: '#e11d48',   // Rose 600
    orange: '#ea580c', // Orange 600
    green: '#16a34a',  // Green 600
    purple: '#9333ea', // Purple 600
    slate: '#475569',
    lightGray: '#f8fafc',
    border: '#e2e8f0'
  };

  // Filtered lists
  const activeStatuses = ['pending', 'scheduled', 'in_progress', 'rq', 'awaiting_supervisor', 'awaiting_conformity'];
  const activeOTMs = useMemo(() => otms.filter(o => activeStatuses.includes(o.status)), [otms]);
  const highPriority = useMemo(() => activeOTMs.filter(o => o.urgency === 'high'), [activeOTMs]);
  const rqOTMs = useMemo(() => otms.filter(o => o.status === 'rq'), [otms]);
  const closedOTMs = useMemo(() => otms.filter(o => o.status === 'closed'), [otms]);

  // SLA Overdue
  const maxDays: Record<string, number> = { high: 2, medium: 5, low: 10 };
  const nowMs = Date.now();
  const overdueOTMs = useMemo(() => {
    return activeOTMs.filter(o => {
      const created = new Date(o.created_at).getTime();
      const limit = maxDays[o.urgency] || 10;
      return (nowMs - created) / 86400000 > limit;
    });
  }, [activeOTMs, nowMs]);

  // Average CSAT
  const ratedOTMs = useMemo(() => otms.filter(o => o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating > 0), [otms]);
  const avgCSAT = useMemo(() => {
    if (ratedOTMs.length === 0) return 0;
    return Number((ratedOTMs.reduce((acc, o) => acc + o.conformity_rating!, 0) / ratedOTMs.length).toFixed(1));
  }, [ratedOTMs]);

  // Routine records calculations
  const totalRoutines = records.length;
  const completedRoutines = useMemo(() => records.filter(r => r.status === 'completed').length, [records]);
  const routineCompliance = useMemo(() => {
    if (totalRoutines === 0) return 100;
    return Math.round((completedRoutines / totalRoutines) * 100);
  }, [totalRoutines, completedRoutines]);

  // Average timing
  const avgExecTime = useMemo(() => {
    const valid = otms.filter(o => o.net_execution_time !== null && o.net_execution_time !== undefined);
    if (valid.length > 0) {
      return Number((valid.reduce((acc, o) => acc + o.net_execution_time!, 0) / valid.length).toFixed(1));
    }
    const fallback = otms.filter(o => o.job_start_time && o.job_end_time);
    if (fallback.length === 0) return 0;
    let sum = 0;
    let validCount = 0;
    fallback.forEach(o => {
      const start = new Date(o.job_start_time!).getTime();
      const end = new Date(o.job_end_time!).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        sum += (end - start);
        validCount++;
      }
    });
    if (validCount === 0) return 0;
    return Number((sum / validCount / 3600000).toFixed(1));
  }, [otms]);

  // Specialty Estimate vs Real
  const specialtyTimeData = useMemo(() => {
    const map: Record<string, { estimated: number; real: number; count: number }> = {};
    otms.forEach(o => {
      const spec = o.failure_type || 'Otros';
      if (!map[spec]) map[spec] = { estimated: 0, real: 0, count: 0 };
      const est = o.estimated_time || 0;
      let real = o.net_execution_time || 0;
      if (!real && o.job_start_time && o.job_end_time) {
        const start = new Date(o.job_start_time).getTime();
        const end = new Date(o.job_end_time).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          real = (end - start) / 3600000;
        }
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
      .slice(0, 5);
  }, [otms]);

  // Areas breakdown
  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    otms.filter(o => o.status !== 'cancelled').forEach(o => {
      const areaKey = o.area_sector || 'Otros';
      map[areaKey] = (map[areaKey] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [otms]);
  const maxArea = Math.max(...areaData.map(a => a[1]), 1);

  // Daily balance stats
  const dailyData = useMemo(() => {
    const days: { label: string; created: number; resolved: number }[] = [];
    const endDate = new Date(dateLimits.end);
    for (let i = 9; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const created = otms.filter(o => {
        const cd = new Date(o.created_at);
        return cd >= d && cd < nextD;
      }).length;
      const resolved = otms.filter(o => {
        if (!o.closed_at) return false;
        const cd = new Date(o.closed_at);
        return cd >= d && cd < nextD;
      }).length;
      days.push({ label: dayLabel, created, resolved });
    }
    return days;
  }, [otms, dateLimits]);
  const maxDaily = Math.max(...dailyData.map(d => Math.max(d.created, d.resolved)), 1);

  // Routine progress
  const routineProgressData = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    records.forEach(r => {
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
    })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [records]);

  // Tech list stats
  const techData = useMemo(() => {
    const map: Record<string, { name: string; closed: number; scheduled: number; inProgress: number; total: number }> = {};
    otms.forEach(o => {
      if (o.technician_id) {
        if (!map[o.technician_id]) {
          const t = (users || []).find(t => t.id === o.technician_id);
          map[o.technician_id] = { name: t?.full_name || o.technician_id, closed: 0, scheduled: 0, inProgress: 0, total: 0 };
        }
        map[o.technician_id].total++;
        if (o.status === 'scheduled') map[o.technician_id].scheduled++;
        else if (o.status === 'in_progress') map[o.technician_id].inProgress++;
        else if (o.status === 'closed') map[o.technician_id].closed++;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [otms, users]);

  // Low csat feedback
  const lowFeedback = useMemo(() => {
    return otms
      .filter(o => o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating <= 3 && o.conformity_rating > 0)
      .slice(0, 5);
  }, [otms]);

  // Area Satisfaction Ranking
  const areaSatisfaction = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    otms.forEach(o => {
      if (o.conformity_rating !== null && o.conformity_rating !== undefined && o.conformity_rating > 0 && o.area_sector) {
        if (!map[o.area_sector]) map[o.area_sector] = { sum: 0, count: 0 };
        map[o.area_sector].sum += o.conformity_rating;
        map[o.area_sector].count++;
      }
    });
    return Object.entries(map)
      .map(([area, data]) => ({
        area,
        rating: Number((data.sum / data.count).toFixed(1))
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [otms]);

  // Total Conformidades
  const totalConformidades = ratedOTMs.length;

  // Feedback rate out of closed OTMs
  const feedbackRate = useMemo(() => {
    const closedCount = closedOTMs.length;
    if (closedCount === 0) return 0;
    return Math.min(100, Math.round((ratedOTMs.length / closedCount) * 100));
  }, [closedOTMs, ratedOTMs]);

  // Workforce distribution data
  const workforceData = useMemo(() => {
    let own = 0;
    let contractor = 0;
    otms.forEach(o => {
      if (o.assignment_type === 'contractor') {
        contractor++;
      } else {
        own++;
      }
    });
    return { own, contractor, total: own + contractor };
  }, [otms]);

  // Pendientes por especialidad
  const pendingBySpecialty = useMemo(() => {
    const map: Record<string, number> = {};
    activeOTMs.forEach(o => {
      const spec = o.failure_type || 'Otros';
      map[spec] = (map[spec] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeOTMs]);

  // Distribución de estados para la Dona de Estados de OTs
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    otms.forEach(o => {
      const status = o.status || 'unknown';
      map[status] = (map[status] || 0) + 1;
    });
    const total = Object.values(map).reduce((sum, val) => sum + val, 0);
    
    const statusLabels: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendiente', color: '#ea580c' },
      scheduled: { label: 'Programado', color: '#0284c7' },
      in_progress: { label: 'En Proceso', color: '#9333ea' },
      rq: { label: 'Requerimiento', color: '#e11d48' },
      awaiting_supervisor: { label: 'Espera Sup.', color: '#475569' },
      awaiting_conformity: { label: 'Espera Conf.', color: '#16a34a' },
      closed: { label: 'Cerrado', color: '#16a34a' },
      cancelled: { label: 'Cancelado', color: '#475569' }
    };

    const items = Object.entries(map).map(([key, count]) => {
      const info = statusLabels[key] || { label: key, color: '#475569' };
      return {
        key,
        label: info.label,
        count,
        color: info.color
      };
    }).filter(item => item.count > 0);

    return { total, items };
  }, [otms]);

  const statusDoughnutItems = useMemo(() => {
    const circumference = 251.2;
    let accumulated = 0;
    return statusData.items.map(item => {
      const percent = statusData.total > 0 ? item.count / statusData.total : 0;
      const strokeLength = percent * circumference;
      const currentOffset = -accumulated;
      accumulated += strokeLength;
      return {
        ...item,
        percent: Math.round(percent * 100),
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: currentOffset
      };
    });
  }, [statusData]);

  // Distribución de tipo de mantenimiento
  const maintenanceData = useMemo(() => {
    const map: Record<string, number> = { corrective: 0, preventive: 0, emergency: 0, support: 0 };
    otms.forEach(o => {
      if (o.maintenance_type && o.maintenance_type in map) map[o.maintenance_type]++;
    });
    const total = Object.values(map).reduce((sum, val) => sum + val, 0);
    const items = Object.entries(map).map(([type, count]) => {
      const label = type === 'corrective' ? 'Correctivo' : type === 'preventive' ? 'Preventivo' : type === 'emergency' ? 'Emergencia' : 'Soporte';
      const color = type === 'corrective' ? colors.rose : type === 'preventive' ? colors.blue : type === 'emergency' ? colors.orange : colors.purple;
      return { type, label, count, color };
    }).filter(item => item.count > 0);
    return { total, items };
  }, [otms, colors]);

  const maintenanceDoughnutItems = useMemo(() => {
    const circumference = 251.2;
    let accumulated = 0;
    return maintenanceData.items.map(item => {
      const percent = maintenanceData.total > 0 ? item.count / maintenanceData.total : 0;
      const strokeLength = percent * circumference;
      const currentOffset = -accumulated;
      accumulated += strokeLength;
      return {
        ...item,
        percent: Math.round(percent * 100),
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: currentOffset
      };
    });
  }, [maintenanceData]);

  // Distribución por prioridad
  const priorityData = useMemo(() => {
    const map: Record<string, number> = { high: 0, medium: 0, low: 0 };
    otms.forEach(o => {
      if (o.urgency && o.urgency in map) map[o.urgency]++;
    });
    const total = Object.values(map).reduce((sum, val) => sum + val, 0);
    const items = [
      { key: 'high', label: 'Alta', count: map.high, color: colors.rose },
      { key: 'medium', label: 'Media', count: map.medium, color: colors.orange },
      { key: 'low', label: 'Baja', count: map.low, color: colors.green }
    ].filter(item => item.count > 0);
    return { total, items };
  }, [otms, colors]);

  const priorityDoughnutItems = useMemo(() => {
    const circumference = 251.2;
    let accumulated = 0;
    return priorityData.items.map(item => {
      const percent = priorityData.total > 0 ? item.count / priorityData.total : 0;
      const strokeLength = percent * circumference;
      const currentOffset = -accumulated;
      accumulated += strokeLength;
      return {
        ...item,
        percent: Math.round(percent * 100),
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: currentOffset
      };
    });
  }, [priorityData]);

  const handlePrint = () => {
    window.print();
  };

  // SVG Line Chart coordinates helper
  const drawLineChart = () => {
    const w = 400;
    const h = 130;
    const paddingL = 25;
    const paddingB = 20;
    const paddingR = 10;
    const paddingT = 10;
    const drawW = w - paddingL - paddingR;
    const drawH = h - paddingT - paddingB;

    const getX = (idx: number) => paddingL + (idx / (dailyData.length - 1 || 1)) * drawW;
    const getY = (val: number) => paddingT + drawH - (val / (maxDaily || 1)) * drawH;

    let createdPath = '';
    let resolvedPath = '';

    dailyData.forEach((d, i) => {
      const cx = getX(i);
      const cy = getY(d.created);
      const rx = getX(i);
      const ry = getY(d.resolved);
      
      if (i === 0) {
        createdPath = `M ${cx},${cy}`;
        resolvedPath = `M ${rx},${ry}`;
      } else {
        createdPath += ` L ${cx},${cy}`;
        resolvedPath += ` L ${rx},${ry}`;
      }
    });

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* Grids */}
        {[0, 0.5, 1].map((f, i) => (
          <line key={i} x1={paddingL} x2={w - paddingR} y1={paddingT + f * drawH} y2={paddingT + f * drawH} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {/* Created Line */}
        <path d={createdPath} fill="none" stroke={colors.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Resolved Line */}
        <path d={resolvedPath} fill="none" stroke={colors.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Nodes and Labels */}
        {dailyData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.created)} r="3" fill={colors.blue} stroke="#fff" strokeWidth="1" />
            <circle cx={getX(i)} cy={getY(d.resolved)} r="3" fill={colors.green} stroke="#fff" strokeWidth="1" />
            {i % 2 === 0 && (
              <text x={getX(i)} y={h - 4} fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">{d.label}</text>
            )}
          </g>
        ))}
        {/* Y Axis labels */}
        <text x={paddingL - 6} y={paddingT + 3} fill="#64748b" fontSize="8" fontWeight="700" textAnchor="end">{maxDaily}</text>
        <text x={paddingL - 6} y={paddingT + drawH + 3} fill="#64748b" fontSize="8" fontWeight="700" textAnchor="end">0</text>
      </svg>
    );
  };

  return (
    <div className="report-modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 99999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      overflowY: 'auto', padding: '20px 0', backdropFilter: 'blur(4px)'
    }}>
      {/* Control Action Bar */}
      <div className="no-print" style={{
        display: 'flex', width: '100%', maxWidth: '820px', justifyContent: 'space-between',
        alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 24px',
        borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-blue)' }}>Generador de Informes Mensuales</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {type === 'basic' ? 'Reporte Básico (1 Página)' : type === 'executive' ? 'Reporte Ejecutivo (3 Páginas)' : 'Reporte Detallado (4 Páginas)'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 16px', background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0284c7 100%)', border: 'none', fontWeight: 800 }} onClick={handlePrint}>
            🖨️ Descargar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Pages Container (Print Area) */}
      <div id="print-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ========================================================================= */}
        {/* PAGE 1: COVER / GENERAL (All reports have Page 1) */}
        {/* ========================================================================= */}
        <div className="print-page print-shadow" style={{
          width: '794px', height: '1123px', background: 'white', padding: '40px 50px',
          boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', border: '1px solid #e2e8f0', pageBreakAfter: 'always', breakAfter: 'page'
        }}>
          {/* Grouped Top Section to avoid vertical stretching */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', letterSpacing: '0.15em', margin: 0 }}>CLUB DE REGATAS LIMA</h4>
                  <h5 style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', margin: '2px 0 0 0' }}>DEPARTAMENTO DE MANTENIMIENTO</h5>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0284c7', fontFamily: 'serif' }}>CRL 1875</span>
              </div>
            </div>

            {/* Main Title Block */}
            <div style={{ margin: '8px 0 4px 0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {type === 'basic' ? 'RESUMEN OPERATIVO MENSUAL' : 'INFORME MENSUAL DE OPERACIONES'}
              </span>
              <h1 style={{ fontSize: '2.0rem', fontWeight: 900, color: '#1e293b', margin: '6px 0 8px 0', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                INFORME DE MANTENIMIENTO
              </h1>
              <div style={{ width: '40px', height: '4px', background: '#eab308', margin: '0 auto 8px auto', borderRadius: 2 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{reportTitle}</h3>
            </div>

            {/* Metadata Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.7rem', marginTop: '4px' }}>
              <div>
                <div style={{ marginBottom: 4 }}><span style={{ color: '#64748b', fontWeight: 600 }}>Periodo de Análisis:</span> <strong style={{ color: '#334155' }}>{formatDate(dateLimits.start)} al {formatDate(dateLimits.end)}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 4 }}><span style={{ color: '#64748b', fontWeight: 600 }}>Fecha de Emisión:</span> <strong style={{ color: '#334155' }}>{formatDate(new Date())}</strong></div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>Tipo de Reporte:</span> <strong style={{ color: '#334155' }}>{type === 'basic' ? 'Básico (Resumido)' : type === 'executive' ? 'Ejecutivo (Jefatura)' : 'Detallado (Operativo)'}</strong></div>
              </div>
            </div>
          </div>

          {/* Daily balance line chart (Full width, half height) */}
          <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px', marginTop: '8px', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: 0 }}>Balance Diario (Creadas vs Resueltas)</h4>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.65rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
                  <span style={{ width: 10, height: 3, background: colors.blue, display: 'inline-block' }} /> OTMs Creadas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
                  <span style={{ width: 10, height: 3, background: colors.green, display: 'inline-block' }} /> OTMs Cerradas
                </span>
              </div>
            </div>
            <div style={{ height: '180px', position: 'relative', width: '100%' }}>
              {drawLineChart()}
            </div>
          </div>

          {/* Fila inferior: Dona de Estados y OTs Pendientes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px', width: '100%', boxSizing: 'border-box' }}>
            {/* Dona de Estados de OTs */}
            <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '240px', boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Estados de OTs
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '10px', flex: 1 }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    {statusDoughnutItems.map(item => item.count > 0 && (
                      <circle
                        key={item.key}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="12"
                        strokeDasharray={item.strokeDasharray}
                        strokeDashoffset={item.strokeDashoffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{statusData.total}</span>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>OTMs</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, paddingLeft: 8 }}>
                  {statusDoughnutItems.slice(0, 5).map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem' }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* OTs Pendientes Breakdown */}
            <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '240px', boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                OTs Pendientes (Carga Activa)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: colors.rose, lineHeight: 1 }}>{activeOTMs.length}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Solicitudes Pendientes Totales</span>
                </div>
                
                {/* Breakdown cards for pending statuses */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'En Cola', count: otms.filter(o => o.status === 'pending').length, color: '#ea580c' },
                    { label: 'Programadas', count: otms.filter(o => o.status === 'scheduled').length, color: '#0284c7' },
                    { label: 'En Proceso', count: otms.filter(o => o.status === 'in_progress').length, color: '#9333ea' },
                    { label: 'Requerimientos (RQ)', count: otms.filter(o => o.status === 'rq').length, color: '#e11d48' },
                  ].map((p, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        {p.label}
                      </span>
                      <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>{p.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Basic summary text field and signatures (Only in Basic report) */}
          {type === 'basic' && (
            <div style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '8px' }}>Observaciones y Firmas del Supervisor</h3>
              <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', minHeight: '60px', fontSize: '0.7rem', color: '#64748b' }}>
                Utilice esta sección para anotar comentarios generales, imprevistos o eventos extraordinarios del mantenimiento en el mes.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
                <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                  Firma Supervisor CRL
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                  Jefatura de Servicios CRL
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
            <span>Informe Mensual Mantenimiento CRL</span>
            <span>Página 1 de {type === 'basic' ? 1 : 3}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: PENDIENTES POR ESPECIALIDAD, DEMANDA Y CRITERIOS (Executive/Detailed) */}
        {/* ========================================================================= */}
        {type !== 'basic' && (
          <div className="print-page print-shadow" style={{
            width: '794px', height: '1123px', background: 'white', padding: '40px 50px',
            boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', border: '1px solid #e2e8f0', pageBreakAfter: 'always', breakAfter: 'page'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>INFORME DE MANTENIMIENTO — {reportTitle}</span>
                <span style={{ fontWeight: 800 }}>CLUB DE REGATAS LIMA</span>
              </div>
            </div>

            {/* Title Section */}
            <div style={{ margin: '6px 0 4px 0' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sección Operativa II</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '4px 0', textTransform: 'uppercase' }}>
                Pendientes por Especialidad e Infraestructura
              </h2>
            </div>

            {/* Pendientes por Especialidad (Full width, same size as Balance Diario) */}
            <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '240px', boxSizing: 'border-box', width: '100%' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Solicitudes Pendientes por Especialidad
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
                {pendingBySpecialty.slice(0, 5).map((spec, i) => {
                  const specColors = [colors.blue, colors.rose, colors.orange, colors.purple, colors.green];
                  const color = specColors[i % specColors.length];
                  const maxPending = Math.max(...pendingBySpecialty.map(s => s.count), 1);
                  return (
                    <div key={spec.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 2, fontWeight: 700, color: '#334155' }}>
                        <span>🛡️ {(spec.name || '').replace(/^\d+\.\s*/, '')}</span>
                        <span>{spec.count} pendientes</span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(spec.count / maxPending) * 100}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
                {pendingBySpecialty.length === 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No hay solicitudes pendientes en el periodo</div>
                )}
              </div>
            </div>

            {/* Subtítulo: Distribución de la demanda y criterios operativos */}
            <div style={{ borderBottom: '1.5px solid #cbd5e1', paddingBottom: '4px', marginTop: '10px', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Distribución de la demanda y Criterios Operativos
              </h3>
            </div>

            {/* Fila con 2 donas grandes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              {/* Dona de Tipo de Mantenimiento */}
              <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '200px', boxSizing: 'border-box' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  Tipo de Mantenimiento
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '10px', flex: 1 }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      {maintenanceDoughnutItems.map(item => item.count > 0 && (
                        <circle
                          key={item.type}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="12"
                          strokeDasharray={item.strokeDasharray}
                          strokeDashoffset={item.strokeDashoffset}
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{maintenanceData.total}</span>
                      <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>OTs</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, paddingLeft: 6 }}>
                    {maintenanceDoughnutItems.map(item => (
                      <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.6rem' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{item.label}</span>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distribución por Prioridad */}
              <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '200px', boxSizing: 'border-box' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  Distribución por Prioridad
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '10px', flex: 1 }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      {priorityDoughnutItems.map(item => item.count > 0 && (
                        <circle
                          key={item.key}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="12"
                          strokeDasharray={item.strokeDasharray}
                          strokeDashoffset={item.strokeDashoffset}
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{priorityData.total}</span>
                      <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>OTs</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, paddingLeft: 6 }}>
                    {priorityDoughnutItems.map(item => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.6rem' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{item.label}</span>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Demás gráficos (Top Áreas) — Ancho y Grande */}
            <div style={{ border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '170px', boxSizing: 'border-box', marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '8px' }}>Top Áreas / Sectores del Club con Mayor Demanda</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
                {areaData.slice(0, 4).map(([area, count], i) => {
                  const areaColors = [colors.blue, colors.rose, colors.orange, colors.purple];
                  const color = areaColors[i % areaColors.length];
                  return (
                    <div key={area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 1, fontWeight: 700, color: '#334155' }}>
                        <span>🛡️ {(area || '').replace(/^\d+\.\s*/, '')}</span>
                        <span>{count} solicitudes</span>
                      </div>
                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(count / maxArea) * 100}%`, height: '100%', background: color, borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Demás gráficos (Eficiencia Temporal) — Ancho y Grande */}
            <div style={{ border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', height: '190px', boxSizing: 'border-box', marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '6px' }}>Eficiencia Temporal: Tiempo Estimado vs Real por Especialidad</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
                {specialtyTimeData.slice(0, 3).map(spec => (
                  <div key={spec.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: '#334155' }}>
                      <span>🛡️ {(spec.name || '').replace(/^\d+\.\s*/, '')}</span>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 400 }}>({spec.count} OTMs)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 50, fontSize: '0.55rem', color: '#64748b', textAlign: 'right' }}>Estimado:</span>
                        <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${(spec.estimated / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`, height: '100%', background: colors.blue }}></div>
                        </div>
                        <span style={{ width: 35, fontSize: '0.6rem', fontWeight: 700, color: '#475569' }}>{spec.estimated}h</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 50, fontSize: '0.55rem', color: '#64748b', textAlign: 'right' }}>Real:</span>
                        <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(spec.real / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`,
                            height: '100%',
                            background: spec.real > spec.estimated ? colors.rose : colors.green
                          }}></div>
                        </div>
                        <span style={{ width: 35, fontSize: '0.6rem', fontWeight: 800, color: spec.real > spec.estimated ? colors.rose : colors.green }}>{spec.real}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
              <span>Informe Mensual Mantenimiento CRL</span>
              <span>Página 2 de 3</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: DESEMPEÑO OPERATIVO Y TRABAJO TÉCNICO (Executive/Detailed) */}
        {/* ========================================================================= */}
        {type !== 'basic' && (
          <div className="print-page print-shadow" style={{
            width: '794px', height: '1123px', background: 'white', padding: '40px 50px',
            boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>INFORME DE MANTENIMIENTO — {reportTitle}</span>
                <span style={{ fontWeight: 800 }}>CLUB DE REGATAS LIMA</span>
              </div>
            </div>

            {/* Title Section */}
            <div style={{ margin: '6px 0 4px 0' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sección Operativa III</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '4px 0', textTransform: 'uppercase' }}>
                Desempeño Operativo y Fuerza Laboral
              </h2>
            </div>

            {/* Subtítulo: Desempeño operativo */}
            <div style={{ borderBottom: '1.5px solid #cbd5e1', paddingBottom: '4px', marginTop: '5px', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Desempeño Operativo
              </h3>
            </div>

            {/* Fuerza Laboral (Personal Propio vs Contratistas) */}
            <div style={{ border: '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', margin: 0 }}>
                Distribución de Fuerza Laboral (Propio vs Contratistas)
              </h4>
              <div style={{ height: '18px', borderRadius: '9px', overflow: 'hidden', display: 'flex', border: '1px solid #e2e8f0', marginTop: 4 }}>
                <div style={{
                  width: `${workforceData.total > 0 ? (workforceData.own / workforceData.total) * 100 : 50}%`,
                  background: colors.blue
                }} />
                <div style={{
                  width: `${workforceData.total > 0 ? (workforceData.contractor / workforceData.total) * 100 : 50}%`,
                  background: colors.purple
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.7rem', fontWeight: 700, marginTop: 4 }}>
                <span style={{ color: colors.blue, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: colors.blue, borderRadius: '50%', display: 'inline-block' }} />
                  Personal Propio: {workforceData.own} OTMs ({workforceData.total > 0 ? Math.round((workforceData.own / workforceData.total) * 100) : 50}%)
                </span>
                <span style={{ color: colors.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: colors.purple, borderRadius: '50%', display: 'inline-block' }} />
                  Contratistas (Terceros): {workforceData.contractor} OTMs ({workforceData.total > 0 ? Math.round((workforceData.contractor / workforceData.total) * 100) : 50}%)
                </span>
              </div>
            </div>

            {/* Volumen de Trabajo por Técnico (Beautiful horizontal bar chart instead of a detailed table) */}
            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', flex: 1, marginTop: '16px', boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Carga de Trabajo y Desempeño por Técnico
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                {techData.slice(0, 5).map((t, idx) => {
                  const maxTechVal = Math.max(...techData.map(tech => tech.total), 1);
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                        <span>👤 {t.name}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          Total: <strong style={{ color: '#1e293b' }}>{t.total}</strong> | Resueltas: <strong style={{ color: colors.green }}>{t.closed}</strong> | Activas: <strong style={{ color: colors.blue }}>{t.scheduled + t.inProgress}</strong>
                        </span>
                      </div>
                      <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                        {/* Segmented bar for Closed, In Progress/Scheduled */}
                        <div style={{
                          width: `${(t.closed / maxTechVal) * 100}%`,
                          background: colors.green,
                          height: '100%'
                        }} />
                        <div style={{
                          width: `${((t.scheduled + t.inProgress) / maxTechVal) * 100}%`,
                          background: colors.blue,
                          height: '100%'
                        }} />
                      </div>
                    </div>
                  );
                })}
                {techData.length === 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Sin datos de técnicos registrados</div>
                )}
              </div>
            </div>

            {/* Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '180px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                Firma Supervisor CRL
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '180px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                Jefatura de Servicios CRL
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
              <span>Informe Mensual Mantenimiento CRL</span>
              <span>Página 3 de 3</span>
            </div>
          </div>
        )}
      </div>

      {/* Report styles (Simulates Page layout on Web, triggers clean pagination in print) */}
      <style>{`
        .report-modal-overlay {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }
        .print-shadow {
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        
        @media print {
          /* Hide everything except the print-area */
          body * {
            visibility: hidden;
            background: white !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            margin: 0;
            padding: 0;
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
            background: white !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20mm 15mm !important;
            background: white !important;
            box-sizing: border-box !important;
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          /* Fix styling colors for black and white high-contrast printing */
          text {
            fill: #334155 !important;
          }
        }
        
        @page {
          size: A4 portrait;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
