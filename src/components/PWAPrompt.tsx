import { useEffect, useState } from 'react';

export default function PWAPrompt({ loginOnly = false }: { loginOnly?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);
  
  // State for the manual instructions modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Check if PWA is already installed/running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    // Detect device for default tab
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    if (ios) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    if (isStandalone) return;

    // Check if user already dismissed the auto-prompt permanently
    const dismissed = localStorage.getItem('dismissed-pwa-auto-prompt');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show automatic prompt on first visit (only once ever)
    if (!dismissed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowAutoPrompt(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    // Listen to manual open event from the login link
    const handleManualOpen = () => {
      setShowManualModal(true);
    };
    window.addEventListener('open-pwa-install-modal', handleManualOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('open-pwa-install-modal', handleManualOpen);
    };
  }, [loginOnly]);

  // Also listen for manual open event even when auto-prompt hasn't been dismissed
  useEffect(() => {
    const handleManualOpen = () => {
      setShowAutoPrompt(false);
      setShowManualModal(true);
    };
    window.addEventListener('open-pwa-install-modal', handleManualOpen);
    return () => window.removeEventListener('open-pwa-install-modal', handleManualOpen);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowAutoPrompt(false);
        setShowManualModal(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("Para instalar en este navegador, abre el menú de opciones del navegador (los tres puntos en Android o el botón de compartir en iOS) y selecciona 'Agregar a la pantalla de inicio'.");
    }
  };

  const handleDismissAutoPrompt = () => {
    setShowAutoPrompt(false);
    localStorage.setItem('dismissed-pwa-auto-prompt', 'true');
  };

  const handleAcceptAutoPrompt = async () => {
    localStorage.setItem('dismissed-pwa-auto-prompt', 'true');
    if (deferredPrompt) {
      await handleInstallClick();
    } else {
      // No native prompt available, show manual modal instead
      setShowAutoPrompt(false);
      setShowManualModal(true);
    }
  };

  // ─── 1. Auto-prompt on first visit ───
  if (showAutoPrompt && !showManualModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: 20
      }}>
        <div className="glass-card fade-in slide-up" style={{
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(16px)',
          padding: 32,
          borderRadius: 24,
          textAlign: 'center',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{ 
            width: 64, height: 64, 
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', 
            color: 'white', 
            borderRadius: 16, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 20px',
            boxShadow: '0 12px 24px rgba(14, 165, 233, 0.3)'
          }}>
            📲
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            Instalar Aplicación
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
            ¿Desea instalar la Plataforma de Mantenimiento CRL en su dispositivo para un acceso rápido?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={handleDismissAutoPrompt}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: '0.9rem',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              No, gracias
            </button>
            <button 
              onClick={handleAcceptAutoPrompt}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              Sí, instalar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. Manual Instructions Modal (simplified & formal) ───
  if (showManualModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: '16px'
      }}>
        <div className="glass-card fade-in slide-up" style={{
          background: 'rgba(255, 255, 255, 0.97)',
          border: '1px solid #e2e8f0',
          padding: '28px',
          borderRadius: 24,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
              📲 Instalar Aplicación de Mantenimiento
            </h3>
            <button 
              onClick={() => setShowManualModal(false)}
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: '#64748b',
                flexShrink: 0
              }}
            >
              ✕
            </button>
          </div>

          {/* Subtitle */}
          <p style={{ 
            fontSize: '0.9rem', 
            fontWeight: 600, 
            color: '#475569', 
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Seleccione el tipo de dispositivo en uso:
          </p>

          {/* Device Tabs */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 12,
            marginBottom: 20
          }}>
            {(['android', 'ios', 'desktop'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: 'none',
                  background: activeTab === tab ? '#ffffff' : 'transparent',
                  color: activeTab === tab ? '#1e293b' : '#64748b',
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'android' ? '🤖 Android' : tab === 'ios' ? '🍎 iPhone / iOS' : '💻 Computadora'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div>
            {activeTab === 'android' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deferredPrompt ? (
                  <button 
                    className="btn btn-primary w-full" 
                    onClick={handleInstallClick}
                    style={{ fontWeight: 700, padding: '12px', borderRadius: 12, fontSize: '0.9rem' }}
                  >
                    📥 Instalar Directamente
                  </button>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', background: 'rgba(14, 165, 233, 0.06)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                    <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: '#0284c7' }}>Instalación en Google Chrome:</h5>
                    <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 8 }}>
                      <li>Presiona el botón de menú <strong>tres puntos (⋮)</strong> en la esquina superior derecha de tu navegador Chrome.</li>
                      <li>Busca y selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                      <li>Confirma la instalación y ¡listo! Aparecerá como una aplicación nativa en tu celular.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ios' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.85rem', color: '#1e293b', background: 'rgba(14, 165, 233, 0.06)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                  <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: '#0284c7' }}>Instalación en Safari (iPhone):</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 8 }}>
                    <li>Abre el navegador <strong>Safari</strong> de tu iPhone e ingresa a este enlace.</li>
                    <li>Presiona el botón de <strong>Compartir</strong> <span style={{ fontSize: '1rem' }}>📤</span> (ubicado en la parte inferior central de la pantalla).</li>
                    <li>Desliza el menú de opciones hacia abajo y selecciona la opción <strong>"Agregar a Inicio"</strong> <span style={{ fontSize: '1.1rem' }}>➕</span>.</li>
                    <li>Presiona <strong>"Agregar"</strong> en la parte superior derecha y el acceso directo se creará en tu pantalla principal.</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deferredPrompt ? (
                  <button 
                    className="btn btn-primary w-full" 
                    onClick={handleInstallClick}
                    style={{ fontWeight: 700, padding: '12px', borderRadius: 12, fontSize: '0.9rem' }}
                  >
                    📥 Instalar Directamente
                  </button>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', background: 'rgba(14, 165, 233, 0.06)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                    <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: '#0284c7' }}>Instalación en la PC (Chrome/Edge):</h5>
                    <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 8 }}>
                      <li>Mira la barra de direcciones de tu navegador (donde escribes el URL).</li>
                      <li>A la derecha, verás un icono de <strong>monitor con flecha hacia abajo</strong> 💻 o un símbolo de suma (+).</li>
                      <li>Haz clic en él y selecciona <strong>Instalar</strong>. La aplicación se abrirá en una ventana propia, independiente y súper fluida.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
