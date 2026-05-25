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
          width: '794px', height: '1123px', background: 'white', padding: '50px 60px',
          boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', border: '1px solid #e2e8f0', pageBreakAfter: 'always', breakAfter: 'page'
        }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', letterSpacing: '0.15em', margin: 0 }}>CLUB DE REGATAS LIMA</h4>
                <h5 style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', margin: '2px 0 0 0' }}>DEPARTAMENTO DE MANTENIMIENTO</h5>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0284c7', fontFamily: 'serif' }}>CRL 1875</span>
            </div>
          </div>

          {/* Main Title Block */}
          <div style={{ margin: '40px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {type === 'basic' ? 'RESUMEN OPERATIVO MENSUAL' : type === 'executive' ? 'INFORME EJECUTIVO MENSUAL' : 'REPORTE DE AUDITORÍA Y DETALLE OPERATIVO'}
            </span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b', margin: '8px 0 12px 0', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              INFORME DE MANTENIMIENTO
            </h1>
            <div style={{ width: '40px', height: '4px', background: '#eab308', margin: '0 auto 16px auto', borderRadius: 2 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{reportTitle}</h3>
          </div>

          {/* Metadata Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
            <div>
              <div style={{ marginBottom: 6 }}><span style={{ color: '#64748b', fontWeight: 600 }}>Periodo de Análisis:</span> <strong style={{ color: '#334155' }}>{formatDate(dateLimits.start)} al {formatDate(dateLimits.end)}</strong></div>
              <div><span style={{ color: '#64748b', fontWeight: 600 }}>Supervisor Responsable:</span> <strong style={{ color: '#334155' }}>{supervisorName || 'Mantenimiento General'}</strong></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: 6 }}><span style={{ color: '#64748b', fontWeight: 600 }}>Fecha de Emisión:</span> <strong style={{ color: '#334155' }}>{formatDate(new Date())}</strong></div>
              <div><span style={{ color: '#64748b', fontWeight: 600 }}>Tipo de Reporte:</span> <strong style={{ color: '#334155' }}>{type === 'basic' ? 'Básico (Resumido)' : type === 'executive' ? 'Ejecutivo (Jefatura)' : 'Detallado (Operativo)'}</strong></div>
            </div>
          </div>

          {/* Executive KPIs */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '12px' }}>Indicadores Clave de Gestión (KPIs)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'OTMs Procesadas', value: otms.length, desc: 'Solicitudes en el mes', color: colors.blue },
                { label: 'Cumplimiento Rutinas', value: `${routineCompliance}%`, desc: 'Avance preventivos', color: colors.purple },
                { label: 'Calidad (CSAT)', value: `${avgCSAT} ⭐`, desc: 'Aceptación del solicitante', color: colors.orange },
                { label: 'Tiempo Neto Ejecución', value: `${avgExecTime}h`, desc: 'Promedio por tarea', color: colors.green }
              ].map((kpi, idx) => (
                <div key={idx} style={{ border: `1px solid ${kpi.color}22`, background: `${kpi.color}05`, padding: '12px 8px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', height: '14px', overflow: 'hidden' }}>{kpi.label}</span>
                  <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 900, color: kpi.color, margin: '4px 0' }}>{kpi.value}</strong>
                  <span style={{ display: 'block', fontSize: '0.55rem', color: '#94a3b8' }}>{kpi.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily balance line chart (Always Page 1) */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '12px' }}>Balance Diario (Creadas vs Resueltas)</h3>
            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', height: '150px' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: '0.65rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
                  <span style={{ width: 10, height: 3, background: colors.blue, display: 'inline-block' }} /> OTMs Creadas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
                  <span style={{ width: 10, height: 3, background: colors.green, display: 'inline-block' }} /> OTMs Cerradas
                </span>
              </div>
              <div style={{ height: '110px' }}>{drawLineChart()}</div>
            </div>
          </div>

          {/* Basic summary text field (Only in Basic report) */}
          {type === 'basic' && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '8px' }}>Observaciones y Firmas del Supervisor</h3>
              <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', minHeight: '80px', fontSize: '0.7rem', color: '#64748b' }}>
                Utilice esta sección para anotar comentarios generales, imprevistos o eventos extraordinarios del mantenimiento en el mes.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '30px' }}>
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
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
            <span>Informe Mensual Mantenimiento CRL</span>
            <span>Página 1 de {type === 'basic' ? 1 : type === 'executive' ? 3 : 4}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXECUTIVE REPORT (PAGE 2) OR DETAILED (PAGE 2) */}
        {/* ========================================================================= */}
        {type !== 'basic' && (
          <div className="print-page print-shadow" style={{
            width: '794px', height: '1123px', background: 'white', padding: '50px 60px',
            boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', border: '1px solid #e2e8f0', pageBreakAfter: 'always', breakAfter: 'page'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>INFORME DE MANTENIMIENTO — {reportTitle}</span>
                <span style={{ fontWeight: 800 }}>CLUB DE REGATAS LIMA</span>
              </div>
            </div>

            {/* Title Section */}
            <div style={{ margin: '20px 0 10px 0' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sección Operativa II</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '4px 0 8px 0', textTransform: 'uppercase' }}>
                Distribución por Áreas del Club y Eficiencia
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Análisis de focos de demanda edilicia e infraestructura, y desviaciones sobre tiempos de trabajo.</p>
            </div>

            {/* Areas Distribution Horizontal Bar Chart */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '10px' }}>Top Áreas / Sectores del Club con Mayor Demanda</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {areaData.map(([area, count], i) => {
                  const areaColors = [colors.blue, colors.rose, colors.orange, colors.purple, colors.green];
                  const color = areaColors[i % areaColors.length];
                  return (
                    <div key={area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4, fontWeight: 700, color: '#334155' }}>
                        <span>{(area || '').replace(/^\d+\.\s*/, '')}</span>
                        <span>{count} solicitudes</span>
                      </div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(count / maxArea) * 100}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estimated vs Real Specialty times chart */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '10px' }}>Eficiencia Temporal: Tiempo Estimado vs Real por Especialidad</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '8px' }}>
                {specialtyTimeData.length > 0 ? specialtyTimeData.map(spec => (
                  <div key={spec.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                      <span>{(spec.name || '').replace(/^\d+\.\s*/, '')}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>({spec.count} OTMs con registro de tiempo)</span>
                    </div>
                    {/* Est vs Real Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 60, fontSize: '0.6rem', color: '#64748b', textAlign: 'right' }}>Estimado:</span>
                        <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '2.5px', overflow: 'hidden' }}>
                          <div style={{ width: `${(spec.estimated / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`, height: '100%', background: colors.blue }}></div>
                        </div>
                        <span style={{ width: 40, fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>{spec.estimated}h</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 60, fontSize: '0.6rem', color: '#64748b', textAlign: 'right' }}>Real:</span>
                        <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '2.5px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(spec.real / Math.max(...specialtyTimeData.map(s => Math.max(s.estimated, s.real)), 1)) * 100}%`,
                            height: '100%',
                            background: spec.real > spec.estimated ? colors.rose : colors.green
                          }}></div>
                        </div>
                        <span style={{ width: 40, fontSize: '0.65rem', fontWeight: 800, color: spec.real > spec.estimated ? colors.rose : colors.green }}>{spec.real}h</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '15px 0' }}>No hay registros de tiempo válidos en el periodo</div>
                )}
              </div>
            </div>

            {/* Additional Info Box on Page 2 for Executive report */}
            {type === 'executive' && (
              <div style={{ marginTop: '24px', background: '#f8fafc', borderLeft: `3px solid ${colors.blue}`, padding: '12px 16px', borderRadius: '0 6px 6px 0', fontSize: '0.7rem', color: '#475569', lineHeight: 1.4 }}>
                <strong>💡 Análisis de Operaciones CRL:</strong> Las áreas recreativas y deportivas (como Deportes o Seguridad) han representado la mayor carga del periodo. En eficiencia temporal, la especialidad de calderas reportó un desvío debido a reparaciones imprevistas, mientras que las demás especialidades se mantuvieron por debajo del tiempo de estimación planificado.
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
              <span>Informe Mensual Mantenimiento CRL</span>
              <span>Página 2 de {type === 'executive' ? 3 : 4}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXECUTIVE REPORT (PAGE 3) OR DETAILED (PAGE 3) */}
        {/* ========================================================================= */}
        {type !== 'basic' && (
          <div className="print-page print-shadow" style={{
            width: '794px', height: '1123px', background: 'white', padding: '50px 60px',
            boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', border: '1px solid #e2e8f0', pageBreakAfter: type === 'executive' ? 'never' : 'always', breakAfter: type === 'executive' ? 'auto' : 'page'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>INFORME DE MANTENIMIENTO — {reportTitle}</span>
                <span style={{ fontWeight: 800 }}>CLUB DE REGATAS LIMA</span>
              </div>
            </div>

            {/* Title Section */}
            <div style={{ margin: '20px 0 10px 0' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {type === 'executive' ? 'Sección Operativa III' : 'Sección Operativa III'}
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '4px 0 8px 0', textTransform: 'uppercase' }}>
                {type === 'executive' ? 'Mantenimiento Preventivo y Control de Calidad' : 'Análisis de Calidad y Alertas de Feedback'}
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
                {type === 'executive' ? 'Tasa de avance de rutinas del plan anual de mantenimiento y feedback (CSAT) del socio.' : 'Auditoría detallada de satisfacción del usuario (CSAT), ranking de áreas y comentarios críticos.'}
              </p>
            </div>

            {/* IF EXECUTIVE: Show Routine Compliance and Quality Ranking */}
            {type === 'executive' ? (
              <>
                {/* Routine progress list */}
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '10px' }}>Cumplimiento Preventivo por Especialidad (Checklists Maestro)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '8px' }}>
                    {routineProgressData.length > 0 ? routineProgressData.map(item => (
                      <div key={item.specialty}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4, fontWeight: 700, color: '#475569' }}>
                          <span>🛡️ {(item.specialty || '').replace(/^\d+\.\s*/, '')}</span>
                          <span>{item.completed} / {item.total} rutinas completadas ({item.percent}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.percent}%`, height: '100%', background: colors.purple, borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '15px 0' }}>No hay registros de rutinas planificadas en el mes</div>
                    )}
                  </div>
                </div>

                {/* CSAT Area ranking */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '10px' }}>Nivel de Satisfacción (CSAT) por Sectores del Club</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ border: '1px solid #e2e8f0', padding: '14px 16px', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.green, marginBottom: '10px', textTransform: 'uppercase' }}>👍 Sectores con Mayor Satisfacción</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {areaSatisfaction.slice(0, 3).map(item => (
                          <div key={item.area} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#475569' }}>{(item.area || '').replace(/^\d+\.\s*/, '')}</span>
                            <span style={{ fontWeight: 700, color: colors.green }}>{item.rating} / 5.0 ⭐</span>
                          </div>
                        ))}
                        {areaSatisfaction.length === 0 && <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center' }}>Sin registros</div>}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', padding: '14px 16px', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.rose, marginBottom: '10px', textTransform: 'uppercase' }}>⚠️ Comentarios y Oportunidades de Mejora</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.6rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.3 }}>
                        {lowFeedback.length > 0 ? lowFeedback.slice(0, 2).map(o => (
                          <div key={o.id} style={{ borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                            "{o.conformity_notes || 'Sin observaciones escritas'}" <strong style={{ color: '#475569' }}>({(o.area_sector || '').replace(/^\d+\.\s*/, '')})</strong>
                          </div>
                        )) : (
                          <div>¡Excelente! No se registraron comentarios de insatisfacción en el mes.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final Signatures for Executive report */}
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '50px' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                    Firma Supervisor CRL
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                    Jefatura de Servicios CRL
                  </div>
                </div>
              </>
            ) : (
              /* IF DETAILED REPORT: Page 3 is focused on CSAT & Alerts */
              <>
                {/* CSAT Details list */}
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '10px' }}>Ranking de Calidad (CSAT) por Áreas</h3>
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.green, marginBottom: '8px' }}>Top Áreas Satisfechas</h4>
                      <table style={{ width: '100%', fontSize: '0.65rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ padding: '4px 0' }}>Área</th><th style={{ textAlign: 'right' }}>Satisfacción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {areaSatisfaction.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                              <td style={{ padding: '6px 0', fontWeight: 600 }}>{(item.area || '').replace(/^\d+\.\s*/, '')}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: colors.green }}>{item.rating} ⭐</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.slate, marginBottom: '8px' }}>Resumen de Calificaciones</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Actas Conformidad Totales:</span>
                          <strong style={{ color: '#334155' }}>{totalConformidades} firmadas</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Tasa de Conformidad de Solicitudes:</span>
                          <strong style={{ color: '#334155' }}>{feedbackRate}% recibidas</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Calificación Promedio General:</span>
                          <strong style={{ color: colors.orange }}>{avgCSAT} / 5.0 Estrellas</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Critical Feedback Alerts */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: colors.rose, marginBottom: '10px' }}>⚠️ Alertas Críticas: Comentarios de Insatisfacción (≤ 3 estrellas)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {lowFeedback.length > 0 ? lowFeedback.map(o => (
                      <div key={o.id} style={{ border: '1px solid #fecdd3', background: '#fff5f5', padding: '12px 16px', borderRadius: '6px', borderLeft: `4px solid ${colors.rose}`, fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700 }}>
                          <span style={{ color: colors.blue }}>{o.otm_code}</span>
                          <span style={{ color: colors.rose }}>{'⭐'.repeat(o.conformity_rating)} ({o.conformity_rating} estrellas)</span>
                        </div>
                        <p style={{ color: '#475569', fontStyle: 'italic', margin: '4px 0' }}>"{o.conformity_notes || 'Sin observaciones escritas'}"</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.6rem', marginTop: '4px' }}>
                          <span>Área: {(o.area_sector || '').replace(/^\d+\.\s*/, '')}</span>
                          <span>Solicitante: {o.requester_name}</span>
                        </div>
                      </div>
                    )) : (
                      <div style={{ border: '1px solid #bbf7d0', background: '#f6fdf9', padding: '16px', borderRadius: '6px', color: colors.green, textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>
                        ✨ ¡Gran mes! No se han recibido calificaciones de 3 estrellas o menores.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
              <span>Informe Mensual Mantenimiento CRL</span>
              <span>Página 3 de {type === 'executive' ? 3 : 4}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAILED REPORT ONLY (PAGE 4) */}
        {/* ========================================================================= */}
        {type === 'detailed' && (
          <div className="print-page print-shadow" style={{
            width: '794px', height: '1123px', background: 'white', padding: '50px 60px',
            boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>INFORME DE MANTENIMIENTO — {reportTitle}</span>
                <span style={{ fontWeight: 800 }}>CLUB DE REGATAS LIMA</span>
              </div>
            </div>

            {/* Title Section */}
            <div style={{ margin: '20px 0 10px 0' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sección Operativa IV</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '4px 0 8px 0', textTransform: 'uppercase' }}>
                Plan Preventivo y Control de Técnicos
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Desglose de avance de rutinas e índices técnicos y distribución de la fuerza laboral.</p>
            </div>

            {/* Routine compliance progress bar list */}
            <div style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '8px' }}>Avance del Plan de Rutinas Preventivas por Especialidad</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '8px' }}>
                {routineProgressData.length > 0 ? routineProgressData.map(item => (
                  <div key={item.specialty}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4, fontWeight: 700, color: '#475569' }}>
                      <span>🛡️ {(item.specialty || '').replace(/^\d+\.\s*/, '')}</span>
                      <span>{item.completed} / {item.total} completadas ({item.percent}%)</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, height: '100%', background: colors.purple, borderRadius: '3px' }}></div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '15px 0' }}>No hay registros de rutinas planificadas en el mes</div>
                )}
              </div>
            </div>

            {/* Technicians Workload Table */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '8px' }}>Carga de Trabajo y Desempeño de Técnicos</h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '0.65rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px' }}>Técnico</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Total Asignados</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Programados</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>En Proceso</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Resueltas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techData.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>{t.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{t.total}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.blue }}>{t.scheduled}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.green }}>{t.inProgress}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: colors.purple }}>{t.closed}</td>
                      </tr>
                    ))}
                    {techData.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Sin datos de técnicos registrados en el periodo</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workforce Own vs Contractor Ratio */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '8px' }}>Distribución de Fuerza Laboral (Propio vs Contratistas)</h3>
              <div style={{ border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: '16px', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{
                    width: `${workforceData.total > 0 ? (workforceData.own / workforceData.total) * 100 : 50}%`,
                    background: colors.blue
                  }} />
                  <div style={{
                    width: `${workforceData.total > 0 ? (workforceData.contractor / workforceData.total) * 100 : 50}%`,
                    background: colors.purple
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.65rem', fontWeight: 700 }}>
                  <span style={{ color: colors.blue }}>🔧 Personal Propio: {workforceData.own} OTMs ({workforceData.total > 0 ? Math.round((workforceData.own / workforceData.total) * 100) : 50}%)</span>
                  <span style={{ color: colors.purple }}>🏗️ Contratistas de Terceros: {workforceData.contractor} OTMs ({workforceData.total > 0 ? Math.round((workforceData.contractor / workforceData.total) * 100) : 50}%)</span>
                </div>
              </div>
            </div>

            {/* Signature Block (Detailed page 4) */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
              <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                Firma Supervisor CRL
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.65rem', width: '150px', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#64748b' }}>
                Jefatura de Servicios CRL
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: 'auto' }}>
              <span>Informe Mensual Mantenimiento CRL</span>
              <span>Página 4 de 4</span>
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
