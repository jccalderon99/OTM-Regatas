import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, LogOut, Plus, Trash2, Globe, Lock, ArrowRight, Upload } from 'lucide-react';
import { savePanoramaBlob, resolvePanoramaUrl, deletePanoramaBlob } from '../lib/clauRvDb';

interface Scene {
  title: string;
  image: string;
  hotSpots: any[];
}

export interface Project {
  id: string;
  title: string;
  image: string; // URL or indexeddb://
  createdAt: string;
  isPublic: boolean;
  scenes: Record<string, Scene>;
  defaultScene: string;
}

interface DashboardProps {
  onOpenProject: (project: Project) => void;
}

// Project Card Helper to handle async IndexedDB images
function ProjectCard({ project, isAdmin, onOpen, onDelete, onToggleVisibility }: {
  project: Project;
  isAdmin: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let active = true;
    resolvePanoramaUrl(project.image).then(url => {
      if (active) setImageUrl(url);
    }).catch(() => {
      if (active) setImageUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>');
    });
    return () => {
      active = false;
      if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [project.image]);

  const sceneCount = Object.keys(project.scenes || {}).length;

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-3xl overflow-hidden border border-amber-900/5 shadow-md shadow-amber-900/5 group hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 cursor-pointer flex flex-col h-full hover:scale-[1.01]"
    >
      {/* Card Thumbnail */}
      <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            Cargando...
          </div>
        )}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
          📷 {sceneCount} Escena(s)
        </div>

        {/* Visibility indicator */}
        <div className="absolute top-4 right-4 flex gap-1.5">
          {isAdmin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              className={`p-2 rounded-xl backdrop-blur-md text-white transition ${
                project.isPublic 
                  ? 'bg-emerald-600/80 hover:bg-emerald-600' 
                  : 'bg-rose-600/80 hover:bg-rose-600'
              }`}
              title={project.isPublic ? 'Público: Hacer Privado' : 'Privado: Hacer Público'}
            >
              {project.isPublic ? <Globe className="w-4.5 h-4.5" /> : <Lock className="w-4.5 h-4.5" />}
            </button>
          ) : (
            <div className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white">
              <Globe className="w-4.5 h-4.5" />
            </div>
          )}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-amber-600 transition mb-2">
            {project.title}
          </h3>
          <p className="text-xs text-slate-400">
            Creado: {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-4">
          <span className="text-amber-700 font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            <span>Ver Tour</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>

          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
              title="Eliminar Proyecto"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onOpenProject }: DashboardProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('claurv_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        setProjects([]);
      }
    } else {
      setProjects([]);
    }
  }, []);

  const saveProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('claurv_projects', JSON.stringify(updated));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedFile) return;

    setIsUploading(true);

    try {
      // Save local indexeddb reference
      const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await savePanoramaBlob(id, selectedFile);
      const imageUrl = `indexeddb://${id}`;

      const newProject: Project = {
        id: `proj-${Date.now()}`,
        title: newTitle.trim(),
        image: imageUrl,
        createdAt: new Date().toISOString(),
        isPublic: isPublic,
        defaultScene: "scene_1",
        scenes: {
          "scene_1": {
            title: "Escena Principal",
            image: imageUrl,
            hotSpots: []
          }
        }
      };

      const updated = [newProject, ...projects];
      saveProjects(updated);
      setNewTitle('');
      setSelectedFile(null);
      setIsPublic(true);
      setShowAddModal(false);
    } catch (err: any) {
      alert('Error al crear el proyecto: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Deseas eliminar permanentemente este proyecto y todas sus escenas?')) {
      const proj = projects.find(p => p.id === id);
      if (proj?.scenes) {
        // Clean up IndexedDB Blobs
        for (const scene of Object.values(proj.scenes)) {
          if (scene.image.startsWith('indexeddb://')) {
            const blobId = scene.image.replace('indexeddb://', '');
            await deletePanoramaBlob(blobId).catch(console.error);
          }
        }
        if (proj.image.startsWith('indexeddb://')) {
          const blobId = proj.image.replace('indexeddb://', '');
          await deletePanoramaBlob(blobId).catch(console.error);
        }
      }

      const updated = projects.filter(p => p.id !== id);
      saveProjects(updated);
    }
  };

  const toggleVisibility = (id: string) => {
    const updated = projects.map(p => {
      if (p.id === id) {
        return { ...p, isPublic: !p.isPublic };
      }
      return p;
    });
    saveProjects(updated);
  };

  const displayedProjects = isAdmin 
    ? projects 
    : projects.filter(p => p.isPublic);

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-sans text-slate-800 pb-16">
      {/* Header bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-900/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-700">
              <Compass className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">CLAUVR 360°</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {isAdmin ? 'Panel de Administrador' : 'Modo Invitado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-amber-600/10"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Proyecto</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Proyectos Disponibles</h2>
            <p className="text-sm text-slate-500">Selecciona un proyecto para abrir el tour interactivo 360°</p>
          </div>
        </div>

        {displayedProjects.length === 0 ? (
          <div className="bg-white rounded-3xl border border-amber-900/5 shadow-sm p-16 text-center max-w-xl mx-auto mt-12">
            <div className="text-4xl mb-4">📂</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No hay proyectos para mostrar</h3>
            <p className="text-sm text-slate-500 mb-6">
              {isAdmin 
                ? 'Comienza creando tu primer proyecto de tour virtual usando el botón superior.'
                : 'Actualmente no hay proyectos configurados como públicos para visualización de invitados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                isAdmin={isAdmin}
                onOpen={() => onOpenProject(project)}
                onDelete={() => handleDelete(project.id)}
                onToggleVisibility={() => toggleVisibility(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-900/5 max-w-md w-full p-8 relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Crear Nuevo Proyecto</h3>
            <p className="text-sm text-slate-500 mb-6">Carga una imagen panorámica de tu computadora para el proyecto.</p>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sede Chorrillos, Piscina Olímpica"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="block w-full px-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Imagen Panorámica 360° (Local)
                </label>
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-[#FAF6F0]/20 hover:bg-[#FAF6F0]/50 transition cursor-pointer relative"
                  onClick={() => document.getElementById('project-file-input')?.click()}
                >
                  <input
                    id="project-file-input"
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <span className="block text-xs font-bold text-slate-700">
                    {selectedFile ? selectedFile.name : 'Seleccionar Archivo de Imagen'}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">JPG, JPEG o PNG en formato equirectangular 2:1</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visibility"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="visibility" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Hacer este proyecto visible para Invitados
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
                  disabled={isUploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/10 transition"
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
