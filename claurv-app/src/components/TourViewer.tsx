import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Project, Hotspot, MediaItem } from '../types/project';
import { 
  ArrowLeft, Eye, Edit3, Plus, Trash2, 
  Info, Image as ImageIcon, Link as LinkIcon, MessageSquare, 
  MapPin, Compass, Camera, Play, CircleDot, Box
} from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { resolvePanoramaUrl } from '../lib/clauRvDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TourViewerProps {
  project: Project;
  onBack: () => void;
}

export default function TourViewer({ project, onBack }: TourViewerProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const cloudActive = isSupabaseConfigured();

  const [activeProject, setActiveProject] = useState<Project>(project);
  const [currentSceneId, setCurrentSceneId] = useState<string>(project.defaultScene || Object.keys(project.scenes)[0] || '');
  const [currentPanoramaUrl, setCurrentPanoramaUrl] = useState('');
  const [isEditMode, setIsEditMode] = useState(isAdmin);
  const [isLoading, setIsLoading] = useState(false);

  // Add Scene Modal
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);

  // Hotspot modal state
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [editingHotspotIndex, setEditingHotspotIndex] = useState<number | null>(null);
  const [hotspotPitch, setHotspotPitch] = useState(0); // Also used as X % for flat images
  const [hotspotYaw, setHotspotYaw] = useState(0);   // Also used as Y % for flat images
  const [hotspotType, setHotspotType] = useState<'info' | 'scene' | 'media'>('info');
  const [hotspotTitle, setHotspotTitle] = useState('');
  const [hotspotText, setHotspotText] = useState('');
  const [hotspotTargetScene, setHotspotTargetScene] = useState('');
  const [hotspotIcon, setHotspotIcon] = useState<any>('info');
  const [hotspotColor, setHotspotColor] = useState('#E91E63'); 
  const [hotspotMediaUrl, setHotspotMediaUrl] = useState('');

  // Media view overlay
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [infoPopup, setInfoPopup] = useState<{ title: string; text: string } | null>(null);

  // Pannellum references
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flatImageRef = useRef<HTMLImageElement>(null);

  const saveProjectChanges = async (updated: Project) => {
    setActiveProject(updated);
    
    // Save to Local
    const saved = localStorage.getItem('claurv_projects');
    if (saved) {
      try {
        const list = JSON.parse(saved) as Project[];
        const index = list.findIndex(p => p.id === updated.id);
        if (index !== -1) {
          list[index] = updated;
          localStorage.setItem('claurv_projects', JSON.stringify(list));
        }
      } catch (e) { console.error(e); }
    }

    // Save to Supabase
    if (cloudActive) {
      try {
        await supabase.from('claurv_projects').update({
          scenes: updated.scenes,
          default_scene: updated.defaultScene
        }).eq('id', updated.id);
      } catch (err) {
        console.error('Error saving scenes to supabase:', err);
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
      if (active) setCurrentPanoramaUrl(sceneData.image);
    });

    return () => {
      active = false;
      if (currentPanoramaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentPanoramaUrl);
      }
    };
  }, [currentSceneId, activeProject]);

  // Initialize Pannellum viewer for 360 scenes
  useEffect(() => {
    const sceneData = activeProject.scenes[currentSceneId];
    if (!containerRef.current || !window.pannellum || !currentPanoramaUrl || !sceneData || sceneData.type === 'flat') return;

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
        cssClass: `custom-hotspot ${hs.type === 'scene' ? 'scene-hotspot' : ''} ${isEditMode ? 'ring-2 ring-[#E91E63]' : ''}`,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          const root = createRoot(hotSpotDiv);
          let IconComponent = Info;
          if (hs.iconType === 'image') IconComponent = ImageIcon;
          if (hs.iconType === 'arrow') IconComponent = LinkIcon;
          if (hs.iconType === 'comment') IconComponent = MessageSquare;
          if (hs.iconType === 'pin' || hs.iconType === 'location') IconComponent = MapPin;
          if (hs.iconType === 'compass') IconComponent = Compass;
          if (hs.iconType === 'camera') IconComponent = Camera;
          if (hs.iconType === 'play') IconComponent = Play;

          hotSpotDiv.style.color = 'white';
          hotSpotDiv.style.backgroundColor = hs.iconColor || '#E91E63';

          root.render(
            <>
              {hs.iconType === 'floor-ellipse' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5.5 h-5.5 drop-shadow-md">
                  <ellipse cx="12" cy="12" rx="10" ry="4.5" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              ) : (
                <IconComponent size={18} className="drop-shadow-md" />
              )}
              <div className="hotspot-tooltip" style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }}>
                {hs.text || 'Marcador'}
                {isEditMode && <span className="block text-[9px] text-[#E91E63] font-bold mt-1">Clic para editar</span>}
              </div>
            </>
          );
        },
        clickHandlerFunc: () => {
          if (isEditMode) {
            setEditingHotspotIndex(index);
            setHotspotPitch(hs.pitch);
            setHotspotYaw(hs.yaw);
            setHotspotType(hs.type);
            setHotspotTitle(hs.text || '');
            setHotspotText(hs.text || '');
            setHotspotIcon(hs.iconType || 'info');
            setHotspotColor(hs.iconColor || '#E91E63');
            setHotspotMediaUrl((hs as any).mediaUrl || '');
            setHotspotTargetScene(hs.sceneId || '');
            setIsHotspotModalOpen(true);
          } else {
            if (hs.type === 'scene' && hs.sceneId) setCurrentSceneId(hs.sceneId);
            else if (hs.type === 'media' && (hs as any).mediaUrl) setSelectedMedia((hs as any).mediaUrl);
            else if (hs.type === 'info' && hs.text) setInfoPopup({ title: 'Info', text: hs.text });
          }
        }
      }))
    };

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

  const handlePanoramaClick = (event: React.MouseEvent) => {
    if (!isEditMode || !viewerRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest('.custom-hotspot') || target.closest('.control-panel')) return;

    const coords = viewerRef.current.mouseEventToCoords(event.nativeEvent);
    if (coords) {
      const [pitch, yaw] = coords;
      openNewHotspotModal(pitch, yaw);
    }
  };

  const handleFlatImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!isEditMode || !flatImageRef.current) return;
    const rect = flatImageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    openNewHotspotModal(y, x); // Map Y to pitch, X to yaw for simplicity in this model
  };

  const openNewHotspotModal = (pitch: number, yaw: number) => {
    setEditingHotspotIndex(null);
    setHotspotPitch(pitch);
    setHotspotYaw(yaw);
    setHotspotType('info');
    setHotspotTitle('');
    setHotspotText('');
    setHotspotIcon('info');
    setHotspotColor('#E91E63');
    setHotspotMediaUrl('');

    const otherScenes = Object.keys(activeProject.scenes).filter(id => id !== currentSceneId);
    setHotspotTargetScene(otherScenes[0] || '');

    setIsHotspotModalOpen(true);
  };

  const handleCreateHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    const newHotspot: Hotspot = {
      id: `hs-${Date.now()}`,
      pitch: hotspotPitch,
      yaw: hotspotYaw,
      type: hotspotType as any,
      iconColor: hotspotColor,
      iconType: hotspotIcon,
      text: hotspotType === 'info' ? hotspotText : (hotspotType === 'media' ? hotspotTitle : `Ir a: ${activeProject.scenes[hotspotTargetScene]?.title}`),
      sceneId: hotspotType === 'scene' ? hotspotTargetScene : undefined,
    };
    (newHotspot as any).mediaUrl = hotspotType === 'media' ? hotspotMediaUrl : undefined;

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
    
    // Reload scene to refresh Pannellum or React state
    const current = currentSceneId;
    setCurrentSceneId('');
    setTimeout(() => setCurrentSceneId(current), 10);
  };

  const handleAddSceneFromMedia = (media: MediaItem) => {
    const sceneId = `scene_${Date.now()}`;
    const updated = { ...activeProject };
    updated.scenes[sceneId] = {
      title: media.name,
      image: media.url,
      type: media.type,
      hotSpots: []
    };
    if (Object.keys(updated.scenes).length === 1) {
      updated.defaultScene = sceneId;
    }
    saveProjectChanges(updated);
    setIsMediaSelectorOpen(false);
    setCurrentSceneId(sceneId);
  };

  const currentSceneData = activeProject.scenes[currentSceneId];

  return (
    <div className="flex h-screen bg-[#000] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR - DARK THEME */}
      {isAdmin && isEditMode && (
        <div className="w-[320px] bg-[#1a1a1a] border-r border-[#333] flex flex-col z-20 shrink-0 shadow-2xl">
          <div className="p-4 border-b border-[#333]">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider mb-4">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <h2 className="text-sm font-bold text-white truncate">{activeProject.title}</h2>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            <button
              onClick={() => setIsMediaSelectorOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-lg text-sm font-bold transition shadow-lg shadow-[#E91E63]/20 mb-6"
            >
              <Plus className="w-4 h-4" /> Añadir Escena
            </button>

            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Escenas del Proyecto</h3>
            
            <div className="space-y-2">
              {Object.entries(activeProject.scenes).map(([id, sc]) => (
                <div
                  key={id}
                  onClick={() => id !== currentSceneId && setCurrentSceneId(id)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition ${
                    id === currentSceneId
                      ? 'bg-[#333] border-[#555] text-white font-bold'
                      : 'bg-[#1a1a1a] border-[#333] text-slate-400 hover:bg-[#222]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {sc.type === 'flat' ? <ImageIcon className="w-4 h-4 shrink-0" /> : <Box className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{sc.title}</span>
                  </div>
                  {Object.keys(activeProject.scenes).length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Eliminar escena?')) {
                          const up = { ...activeProject };
                          delete up.scenes[id];
                          if (up.defaultScene === id) up.defaultScene = Object.keys(up.scenes)[0];
                          saveProjectChanges(up);
                          setCurrentSceneId(up.defaultScene);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-500/20 text-rose-500 rounded-md transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-[#333]">
            <button
              onClick={() => setIsEditMode(false)}
              className="w-full py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> Visualizar Tour
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEWER */}
      <div className="flex-1 relative bg-black">
        {!isEditMode && isAdmin && (
          <button
            onClick={() => setIsEditMode(true)}
            className="absolute top-4 right-4 z-40 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E91E63]/20"
          >
            <Edit3 className="w-4 h-4" /> Editar Tour
          </button>
        )}
        
        {(!isEditMode || !isAdmin) && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-40 px-4 py-2 bg-[#1a1a1a]/80 backdrop-blur text-white border border-[#333] rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Salir
          </button>
        )}

        {currentSceneData?.type === 'flat' ? (
          // FLAT IMAGE VIEWER
          <div className="w-full h-full relative overflow-auto bg-[#111] flex items-center justify-center">
            <div className="relative inline-block max-w-full max-h-full">
              <img 
                ref={flatImageRef}
                src={currentPanoramaUrl} 
                alt="Plano" 
                className="max-w-full max-h-full object-contain cursor-crosshair"
                onClick={handleFlatImageClick}
              />
              {/* Render Flat Hotspots */}
              {(currentSceneData.hotSpots || []).map((hs, index) => {
                const isFloorCircle = hs.iconType === 'floor-ellipse';
                let IconComponent = Info;
                if (hs.iconType === 'image') IconComponent = ImageIcon;
                if (hs.iconType === 'arrow') IconComponent = LinkIcon;
                if (hs.iconType === 'comment') IconComponent = MessageSquare;
                if (hs.iconType === 'pin' || hs.iconType === 'location') IconComponent = MapPin;
                if (hs.iconType === 'camera') IconComponent = Camera;

                return (
                  <div 
                    key={index}
                    className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${isEditMode ? 'hover:scale-110' : ''}`}
                    style={{ top: `${hs.pitch}%`, left: `${hs.yaw}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditMode) {
                        setEditingHotspotIndex(index);
                        setHotspotPitch(hs.pitch);
                        setHotspotYaw(hs.yaw);
                        setHotspotType(hs.type);
                        setHotspotText(hs.text || '');
                        setHotspotIcon(hs.iconType || 'info');
                        setHotspotColor(hs.iconColor || '#E91E63');
                        setHotspotTargetScene(hs.sceneId || '');
                        setIsHotspotModalOpen(true);
                      } else {
                        if (hs.type === 'scene' && hs.sceneId) setCurrentSceneId(hs.sceneId);
                        else if (hs.type === 'media' && (hs as any).mediaUrl) setSelectedMedia((hs as any).mediaUrl);
                        else if (hs.type === 'info' && hs.text) setInfoPopup({ title: 'Info', text: hs.text });
                      }
                    }}
                  >
                    <div 
                      className={`p-1.5 rounded-full shadow-lg ${isEditMode ? 'ring-2 ring-white/50' : ''}`}
                      style={{ backgroundColor: hs.iconColor || '#E91E63', color: 'white' }}
                    >
                      {isFloorCircle ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                          <ellipse cx="12" cy="12" rx="10" ry="4.5" />
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                        </svg>
                      ) : (
                        <IconComponent size={16} />
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full mt-2 w-max bg-[#1a1a1a] text-white text-xs px-3 py-1.5 rounded-md border border-[#333] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      {hs.text || 'Marcador'}
                      {isEditMode && <span className="block text-[9px] text-[#E91E63] font-bold mt-1">Clic para editar</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // PANNELLUM 360 VIEWER
          <div ref={containerRef} onClick={handlePanoramaClick} className="w-full h-full" id="pannellum-root" />
        )}
      </div>

      {/* Select Media Modal */}
      {isMediaSelectorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] max-w-4xl w-full rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#333] flex justify-between items-center">
              <h3 className="text-white font-bold">Añadir Escena desde Biblioteca</h3>
              <button onClick={() => setIsMediaSelectorOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              {(activeProject.mediaLibrary || []).map(media => (
                <div 
                  key={media.id} 
                  onClick={() => handleAddSceneFromMedia(media)}
                  className="bg-[#222] border border-[#333] rounded-xl overflow-hidden cursor-pointer hover:border-[#E91E63] transition group"
                >
                  <div className="aspect-video bg-[#111] flex items-center justify-center text-slate-600 relative">
                    <span className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase">{media.type}</span>
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="p-3 text-xs font-medium text-slate-300 truncate">{media.name}</div>
                </div>
              ))}
              {(activeProject.mediaLibrary || []).length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-10">
                  No hay imágenes en la biblioteca. Ve al Gestor de Medios para subir fotos.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hotspot Modal */}
      {isHotspotModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl max-w-md w-full p-6 text-slate-300 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Configurar Marcador</h3>
            <form onSubmit={handleCreateHotspot} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Acción</label>
                <select value={hotspotType} onChange={(e) => setHotspotType(e.target.value as any)} className="w-full bg-[#222] border border-[#444] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="info">Mostrar Texto/Información</option>
                  <option value="scene">Ir a otra escena</option>
                  <option value="media">Abrir imagen en Pop-up</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Ícono</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'info', Icon: Info }, { id: 'arrow', Icon: LinkIcon }, { id: 'image', Icon: ImageIcon },
                    { id: 'comment', Icon: MessageSquare }, { id: 'pin', Icon: MapPin }, { id: 'camera', Icon: Camera },
                    { id: 'play', Icon: Play }, { id: 'floor-ellipse', Icon: CircleDot }
                  ].map(({ id, Icon }) => (
                    <button
                      key={id} type="button" onClick={() => setHotspotIcon(id)}
                      className={`p-2 rounded-lg border ${hotspotIcon === id ? 'border-[#E91E63] bg-[#E91E63]/20 text-[#E91E63]' : 'border-[#444] text-slate-400 hover:bg-[#333]'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Color</label>
                <div className="flex gap-2">
                  {['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#000000', '#FFFFFF'].map(col => (
                    <button
                      key={col} type="button" onClick={() => setHotspotColor(col)}
                      className={`w-6 h-6 rounded-full border-2 ${hotspotColor === col ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {hotspotType === 'info' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Texto a mostrar</label>
                  <textarea value={hotspotText} onChange={(e) => setHotspotText(e.target.value)} required rows={3} className="w-full bg-[#222] border border-[#444] rounded-lg px-3 py-2 text-sm text-white resize-none" />
                </div>
              )}

              {hotspotType === 'scene' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Escena Destino</label>
                  <select value={hotspotTargetScene} onChange={(e) => setHotspotTargetScene(e.target.value)} className="w-full bg-[#222] border border-[#444] rounded-lg px-3 py-2 text-sm text-white">
                    {Object.entries(activeProject.scenes).map(([id, sc]) => id !== currentSceneId && <option key={id} value={id}>{sc.title}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-[#333] mt-6">
                {editingHotspotIndex !== null && (
                  <button type="button" onClick={() => {
                    const up = { ...activeProject };
                    up.scenes[currentSceneId].hotSpots.splice(editingHotspotIndex, 1);
                    saveProjectChanges(up);
                    setIsHotspotModalOpen(false);
                    const c = currentSceneId; setCurrentSceneId(''); setTimeout(() => setCurrentSceneId(c), 10);
                  }} className="mr-auto text-rose-500 text-sm font-bold hover:underline">Eliminar</button>
                )}
                <button type="button" onClick={() => setIsHotspotModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#E91E63]/20">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Modal popup */}
      {selectedMedia && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedMedia(null)}>
          <div className="relative bg-[#111] border border-[#333] max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={selectedMedia} alt="Media" className="w-full h-full object-contain" />
            <button onClick={() => setSelectedMedia(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/75 rounded-full text-white text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Info hotspot popup modal */}
      {infoPopup && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setInfoPopup(null)}>
          <div className="bg-[#1a1a1a] text-slate-300 border border-[#333] max-w-md w-full rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setInfoPopup(null)} className="absolute top-4 right-4 w-8 h-8 text-slate-400 hover:text-white">✕</button>
            <h3 className="text-lg font-bold text-white mb-3">{infoPopup.title}</h3>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{infoPopup.text}</p>
          </div>
        </div>
      )}

      {/* Loading animation overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#333] border-t-[#E91E63] animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Cargando...</p>
        </div>
      )}
    </div>
  );
}
