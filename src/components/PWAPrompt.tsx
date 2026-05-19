import React, { useEffect, useState } from 'react';

export default function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSManualTip, setShowIOSManualTip] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed/running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // If it is iOS, show a subtle tutorial tip after 3 seconds
    if (ios) {
      const timer = setTimeout(() => {
        // Only show if not dismissed before (using localStorage)
        if (!localStorage.getItem('dismissed-ios-pwa-tip')) {
          setShowIOSManualTip(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

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

  const dismissIOSTip = () => {
    setShowIOSManualTip(false);
    localStorage.setItem('dismissed-ios-pwa-tip', 'true');
  };

  // 1. Android Automatic Prompt
  if (showPrompt) {
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

  // 2. iOS Manual Prompt
  if (showIOSManualTip) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24, left: 16, right: 16,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(14, 165, 233, 0.2)',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }} className="fade-in slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '1.8rem' }}>📱</span>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>Instalar Aplicación</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Agrégala a tu pantalla de inicio en iPhone</p>
            </div>
          </div>
          <button 
            style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }} 
            onClick={dismissIOSTip}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, background: 'rgba(14, 165, 233, 0.05)', padding: 12, borderRadius: 12 }}>
          1. Presiona el botón de <strong>Compartir</strong> <span style={{ fontSize: '1rem' }}>📤</span> en Safari.<br />
          2. Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> <span style={{ fontSize: '1rem' }}>➕</span>.
        </div>
      </div>
    );
  }

  return null;
}
