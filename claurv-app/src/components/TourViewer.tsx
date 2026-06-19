import { useEffect, useRef, useState } from 'react';
import { Info, Image as ImageIcon, Map, ExternalLink, MessageCircle } from 'lucide-react';
import { createRoot } from 'react-dom/client';

// We'll mock a tour here for now. In a real app, this comes from Supabase.
const MOCK_SCENES = {
  'scene1': {
    title: 'Entrada Principal',
    panorama: 'https://pannellum.org/images/alma.jpg',
    hotSpots: [
      {
        id: 'hs1',
        pitch: -5,
        yaw: 10,
        type: 'info', // Panoee style: info, link, scene, media
        text: 'Recepción y Control',
        icon: 'info'
      },
      {
        id: 'hs2',
        pitch: -2,
        yaw: 50,
        type: 'scene',
        sceneId: 'scene2',
        text: 'Ir al Taller',
        icon: 'arrow'
      }
    ]
  },
  'scene2': {
    title: 'Taller de Mantenimiento',
    panorama: 'https://pannellum.org/images/bma-0.jpg',
    hotSpots: [
      {
        id: 'hs3',
        pitch: 0,
        yaw: -100,
        type: 'scene',
        sceneId: 'scene1',
        text: 'Volver a Entrada',
        icon: 'arrow'
      },
      {
        id: 'hs4',
        pitch: -15,
        yaw: 10,
        type: 'media',
        text: 'Ver Plano Técnico',
        icon: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800'
      }
    ]
  }
};

export default function TourViewer() {
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentScene, setCurrentScene] = useState('scene1');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Initialize Pannellum
  useEffect(() => {
    if (!containerRef.current || !window.pannellum) return;

    // Destroy existing viewer
    if (viewerRef.current) {
      viewerRef.current.destroy();
    }

    const sceneData = MOCK_SCENES[currentScene as keyof typeof MOCK_SCENES];
    if (!sceneData) return;

    const config = {
      type: 'equirectangular',
      panorama: sceneData.panorama,
      autoLoad: true,
      compass: true,
      showControls: true,
      keyboardZoom: true,
      mouseZoom: true,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: sceneData.hotSpots.map(hs => ({
        pitch: hs.pitch,
        yaw: hs.yaw,
        cssClass: `custom-hotspot ${hs.type === 'scene' ? 'scene-hotspot' : ''}`,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          // Render React icon and tooltip inside the standard DOM element provided by Pannellum
          const root = createRoot(hotSpotDiv);
          
          let IconComponent = Info;
          if (hs.icon === 'image') IconComponent = ImageIcon;
          if (hs.icon === 'arrow') IconComponent = ExternalLink;
          if (hs.icon === 'comment') IconComponent = MessageCircle;

          root.render(
            <>
              <IconComponent size={20} className="drop-shadow-md" />
              <div className="hotspot-tooltip">{hs.text}</div>
            </>
          );
        },
        createTooltipArgs: hs,
        clickHandlerFunc: (_event: any, _args: any) => {
          if (hs.type === 'scene' && (hs as any).sceneId) {
            setCurrentScene((hs as any).sceneId);
          } else if (hs.type === 'media' && (hs as any).mediaUrl) {
            setSelectedMedia((hs as any).mediaUrl);
          } else if (hs.type === 'info') {
            alert(`Información: ${hs.text}`);
          }
        }
      }))
    };

    viewerRef.current = window.pannellum.viewer(containerRef.current, config);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [currentScene]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {/* Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2 pointer-events-auto">
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-400" />
            {MOCK_SCENES[currentScene as keyof typeof MOCK_SCENES]?.title || 'Tour Virtual'}
          </h1>
        </div>
      </div>

      {/* Pannellum Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        id="pannellum-container"
      />

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20" onClick={e => e.stopPropagation()}>
            <img src={selectedMedia} alt="Media" className="w-full h-full object-contain" />
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
