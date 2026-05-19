import React, { useEffect, useState } from 'react';

export default function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20
    }}>
      <div className="glass-card fade-in slide-up" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        padding: 32,
        borderRadius: 24,
        textAlign: 'center',
        maxWidth: 360,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ 
          width: 64, height: 64, 
          background: 'var(--accent-blue)', 
          color: 'white', 
          borderRadius: 16, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 20px',
          boxShadow: '0 12px 24px rgba(14, 165, 233, 0.3)'
        }}>
          📱
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Agregar al Inicio
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
          Instala la Plataforma de Mantenimiento CRL en tu dispositivo para un acceso rápido y fluido.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn-ghost w-full" 
            onClick={() => setShowPrompt(false)}
            style={{ fontWeight: 600, color: '#64748b' }}
          >
            Ahora no
          </button>
          <button 
            className="btn btn-primary w-full" 
            onClick={handleInstallClick}
            style={{ fontWeight: 600 }}
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
