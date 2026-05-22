import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NAV_GROUPS, ROLE_LABELS } from '../layouts/DashboardLayout';

interface Props {
  onNavigate: (view: string) => void;
}

export default function WelcomePortal({ onNavigate }: Props) {
  const { user } = useAuth();

  if (!user) return null;

  // Role-based background images
  let bgImage = '';
  switch (user.role) {
    case 'admin':
      // Futuristic / Command Center
      bgImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';
      break;
    case 'supervisor':
    case 'jefatura':
      // Directing / Field work / Leadership
      bgImage = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop';
      break;
    case 'technician':
      // Tools / Machinery / Maintenance
      bgImage = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop';
      break;
    case 'requester':
    default:
      // Office / Corporate / Desk
      bgImage = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';
      break;
  }

  // Get permitted navigation items
  const permittedItems = NAV_GROUPS.flatMap(group => 
    group.items.filter(item => item.roles.includes(user.role))
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: `url('${bgImage}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Overlay to ensure text readability */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.4) 100%)',
        backdropFilter: 'blur(4px)'
      }} />

      {/* Content Container */}
      <div className="fade-in slide-up" style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '900px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 800, 
            color: 'var(--accent-gold)', 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            marginBottom: '16px' 
          }}>
            Plataforma de Mantenimiento
          </div>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 900, 
            color: '#ffffff', 
            lineHeight: 1.1,
            marginBottom: '12px',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>
            Interfaz de {ROLE_LABELS[user.role]}
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#cbd5e1', 
            fontWeight: 500 
          }}>
            Bienvenido, <span style={{ color: '#ffffff', fontWeight: 700 }}>{user.full_name}</span>
          </p>
        </div>

        {/* Action Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          {permittedItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: '#ffffff',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                fontSize: '2.5rem',
                background: 'rgba(255,255,255,0.15)',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                marginBottom: '4px'
              }}>
                {item.icon}
              </div>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 700, 
                textAlign: 'center',
                letterSpacing: '0.02em'
              }}>
                {item.label}
              </div>
            </button>
          ))}
        </div>
        
        {/* Footer info */}
        <div style={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.85rem',
          marginTop: '20px' 
        }}>
          Club de Regatas "Lima" • Módulo de Mantenimiento
        </div>
      </div>
    </div>
  );
}
