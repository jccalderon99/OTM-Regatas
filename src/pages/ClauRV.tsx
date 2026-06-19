import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import {
  savePanoramaBlob,
  deletePanoramaBlob,
  resolvePanoramaUrl
} from '../lib/clauRvDb';

// Custom icons SVGs
const SCENE_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: #fff; pointer-events: none;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
const INFO_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: #fff; pointer-events: none;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

interface Hotspot {
  pitch: number;
  yaw: number;
  type: 'info' | 'scene';
  title?: string;
  text?: string;
  targetScene?: string;
  icon?: string;
  targetPitch?: number;
  targetYaw?: number;
}

interface Scene {
  title: string;
  image: string; // URL or indexeddb:// reference
  hotSpots: Hotspot[];
}

interface Tour {
  id: string;
  title: string;
  image: string; // thumbnail
  createdAt: string;
  scenes?: Record<string, Scene>;
  defaultScene?: string;
}

const DEFAULT_TOURS: Tour[] = [
  {
    id: "clauvr-no5pkc",
    title: "Muestra - Área del Club",
    image: "/uploads/panorama-1781804774907-726321249.png",
    createdAt: "2026-06-18T17:46:32.288Z",
    scenes: {
      "scene_1": {
        title: "Escena Principal",
        image: "/uploads/panorama-1781804774907-726321249.png",
        hotSpots: [
          {
            pitch: -11.732,
            yaw: -60.002,
            type: "info",
            title: "Laptop / Computadora",
            text: "Computadora de desarrollo configurada localmente."
          },
          {
            pitch: -20.095,
            yaw: 29.728,
            type: "scene",
            targetScene: "scene_bb0btj",
            text: "Ir a: Panorama 2",
            icon: "arrow",
            targetPitch: 0,
            targetYaw: 0
          }
        ]
      },
      "scene_bb0btj": {
        title: "Panorama 2",
        image: "/uploads/panorama-1781804915449-577008427.png",
        hotSpots: []
      }
    },
    defaultScene: "scene_1"
  },
  {
    id: "clauvr-izsfmn",
    title: "Muestra - Marina de Embarcaciones",
    image: "/uploads/panorama-1781803832714-88447102.png",
    createdAt: "2026-06-18T17:30:51.248Z",
    scenes: {
      "scene_1": {
        title: "Marina",
        image: "/uploads/panorama-1781803832714-88447102.png",
        hotSpots: []
      }
    },
    defaultScene: "scene_1"
  }
];

export default function ClauRV() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [tours, setTours] = useState<Tour[]>([]);
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTourData, setActiveTourData] = useState<Tour | null>(null); // Draft data for edit mode

  // View state
  const [viewMode, setViewMode] = useState<'gallery' | 'viewer'>('gallery');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Cargando...');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Tour Creation Form State
  const [newTourTitle, setNewTourTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hotspot Modal State
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [hotspotPitch, setHotspotPitch] = useState(0);
  const [hotspotYaw, setHotspotYaw] = useState(0);
  const [hotspotType, setHotspotType] = useState<'info' | 'scene'>('info');
  const [hotspotTitle, setHotspotTitle] = useState('');
  const [hotspotText, setHotspotText] = useState('');
  const [hotspotTargetScene, setHotspotTargetScene] = useState('');

  // Info Card State (Viewer overlay)
  const [infoCardData, setInfoCardData] = useState<{ title: string; text: string } | null>(null);

  // Overlay Panels
  const [thumbnailsDrawerOpen, setThumbnailsDrawerOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [gyroscopeActive, setGyroscopeActive] = useState(false);
  const [isGyroSupported, setIsGyroSupported] = useState(false);

  // Refs
  const viewerRef = useRef<any>(null);
  const resolvedImagesMapRef = useRef<Record<string, string>>({}); // Maps raw URLs/indexeddb paths to resolved Blob URLs
  const addSceneInputRef = useRef<HTMLInputElement>(null);

  // Load tours list on mount
  useEffect(() => {
    const saved = localStorage.getItem('crl_clauvr_tours');
    if (saved) {
      try {
        setTours(JSON.parse(saved));
      } catch (e) {
        setTours(DEFAULT_TOURS);
      }
    } else {
      setTours(DEFAULT_TOURS);
      localStorage.setItem('crl_clauvr_tours', JSON.stringify(DEFAULT_TOURS));
    }

    // Check gyroscope availability
    if (window.DeviceOrientationEvent && typeof (window.DeviceOrientationEvent as any).requestPermission === 'function') {
      setIsGyroSupported(true);
    } else if ('ondeviceorientation' in window) {
      setIsGyroSupported(true);
    }
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(resolvedImagesMapRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Save changes to localStorage helper
  const saveToursList = (updatedTours: Tour[]) => {
    setTours(updatedTours);
    localStorage.setItem('crl_clauvr_tours', JSON.stringify(updatedTours));
  };

  // Helper to resolve and cache panorama images
  const getCachedPanoramaUrl = async (path: string): Promise<string> => {
    if (resolvedImagesMapRef.current[path]) {
      return resolvedImagesMapRef.current[path];
    }
    const resolved = await resolvePanoramaUrl(path);
    resolvedImagesMapRef.current[path] = resolved;
    return resolved;
  };

  // Init/Re-init Pannellum Viewer
  const initViewer = async (tour: Tour, sceneId: string | null, forceEditMode = false) => {
    if (!tour.scenes) return;
    setIsLoading(true);
    setLoadingText('Cargando Recorrido 360°...');

    const activeSceneId = sceneId || tour.defaultScene || Object.keys(tour.scenes)[0];
    setCurrentSceneId(activeSceneId);

    // Destroy existing viewer
    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch (e) {
        console.error('Pannellum destroy error:', e);
      }
      viewerRef.current = null;
    }

    try {
      const scenesConfig: Record<string, any> = {};

      // Resolve and configure all scenes
      for (const [id, scene] of Object.entries(tour.scenes)) {
        const resolvedUrl = await getCachedPanoramaUrl(scene.image);
        
        // Map hotspots to Pannellum format
        const hotSpotsConfig = (scene.hotSpots || []).map((hs, index) => {
          return {
            pitch: hs.pitch,
            yaw: hs.yaw,
            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
              hotSpotDiv.className = `pnlm-hotspot-base custom-hotspot hotspot-${hs.type} ${forceEditMode ? 'edit-mode' : ''}`;
              hotSpotDiv.innerHTML = hs.type === 'scene' ? SCENE_ICON_SVG : INFO_ICON_SVG;

              // Tooltip on hover
              if (hs.text || hs.title) {
                const tooltip = document.createElement('div');
                tooltip.className = 'hotspot-tooltip';
                tooltip.innerText = hs.title || hs.text || '';
                hotSpotDiv.appendChild(tooltip);
              }

              // Click handler
              hotSpotDiv.onclick = (e) => {
                e.stopPropagation();
                if (forceEditMode) {
                  if (confirm('¿Deseas eliminar este punto de interés (comentario o enlace)?')) {
                    // Delete hotspot logic
                    const draft = JSON.parse(JSON.stringify(tour));
                    const draftScene = draft.scenes[id];
                    draftScene.hotSpots.splice(index, 1);
                    
                    setActiveTourData(draft);
                    // Re-render
                    const currentPitch = viewerRef.current ? viewerRef.current.getPitch() : 0;
                    const currentYaw = viewerRef.current ? viewerRef.current.getYaw() : 0;
                    const currentHfov = viewerRef.current ? viewerRef.current.getHfov() : 100;
                    setTimeout(() => initViewer(draft, id, true).then(() => {
                      if (viewerRef.current) {
                        viewerRef.current.setPitch(currentPitch);
                        viewerRef.current.setYaw(currentYaw);
                        viewerRef.current.setHfov(currentHfov);
                      }
                    }), 50);
                  }
                } else {
                  if (hs.type === 'scene' && hs.targetScene) {
                    // Fade transition simulation
                    const overlay = document.getElementById('scene-transition-overlay');
                    if (overlay) overlay.classList.add('active');
                    setTimeout(() => {
                      if (viewerRef.current) {
                        viewerRef.current.loadScene(hs.targetScene, hs.targetPitch || 0, hs.targetYaw || 0);
                      }
                      setTimeout(() => {
                        if (overlay) overlay.classList.remove('active');
                      }, 400);
                    }, 400);
                  } else if (hs.type === 'info') {
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
          showControls: false, // Use custom HTML controls
          compass: false
        },
        scenes: scenesConfig
      };

      // Delay a split second to ensure DOM target div is mounted
      setTimeout(() => {
        if (!document.getElementById('pannellum-root')) {
          setIsLoading(false);
          return;
        }

        const viewer = (window as any).pannellum.viewer('pannellum-root', config);
        viewerRef.current = viewer;

        viewer.on('load', () => {
          setIsLoading(false);
          viewer.resize();
        });

        viewer.on('scenechange', (newSceneId: string) => {
          setCurrentSceneId(newSceneId);
        });
      }, 100);

    } catch (err) {
      console.error(err);
      alert('Error cargando el visor 360. Por favor verifica las imágenes.');
      setIsLoading(false);
    }
  };

  // Switch scene inside viewer
  const handleSwitchScene = (sceneId: string) => {
    if (viewerRef.current) {
      const overlay = document.getElementById('scene-transition-overlay');
      if (overlay) overlay.classList.add('active');
      setTimeout(() => {
        viewerRef.current.loadScene(sceneId, 0, 0);
        setTimeout(() => {
          if (overlay) overlay.classList.remove('active');
        }, 300);
      }, 300);
    } else {
      const targetTour = isEditMode ? activeTourData : activeTour;
      if (targetTour) initViewer(targetTour, sceneId, isEditMode);
    }
  };

  // Open tour in viewer mode
  const handleOpenTour = (tour: Tour) => {
    setActiveTour(tour);
    setActiveTourData(null);
    setIsEditMode(false);
    setViewMode('viewer');
    
    // Normalize format on the fly if needed
    const normalized = { ...tour };
    if (!normalized.scenes) {
      normalized.scenes = {
        "scene_1": {
          title: "Escena Principal",
          image: tour.image,
          hotSpots: []
        }
      };
      normalized.defaultScene = "scene_1";
    }

    initViewer(normalized, normalized.defaultScene || "scene_1", false);
  };

  // Enter/Exit Edit Mode
  const toggleEditMode = () => {
    if (!activeTour) return;
    if (isEditMode) {
      // Exit without saving (discard draft edits)
      if (confirm('¿Deseas salir del modo edición? Se perderán todos los cambios no guardados.')) {
        setIsEditMode(false);
        setActiveTourData(null);
        initViewer(activeTour, currentSceneId, false);
      }
    } else {
      // Enter edit mode
      setIsEditMode(true);
      const draft = JSON.parse(JSON.stringify(activeTour));
      if (!draft.scenes) {
        draft.scenes = {
          "scene_1": {
            title: "Escena Principal",
            image: activeTour.image,
            hotSpots: []
          }
        };
        draft.defaultScene = "scene_1";
      }
      setActiveTourData(draft);
      initViewer(draft, currentSceneId, true);
    }
  };

  // Save tour edits to storage
  const handleSaveEdits = () => {
    if (!activeTour || !activeTourData || !tours) return;

    // Keep root tour thumbnail image updated to match the default scene
    const draft = { ...activeTourData };
    if (draft.scenes && draft.defaultScene && draft.scenes[draft.defaultScene]) {
      draft.image = draft.scenes[draft.defaultScene].image;
    }

    // Save to tours list
    const updated = tours.map(t => t.id === draft.id ? draft : t);
    saveToursList(updated);
    setActiveTour(draft);
    setIsEditMode(false);
    setActiveTourData(null);
    initViewer(draft, currentSceneId, false);
    alert('¡Recorrido guardado exitosamente!');
  };

  // Deletion logic for entire Tour
  const handleDeleteTour = (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar permanentemente este recorrido virtual y todas sus escenas?')) {
      const tourToDelete = tours.find(t => t.id === tourId);
      if (tourToDelete?.scenes) {
        // Clean up IndexedDB Blobs if any
        Object.values(tourToDelete.scenes).forEach(scene => {
          if (scene.image.startsWith('indexeddb://')) {
            const blobId = scene.image.replace('indexeddb://', '');
            deletePanoramaBlob(blobId).catch(console.error);
          }
        });
      }

      const updated = tours.filter(t => t.id !== tourId);
      saveToursList(updated);
    }
  };

  // Drop hotspot on panorama click (only in edit mode)
  const handlePanoramaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !viewerRef.current) return;

    // Verify click is not on menus/drawers or built-in elements
    const target = event.target as HTMLElement;
    if (
      target.closest('.pnlm-controls-container') ||
      target.closest('.pnlm-compass') ||
      target.closest('.custom-hotspot') ||
      target.closest('#viewer-overlay-ui')
    ) {
      return;
    }

    const nativeEvent = event.nativeEvent;
    const container = document.getElementById('pannellum-root');
    if (!container) return;

    // Get exact bounding rect of the Pannellum container
    const rect = container.getBoundingClientRect();
    
    // Create a client coordinates object relative to the container element
    const customEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      target: nativeEvent.target,
      preventDefault: () => {},
      stopPropagation: () => {}
    };

    const coords = viewerRef.current.mouseEventToCoords(customEvent);
    if (coords) {
      const [pitch, yaw] = coords;
      setHotspotPitch(pitch);
      setHotspotYaw(yaw);
      setHotspotType('info');
      setHotspotTitle('');
      setHotspotText('');

      // Auto-select first target scene if any
      const otherScenes = Object.keys(activeTourData?.scenes || {}).filter(id => id !== currentSceneId);
      setHotspotTargetScene(otherScenes[0] || '');

      setIsHotspotModalOpen(true);
    }
  };

  // Create hotspot submit
  const handleCreateHotspotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTourData || !currentSceneId) return;

    const newHs: Hotspot = {
      pitch: hotspotPitch,
      yaw: hotspotYaw,
      type: hotspotType
    };

    if (hotspotType === 'info') {
      newHs.title = hotspotTitle.trim() || 'Nota';
      newHs.text = hotspotText.trim() || 'Detalle informativo.';
    } else {
      if (!hotspotTargetScene) {
        alert('Por favor, agrega otra escena primero para poder conectarlas.');
        return;
      }
      const targetSceneName = activeTourData.scenes?.[hotspotTargetScene]?.title || 'Otra Escena';
      newHs.targetScene = hotspotTargetScene;
      newHs.text = `Ir a: ${targetSceneName}`;
      newHs.icon = 'arrow';
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

    // Save current camera view details to restore
    const curPitch = viewerRef.current ? viewerRef.current.getPitch() : 0;
    const curYaw = viewerRef.current ? viewerRef.current.getYaw() : 0;
    const curHfov = viewerRef.current ? viewerRef.current.getHfov() : 100;

    setTimeout(() => {
      initViewer(draft, currentSceneId, true).then(() => {
        if (viewerRef.current) {
          viewerRef.current.setPitch(curPitch);
          viewerRef.current.setYaw(curYaw);
          viewerRef.current.setHfov(curHfov);
        }
      });
    }, 50);
  };

  // Upload file helper (handles Cloudinary vs IndexedDB)
  const uploadFile = async (file: File, onProgress: (pct: number) => void): Promise<string> => {
    onProgress(10);
    if (isCloudinaryConfigured()) {
      onProgress(30);
      const res = await uploadToCloudinary(file, 'clau-rv');
      onProgress(100);
      return res.url;
    } else {
      // Save local indexeddb reference
      const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      onProgress(50);
      await savePanoramaBlob(id, file);
      onProgress(100);
      return `indexeddb://${id}`;
    }
  };

  // Submit main Create Tour form
  const handleCreateTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setLoadingText('Subiendo panorama...');
    setUploadProgress(0);

    try {
      const imageUrl = await uploadFile(selectedFile, (pct) => setUploadProgress(pct));
      
      const newId = 'clauvr-' + Math.random().toString(36).substring(2, 8);
      const title = newTourTitle.trim() || selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || 'Recorrido Virtual';

      const newTour: Tour = {
        id: newId,
        title: title,
        image: imageUrl,
        createdAt: new Date().toISOString(),
        scenes: {
          "scene_1": {
            title: "Escena Principal",
            image: imageUrl,
            hotSpots: []
          }
        },
        defaultScene: "scene_1"
      };

      const updated = [newTour, ...tours];
      saveToursList(updated);

      // Clean form
      setNewTourTitle('');
      setSelectedFile(null);
      setIsLoading(false);
      
      // Open immediately
      handleOpenTour(newTour);
    } catch (err: any) {
      console.error(err);
      alert('Error al crear el recorrido: ' + err.message);
      setIsLoading(false);
    }
  };

  // Add a Scene to an existing Tour (during edit mode)
  const handleAddSceneSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeTourData || !currentSceneId) return;
    const file = e.target.files[0];
    const sceneTitleStr = prompt('Escribe el título para la nueva escena:', file.name.substring(0, file.name.lastIndexOf('.')) || 'Nueva Escena');
    if (sceneTitleStr === null) return; // User cancelled

    setIsLoading(true);
    setLoadingText('Subiendo nueva escena...');

    try {
      const imageUrl = await uploadFile(file, () => {});
      const sceneId = 'scene_' + Math.random().toString(36).substring(2, 8);

      const draft = { ...activeTourData };
      if (!draft.scenes) draft.scenes = {};
      draft.scenes[sceneId] = {
        title: sceneTitleStr.trim() || 'Nueva Escena',
        image: imageUrl,
        hotSpots: []
      };

      setActiveTourData(draft);
      setIsLoading(false);
      renderEditorScenesList();
      initViewer(draft, sceneId, true);
      alert('¡Escena agregada exitosamente! Haz clic en el visor para conectar los puntos.');
    } catch (err: any) {
      console.error(err);
      alert('Error al agregar escena: ' + err.message);
      setIsLoading(false);
    } finally {
      if (addSceneInputRef.current) addSceneInputRef.current.value = '';
    }
  };

  // Delete Scene from Tour (during edit mode)
  const handleDeleteScene = (e: React.MouseEvent, sceneIdToDelete: string) => {
    e.stopPropagation();
    if (!activeTourData || !activeTourData.scenes) return;
    const sceneCount = Object.keys(activeTourData.scenes).length;
    if (sceneCount <= 1) {
      alert('No puedes eliminar la última escena del recorrido.');
      return;
    }

    if (confirm(`¿Deseas eliminar la escena "${activeTourData.scenes[sceneIdToDelete]?.title}" y todos sus hotspots?`)) {
      const draft = { ...activeTourData };
      if (draft.scenes) {
        // Delete IndexedDB blob if any
        const path = draft.scenes[sceneIdToDelete]?.image;
        if (path.startsWith('indexeddb://')) {
          const blobId = path.replace('indexeddb://', '');
          deletePanoramaBlob(blobId).catch(console.error);
        }

        delete draft.scenes[sceneIdToDelete];

        // Fallback target if current scene was deleted
        let newTarget = currentSceneId;
        if (currentSceneId === sceneIdToDelete) {
          newTarget = Object.keys(draft.scenes)[0];
          setCurrentSceneId(newTarget);
        }
        if (draft.defaultScene === sceneIdToDelete) {
          draft.defaultScene = newTarget;
        }

        setActiveTourData(draft);
        setTimeout(() => initViewer(draft, newTarget, true), 50);
      }
    }
  };

  // Custom Controls Action functions
  const handleZoomIn = () => {
    if (viewerRef.current) viewerRef.current.setHfov(viewerRef.current.getHfov() - 10);
  };
  const handleZoomOut = () => {
    if (viewerRef.current) viewerRef.current.setHfov(viewerRef.current.getHfov() + 10);
  };
  const handleToggleAutoRotate = () => {
    if (viewerRef.current) {
      const nextVal = !autoRotate;
      setAutoRotate(nextVal);
      if (nextVal) {
        viewerRef.current.startAutoRotate(-2);
      } else {
        viewerRef.current.stopAutoRotate();
      }
    }
  };
  const handleToggleFullscreen = () => {
    if (viewerRef.current) viewerRef.current.toggleFullscreen();
  };
  const handleToggleGyro = () => {
    if (!viewerRef.current) return;
    const nextVal = !gyroscopeActive;
    setGyroscopeActive(nextVal);
    if (nextVal) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              viewerRef.current.startOrientation();
            } else {
              setGyroscopeActive(false);
            }
          })
          .catch(console.error);
      } else {
        viewerRef.current.startOrientation();
      }
    } else {
      viewerRef.current.stopOrientation();
    }
  };

  // Render scenes list side panel (React)
  const renderEditorScenesList = () => {
    const draft = activeTourData;
    if (!draft || !draft.scenes) return null;
    return Object.entries(draft.scenes).map(([id, scene]) => (
      <div
        key={id}
        onClick={() => id !== currentSceneId && handleSwitchScene(id)}
        className={`editor-scene-item ${id === currentSceneId ? 'active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '10px',
          background: id === currentSceneId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
          border: id === currentSceneId ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255,255,255,0.05)',
          cursor: id === currentSceneId ? 'default' : 'pointer',
          marginBottom: '8px',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem', color: id === currentSceneId ? '#fff' : 'var(--text-secondary)', fontWeight: id === currentSceneId ? 600 : 400 }}>
          {scene.title}
        </span>
        {Object.keys(draft.scenes || {}).length > 1 && (
          <button
            onClick={(e) => handleDeleteScene(e, id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-red, #ef4444)',
              fontSize: '1.2rem',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '2px 6px'
            }}
            title="Eliminar escena"
          >
            &times;
          </button>
        )}
      </div>
    ));
  };

  return (
    <div className="clau-rv-page" style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Dynamic Injection of Premium CSS styles for Pannellum custom elements */}
      <style>{`
        .custom-hotspot {
          width: 36px;
          height: 36px;
          background: rgba(15, 23, 42, 0.75);
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .custom-hotspot:hover {
          background: rgba(59, 130, 246, 0.8) !important;
          border-color: #3b82f6 !important;
        }
        .custom-hotspot.edit-mode {
          border-color: #ef4444 !important;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        .custom-hotspot.edit-mode::before {
          content: '×';
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background: #ef4444;
          color: #fff;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .hotspot-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #f8fafc;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .custom-hotspot:hover .hotspot-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-5px);
        }
        .scene-transition-overlay-class {
          position: absolute;
          inset: 0;
          background: #000;
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .scene-transition-overlay-class.active {
          opacity: 1;
          pointer-events: all;
        }
        .pnlm-load-box {
          display: none !important; /* Hide default loader to use premium overlay */
        }
      `}</style>

      {/* 1. GALLERY / LANDING VIEW */}
      {viewMode === 'gallery' && (
        <div style={{ padding: '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b', marginBottom: 8, letterSpacing: '-0.02em' }}>
                Complemento ClauRV (Tours 360°)
              </h1>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '1.05rem', maxWidth: 650 }}>
                Crea, edita y navega a través de recorridos virtuales inmersivos 360° para visualizaciones en alta definición.
              </p>
            </div>
            {!isCloudinaryConfigured() && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#b45309',
                padding: '12px 16px',
                borderRadius: '16px',
                fontSize: '0.9rem',
                maxWidth: 450
              }}>
                <strong>💡 Nota de Despliegue:</strong> Cloudinary no está configurado. Los panoramas se guardarán en la memoria local (IndexedDB) de este navegador. Configura `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET` en Vercel para guardar de forma permanente y poder compartirlos.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="md:grid-cols-3">
            {/* Create Tour Panel */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(78, 181, 230, 0.12)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.04)',
              padding: '24px',
              height: 'fit-content'
            }} className="md:col-span-1">
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 20 }}>
                Crear Nuevo Recorrido
              </h2>
              <form onSubmit={handleCreateTour} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Título del Recorrido:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Auditorio Principal, Piscina..."
                    value={newTourTitle}
                    onChange={(e) => setNewTourTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      outline: 'none',
                      fontSize: '0.95rem',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Imagen Panorámica 360°:
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '16px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      background: selectedFile ? 'rgba(59, 130, 246, 0.02)' : '#f8fafc',
                      borderColor: selectedFile ? 'var(--accent-blue, #3b82f6)' : '#cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🖼️</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      {selectedFile ? selectedFile.name : 'Arrastra o selecciona tu archivo'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Formatos JPG, JPEG, PNG en proporción 2:1
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedFile || isLoading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--accent-gradient, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%))',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: (!selectedFile || isLoading) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedFile || isLoading) ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  {isLoading ? `Subiendo... (${uploadProgress}%)` : '🚀 Crear Recorrido'}
                </button>
              </form>
            </div>

            {/* Tours List Panel */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(78, 181, 230, 0.12)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.04)',
              padding: '24px'
            }} className="md:col-span-2">
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 20 }}>
                Tus Recorridos Guardados ({tours.length})
              </h2>

              {tours.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📂</div>
                  <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginBottom: 8 }}>
                    Aún no has creado recorridos
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                    Sube tu primera imagen panorámica para empezar.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {tours.map(tour => {
                    const sceneCount = Object.keys(tour.scenes || {}).length || 1;
                    return (
                      <div
                        key={tour.id}
                        onClick={() => handleOpenTour(tour)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s'
                        }}
                        className="hover:scale-102 hover:shadow-md"
                      >
                        {/* Thumbnail */}
                        <div style={{ width: '100%', height: '150px', background: '#e2e8f0', position: 'relative' }}>
                          <img
                            src={tour.image.startsWith('indexeddb://') ? '/favicon.ico' : tour.image}
                            alt={tour.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              // If loading raw blob fails, show indicator
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            padding: '4px 10px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            color: '#ffffff',
                            fontWeight: 700
                          }}>
                            📸 {sceneCount} escena(s)
                          </div>
                        </div>

                        {/* Details */}
                        <div style={{ padding: '16px' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tour.title}
                          </h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Creado: {new Date(tour.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={(e) => handleDeleteTour(e, tour.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                transition: 'background 0.2s'
                              }}
                              className="hover:bg-red-200"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. VIEWER VIEW (Pannellum container & UI overlay) */}
      {viewMode === 'viewer' && activeTour && (
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 130px)', borderRadius: '24px', overflow: 'hidden', background: '#000' }}>
          {/* Black screen transition overlay */}
          <div id="scene-transition-overlay" className="scene-transition-overlay-class" />

          {/* Panorama div mount target */}
          <div
            id="pannellum-root"
            onClick={handlePanoramaClick}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Loader Overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#070a13',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              color: '#ffffff',
              gap: 20
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite'
              }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loadingText}</h3>
            </div>
          )}

          {/* UI OVERLAY CONTAINER */}
          <div id="viewer-overlay-ui" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', pointerEvents: 'auto' }}>
              {/* Back Button */}
              <button
                onClick={() => {
                  if (viewerRef.current) {
                    try { viewerRef.current.destroy(); } catch (e) {}
                    viewerRef.current = null;
                  }
                  setViewMode('gallery');
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                }}
              >
                ◀ Salir del Visor
              </button>

              {/* Edit Toggle (Admins Only) */}
              {isAdmin && (
                <button
                  onClick={toggleEditMode}
                  style={{
                    background: isEditMode ? 'rgba(239, 68, 68, 0.85)' : 'rgba(59, 130, 246, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                  }}
                >
                  ✏️ {isEditMode ? 'Ver Recorrido' : 'Editar Recorrido'}
                </button>
              )}
            </div>

            {/* Sidebar Editor Console (Visible only in edit mode) */}
            {isEditMode && activeTourData && (
              <div style={{
                position: 'absolute',
                top: 90,
                left: 24,
                width: 280,
                maxHeight: 'calc(100% - 220px)',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '24px',
                padding: 20,
                color: '#ffffff',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Consola Edición</h3>
                  <span style={{ fontSize: '0.75rem', background: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Activo</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  Haz clic en cualquier punto del visor 360° para agregar un marcador (nota o enlace).
                </p>

                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', paddingRight: 4 }}>
                  <h4 style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Escenas del Tour</h4>
                  {renderEditorScenesList()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                  <button
                    onClick={() => addSceneInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    ➕ Agregar Escena (360)
                  </button>
                  <input
                    type="file"
                    ref={addSceneInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAddSceneSubmit}
                  />
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                  <button
                    onClick={handleSaveEdits}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 700
                    }}
                  >
                    💾 Guardar Cambios
                  </button>
                  <button
                    onClick={toggleEditMode}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'none',
                      color: '#94a3b8',
                      fontSize: '0.85rem'
                    }}
                  >
                    Descartar Cambios
                  </button>
                </div>
              </div>
            )}

            {/* Info Card Pop-up (Visible when info hotspot clicked) */}
            {infoCardData && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                maxWidth: 400,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '24px',
                padding: '24px',
                color: '#ffffff',
                pointerEvents: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
              }}>
                <button
                  onClick={() => setInfoCardData(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    color: '#94a3b8',
                    fontSize: '1.5rem',
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: '#3b82f6' }}>
                  {infoCardData.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                  {infoCardData.text}
                </p>
              </div>
            )}

            {/* Bottom Bar: Title & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
              {/* Tour metadata overlay */}
              {!isEditMode && (
                <div style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ffffff'
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{activeTour.title}</h2>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    {activeTour.scenes?.[currentSceneId || '']?.title || 'Escena Actual'}
                  </p>
                </div>
              )}

              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto', flexWrap: 'wrap', gap: 12 }}>
                {/* Scenes Drawer Button */}
                <button
                  onClick={() => setThumbnailsDrawerOpen(!thumbnailsDrawerOpen)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                >
                  🗺️ Escenas
                </button>

                {/* Main Action Controllers */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  gap: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  <button onClick={handleZoomIn} style={{ color: '#fff', fontSize: '1.25rem', padding: '6px' }} title="Acercar">➕</button>
                  <button onClick={handleZoomOut} style={{ color: '#fff', fontSize: '1.25rem', padding: '6px' }} title="Alejar">➖</button>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
                  
                  <button
                    onClick={handleToggleAutoRotate}
                    style={{
                      color: autoRotate ? '#3b82f6' : '#fff',
                      fontSize: '1.1rem',
                      padding: '6px',
                      transition: 'color 0.2s'
                    }}
                    title="Auto-rotación"
                  >
                    🔄
                  </button>

                  {isGyroSupported && (
                    <button
                      onClick={handleToggleGyro}
                      style={{
                        color: gyroscopeActive ? '#3b82f6' : '#fff',
                        fontSize: '1.1rem',
                        padding: '6px'
                      }}
                      title="Giroscopio"
                    >
                      📱
                    </button>
                  )}

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
                  <button onClick={handleToggleFullscreen} style={{ color: '#fff', fontSize: '1.1rem', padding: '6px' }} title="Pantalla Completa">📺</button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails Drawer */}
          {thumbnailsDrawerOpen && (
            <div style={{
              position: 'absolute',
              bottom: 86,
              left: 24,
              right: 24,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              padding: '16px 20px',
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 800 }}>Explorar Escenas</h3>
                <button onClick={() => setThumbnailsDrawerOpen(false)} style={{ color: '#cbd5e1', fontSize: '1.25rem' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
                {Object.entries((isEditMode ? activeTourData : activeTour)?.scenes || {}).map(([id, scene]) => (
                  <div
                    key={id}
                    onClick={() => handleSwitchScene(id)}
                    style={{
                      flex: '0 0 140px',
                      height: '80px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: id === currentSceneId ? '2.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={scene.image.startsWith('indexeddb://') ? '/favicon.ico' : scene.image}
                      alt={scene.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      textAlign: 'center',
                      padding: '2px 4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {scene.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* React Add Hotspot Dialog Modal */}
          {isHotspotModalOpen && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: 20
            }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '24px',
                padding: '28px',
                color: '#ffffff',
                width: '100%',
                maxWidth: 420,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Crear Punto de Interés</h3>
                  <button onClick={() => setIsHotspotModalOpen(false)} style={{ color: '#cbd5e1', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: 20 }}>
                  Selecciona el tipo de marcador que deseas colocar en esta coordenada.
                </p>

                <form onSubmit={handleCreateHotspotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                      Tipo de Marcador:
                    </label>
                    <select
                      value={hotspotType}
                      onChange={(e) => setHotspotType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        outline: 'none'
                      }}
                    >
                      <option value="info">Comentario / Nota de Información</option>
                      <option value="scene" disabled={Object.keys(activeTourData?.scenes || {}).length <= 1}>
                        Enlace a otra Escena (Conexión)
                      </option>
                    </select>
                  </div>

                  {hotspotType === 'info' ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                          Título de la Nota:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Detalle de arquitectura"
                          value={hotspotTitle}
                          onChange={(e) => setHotspotTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#fff',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                          Descripción:
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Ej: Material de policarbonato templado..."
                          value={hotspotText}
                          onChange={(e) => setHotspotText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#fff',
                            outline: 'none',
                            resize: 'none'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                        Conectar con la escena:
                      </label>
                      <select
                        value={hotspotTargetScene}
                        onChange={(e) => setHotspotTargetScene(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          outline: 'none'
                        }}
                      >
                        {Object.entries(activeTourData?.scenes || {}).map(([id, sc]) => (
                          id !== currentSceneId && <option key={id} value={id}>{sc.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => setIsHotspotModalOpen(false)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#cbd5e1',
                        fontSize: '0.88rem'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 700
                      }}
                    >
                      Colocar Puntero
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
