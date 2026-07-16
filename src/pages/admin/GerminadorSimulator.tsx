import React from 'react';

export default function GerminadorSimulator() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
    }}>
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}>
            🌱 Simulador Germinador — UTP
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}>
            Prototipo de germinador de higos con suelo de inducción térmica · Visualización 3D interactiva
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(34,197,94,0.15)',
            color: '#22c55e',
            fontWeight: 700,
            border: '1px solid rgba(34,197,94,0.3)',
          }}>
            ● SIMULACIÓN EN VIVO
          </span>
          <a
            href="/germinador-simulador.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              padding: '5px 12px',
              borderRadius: '8px',
              background: 'var(--accent-blue)',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            ↗ Pantalla completa
          </a>
        </div>
      </div>

      {/* iframe con el simulador */}
      <div style={{
        flex: 1,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
        minHeight: '600px',
        position: 'relative',
        background: '#0f172a',
      }}>
        <iframe
          src="/germinador-simulador.html"
          title="Simulador 3D Germinador de Higos - UTP"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            minHeight: '600px',
          }}
          allow="fullscreen"
          loading="eager"
        />
      </div>

      {/* Nota de uso */}
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        paddingBottom: '4px',
      }}>
        🖱️ Clic + arrastrar para rotar · Scroll para zoom · Esta sección puede ocultarse desde el menú de administración
      </div>
    </div>
  );
}
