import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import NotificationBell from '../components/NotificationBell';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

interface NavGroup {
  id: string;
  title: string;
  roles: UserRole[];
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'otm',
    title: 'Órdenes de Trabajo',
    roles: ['requester', 'supervisor', 'jefatura', 'admin'],
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['requester', 'supervisor', 'jefatura', 'admin'] },
      { id: 'new-otm', label: 'Nueva Solicitud', icon: '➕', roles: ['requester', 'admin', 'jefatura'] },
      { id: 'new-oti', label: 'Generar OTI', icon: '📝', roles: ['supervisor', 'admin'] },
      { id: 'management', label: 'Gestión OTMs', icon: '📋', roles: ['supervisor', 'admin'] },
    ]
  },
  {
    id: 'activities',
    title: 'Actividades',
    roles: ['technician'],
    items: [
      { id: 'my-tasks', label: 'Actividades asignadas', icon: '🔧', roles: ['technician'] },
      { id: 'routine-register', label: 'Actividades de Rutina', icon: '⚡', roles: ['technician'] },
    ]
  },
  {
    id: 'planning',
    title: 'Plan de actividades',
    roles: ['supervisor', 'admin', 'technician'],
    items: [
      { id: 'calendar', label: 'Agenda de actividades', icon: '📅', roles: ['supervisor', 'admin', 'technician'] },
      { id: 'gantt', label: 'Diagrama Gantt', icon: '📊', roles: ['supervisor', 'admin'] },
    ]
  },
  {
    id: 'reports',
    title: 'Análisis y Reportes',
    roles: ['supervisor', 'admin'],
    items: [
      { id: 'reports', label: 'Reportes', icon: '📈', roles: ['supervisor', 'admin'] },
    ]
  },
  {
    id: 'personnel',
    title: 'Configuración',
    roles: ['supervisor', 'admin'],
    items: [
      { id: 'users', label: 'Configuración Maestra', icon: '⚙️', roles: ['admin'] },
    ]
  }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  requester: 'Solicitante',
  supervisor: 'Supervisor',
  technician: 'Técnico',
  jefatura: 'Jefatura',
  admin: 'Admin',
};

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export default function DashboardLayout({ currentView, onNavigate, children }: Props) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isEmbeddedDashboard = currentView === 'dashboard' && (user.role === 'admin' || user.role === 'supervisor' || user.role === 'jefatura');

  if (!user) return null;

  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 49,
            backdropFilter: 'blur(2px)'
          }} 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, opacity: 0.6 }}>
            Plataforma de
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-blue)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            MANTENIMIENTO
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(78,181,230,0.12)' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', fontFamily: '"Nunito", "Quicksand", "Arial Rounded MT Bold", sans-serif' }}>CRL</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 800, fontFamily: '"Nunito", "Quicksand", "Arial Rounded MT Bold", sans-serif' }}>1875</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_GROUPS.filter(g => g.roles.includes(user.role)).map(group => {
            const groupItems = group.items.filter(item => item.roles.includes(user.role));
            if (groupItems.length === 0) return null;
            return (
              <div key={group.id}>
                <div className="sidebar-nav-group-title">{group.title}</div>
                {groupItems.map(item => (
                  <button key={item.id} className={`sidebar-link ${currentView === item.id ? 'active' : ''}`}
                    onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: user.role === 'admin' ? 'var(--accent-rose)' : 'inherit' }}>
                {user.role === 'admin' && <span style={{ fontSize: '0.7rem', verticalAlign: 'middle', marginRight: 4 }}>👑</span>}
                {user.full_name}
              </div>
              <span className={`role-badge role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          {user.area_sector && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {user.area_sector}</div>}
          <button className="btn btn-ghost btn-sm w-full" onClick={logout}>Cerrar Sesión</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content" style={isEmbeddedDashboard ? { marginLeft: sidebarOpen ? '0' : undefined } : undefined}>
        {isEmbeddedDashboard && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              left: 16,
              top: 16,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: 'white',
              width: '40px',
              height: '40px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.25rem',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            className="mobile-sidebar-toggle-btn"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        )}

        {!isEmbeddedDashboard && (
          <header className="topbar">
            <div className="flex items-center gap-3">
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                id="mobile-menu-btn"
              >
                {sidebarOpen ? '✕' : '☰'}
              </button>
              <span className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>
                  {NAV_GROUPS.flatMap(g => g.items).find(n => n.id === currentView)?.icon} {NAV_GROUPS.flatMap(g => g.items).find(n => n.id === currentView)?.label || 'Plataforma Mantenimiento'}
                </span>
                {(user.role === 'admin' || user.role === 'supervisor') && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, borderLeft: '1px solid var(--border)', paddingLeft: 10, display: 'inline-block' }}>
                    Centro de control - Mantenimiento
                  </span>
                )}
              </span>
            </div>
            <div className="topbar-actions">
              <NotificationBell />
            </div>
          </header>
        )}

        <main className="page-content fade-in" style={isEmbeddedDashboard ? { padding: 0, margin: 0, maxWidth: 'none', width: '100%' } : undefined}>
          {children}
        </main>
      </div>

      <style>{`
        #mobile-menu-btn { display: none; }
        @media(max-width:1024px) {
          #mobile-menu-btn { display: flex !important; }
          .mobile-sidebar-toggle-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
