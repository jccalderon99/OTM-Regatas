import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { savePanoramaBlob, resolvePanoramaUrl } from './lib/clauRvDb';
import { 
  Camera, Plus, Trash2, ArrowLeft, Edit3, Compass, Check, X,
  Info, Image as ImageIcon
} from 'lucide-react';

interface Hotspot {
  pitch: number;
  yaw: number;
  type: 'info' | 'scene' | 'media';
  title?: string;
  text?: string;
  targetScene?: string;
  icon?: string; // 'info' | 'arrow' | 'media' | 'alert' | 'star'
  targetPitch?: number;
  targetYaw?: number;
}

interface Scene {
  title: string;
  image: string;
  hotSpots: Hotspot[];
}

interface Tour {
  id: string;
  title: string;
  image: string;
  createdAt: string;
  scenes?: Record<string, Scene>;
  defaultScene?: string;
}

const DEFAULT_TOURS: Tour[] = [
  {
    id: "tour-demo-1",
    title: "Muestra - Área del Club",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    scenes: {
      "scene_1": {
        title: "Oficina Principal",
        image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1600&auto=format&fit=crop&q=80",
        hotSpots: [
          {
            pitch: -10,
            yaw: -50,
            type: "info",
            title: "Computadora de Control",
            text: "Terminal de monitoreo y bitácora en tiempo real.",
            icon: "info"
          },
          {
            pitch: -15,
            yaw: 40,
            type: "scene",
            targetScene: "scene_2",
            text: "Ir a la Terraza",
            icon: "arrow"
          }
        ]
      },
      "scene_2": {
        title: "Terraza",
        image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=1600&auto=format&fit=crop&q=80",
        hotSpots: [
          {
            pitch: -5,
            yaw: -20,
            type: "scene",
            targetScene: "scene_1",
            text: "Volver a la Oficina",
            icon: "arrow"
          }
        ]
      }
    },
    defaultScene: "scene_1"
  }
];

// SVGs for Panoee style icons
const HOTSPOT_ICONS: Record<string, string> = {
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-6 h-6 text-white pointer-events-none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-6 h-6 text-white pointer-events-none pulse-scene"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-6 h-6 text-white pointer-events-none"><path d="M23 7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7Z"/><path d="m10 15 5-3-5-3v6Z"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-6 h-6 text-white pointer-events-none"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-6 h-6 text-white pointer-events-none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

export default function App() {
  const { isAdmin } = useAuth();

  // State
  const [tours, setTours] = useState<Tour[]>([]);
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTourData, setActiveTourData] = useState<Tour | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'gallery' | 'viewer'>('gallery');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Form states
  const [newTourTitle, setNewTourTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addSceneInputRef = useRef<HTMLInputElement>(null);

  // Hotspot modal form states
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [hotspotPitch, setHotspotPitch] = useState(0);
  const [hotspotYaw, setHotspotYaw] = useState(0);
  const [hotspotType, setHotspotType] = useState<'info' | 'scene' | 'media'>('info');
  const [hotspotIcon, setHotspotIcon] = useState<string>('info');
  const [hotspotTitle, setHotspotTitle] = useState('');
  const [hotspotText, setHotspotText] = useState('');
  const [hotspotTargetScene, setHotspotTargetScene] = useState('');

  // Info overlay card state
  const [infoCardData, setInfoCardData] = useState<{ title: string; text: string } | null>(null);
  const [thumbnailsDrawerOpen, setThumbnailsDrawerOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // Refs
  const viewerRef = useRef<any>(null);
  const resolvedImagesMapRef = useRef<Record<string, string>>({});

  // Fetch list from localstorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('standalone_claurv_tours');
    if (saved) {
      try {
        setTours(JSON.parse(saved));
      } catch {
        setTours(DEFAULT_TOURS);
      }
    } else {
      setTours(DEFAULT_TOURS);
      localStorage.setItem('standalone_claurv_tours', JSON.stringify(DEFAULT_TOURS));
    }
  }, []);

  const saveToursList = (updated: Tour[]) => {
    setTours(updated);
    localStorage.setItem('standalone_claurv_tours', JSON.stringify(updated));
  };

  const getCachedPanoramaUrl = async (path: string): Promise<string> => {
    if (resolvedImagesMapRef.current[path]) {
      return resolvedImagesMapRef.current[path];
    }
    const resolved = await resolvePanoramaUrl(path);
    resolvedImagesMapRef.current[path] = resolved;
    return resolved;
  };

  // Pannellum initialization
  const initViewer = async (tour: Tour, sceneId: string | null, forceEditMode = false) => {
    if (!tour.scenes) return;
    setIsLoading(true);
    setLoadingText('Cargando Entorno 360°...');

    const activeSceneId = sceneId || tour.defaultScene || Object.keys(tour.scenes || {})[0];
    setCurrentSceneId(activeSceneId);

    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch (e) {
        console.error(e);
      }
      viewerRef.current = null;
    }

    try {
      const scenesConfig: Record<string, any> = {};

      for (const [id, scene] of Object.entries(tour.scenes || {})) {
        const resolvedUrl = await getCachedPanoramaUrl(scene.image);
        
        const hotSpotsConfig = (scene.hotSpots || []).map((hs, index) => {
          return {
            pitch: hs.pitch,
            yaw: hs.yaw,
            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
              const selectedIcon = hs.icon || (hs.type === 'scene' ? 'arrow' : 'info');
              hotSpotDiv.className = `pnlm-hotspot-base custom-hotspot hotspot-${hs.type} ${forceEditMode ? 'edit-mode' : ''}`;
              hotSpotDiv.innerHTML = HOTSPOT_ICONS[selectedIcon] || HOTSPOT_ICONS.info;

              if (hs.title || hs.text) {
                const tooltip = document.createElement('div');
                tooltip.className = 'hotspot-tooltip';
                tooltip.innerText = hs.title || hs.text || '';
                hotSpotDiv.appendChild(tooltip);
              }

              hotSpotDiv.onclick = (e) => {
                e.stopPropagation();
                if (forceEditMode) {
                  if (confirm('¿Deseas eliminar este marcador permanentemente?')) {
                    const draft = JSON.parse(JSON.stringify(tour));
                    draft.scenes[id].hotSpots.splice(index, 1);
                    setActiveTourData(draft);
                    
                    const p = viewerRef.current ? viewerRef.current.getPitch() : 0;
                    const y = viewerRef.current ? viewerRef.current.getYaw() : 0;
                    setTimeout(() => initViewer(draft, id, true).then(() => {
                      if (viewerRef.current) {
                        viewerRef.current.setPitch(p);
                        viewerRef.current.setYaw(y);
                      }
                    }), 50);
                  }
                } else {
                  if (hs.type === 'scene' && hs.targetScene) {
                    const overlay = document.getElementById('transition-overlay');
                    if (overlay) overlay.classList.add('opacity-100');
                    setTimeout(() => {
                      if (viewerRef.current) {
                        viewerRef.current.loadScene(hs.targetScene, hs.targetPitch || 0, hs.targetYaw || 0);
                      }
                      setTimeout(() => {
                        if (overlay) overlay.classList.remove('opacity-100');
                      }, 400);
                    }, 400);
                  } else {
                    setInfoCardData({
                      title: hs.title || 'Información',
                      text: hs.text || ''
                    });
                  }
                }
              };
            }
          };
        });

        scenesConfig[id] = {
          title: scene.title,
          type: "equirectangular",
          panorama: resolvedUrl,
          hotSpots: hotSpotsConfig
        };
      }

      const config = {
        default: {
          firstScene: activeSceneId,
          sceneFadeDuration: 800,
          autoLoad: true,
          showControls: false,
          compass: false
        },
        scenes: scenesConfig
      };

      setTimeout(() => {
        if (!document.getElementById('pannellum-container')) {
          setIsLoading(false);
          return;
        }

        const viewer = (window as any).pannellum.viewer('pannellum-container', config);
        viewerRef.current = viewer;

        viewer.on('load', () => {
          setIsLoading(false);
          viewer.resize();
        });

        viewer.on('scenechange', (newId: string) => {
          setCurrentSceneId(newId);
        });
      }, 100);

    } catch (err) {
      console.error(err);
      alert('Error al montar el visor 360.');
      setIsLoading(false);
    }
  };

  const handleSwitchScene = (sceneId: string) => {
    if (viewerRef.current) {
      const overlay = document.getElementById('transition-overlay');
      if (overlay) overlay.classList.add('opacity-100');
      setTimeout(() => {
        viewerRef.current.loadScene(sceneId, 0, 0);
        setTimeout(() => {
          if (overlay) overlay.classList.remove('opacity-100');
        }, 300);
      }, 300);
    } else {
      const target = isEditMode ? activeTourData : activeTour;
      if (target) initViewer(target, sceneId, isEditMode);
    }
  };

  const handleOpenTour = (tour: Tour) => {
    setActiveTour(tour);
    setActiveTourData(null);
    setIsEditMode(false);
    setViewMode('viewer');
    
    const normalized = { ...tour };
    if (!normalized.scenes) {
      normalized.scenes = {
        "scene_1": {
          title: "Escena 1",
          image: tour.image,
          hotSpots: []
        }
      };
      normalized.defaultScene = "scene_1";
    }
    initViewer(normalized, normalized.defaultScene || "scene_1", false);
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      setActiveTourData(null);
      setIsEditMode(false);
      initViewer(activeTour!, currentSceneId || null, false);
    } else {
      const clone = JSON.parse(JSON.stringify(activeTour));
      setActiveTourData(clone);
      setIsEditMode(true);
      initViewer(clone, currentSceneId || null, true);
    }
  };

  const handleSaveTourEdits = () => {
    if (!activeTourData) return;
    const draft = { ...activeTourData };
    if (draft.scenes && draft.defaultScene && draft.scenes[draft.defaultScene]) {
      draft.image = draft.scenes[draft.defaultScene].image;
    }

    const updated = tours.map(t => t.id === draft.id ? draft : t);
    saveToursList(updated);
    setActiveTour(draft);
    setIsEditMode(false);
    setActiveTourData(null);
    initViewer(draft, currentSceneId || null, false);
    alert('¡Tour virtual guardado exitosamente!');
  };

  const handlePanoramaClick = (event: React.MouseEvent) => {
    if (!isEditMode || !viewerRef.current) return;

    const target = event.target as HTMLElement;
    if (
      target.closest('.pnlm-controls-container') ||
      target.closest('.custom-hotspot') ||
      target.closest('#control-panel-ui')
    ) {
      return;
    }

    const container = document.getElementById('pannellum-container');
    if (!container) return;

    const customEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      target: event.nativeEvent.target,
      preventDefault: () => {},
      stopPropagation: () => {}
    };

    const coords = viewerRef.current.mouseEventToCoords(customEvent);
    if (coords) {
      const [pitch, yaw] = coords;
      setHotspotPitch(pitch);
      setHotspotYaw(yaw);
      setHotspotType('info');
      setHotspotIcon('info');
      setHotspotTitle('');
      setHotspotText('');

      const otherScenes = Object.keys(activeTourData?.scenes || {}).filter(id => id !== currentSceneId);
      setHotspotTargetScene(otherScenes[0] || '');
      setIsHotspotModalOpen(true);
    }
  };

  const handleCreateHotspotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTourData || !currentSceneId) return;

    const newHs: Hotspot = {
      pitch: hotspotPitch,
      yaw: hotspotYaw,
      type: hotspotType,
      icon: hotspotIcon
    };

    if (hotspotType === 'info') {
      newHs.title = hotspotTitle.trim() || 'Nota';
      newHs.text = hotspotText.trim() || 'Comentario descriptivo.';
    } else if (hotspotType === 'media') {
      newHs.title = hotspotTitle.trim() || 'Multimedia';
      newHs.text = hotspotText.trim() || 'Enlace o vídeo.';
    } else {
      if (!hotspotTargetScene) {
        alert('Crea otra escena primero.');
        return;
      }
      const targetSceneName = activeTourData.scenes?.[hotspotTargetScene]?.title || 'Escena vinculada';
      newHs.targetScene = hotspotTargetScene;
      newHs.text = `Ir a: ${targetSceneName}`;
      newHs.targetPitch = 0;
      newHs.targetYaw = 0;
    }

    const draft = { ...activeTourData };
    if (draft.scenes && draft.scenes[currentSceneId]) {
      if (!draft.scenes[currentSceneId].hotSpots) {
        draft.scenes[currentSceneId].hotSpots = [];
      }
      draft.scenes[currentSceneId].hotSpots.push(newHs);
    }

    setActiveTourData(draft);
    setIsHotspotModalOpen(false);

    const p = viewerRef.current ? viewerRef.current.getPitch() : 0;
    const y = viewerRef.current ? viewerRef.current.getYaw() : 0;

    setTimeout(() => {
      initViewer(draft, currentSceneId, true).then(() => {
        if (viewerRef.current) {
          viewerRef.current.setPitch(p);
          viewerRef.current.setYaw(y);
        }
      });
    }, 50);
  };

  const uploadFile = async (file: File): Promise<string> => {
    // CDN simulation for standalone (IndexedDB base fallback or dataURL representation for speed)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        // Reduce quality client side to convert fast to webp/jpg blob
        await savePanoramaBlob(id, file);
        resolve(`indexeddb://${id}`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setLoadingText('Subiendo imagen 360°...');

    try {
      const url = await uploadFile(selectedFile);
      const newId = 'tour-' + Math.random().toString(36).substring(2, 8);
      const title = newTourTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, "");

      const newTour: Tour = {
        id: newId,
        title,
        image: url,
        createdAt: new Date().toISOString(),
        scenes: {
          "scene_1": {
            title: "Escena 1",
            image: url,
            hotSpots: []
          }
        },
        defaultScene: "scene_1"
      };

      const updated = [newTour, ...tours];
      saveToursList(updated);
      setNewTourTitle('');
      setSelectedFile(null);
      setIsLoading(false);
      handleOpenTour(newTour);
    } catch (e: any) {
      alert('Error creando tour: ' + e.message);
      setIsLoading(false);
    }
  };

  const handleAddSceneSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeTourData || !currentSceneId) return;
    const file = e.target.files[0];
    const name = prompt('Nombre de la nueva escena:', file.name.replace(/\.[^/.]+$/, ""));
    if (name === null) return;

    setIsLoading(true);
    setLoadingText('Subiendo escena...');

    try {
      const url = await uploadFile(file);
      const sceneId = 'scene_' + Math.random().toString(36).substring(2, 8);
      const draft = { ...activeTourData };
      if (!draft.scenes) draft.scenes = {};
      draft.scenes[sceneId] = {
        title: name.trim() || 'Escena Adicional',
        image: url,
        hotSpots: []
      };
      setActiveTourData(draft);
      setIsLoading(false);
      initViewer(draft, sceneId, true);
    } catch (e: any) {
      alert('Error agregando escena: ' + e.message);
      setIsLoading(false);
    }
  };

  const handleDeleteTour = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar permanentemente este tour virtual?')) {
      const updated = tours.filter(t => t.id !== id);
      saveToursList(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-500">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">ClauRV 360°</h1>
            <p className="text-xs text-slate-400">Creador de Recorridos Virtuales Autónomo</p>
          </div>
        </div>
        {viewMode === 'viewer' && (
          <button
            onClick={() => setViewMode('gallery')}
            className="flex items-center gap-2 text-xs px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la Galería
          </button>
        )}
      </header>

      {/* Loader */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-300">{loadingText}</p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        
        {/* Gallery Mode */}
        {viewMode === 'gallery' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Create Tour Card */}
            {isAdmin && (
              <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-md font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Crear Recorrido Virtual</h2>
                <form onSubmit={handleCreateTourSubmit} className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[250px]">
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Título del Tour</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Gimnasio Principal, Área Náutica..."
                      value={newTourTitle}
                      onChange={e => setNewTourTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm transition"
                    />
                  </div>
                  <div className="flex-1 min-w-[250px]">
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Imagen Panorámica (360°)</label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 hover:border-slate-700 transition text-left text-slate-400 text-sm flex items-center justify-between"
                    >
                      <span>{selectedFile ? selectedFile.name : 'Seleccionar archivo...'}</span>
                      <Camera className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 py-2.5 font-bold text-sm transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Crear Tour
                  </button>
                </form>
              </section>
            )}

            {/* Tours Grid */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold">Mis Recorridos Virtuales</h2>
              {tours.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
                  No hay tours virtuales disponibles. Crea uno para comenzar.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tours.map(tour => (
                    <div
                      key={tour.id}
                      onClick={() => handleOpenTour(tour)}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition cursor-pointer group flex flex-col h-full"
                    >
                      <div className="h-44 w-full bg-slate-950 relative overflow-hidden">
                        <img
                          src={tour.image.startsWith('indexeddb://') ? '/favicon.ico' : tour.image}
                          alt={tour.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=500';
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
                          📸 {Object.keys(tour.scenes || {}).length || 1} Escena(s)
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-md group-hover:text-blue-400 transition truncate mb-2">{tour.title}</h3>
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
                          <span>{new Date(tour.createdAt).toLocaleDateString()}</span>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDeleteTour(e, tour.id)}
                              className="p-1.5 hover:text-red-500 rounded-lg transition"
                              title="Eliminar tour"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Viewer / Editor Mode */}
        {viewMode === 'viewer' && activeTour && (
          <div className="relative w-full h-[calc(100vh-200px)] rounded-3xl overflow-hidden bg-black border border-slate-800">
            {/* Fade transition element */}
            <div id="transition-overlay" className="absolute inset-0 bg-black pointer-events-none opacity-0 z-[9999] transition-opacity duration-300" />

            {/* Pannellum Root */}
            <div
              id="pannellum-container"
              onClick={handlePanoramaClick}
              className="w-full h-full"
            />

            {/* Overlay UI */}
            <div id="control-panel-ui" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-50">
              {/* Top Controls */}
              <div className="w-full flex justify-between items-center pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-bold">{isEditMode ? activeTourData?.title : activeTour.title}</h3>
                  <p className="text-xs text-slate-400 truncate">
                    {isEditMode ? activeTourData?.scenes?.[currentSceneId!]?.title : activeTour.scenes?.[currentSceneId!]?.title}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={toggleEditMode}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                        isEditMode 
                          ? 'bg-red-600 hover:bg-red-500 border-red-500/50' 
                          : 'bg-blue-600 hover:bg-blue-500 border-blue-500/50'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      {isEditMode ? 'Cancelar Edición' : 'Editar Recorrido'}
                    </button>
                    {isEditMode && (
                      <button
                        onClick={handleSaveTourEdits}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 border border-green-500/50 rounded-xl text-xs font-bold transition"
                      >
                        <Check className="w-4 h-4" /> Guardar Cambios
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions Drawer & Controls */}
              <div className="w-full space-y-4">
                {/* Popups (Note cards) */}
                {infoCardData && (
                  <div className="max-w-sm pointer-events-auto bg-slate-900/95 border border-slate-800 backdrop-blur-md rounded-2xl p-5 shadow-2xl space-y-2 animate-slideUp">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-blue-400 flex items-center gap-1.5"><Info className="w-4 h-4" /> {infoCardData.title}</h4>
                      <button onClick={() => setInfoCardData(null)} className="text-slate-400 hover:text-white transition"><X className="w-4.5 h-4.5" /></button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{infoCardData.text}</p>
                  </div>
                )}

                {/* Main controls row */}
                <div className="flex justify-between items-end gap-4">
                  {/* Left: Scenes Button */}
                  <button
                    onClick={() => setThumbnailsDrawerOpen(!thumbnailsDrawerOpen)}
                    className="pointer-events-auto bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-800 transition text-xs font-bold flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> Escenas
                  </button>

                  {/* Center: Zoom & rotation */}
                  <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
                    <button
                      onClick={() => viewerRef.current?.setHfov(viewerRef.current?.getHfov() - 8)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition text-xs font-bold"
                    >+</button>
                    <button
                      onClick={() => viewerRef.current?.setHfov(viewerRef.current?.getHfov() + 8)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition text-xs font-bold"
                    >-</button>
                    <button
                      onClick={() => {
                        const state = !autoRotate;
                        setAutoRotate(state);
                        if (state) viewerRef.current?.startAutoRotate(-1.5);
                        else viewerRef.current?.stopAutoRotate();
                      }}
                      className={`p-2 rounded-lg transition text-xs ${autoRotate ? 'text-blue-400 bg-blue-500/10' : 'hover:bg-slate-800'}`}
                      title="Giro Automático"
                    >
                      <Compass className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right: Add Scene (Editor Mode only) */}
                  {isEditMode && (
                    <div className="pointer-events-auto flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={addSceneInputRef}
                        onChange={handleAddSceneSubmit}
                        className="hidden"
                      />
                      <button
                        onClick={() => addSceneInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                      >
                        <Plus className="w-4 h-4" /> Agregar Escena
                      </button>
                    </div>
                  )}
                </div>

                {/* Scene thumbnails bar drawer */}
                {thumbnailsDrawerOpen && (
                  <div className="pointer-events-auto bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3 shadow-2xl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-300">Navegar por las Escenas del Recorrido</h4>
                      <button onClick={() => setThumbnailsDrawerOpen(false)} className="text-slate-500 hover:text-white">&times;</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {Object.entries((isEditMode ? activeTourData : activeTour)?.scenes || {}).map(([id, sc]) => (
                        <div
                          key={id}
                          onClick={() => handleSwitchScene(id)}
                          className={`flex-none w-32 h-20 rounded-xl overflow-hidden relative cursor-pointer border-2 transition ${
                            id === currentSceneId ? 'border-blue-500' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={sc.image.startsWith('indexeddb://') ? '/favicon.ico' : sc.image}
                            alt={sc.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=200';
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-center py-1 truncate px-1">
                            {sc.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hotspot creation dialog modal */}
            {isHotspotModalOpen && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-md">Añadir Marcador</h3>
                    <button onClick={() => setIsHotspotModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>

                  <form onSubmit={handleCreateHotspotSubmit} className="space-y-4">
                    {/* Selector tipo marcador */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Marcador</label>
                      <select
                        value={hotspotType}
                        onChange={e => {
                          const val = e.target.value as any;
                          setHotspotType(val);
                          setHotspotIcon(val === 'scene' ? 'arrow' : 'info');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-xs"
                      >
                        <option value="info">📝 Nota / Comentario Informativo</option>
                        <option value="scene">🔗 Enlace a otro escenario</option>
                        <option value="media">🎥 Multimedia (Vídeo/Imagen)</option>
                      </select>
                    </div>

                    {/* Selector de ícono tipo Panoee */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Elegir Icono (Estilo Panoee)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.keys(HOTSPOT_ICONS).map(iconName => (
                          <button
                            type="button"
                            key={iconName}
                            onClick={() => setHotspotIcon(iconName)}
                            className={`p-2 border rounded-xl flex justify-center items-center transition ${
                              hotspotIcon === iconName ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className="w-5 h-5 text-white"
                              dangerouslySetInnerHTML={{ __html: HOTSPOT_ICONS[iconName] }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inputs condicionales */}
                    {hotspotType !== 'scene' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título del Marcador</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Caja Eléctrica"
                            value={hotspotTitle}
                            onChange={e => setHotspotTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Especificaciones o anotaciones de mantenimiento..."
                            value={hotspotText}
                            onChange={e => setHotspotText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-xs resize-none"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Vincular con Escena</label>
                        <select
                          value={hotspotTargetScene}
                          onChange={e => setHotspotTargetScene(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-xs"
                        >
                          {Object.entries(activeTourData?.scenes || {}).map(([id, sc]) => (
                            id !== currentSceneId && <option key={id} value={id}>{sc.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Colocar Marcador
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
