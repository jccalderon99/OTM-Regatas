import React from 'react';

export default function Reports() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Análisis y Reportes</h1>
        <p className="page-subtitle">Visualización de datos históricos y cuadros de mando interactivos</p>
      </div>

      <div className="grid-3">
        {/* Tarjeta de Reporte de Mayo 2026 */}
        <div 
          className="glass-card" 
          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
          onClick={() => window.open('/reports/dashboard-mayo-2026.html', '_blank')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent-blue)' }}></div>
          
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.9 }}>📊</div>
            <span className="status-badge status-awaiting_conformity">Disponible</span>
          </div>
          
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Dashboard Mayo 2026
          </h3>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Análisis de Bitácora de Actividades (4 - 25 mayo). Incluye estado de OTs, tiempos de atención, priorización y rendimiento del personal técnico.
          </p>
          
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--accent-blue)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Abrir dashboard <span style={{ fontSize: '1.2rem' }}>→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
