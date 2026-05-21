import React, { useEffect, useState } from 'react';

export default function PWAPrompt({ loginOnly = false }: { loginOnly?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSManualTip, setShowIOSManualTip] = useState(false);
  
  // State for the manual instructions modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [copied, setCopied] = useState(false);

  const currentUrl = window.location.origin;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;

  useEffect(() => {
    // Check if PWA is already installed/running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Set default active tab based on OS
    if (ios) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!loginOnly) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen to manual open event
    const handleManualOpen = () => {
      setShowManualModal(true);
    };
    window.addEventListener('open-pwa-install-modal', handleManualOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('open-pwa-install-modal', handleManualOpen);
    };
  }, [loginOnly]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setShowManualModal(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("Para instalar en este navegador, abre el menú de opciones del navegador (los tres puntos en Android o el botón de compartir en iOS) y selecciona 'Agregar a la pantalla de inicio'.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dismissIOSTip = () => {
    setShowIOSManualTip(false);
    localStorage.setItem('dismissed-ios-pwa-tip', 'true');
  };

  // 1. Android Automatic Prompt (solo fuera de login si no es loginOnly)
  if (!loginOnly && showPrompt && !showManualModal) {
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

  // 2. iOS Manual Prompt (deshabilitado en loginOnly)
  if (!loginOnly && showIOSManualTip && !showManualModal) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24, left: 16, right: 16,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }} className="fade-in slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '1.8rem' }}>📱</span>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>Instalar Aplicación Movil</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Agrégala a tu pantalla de inicio en iPhone</p>
            </div>
          </div>
          <button 
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', padding: '0 4px' }} 
            onClick={dismissIOSTip}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5, background: 'rgba(14, 165, 233, 0.05)', padding: 12, borderRadius: 12 }}>
          1. Presiona el botón de <strong>Compartir</strong> <span style={{ fontSize: '1rem' }}>📤</span> en Safari.<br />
          2. Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> <span style={{ fontSize: '1rem' }}>➕</span>.
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => { setShowIOSManualTip(false); setShowManualModal(true); }}
          style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', alignSelf: 'flex-end', fontWeight: 600 }}
        >
          Ver más opciones
        </button>
      </div>
    );
  }

  // 3. Gorgeous Manual Instructions Modal
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
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: '28px',
          borderRadius: 24,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              📲 Instalar Aplicación de Mantenimiento
            </h3>
            <button 
              onClick={() => setShowManualModal(false)}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: 'var(--text-secondary)'
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            La plataforma funciona como una <strong>PWA (Aplicación Web Progresiva)</strong>. Esto significa que la versión web y celular son el mismo sistema inteligente, adaptándose a tu teléfono móvil y permitiendo instalarse sin necesidad de usar tiendas de aplicaciones.
          </p>

          {/* Device Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
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
                  padding: '8px 12px',
                  border: 'none',
                  background: activeTab === tab ? 'var(--card-bg)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: '0.8rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'android' ? '🤖 Android' : tab === 'ios' ? '🍎 iPhone / iOS' : '💻 Computadora'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div style={{ marginBottom: 24 }}>
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
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(14, 165, 233, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                    <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: 'var(--accent-blue)' }}>Instalación Manual en Google Chrome:</h5>
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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(14, 165, 233, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                  <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: 'var(--accent-blue)' }}>Instalación Manual en Safari (iPhone):</h5>
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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(14, 165, 233, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                  <h5 style={{ fontWeight: 700, margin: '0 0 8px 0', color: 'var(--accent-blue)' }}>Instalación en la PC (Chrome/Edge):</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 8 }}>
                    <li>Mira la barra de direcciones de tu navegador (donde escribes el URL).</li>
                    <li>A la derecha, verás un icono de <strong>monitor con flecha hacia abajo</strong> 💻 o un símbolo de suma (+).</li>
                    <li>Haz clic en él y selecciona <strong>Instalar</strong>. La aplicación se abrirá en una ventana propia, independiente y súper fluida.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* QR Code and Direct URL sharing */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 20,
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              ¿Estás en tu computadora? Escanea el QR para abrirlo en tu celular:
            </h4>
            <div style={{ display: 'inline-block', background: 'white', padding: 10, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <img src={qrUrl} alt="Escanea para instalar en tu celular" style={{ width: 140, height: 140, display: 'block' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>URL del Sistema:</div>
              <div style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                padding: '6px 12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUrl}
                </span>
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: copied ? 'var(--accent-green)' : 'var(--accent-blue)'
                  }}
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
