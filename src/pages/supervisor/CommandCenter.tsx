import React from 'react';
import { useOTM } from '../../context/OTMContext';
import { OTMStatus, KPIData } from '../../types';

export default function CommandCenter() {
  const { otms } = useOTM();

  const kpi: KPIData = {
    total_requests: otms.length,
    resolved: otms.filter(o => o.status === 'closed').length,
    avg_completion_hours: (() => {
      const closed = otms.filter(o => o.closed_at);
      if (closed.length === 0) return 0;
      const total = closed.reduce((sum, o) => {
        return sum + (new Date(o.closed_at!).getTime() - new Date(o.created_at).getTime()) / 3600000;
      }, 0);
      return Math.round(total / closed.length);
    })(),
    pending: otms.filter(o => o.status === 'pending').length,
    scheduled: otms.filter(o => o.status === 'scheduled').length,
    in_progress: otms.filter(o => o.status === 'in_progress').length,
    awaiting_conformity: otms.filter(o => o.status === 'awaiting_conformity').length,
    closed: otms.filter(o => o.status === 'closed').length,
    cancelled: otms.filter(o => o.status === 'cancelled').length,
  };

  const resolutionRate = kpi.total_requests > 0 ? Math.round((kpi.resolved / kpi.total_requests) * 100) : 0;

  // Area breakdown
  const areaMap = new Map<string, number>();
  otms.forEach(o => areaMap.set(o.area_sector, (areaMap.get(o.area_sector) || 0) + 1));
  const areaCounts = Array.from(areaMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxAreaCount = Math.max(...areaCounts.map(a => a[1]), 1);

  // Status breakdown for chart
  const statusData: { status: OTMStatus; count: number; color: string; label: string }[] = [
    { status: 'pending', count: kpi.pending, color: 'var(--accent-amber)', label: 'Pendiente' },
    { status: 'scheduled', count: kpi.scheduled, color: 'var(--accent-purple)', label: 'Programado' },
    { status: 'in_progress', count: kpi.in_progress, color: 'var(--accent-blue)', label: 'En Progreso' },
    { status: 'awaiting_conformity', count: kpi.awaiting_conformity, color: 'var(--accent-emerald)', label: 'Conformidad' },
    { status: 'closed', count: kpi.closed, color: 'var(--text-muted)', label: 'Cerrado' },
  ];
  const maxStatusCount = Math.max(...statusData.map(s => s.count), 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Centro de Mando</h1>
        <p className="page-subtitle">Métricas y KPIs en tiempo real del sistema de mantenimiento</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-blue)' } as any}>
          <div className="kpi-label">Total Solicitudes</div>
          <div className="kpi-value" style={{ color: 'var(--accent-blue)' }}>{kpi.total_requests}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-emerald)' } as any}>
          <div className="kpi-label">Resueltas</div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>{kpi.resolved}</div>
          <div className="kpi-sub">{resolutionRate}% tasa de resolución</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-amber)' } as any}>
          <div className="kpi-label">Tiempo Promedio</div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{kpi.avg_completion_hours}h</div>
          <div className="kpi-sub">Creación a cierre</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-rose)' } as any}>
          <div className="kpi-label">Pendientes</div>
          <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>{kpi.pending}</div>
          <div className="kpi-sub">Requieren asignación</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Status Breakdown */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 20 }}>OTMs por Estado</h3>
          <div className="flex-col gap-3">
            {statusData.map(s => (
              <div key={s.status}>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / maxStatusCount) * 100}%`, height: '100%', background: s.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Area Breakdown */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 20 }}>Solicitudes por Área</h3>
          <div className="flex-col gap-3">
            {areaCounts.map(([area, count]) => (
              <div key={area}>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{area}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(count / maxAreaCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
