import { useState, useEffect } from 'react';
import { ChevronLeft, Folder, Image as ImageIcon, Box, UploadCloud, Trash2, ArrowRight } from 'lucide-react';
import type { Project, MediaItem } from '../types/project';
import { savePanoramaBlob, deletePanoramaBlob, resolvePanoramaUrl } from '../lib/clauRvDb';
import { supabase, isSupabaseConfigured, uploadPanoramaToSupabase } from '../lib/supabase';

interface MediaManagerProps {
  project: Project;
  onBack: () => void;
  onGoToEditor: () => void;
}

export default function MediaManager({ project, onBack, onGoToEditor }: MediaManagerProps) {
  const [albums] = useState<string[]>(['Root']);
  const [activeAlbum, setActiveAlbum] = useState('Root');
  const [activeTab, setActiveTab] = useState<'360' | 'flat'>('360');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(project.mediaLibrary || []);
  const [isUploading, setIsUploading] = useState(false);
  const cloudActive = isSupabaseConfigured();

  // Save changes to db
  const saveMediaLibrary = async (newMedia: MediaItem[]) => {
    setMediaItems(newMedia);
    
    if (cloudActive) {
      await supabase.from('claurv_projects').update({ media_library: newMedia }).eq('id', project.id);
    } else {
      const saved = localStorage.getItem('claurv_projects');
      if (saved) {
        const parsed = JSON.parse(saved) as Project[];
        const updated = parsed.map(p => p.id === project.id ? { ...p, mediaLibrary: newMedia } : p);
        localStorage.setItem('claurv_projects', JSON.stringify(updated));
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      let url = '';
      if (cloudActive) {
        url = await uploadPanoramaToSupabase(file);
      } else {
        const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await savePanoramaBlob(id, file);
        url = `indexeddb://${id}`;
      }

      const newItem: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name,
        url,
        type: activeTab,
        album: activeAlbum,
        createdAt: new Date().toISOString()
      };

      await saveMediaLibrary([newItem, ...mediaItems]);
    } catch (err) {
      console.error(err);
      alert('Error al subir archivo');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    
    const newMedia = mediaItems.filter(m => m.id !== id);
    await saveMediaLibrary(newMedia);

    if (!cloudActive && url.startsWith('indexeddb://')) {
      await deletePanoramaBlob(url.replace('indexeddb://', ''));
    }
  };

  const currentMedia = mediaItems.filter(m => m.album === activeAlbum && m.type === activeTab);

  return (
    <div className="flex h-screen bg-[#111111] text-slate-300 font-sans">
      
      {/* Sidebar - Albums */}
      <div className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col">
        <div className="p-4 border-b border-[#333] flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-[#333] rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h2 className="text-sm font-bold text-slate-100 truncate">{project.title}</h2>
        </div>
        
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Álbumes</h3>
            <button className="text-[#E91E63] text-xs font-bold hover:underline">+ Álbum</button>
          </div>
          
          <ul className="space-y-1">
            {albums.map(album => (
              <li key={album}>
                <button 
                  onClick={() => setActiveAlbum(album)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeAlbum === album ? 'bg-[#333] text-white' : 'hover:bg-[#222] text-slate-400'}`}
                >
                  <Folder className="w-4 h-4" />
                  {album}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        
        {/* Top bar */}
        <div className="h-16 border-b border-[#333] flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-[#E91E63]" />
              {activeAlbum}
            </h1>
            
            <div className="flex bg-[#222] p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('360')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === '360' ? 'bg-[#333] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Box className="w-4 h-4" /> 360 Image
              </button>
              <button 
                onClick={() => setActiveTab('flat')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'flat' ? 'bg-[#333] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ImageIcon className="w-4 h-4" /> Flat Image
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition">
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Subiendo...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
            
            <button 
              onClick={onGoToEditor}
              className="flex items-center gap-2 bg-[#E91E63] hover:bg-[#D81B60] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-[#E91E63]/20 transition"
            >
              Generar Escenarios <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <div className="w-24 h-24 mb-4 opacity-20">
                <ImageIcon className="w-full h-full" />
              </div>
              <p className="text-sm">No hay imágenes en este álbum</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {currentMedia.map(item => (
                <MediaCard key={item.id} item={item} onDelete={() => handleDelete(item.id, item.url)} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function MediaCard({ item, onDelete }: { item: MediaItem, onDelete: () => void }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    resolvePanoramaUrl(item.url).then(url => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    };
  }, [item.url]);

  return (
    <div className="bg-[#222] rounded-xl overflow-hidden border border-[#333] group relative hover:border-slate-500 transition">
      <div className="aspect-video bg-[#111] relative">
        {src ? (
          <img src={src} className="w-full h-full object-cover" alt={item.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onDelete} className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-md backdrop-blur-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-xs font-medium text-slate-300 truncate" title={item.name}>{item.name}</h4>
      </div>
    </div>
  );
}
