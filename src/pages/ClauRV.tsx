import React, { useState, useEffect } from 'react';
import { ExternalLink, Compass, Settings, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ClauRV() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Read configured ClauRV URL from localStorage (so it's easily customizable if Vercel generates a different link)
  const [standaloneUrl, setStandaloneUrl] = useState('https://otm-regatas-claurv.vercel.app');
  const [tempUrl, setTempUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('claurv_standalone_url');
    if (savedUrl) {
      setStandaloneUrl(savedUrl);
      setTempUrl(savedUrl);
    } else {
      setTempUrl('https://otm-regatas-claurv.vercel.app');
    }
  }, []);

  const handleOpenStandalone = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const targetUrl = isLocal ? 'http://localhost:5173/claurv-app/' : standaloneUrl;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUrl.trim()) return;
    
    // Normalize URL
    let formattedUrl = tempUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    localStorage.setItem('claurv_standalone_url', formattedUrl);
    setStandaloneUrl(formattedUrl);
    setTempUrl(formattedUrl);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 max-w-2xl mx-auto text-center">
      {/* 1. Brand Logo */}
      <div className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-blue-500 mb-6 shadow-lg shadow-blue-500/5 animate-pulse">
        <Compass className="w-14 h-14" />
      </div>
      
      {/* 2. Heading */}
      <h1 className="text-3xl font-extrabold text-slate-100 mb-3 bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
        ClauRV (Tours 360°)
      </h1>
      
      {/* 3. Description */}
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        El módulo de tours virtuales e inmersivos 360° corre en su propio dominio independiente de Vercel. Esto soluciona los problemas de renderizado móvil, y acelera la carga al 100%.
      </p>

      {/* 4. Main Access Button */}
      <button
        onClick={handleOpenStandalone}
        className="flex items-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 hover:scale-[1.02] mb-8"
      >
        <span>Abrir ClauRV Autónomo</span>
        <ExternalLink className="w-4.5 h-4.5" />
      </button>

      {/* 5. Vercel Configuration Help and Settings (Admin Only) */}
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configuración del enlace</span>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              {isEditing ? 'Cancelar' : 'Cambiar enlace'}
            </button>
          )}
        </div>

        {/* Editing Mode */}
        {isEditing ? (
          <form onSubmit={handleSaveUrl} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Enlace de Vercel (URL):</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://otm-regatas-claurv.vercel.app"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none text-xs focus:border-blue-500 transition text-slate-100"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-mono select-all">{standaloneUrl}</span>
            {saveSuccess && (
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full font-bold">¡Guardado!</span>
            )}
          </div>
        )}

        {/* Dynamic Vercel Setup Instructions */}
        <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/40 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-500 font-bold mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>¿Por qué sale pantalla de 404 en Vercel?</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Como ClauRV ahora corre separado, debes crear el nuevo proyecto en tu cuenta de Vercel con estos pasos:
          </p>
          <ol className="list-decimal list-inside text-slate-400 space-y-1.5 ml-1 leading-relaxed">
            <li>Ingresa a tu consola de **Vercel** y dale a **"Add New" ➔ "Project"**.</li>
            <li>Elige el repositorio **"OTM-Regatas"**.</li>
            <li>En los ajustes de Vercel, busca el campo **Root Directory** y cámbialo a: <strong className="text-slate-200">claurv-app</strong>.</li>
            <li>Dale clic a **Deploy**.</li>
            <li>Una vez completado, copia el enlace generado por Vercel y pégalo arriba haciendo clic en <strong className="text-blue-400 font-medium">"Cambiar enlace"</strong> para actualizar la plataforma.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
