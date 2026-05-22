import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PWAPrompt from '../components/PWAPrompt';

const ClubLogo = ({ size = 70 }: { size?: number }) => {
  const height = size;
  const width = Math.round(size * 0.8);
  
  return (
    <svg 
      viewBox="0 0 80 100" 
      width={width} 
      height={height} 
      style={{ display: 'block', margin: '0 auto' }}
      aria-label="Club de Regatas Lima Shield"
    >
      <ellipse 
        cx="40" 
        cy="42" 
        rx="26" 
        ry="36" 
        fill="#ffffff" 
        stroke="#ae9142" 
        strokeWidth="2.5" 
      />
      <polygon 
        points="24,31 56,31 40,68" 
        fill="#4eb5e6" 
        stroke="#ae9142" 
        strokeWidth="1.2" 
      />
      <text 
        x="40" 
        y="23" 
        fill="#584820" 
        fontFamily="'Inter', sans-serif" 
        fontWeight="800" 
        fontSize="10" 
        textAnchor="middle"
      >
        R
      </text>
      <text 
        x="20.5" 
        y="46" 
        fill="#584820" 
        fontFamily="'Inter', sans-serif" 
        fontWeight="800" 
        fontSize="10" 
        textAnchor="middle"
      >
        C
      </text>
      <text 
        x="59.5" 
        y="46" 
        fill="#584820" 
        fontFamily="'Inter', sans-serif" 
        fontWeight="800" 
        fontSize="10" 
        textAnchor="middle"
      >
        L
      </text>
      <text 
        x="40" 
        y="92" 
        fill="#ae9142" 
        fontFamily="'Inter', sans-serif" 
        fontWeight="800" 
        fontSize="11" 
        textAnchor="middle"
        letterSpacing="0.05em"
      >
        1875
      </text>
    </svg>
  );
};

export default function Login() {
  const { login, loginAsDemo, loading, error, isDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <>
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '30px 20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Capa de fondo con imagen en alta calidad y desenfoque CSS premium */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("/images/login-hero.jpg") center/cover no-repeat',
          filter: 'blur(2px) brightness(0.88)',
          transform: 'scale(1.04)', // Previene bordes blancos por el desenfoque
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <div style={{ 
          width: '100%', 
          maxWidth: 440, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 18,
          position: 'relative',
          zIndex: 1 
        }} className="fade-in">
          
          {/* Card 1: Top Brand/Header Card */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            padding: '32px 24px 28px', 
            borderRadius: '24px', 
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)', 
            backdropFilter: 'blur(10px)', 
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <h1 style={{ 
              fontSize: '1.65rem', 
              color: '#0f2d59', 
              fontFamily: '"Playfair Display", Georgia, serif', 
              fontWeight: 700, 
              marginBottom: 4,
              letterSpacing: '-0.01em'
            }}>
              Club de Regatas Lima
            </h1>
            <h2 style={{ 
              fontSize: '2.2rem', 
              fontWeight: 900, 
              color: '#ae9142', 
              letterSpacing: '0.04em', 
              lineHeight: 1.1,
              fontFamily: '"Inter", sans-serif',
              marginBottom: 20
            }}>
              MANTENIMIENTO
            </h2>
            <div style={{ marginTop: 8 }}>
              <ClubLogo size={70} />
            </div>
          </div>

          {/* Card 2: Login Form Card */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            padding: '32px 30px', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '24px', 
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)', 
            width: '100%', 
            boxSizing: 'border-box',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Correo electrónico
                </label>
                <input 
                  className="form-input" 
                  type="email" 
                  placeholder="usuario@clubderegatas.org.pe" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  style={{
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              {!isDemo && (
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Contraseña
                  </label>
                  <input 
                    className="form-input" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    style={{
                      borderRadius: '12px',
                      padding: '12px 16px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              )}
              {error && <div className="form-error" style={{ marginBottom: 16, color: 'var(--accent-rose)', fontSize: '0.85rem' }}>{error}</div>}
              <button 
                className="btn btn-primary btn-lg w-full" 
                type="submit" 
                disabled={loading}
                style={{
                  borderRadius: '12px',
                  padding: '14px',
                  fontWeight: 700,
                  background: 'var(--accent-blue)',
                  border: 'none',
                  boxShadow: '0 4px 12px var(--accent-blue-glow)',
                  fontSize: '0.95rem'
                }}
              >
                {loading ? <span className="spinner" /> : 'Iniciar Sesión'}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-pwa-install-modal'))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
                  padding: 4
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                📲 ¿Quieres instalar la app en su interfaz? Haz clic aquí
              </button>
            </div>
          </div>

          {/* Card 3: Demo Access Card */}
          {isDemo && (() => {
            const btnStyle = {
              display: 'flex' as const,
              alignItems: 'center' as const,
              justifyContent: 'space-between' as const,
              width: '100%',
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              padding: '10px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              textAlign: 'left' as const
            };
            const roleColors: Record<string, string> = {
              ADMINISTRADOR: '#b91c1c',
              SUPERVISOR: '#4338ca',
              SOLICITANTE: '#0d9488',
              JEFATURA: '#b45309',
              TÉCNICO: '#7c3aed'
            };
            const DemoBtn = ({ id, role, name, area }: { id: string; role: string; name: string; area: string }) => (
              <button className="demo-login-btn" onClick={() => loginAsDemo(id)} style={btnStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: roleColors[role] || '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{role}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{name}</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{area}</span>
              </button>
            );
            return (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.82)', 
              padding: '20px 16px 14px', 
              borderRadius: '24px', 
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <p style={{ 
                color: '#1e293b', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                textAlign: 'center', 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}>
                ⚜️ Modo Demo — Acceso rápido
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <DemoBtn id="admin-1" role="ADMINISTRADOR" name="Jose Calderon" area="22. MANT." />
                
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                
                <DemoBtn id="sup-1" role="SUPERVISOR" name="Diana Altamirano" area="22. MANT." />
                <DemoBtn id="sup-2" role="SUPERVISOR" name="Marlon Rivera" area="22. MANT." />
                
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                
                <DemoBtn id="usr-4" role="SOLICITANTE" name="Sonia Masias" area="13. DEPORTES" />
                <DemoBtn id="usr-5" role="SOLICITANTE" name="Lybe Diaz" area="13. DEPORTES" />

                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                
                <DemoBtn id="usr-10" role="JEFATURA" name="Raul Lozada" area="13. DEPORTES" />
                <DemoBtn id="usr-2" role="JEFATURA" name="Marco Alvarez" area="22. MANT." />

                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                
                <DemoBtn id="tech-1" role="TÉCNICO" name="Ciro Diaz Sifuentes" area="Calderos" />
                <DemoBtn id="tech-13" role="TÉCNICO" name="Eduardo Jorge Rivera" area="Electricista" />
                <DemoBtn id="tech-22" role="TÉCNICO" name="Rogelio Herrera Lazaro" area="Gasfitero" />
              </div>

              <div style={{ 
                textAlign: 'center', 
                marginTop: 4, 
                fontSize: '0.72rem', 
                color: 'rgba(0,0,0,0.35)', 
                fontWeight: 600,
                letterSpacing: '0.05em' 
              }}>
                Admin: J.C
              </div>
            </div>
            );
          })()}

        </div>
      </div>
      
      {/* Inline styles for button hover effects */}
      <style>{`
        .demo-login-btn:hover {
          background: rgba(255, 255, 255, 1) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(0, 0, 0, 0.15) !important;
        }
        .demo-login-btn:active {
          transform: translateY(0);
        }
      `}</style>

      <PWAPrompt loginOnly />
    </>
  );
}
