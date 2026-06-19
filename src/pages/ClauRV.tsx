import React from 'react';
import { ExternalLink, Compass } from 'lucide-react';

export default function ClauRV() {
  const handleOpenStandalone = () => {
    // Dynamically open ClauRV standalone page. 
    // If it's Vercel production, it will be mapped to the standalone Vercel deployment URL (e.g. otm-regatas-claurv.vercel.app),
    // otherwise fallback to localhost for development.
    const standaloneUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5174' // vite dev server typically assigns 5174 for nested projects
      : 'https://otm-regatas-claurv.vercel.app'; // Configure this Vercel deployment domain
    
    window.open(standaloneUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-blue-500 mb-6 shadow-lg shadow-blue-500/5 animate-pulse">
        <Compass className="w-16 h-16" />
      </div>
      
      <h1 className="text-3xl font-extrabold text-slate-100 mb-3 bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
        ClauRV (Tours 360°)
      </h1>
      
      <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
        El módulo de tours virtuales e inmersivos 360° ahora corre de forma independiente para garantizar una velocidad óptima, precarga avanzada de imágenes y múltiples tipos de marcadores estilo Panoee.
      </p>
      
      <button
        onClick={handleOpenStandalone}
        className="flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
      >
        <span>Abrir ClauRV Autónomo</span>
        <ExternalLink className="w-4.5 h-4.5" />
      </button>
    </div>
  );
}
