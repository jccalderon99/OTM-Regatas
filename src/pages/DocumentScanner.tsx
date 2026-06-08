import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface ScannedPage {
  id: string;
  originalDataUrl: string;
  editedDataUrl: string;
  filter: FilterType;
  rotation: number;
  brightness: number;
  contrast: number;
}

type FilterType = 'original' | 'grayscale' | 'bw' | 'magic';
type ScannerView = 'capture' | 'edit' | 'gallery' | 'export';

// ── Utility Functions ──────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function applyFilter(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  filter: FilterType,
  brightness: number,
  contrast: number,
  rotation: number
) {
  const rad = (rotation * Math.PI) / 180;
  const absC = Math.abs(Math.cos(rad));
  const absS = Math.abs(Math.sin(rad));
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = Math.round(w * absC + h * absS);
  canvas.height = Math.round(w * absS + h * absC);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  if (filter === 'original' && brightness === 100 && contrast === 100) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bFactor = brightness / 100;
  const cFactor = (contrast / 100) * (contrast / 100);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Brightness + Contrast
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255 * bFactor;
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255 * bFactor;
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255 * bFactor;

    switch (filter) {
      case 'grayscale': {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
        break;
      }
      case 'bw': {
        const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray2 > 128 ? 255 : 0;
        break;
      }
      case 'magic': {
        // Auto-levels: boost exposure + sharpen contrast for documents
        r = Math.pow(r / 255, 0.75) * 255;
        g = Math.pow(g / 255, 0.75) * 255;
        b = Math.pow(b / 255, 0.75) * 255;
        break;
      }
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

function playShutterSound() {
  try {
    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 1800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch { /* silent fail */ }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DocumentScanner() {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);
  const [view, setView] = useState<ScannerView>('capture');
  const [fileName, setFileName] = useState('documento_escaneado');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [cameraActive, setCameraActive] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPage = currentPageIndex >= 0 ? pages[currentPageIndex] : null;

  // ── Camera management ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter(d => d.kind === 'videoinput'));
    } catch (err) {
      console.error('Camera error:', err);
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  // ── Capture from camera ─────────────────────────────────────────────
  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    playShutterSound();
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const video = videoRef.current;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx2 = c.getContext('2d')!;
    ctx2.drawImage(video, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.92);

    const newPage: ScannedPage = {
      id: generateId(),
      originalDataUrl: dataUrl,
      editedDataUrl: dataUrl,
      filter: 'original',
      rotation: 0,
      brightness: 100,
      contrast: 100,
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    setView('edit');
    stopCamera();
  }, [pages.length, stopCamera]);

  // ── Upload from file ────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const newPage: ScannedPage = {
          id: generateId(),
          originalDataUrl: dataUrl,
          editedDataUrl: dataUrl,
          filter: 'original',
          rotation: 0,
          brightness: 100,
          contrast: 100,
        };
        setPages(prev => {
          const updated = [...prev, newPage];
          setCurrentPageIndex(updated.length - 1);
          return updated;
        });
        setView('edit');
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // ── Edit page (filter/rotate/brightness/contrast) ───────────────────
  const updateCurrentPage = useCallback((updates: Partial<ScannedPage>) => {
    if (currentPageIndex < 0) return;
    setPages(prev => {
      const copy = [...prev];
      copy[currentPageIndex] = { ...copy[currentPageIndex], ...updates };
      return copy;
    });
  }, [currentPageIndex]);

  // Re-render canvas when edit parameters change
  useEffect(() => {
    if (!currentPage || !canvasRef.current || view !== 'edit') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      applyFilter(canvas, ctx, img, currentPage.filter, currentPage.brightness, currentPage.contrast, currentPage.rotation);
      const edited = canvas.toDataURL('image/jpeg', 0.92);
      // Silently update edited data url without re-triggering
      setPages(prev => {
        const copy = [...prev];
        if (copy[currentPageIndex]) {
          copy[currentPageIndex] = { ...copy[currentPageIndex], editedDataUrl: edited };
        }
        return copy;
      });
    };
    img.src = currentPage.originalDataUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.filter, currentPage?.rotation, currentPage?.brightness, currentPage?.contrast, view]);

  // ── Reorder (drag & drop) ──────────────────────────────────────────
  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setPages(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    setDragIndex(null);
  };

  // ── Delete page ────────────────────────────────────────────────────
  const deletePage = (idx: number) => {
    setPages(prev => prev.filter((_, i) => i !== idx));
    if (currentPageIndex >= pages.length - 1) {
      setCurrentPageIndex(Math.max(0, pages.length - 2));
    }
    if (pages.length <= 1) setView('capture');
  };

  // ── Export to PDF ──────────────────────────────────────────────────
  const exportDocument = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      if (exportFormat === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const maxW = pageWidth - margin * 2;
              const maxH = pageHeight - margin * 2;
              const ratio = Math.min(maxW / img.width, maxH / img.height);
              const w = img.width * ratio;
              const h = img.height * ratio;
              const x = (pageWidth - w) / 2;
              const y = (pageHeight - h) / 2;
              pdf.addImage(pages[i].editedDataUrl, 'JPEG', x, y, w, h);
              resolve();
            };
            img.src = pages[i].editedDataUrl;
          });
        }

        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Export each page as JPEG
        for (let i = 0; i < pages.length; i++) {
          const link = document.createElement('a');
          link.href = pages[i].editedDataUrl;
          link.download = pages.length > 1 ? `${fileName}_${i + 1}.jpg` : `${fileName}.jpg`;
          link.click();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Share via Web Share API ────────────────────────────────────────
  const shareDocument = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      let file: File;
      if (exportFormat === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const ratio = Math.min(190 / img.width, 277 / img.height);
              const w = img.width * ratio;
              const h = img.height * ratio;
              pdf.addImage(pages[i].editedDataUrl, 'JPEG', (210 - w) / 2, (297 - h) / 2, w, h);
              resolve();
            };
            img.src = pages[i].editedDataUrl;
          });
        }
        const blob = pdf.output('blob');
        file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      } else {
        // Share first image
        const resp = await fetch(pages[0].editedDataUrl);
        const blob = await resp.blob();
        file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
      }

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 3000);
      } else {
        // Fallback: download
        exportDocument();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        exportDocument(); // Fallback
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Filter UI config ──────────────────────────────────────────────
  const filters: { key: FilterType; label: string; icon: string }[] = [
    { key: 'original', label: 'Original', icon: '🎨' },
    { key: 'grayscale', label: 'Gris', icon: '🌫️' },
    { key: 'bw', label: 'Documento', icon: '📄' },
    { key: 'magic', label: 'Mágico', icon: '✨' },
  ];

  // ── Styles ─────────────────────────────────────────────────────────
  const S = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0c1222 0%, #111b30 40%, #0d1526 100%)',
      color: '#e2e8f0',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(78,181,230,0.1)',
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(12px)',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
    },
    headerTitle: {
      fontSize: '1.2rem',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #4eb5e6, #a78bfa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    badge: {
      background: 'rgba(78,181,230,0.2)',
      color: '#4eb5e6',
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 700,
    },
    body: {
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      paddingBottom: '120px',
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '16px',
      backdropFilter: 'blur(8px)',
    },
    btn: (variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary') => ({
      padding: variant === 'ghost' ? '8px 12px' : '12px 24px',
      borderRadius: '14px',
      border: 'none',
      fontWeight: 700,
      fontSize: '0.9rem',
      cursor: 'pointer',
      display: 'inline-flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: '8px',
      transition: 'all 0.2s ease',
      ...(variant === 'primary' ? {
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
      } : variant === 'secondary' ? {
        background: 'rgba(255,255,255,0.08)',
        color: '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.12)',
      } : variant === 'danger' ? {
        background: 'rgba(239,68,68,0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239,68,68,0.2)',
      } : {
        background: 'transparent',
        color: '#94a3b8',
        padding: '8px 12px',
      }),
    }),
    captureBtn: {
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      border: '4px solid rgba(255,255,255,0.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 0 30px rgba(59,130,246,0.4), inset 0 0 20px rgba(255,255,255,0.1)',
      transition: 'all 0.15s ease',
    },
    videoContainer: {
      position: 'relative' as const,
      borderRadius: '20px',
      overflow: 'hidden',
      background: '#000',
      aspectRatio: '4/3',
      width: '100%',
    },
    thumbnail: (active: boolean) => ({
      width: '64px',
      height: '80px',
      objectFit: 'cover' as const,
      borderRadius: '10px',
      border: active ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: active ? '0 0 15px rgba(59,130,246,0.3)' : 'none',
    }),
    filterBtn: (active: boolean) => ({
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '6px',
      padding: '12px 16px',
      borderRadius: '14px',
      border: active ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      color: active ? '#60a5fa' : '#94a3b8',
      fontSize: '0.75rem',
      fontWeight: 600,
      minWidth: '72px',
    }),
    slider: {
      width: '100%',
      height: '6px',
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const,
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '3px',
      outline: 'none',
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div style={S.container}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerTitle}>
          <span style={{ fontSize: '1.5rem' }}>📸</span>
          Escáner de Documentos
          {pages.length > 0 && (
            <span style={S.badge}>{pages.length} pág{pages.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {pages.length > 0 && view !== 'export' && (
            <button style={S.btn('secondary')} onClick={() => setView('export')}>
              📥 Exportar
            </button>
          )}
          {view !== 'capture' && (
            <button style={S.btn('ghost')} onClick={() => { stopCamera(); setView('capture'); }}>
              ← Captura
            </button>
          )}
        </div>
      </div>

      <div style={S.body}>
        {/* Flash Effect */}
        {flashEffect && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)',
            zIndex: 9999, animation: 'fadeOut 0.2s ease forwards',
          }} />
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.9)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '4px solid rgba(59,130,246,0.2)',
              borderTopColor: '#3b82f6',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontWeight: 600, color: '#94a3b8' }}>Procesando...</span>
          </div>
        )}

        {/* Share Success Toast */}
        {showShareSuccess && (
          <div style={{
            position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', padding: '12px 24px', borderRadius: '14px',
            fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 30px rgba(16,185,129,0.3)',
            animation: 'slideDown 0.3s ease',
          }}>
            ✅ ¡Documento compartido exitosamente!
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  CAPTURE VIEW                                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {view === 'capture' && (
          <>
            {/* Camera */}
            {cameraActive ? (
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <div style={S.videoContainer}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Scan guide overlay */}
                  <div style={{
                    position: 'absolute', inset: '10%',
                    border: '2px dashed rgba(59,130,246,0.5)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                  }}>
                    {/* Corner markers */}
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                      <div key={pos} style={{
                        position: 'absolute',
                        width: '24px', height: '24px',
                        borderColor: '#3b82f6',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        ...(pos.includes('top') ? { top: -2 } : { bottom: -2 }),
                        ...(pos.includes('left') ? { left: -2 } : { right: -2 }),
                        borderTopStyle: pos.includes('top') ? 'solid' : 'none',
                        borderBottomStyle: pos.includes('bottom') ? 'solid' : 'none',
                        borderLeftStyle: pos.includes('left') ? 'solid' : 'none',
                        borderRightStyle: pos.includes('right') ? 'solid' : 'none',
                        borderRadius: pos === 'top-left' ? '8px 0 0 0' : pos === 'top-right' ? '0 8px 0 0' : pos === 'bottom-left' ? '0 0 0 8px' : '0 0 8px 0',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Camera Controls */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                  padding: '20px', background: 'rgba(15,23,42,0.8)',
                }}>
                  {/* Switch camera */}
                  {devices.length > 1 && (
                    <button
                      style={{ ...S.btn('ghost'), fontSize: '1.5rem' }}
                      onClick={() => {
                        setFacingMode(f => f === 'user' ? 'environment' : 'user');
                        startCamera();
                      }}
                    >
                      🔄
                    </button>
                  )}

                  {/* Capture button */}
                  <button style={S.captureBtn as any} onClick={captureFromCamera}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      border: '3px solid rgba(255,255,255,0.8)',
                    }} />
                  </button>

                  {/* Close camera */}
                  <button style={{ ...S.btn('ghost'), fontSize: '1.5rem' }} onClick={stopCamera}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              /* Capture options */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  ...S.card,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '24px', padding: '48px 24px',
                  background: 'linear-gradient(145deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05))',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <div style={{
                    width: '100px', height: '100px', borderRadius: '28px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '3rem',
                  }}>
                    📷
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>
                      Escanear documento
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', maxWidth: '400px' }}>
                      Usa la cámara para capturar o selecciona una imagen de tu galería
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button style={S.btn('primary')} onClick={startCamera}>
                      📷 Abrir Cámara
                    </button>
                    <button style={S.btn('secondary')} onClick={() => fileInputRef.current?.click()}>
                      📁 Subir Imagen
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Tips card */}
                <div style={{ ...S.card, padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '12px' }}>
                    💡 Consejos para un mejor escaneo
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {[
                      '📐 Coloca el documento en superficie plana',
                      '💡 Asegúrate de buena iluminación',
                      '📏 Encuadra dentro de las guías',
                      '🔍 Usa el filtro "Documento" para textos',
                    ].map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Existing pages thumbnails */}
            {pages.length > 0 && !cameraActive && (
              <div style={{ ...S.card, marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    📄 Páginas escaneadas ({pages.length})
                  </span>
                  <button style={S.btn('secondary')} onClick={() => setView('export')}>
                    Exportar →
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
                  {pages.map((p, i) => (
                    <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={p.editedDataUrl}
                        style={S.thumbnail(currentPageIndex === i)}
                        onClick={() => { setCurrentPageIndex(i); setView('edit'); }}
                        alt={`Página ${i + 1}`}
                      />
                      <span style={{
                        position: 'absolute', bottom: '-4px', right: '-4px',
                        background: '#1e293b', color: '#94a3b8', fontSize: '0.65rem',
                        fontWeight: 700, padding: '2px 6px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  EDIT VIEW                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {view === 'edit' && currentPage && (
          <>
            {/* Canvas preview */}
            <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{
                background: '#0a0f1a', display: 'flex', alignItems: 'center',
                justifyContent: 'center', minHeight: '300px', maxHeight: '500px',
                position: 'relative',
              }}>
                <canvas
                  ref={canvasRef}
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Quick actions */}
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'
            }}>
              <button
                style={S.btn('secondary')}
                onClick={() => updateCurrentPage({ rotation: ((currentPage.rotation || 0) + 90) % 360 })}
              >
                🔄 Rotar 90°
              </button>
              <button
                style={S.btn('secondary')}
                onClick={() => {
                  updateCurrentPage({ filter: 'original', brightness: 100, contrast: 100, rotation: 0 });
                }}
              >
                ↩️ Restaurar
              </button>
              <button
                style={S.btn('danger')}
                onClick={() => deletePage(currentPageIndex)}
              >
                🗑️ Eliminar
              </button>
            </div>

            {/* Filters */}
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '14px' }}>
                🎨 Filtros
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '2px' }}>
                {filters.map(f => (
                  <button
                    key={f.key}
                    style={S.filterBtn(currentPage.filter === f.key) as any}
                    onClick={() => updateCurrentPage({ filter: f.key })}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brightness & Contrast */}
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '14px' }}>
                ☀️ Ajustes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
                    <span>Brillo</span>
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>{currentPage.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={currentPage.brightness}
                    onChange={(e) => updateCurrentPage({ brightness: parseInt(e.target.value) })}
                    style={S.slider}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
                    <span>Contraste</span>
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>{currentPage.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={currentPage.contrast}
                    onChange={(e) => updateCurrentPage({ contrast: parseInt(e.target.value) })}
                    style={S.slider}
                  />
                </div>
              </div>
            </div>

            {/* Page thumbnails strip */}
            {pages.length > 0 && (
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa' }}>
                    📄 Páginas ({pages.length})
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={S.btn('secondary')} onClick={() => { stopCamera(); setView('capture'); }}>
                      ➕ Añadir
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
                  {pages.map((p, i) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(i)}
                      style={{ position: 'relative', flexShrink: 0, cursor: 'grab' }}
                    >
                      <img
                        src={p.editedDataUrl}
                        style={S.thumbnail(currentPageIndex === i)}
                        onClick={() => setCurrentPageIndex(i)}
                        alt={`Página ${i + 1}`}
                      />
                      <span style={{
                        position: 'absolute', bottom: '-4px', right: '-4px',
                        background: currentPageIndex === i ? '#3b82f6' : '#1e293b',
                        color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                        padding: '2px 6px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '8px', textAlign: 'center' }}>
                  💡 Arrastra las miniaturas para reordenar
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  EXPORT VIEW                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {view === 'export' && (
          <>
            {/* Preview all pages */}
            <div style={{ ...S.card, padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9', marginBottom: '16px', textAlign: 'center' }}>
                Vista previa del documento ({pages.length} página{pages.length > 1 ? 's' : ''})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
                gap: '12px',
                justifyItems: 'center',
              }}>
                {pages.map((p, i) => (
                  <div key={p.id} style={{
                    position: 'relative',
                    background: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}>
                    <img
                      src={p.editedDataUrl}
                      style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                      alt={`Página ${i + 1}`}
                    />
                    <div style={{
                      position: 'absolute', bottom: '6px', right: '6px',
                      background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      {i + 1}/{pages.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '16px' }}>
                ⚙️ Opciones de exportación
              </div>

              {/* File name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
                  Nombre del archivo
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e2e8f0',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="documento_escaneado"
                />
              </div>

              {/* Format selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                  Formato
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { key: 'pdf', label: 'PDF', icon: '📕', desc: 'Ideal para documentos multi-página' },
                    { key: 'jpg', label: 'JPG', icon: '🖼️', desc: 'Imagen individual por página' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setExportFormat(f.key as 'pdf' | 'jpg')}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '14px',
                        border: exportFormat === f.key
                          ? '2px solid #3b82f6'
                          : '2px solid rgba(255,255,255,0.08)',
                        background: exportFormat === f.key
                          ? 'rgba(59,130,246,0.12)'
                          : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left' as const,
                        color: '#e2e8f0',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.label}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  ...S.btn('primary'),
                  flex: 1,
                  padding: '16px 24px',
                  fontSize: '1rem',
                }}
                onClick={exportDocument}
                disabled={isProcessing}
              >
                📥 Descargar {exportFormat.toUpperCase()}
              </button>
              <button
                style={{
                  ...S.btn('secondary'),
                  flex: 1,
                  padding: '16px 24px',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#34d399',
                }}
                onClick={shareDocument}
                disabled={isProcessing}
              >
                📤 Compartir
              </button>
            </div>
            <div style={{
              textAlign: 'center', fontSize: '0.75rem', color: '#475569',
              marginTop: '8px',
            }}>
              Compartir permite enviar por WhatsApp, correo u otras apps instaladas
            </div>

            {/* Back to edit */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
              <button style={S.btn('ghost')} onClick={() => setView('edit')}>
                ← Volver al editor
              </button>
              <button style={S.btn('ghost')} onClick={() => { stopCamera(); setView('capture'); }}>
                ➕ Añadir más páginas
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Global Styles ──────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(59,130,246,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(59,130,246,0.4);
        }
      `}</style>
    </div>
  );
}
