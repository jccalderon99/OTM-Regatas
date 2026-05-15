import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../lib/demoData';

export default function Login() {
  const { login, loginAsDemo, loading, error, isDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const ROLE_LABELS: Record<string, string> = {
    requester: 'Solicitante',
    supervisor: 'Supervisor',
    technician: 'Técnico',
    jefatura: 'Jefatura',
    admin: 'Administrador'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <>
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.2)), url("/regatas-bg.png") center/cover no-repeat', 
        padding: '20px' 
      }}>
        <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.95)', padding: '20px 40px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-blue)', letterSpacing: '-0.05em', lineHeight: 1 }}>CRL</div>
              <div style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 800 }}>1875</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8, fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 8 }}>Órdenes de Trabajo</p>
              <p style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Mantenimiento</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="glass-card" style={{ padding: 32, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Correo electrónico</label>
                <input className="form-input" type="email" placeholder="usuario@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              {!isDemo && (
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              )}
              {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {/* Demo Quick Login */}
          {isDemo && (
            <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.95)', padding: 20, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>⚡ Modo Demo — Acceso rápido</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_USERS.map(u => (
                  <button key={u.id} className="btn btn-secondary" onClick={() => loginAsDemo(u.id)} style={{ justifyContent: 'flex-start' }}>
                    <span className={`role-badge role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                    <span>{u.full_name}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.area_sector || 'Todas las áreas'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: 12, right: 16, fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)', fontWeight: 500, pointerEvents: 'none', letterSpacing: '0.05em' }}>Admin: J.C</div>
    </>
  );
}
