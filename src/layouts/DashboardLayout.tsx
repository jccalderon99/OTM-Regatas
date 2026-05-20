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

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'attendance-tech',
    title: 'Ingreso',
    roles: ['technician'],
    items: [
      { id: 'attendance', label: 'Marcar Asistencia', icon: '📍', roles: ['technician'] },
    ]
  },
  {
    id: 'otm',
    title: 'Orden de trabajo mantenimiento',
    roles: ['requester', 'supervisor', 'technician', 'jefatura', 'admin'],
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['requester', 'supervisor', 'jefatura', 'admin'] },
      { id: 'new-otm', label: 'Nueva Solicitud', icon: '➕', roles: ['requester', 'admin', 'jefatura'] },
      { id: 'management', label: 'Gestión OTMs', icon: '📋', roles: ['supervisor', 'admin'] },
      { id: 'my-tasks', label: 'Mis Tareas', icon: '🔧', roles: ['technician'] },
      { id: 'calendar', label: 'Calendario OTMs', icon: '📅', roles: ['supervisor', 'admin', 'technician'] },
    ]
  },
  {
    id: 'personnel',
    title: 'Personal de Mantenimiento',
    roles: ['supervisor', 'admin'],
    items: [
      { id: 'attendance-table', label: 'Asistencia del personal', icon: '⏱️', roles: ['supervisor', 'admin'] },
      { id: 'users', label: 'Panel de Usuarios', icon: '👥', roles: ['admin'] },
    ]
  }
];

const ROLE_LABELS: Record<UserRole, string> = {
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
          <div style={{ textAlign: 'center', margin: '12px 0 16px' }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent-blue)', letterSpacing: '-0.05em', lineHeight: 1 }}>CRL</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 800 }}>1875</div>
          </div>
          <div className="sidebar-subtitle">Órdenes de Trabajo</div>
        </div>
        <nav className="sidebar-nav">
          {NAV_GROUPS.filter(g => g.roles.includes(user.role)).map(group => {
            const groupItems = group.items.filter(item => item.roles.includes(user.role));
            if (groupItems.length === 0) return null;
            return (
              <div key={group.id} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 16px', marginBottom: 8 }}>
                  {group.title}
                </div>
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
      <div className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button 
              className="btn btn-icon btn-ghost" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="mobile-menu-btn"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <span className="topbar-title">
              {NAV_GROUPS.flatMap(g => g.items).find(n => n.id === currentView)?.icon} {NAV_GROUPS.flatMap(g => g.items).find(n => n.id === currentView)?.label || 'Plataforma Mantenimiento'}
            </span>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
          </div>
        </header>
        <main className="page-content fade-in">
          {children}
        </main>
      </div>

      <style>{`
        #mobile-menu-btn { display: none; }
        @media(max-width:1024px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
