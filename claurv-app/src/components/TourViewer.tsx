import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Project } from './Dashboard';
import { 
  ArrowLeft, Eye, Edit3, Plus, Trash2, 
  Info, Image as ImageIcon, Link as LinkIcon, MessageSquare, 
  Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { savePanoramaBlob, resolvePanoramaUrl, deletePanoramaBlob } from '../lib/clauRvDb';

interface TourViewerProps {
  project: Project;
  onBack: () => void;
}

export default function TourViewer({ project, onBack }: TourViewerProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeProject, setActiveProject] = useState<Project>(project);
  const [currentSceneId, setCurrentSceneId] = useState<string>(project.defaultScene || Object.keys(project.scenes)[0]);
  const [currentPanoramaUrl, setCurrentPanoramaUrl] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Hotspot modal state
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [editingHotspotIndex, setEditingHotspotIndex] = useState<number | null>(null);
  const [hotspotPitch, setHotspotPitch] = useState(0);
  const [hotspotYaw, setHotspotYaw] = useState(0);
  const [hotspotType, setHotspotType] = useState<'info' | 'scene' | 'media'>('info');
  const [hotspotTitle, setHotspotTitle] = useState('');
  const [hotspotText, setHotspotText] = useState('');
  const [hotspotTargetScene, setHotspotTargetScene] = useState('');
  const [hotspotIcon, setHotspotIcon] = useState('info'); // info, arrow, image, comment
  const [hotspotColor, setHotspotColor] = useState('#b45309'); // default gold/amber
  const [hotspotMediaUrl, setHotspotMediaUrl] = useState('');

  // Media view overlay
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [infoPopup, setInfoPopup] = useState<{ title: string; text: string } | null>(null);

  // Pannellum references
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const addSceneInputRef = useRef<HTMLInputElement>(null);

  // Local state synchronization
  useEffect(() => {
    const saved = localStorage.getItem('claurv_projects');
    if (saved) {
      try {
        const list = JSON.parse(saved) as Project[];
        const found = list.find(p => p.id === project.id);
        if (found) {
          setActiveProject(found);
          const firstScene = found.defaultScene || Object.keys(found.scenes)[0];
          setCurrentSceneId(firstScene);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [project.id]);

  const saveProjectChanges = (updated: Project) => {
    setActiveProject(updated);
    const saved = localStorage.getItem('claurv_projects');
    if (saved) {
      try {
        const list = JSON.parse(saved) as Project[];
        const index = list.findIndex(p => p.id === updated.id);
        if (index !== -1) {
          list[index] = updated;
          localStorage.setItem('claurv_projects', JSON.stringify(list));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Resolve image URL
  useEffect(() => {
    const sceneData = activeProject.scenes[currentSceneId];
    if (!sceneData) return;

    let active = true;
    resolvePanoramaUrl(sceneData.image).then(url => {
      if (active) setCurrentPanoramaUrl(url);
    }).catch(err => {
      console.error(err);
      if (active) setCurrentPanoramaUrl(sceneData.image); // fallback
    });

    return () => {
      active = false;
      if (currentPanoramaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentPanoramaUrl);
      }
    };
  }, [currentSceneId, activeProject]);

  // Initialize/reinitialize Pannellum viewer
  useEffect(() => {
    if (!containerRef.current || !window.pannellum || !currentPanoramaUrl) return;

    const sceneData = activeProject.scenes[currentSceneId];
    if (!sceneData) return;

    // Check if the resolved url matches the current scene image
    const isMatching = sceneData.image.startsWith('indexeddb://')
      ? currentPanoramaUrl.startsWith('blob:')
      : currentPanoramaUrl === sceneData.image;

    if (!isMatching) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    setIsLoading(true);

    const config = {
      type: 'equirectangular',
      panorama: currentPanoramaUrl,
      autoLoad: true,
      showControls: false,
      compass: false,
      keyboardZoom: true,
      mouseZoom: true,
      hotSpots: (sceneData.hotSpots || []).map((hs, index) => ({
        pitch: hs.pitch,
        yaw: hs.yaw,
        cssClass: `custom-hotspot ${hs.type === 'scene' ? 'scene-hotspot' : ''} ${isEditMode ? 'ring-2 ring-rose-500' : ''}`,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          const root = createRoot(hotSpotDiv);
          
          let IconComponent = Info;
          if (hs.icon === 'image') IconComponent = ImageIcon;
          if (hs.icon === 'arrow') IconComponent = LinkIcon;
          if (hs.icon === 'comment') IconComponent = MessageSquare;

          // Apply color
          hotSpotDiv.style.color = 'white';
          hotSpotDiv.style.backgroundColor = hs.color || '#b45309';

          root.render(
            <>
              <IconComponent size={18} className="drop-shadow-md" />
              <div className="hotspot-tooltip">
                {hs.title || hs.text || 'Marcador'}
                {isEditMode && <span className="block text-[9px] text-amber-300 font-bold mt-1">Hacer clic para editar</span>}
              </div>
            </>
          );
        },
        clickHandlerFunc: (_event: any, _args: any) => {
          if (isEditMode) {
            // Open edit modal
            setEditingHotspotIndex(index);
            setHotspotPitch(hs.pitch);
            setHotspotYaw(hs.yaw);
            setHotspotType(hs.type);
            setHotspotTitle(hs.title || '');
            setHotspotText(hs.text || '');
            setHotspotIcon(hs.icon || 'info');
            setHotspotColor(hs.color || '#b45309');
            setHotspotMediaUrl(hs.mediaUrl || '');
            setHotspotTargetScene(hs.targetScene || '');
            setIsHotspotModalOpen(true);
          } else {
            // Action
            if (hs.type === 'scene' && hs.targetScene) {
              setCurrentSceneId(hs.targetScene);
            } else if (hs.type === 'media' && hs.mediaUrl) {
              setSelectedMedia(hs.mediaUrl);
            } else if (hs.type === 'info' && hs.text) {
              setInfoPopup({
                title: hs.title || 'Información',
                text: hs.text || ''
              });
            }
          }
        }
      }))
    };

    // Tiny timeout to make sure DOM is fully ready
    const timer = setTimeout(() => {
      if (containerRef.current) {
        viewerRef.current = window.pannellum.viewer(containerRef.current, config);
        viewerRef.current.on('load', () => setIsLoading(false));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [currentPanoramaUrl, currentSceneId, activeProject, isEditMode]);

  // Click on panorama to add custom hotspots
  const handlePanoramaClick = (event: React.MouseEvent) => {
    if (!isEditMode || !viewerRef.current) return;

    // Don't trigger if clicked on controls or existing hotspots
    const target = event.target as HTMLElement;
    if (target.closest('.custom-hotspot') || target.closest('.control-panel')) return;

    const coords = viewerRef.current.mouseEventToCoords(event.nativeEvent);
    if (coords) {
      const [pitch, yaw] = coords;
      setEditingHotspotIndex(null);
      setHotspotPitch(pitch);
      setHotspotYaw(yaw);
      setHotspotType('info');
      setHotspotTitle('');
      setHotspotText('');
      setHotspotIcon('info');
      setHotspotColor('#b45309');
      setHotspotMediaUrl('');

      const otherScenes = Object.keys(activeProject.scenes).filter(id => id !== currentSceneId);
      setHotspotTargetScene(otherScenes[0] || '');

      setIsHotspotModalOpen(true);
    }
  };

  const handleCreateHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    const newHotspot: any = {
      pitch: hotspotPitch,
      yaw: hotspotYaw,
      type: hotspotType,
      color: hotspotColor,
      icon: hotspotIcon
    };

    if (hotspotType === 'info') {
      newHotspot.title = hotspotTitle.trim() || 'Nota';
      newHotspot.text = hotspotText.trim() || '';
    } else if (hotspotType === 'media') {
      newHotspot.title = hotspotTitle.trim() || 'Ver Imagen';
      newHotspot.mediaUrl = hotspotMediaUrl.trim() || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800';
    } else {
      if (!hotspotTargetScene) {
        alert('Debes tener al menos otra escena configurada para poder enlazarla.');
        return;
      }
      newHotspot.targetScene = hotspotTargetScene;
      newHotspot.title = `Ir a: ${activeProject.scenes[hotspotTargetScene].title}`;
    }

    const updated = { ...activeProject };
    if (!updated.scenes[currentSceneId].hotSpots) {
      updated.scenes[currentSceneId].hotSpots = [];
    }
    
    if (editingHotspotIndex !== null) {
      updated.scenes[currentSceneId].hotSpots[editingHotspotIndex] = newHotspot;
    } else {
      updated.scenes[currentSceneId].hotSpots.push(newHotspot);
    }

    saveProjectChanges(updated);
    setIsHotspotModalOpen(false);
    setEditingHotspotIndex(null);

    // Force reload
    setCurrentSceneId('');
    setTimeout(() => setCurrentSceneId(currentSceneId), 50);
  };

  const handleAddSceneClick = () => {
    addSceneInputRef.current?.click();
  };

  const handleAddSceneFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Nueva Escena';
    const title = prompt('Título de la nueva escena:', defaultName);
    if (title === null) return; // Cancelled

    setIsLoading(true);
    try {
      const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await savePanoramaBlob(id, file);
      const imageUrl = `indexeddb://${id}`;

      const newSceneId = `scene_${Date.now()}`;
      const updated = { ...activeProject };
      updated.scenes[newSceneId] = {
        title: title.trim() || defaultName,
        image: imageUrl,
        hotSpots: []
      };
      saveProjectChanges(updated);
      setCurrentSceneId(newSceneId);
    } catch (err: any) {
      alert('Error al añadir escena: ' + err.message);
    } finally {
      setIsLoading(false);
      if (addSceneInputRef.current) addSceneInputRef.current.value = '';
    }
  };

  const handleDeleteScene = async (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Object.keys(activeProject.scenes).length <= 1) {
      alert('Un proyecto debe tener al menos una escena.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar la escena "${activeProject.scenes[sceneId].title}"?`)) {
      const sceneData = activeProject.scenes[sceneId];
      if (sceneData.image.startsWith('indexeddb://')) {
        const id = sceneData.image.replace('indexeddb://', '');
        await deletePanoramaBlob(id).catch(console.error);
      }

      const updated = { ...activeProject };
      delete updated.scenes[sceneId];
      saveProjectChanges(updated);

      if (currentSceneId === sceneId) {
        setCurrentSceneId(Object.keys(updated.scenes)[0]);
      }
    }
  };

  // Zoom/Rotate buttons
  const handleZoom = (direction: 'in' | 'out') => {
    if (!viewerRef.current) return;
    const currentHfov = viewerRef.current.getHfov();
    viewerRef.current.setHfov(direction === 'in' ? currentHfov - 10 : currentHfov + 10);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-100 select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-center pointer-events-none control-panel">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-[#FAF6F0] hover:bg-[#FAF6F0]/90 text-slate-800 rounded-2xl font-bold text-sm shadow-xl shadow-black/30 transition-all border border-amber-900/5 hover:scale-[1.02]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="flex gap-3 pointer-events-auto">
          {isAdmin && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-black/30 transition-all hover:scale-[1.02] ${
                isEditMode
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {isEditMode ? <Eye className="w-4.5 h-4.5" /> : <Edit3 className="w-4.5 h-4.5" />}
              <span>{isEditMode ? 'Visualizar Tour' : 'Editar Hotspots'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Sidebar Dashboard */}
      {isEditMode && isAdmin && (
        <div className="absolute top-24 left-6 w-72 bg-[#FAF6F0] text-slate-800 rounded-3xl p-5 shadow-2xl z-20 max-h-[75vh] flex flex-col justify-between border border-amber-900/10 pointer-events-auto control-panel">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-md tracking-tight">Editor de Escenas</h3>
              <span className="bg-amber-600/10 border border-amber-500/30 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Activo
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Haz clic en cualquier punto del panorama 3D para colocar una nota, imagen o conexión.
            </p>

            <div className="space-y-2 max-h-[30vh] overflow-y-auto mb-4 pr-1">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Escenas del Proyecto</h4>
              {Object.entries(activeProject.scenes).map(([id, sc]) => (
                <div
                  key={id}
                  onClick={() => id !== currentSceneId && setCurrentSceneId(id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    id === currentSceneId
                      ? 'bg-amber-50 border-amber-500/30 text-amber-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate flex-1 pr-2">{sc.title}</span>
                  {Object.keys(activeProject.scenes).length > 1 && (
                    <button
                      onClick={(e) => handleDeleteScene(id, e)}
                      className="p-1 hover:bg-red-50 text-rose-600 rounded-lg transition"
                      title="Eliminar escena"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200 mt-auto">
            <button
              onClick={handleAddSceneClick}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Escena 360°</span>
            </button>
            <input
              type="file"
              ref={addSceneInputRef}
              onChange={handleAddSceneFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => setIsEditMode(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Salir de Edición
            </button>
          </div>
        </div>
      )}

      {/* Main Pannellum Canvas */}
      <div
        ref={containerRef}
        onClick={handlePanoramaClick}
        className="w-full h-full"
        id="pannellum-root"
      />

      {/* Loading animation overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-amber-600 animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">Cargando Escena 360°...</p>
        </div>
      )}

      {/* Bottom Floating Bar - Title and Navigation */}
      <div className="absolute bottom-6 left-6 right-6 z-30 flex justify-between items-end pointer-events-none control-panel">
        {/* Info panel */}
        <div className="bg-slate-950/70 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl pointer-events-auto">
          <h2 className="font-bold text-sm tracking-tight text-white mb-0.5">{activeProject.title}</h2>
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
            {activeProject.scenes[currentSceneId]?.title}
          </p>
        </div>

        {/* View Controllers */}
        <div className="flex gap-2.5 bg-slate-950/70 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl pointer-events-auto">
          <button
            onClick={() => handleZoom('in')}
            className="p-2.5 bg-white/5 hover:bg-white/15 rounded-xl transition text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-2.5 bg-white/5 hover:bg-white/15 rounded-xl transition text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <div className="w-px h-7 bg-white/10 self-center" />
          <button
            onClick={() => {
              if (viewerRef.current) viewerRef.current.toggleFullscreen();
            }}
            className="p-2.5 bg-white/5 hover:bg-white/15 rounded-xl transition text-white"
            title="Pantalla Completa"
          >
            <Maximize2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Media Modal popup */}
      {selectedMedia && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer control-panel"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative bg-slate-900 border border-white/10 max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedMedia} alt="Media" className="w-full h-full object-contain" />
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center text-white text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Info hotspot popup modal */}
      {infoPopup && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer control-panel"
          onClick={() => setInfoPopup(null)}
        >
          <div
            className="bg-[#FAF6F0] text-slate-800 border border-amber-900/10 max-w-md w-full rounded-3xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInfoPopup(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-extrabold text-amber-800 mb-3">{infoPopup.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{infoPopup.text}</p>
          </div>
        </div>
      )}

      {/* Create Hotspot modal */}
      {isHotspotModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 control-panel">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-xl font-bold mb-2">Crear Punto de Interés</h3>
            <p className="text-xs text-slate-500 mb-5">
              Personaliza el marcador que se colocará en estas coordenadas del panorama.
            </p>

            <form onSubmit={handleCreateHotspot} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Marcador
                </label>
                <select
                  value={hotspotType}
                  onChange={(e) => setHotspotType(e.target.value as any)}
                  className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs font-semibold"
                >
                  <option value="info">Comentario / Nota Informativa</option>
                  <option value="scene">Enlace a otra Escena</option>
                  <option value="media">Ver Imagen (Pop-up)</option>
                </select>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ícono del Marcador
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'info', Icon: Info },
                    { id: 'arrow', Icon: LinkIcon },
                    { id: 'image', Icon: ImageIcon },
                    { id: 'comment', Icon: MessageSquare }
                  ].map(({ id, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setHotspotIcon(id)}
                      className={`p-2.5 rounded-xl border transition ${
                        hotspotIcon === id
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-[#FAF6F0]/40 border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Color del Marcador
                </label>
                <div className="flex gap-2">
                  {['#b45309', '#1e3a8a', '#dc2626', '#16a34a', '#7c3aed'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setHotspotColor(col)}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        hotspotColor === col ? 'border-slate-800 scale-110 shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {hotspotType === 'info' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Título de la Nota
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Detalle de construcción"
                      value={hotspotTitle}
                      onChange={(e) => setHotspotTitle(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Detalle Informativo
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ej: Policarbonato de alta densidad reforzado..."
                      value={hotspotText}
                      onChange={(e) => setHotspotText(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs transition resize-none"
                    />
                  </div>
                </>
              )}

              {hotspotType === 'media' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Título
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Plano Técnico de Área"
                      value={hotspotTitle}
                      onChange={(e) => setHotspotTitle(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      URL de Imagen a Mostrar
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://ejemplo.com/plano.png"
                      value={hotspotMediaUrl}
                      onChange={(e) => setHotspotMediaUrl(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs transition"
                    />
                  </div>
                </>
              )}

              {hotspotType === 'scene' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Conectar con Escena
                  </label>
                  <select
                    value={hotspotTargetScene}
                    onChange={(e) => setHotspotTargetScene(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-xs font-semibold"
                  >
                    {Object.entries(activeProject.scenes).map(([id, sc]) => (
                      id !== currentSceneId && <option key={id} value={id}>{sc.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end items-center pt-4">
                {editingHotspotIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas eliminar este marcador permanentemente?')) {
                        const updated = { ...activeProject };
                        updated.scenes[currentSceneId].hotSpots.splice(editingHotspotIndex, 1);
                        saveProjectChanges(updated);
                        setIsHotspotModalOpen(false);
                        setEditingHotspotIndex(null);

                        // Force reload
                        setCurrentSceneId('');
                        setTimeout(() => setCurrentSceneId(currentSceneId), 50);
                      }
                    }}
                    className="mr-auto px-4.5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsHotspotModalOpen(false);
                    setEditingHotspotIndex(null);
                  }}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/10 transition"
                >
                  {editingHotspotIndex !== null ? 'Guardar Cambios' : 'Crear Marcador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
