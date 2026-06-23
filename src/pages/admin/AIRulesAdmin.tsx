import React, { useState, useEffect } from 'react';

export default function AIRulesAdmin() {
  const [rules, setRules] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedRules = localStorage.getItem('crl_ai_custom_rules') || '';
    setRules(savedRules);
  }, []);

  const handleSave = () => {
    localStorage.setItem('crl_ai_custom_rules', rules);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🤖 Configuración de IA</h1>
          <p className="page-subtitle">Instrucciones personalizadas para guiar el comportamiento del Asistente de IA (Gemini/Groq).</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {isSaved ? '✓ Guardado exitosamente' : '💾 Guardar Reglas'}
        </button>
      </div>

      <div className="glass-card slide-up" style={{ marginBottom: 24, padding: '24px', borderLeft: '4px solid var(--accent-blue)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          💡 ¿Cómo escribir buenas reglas?
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <li style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>•</span>
            <span><strong>Define límites:</strong> "No generes OTMs si falta la ubicación exacta o el tipo de falla."</span>
          </li>
          <li style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>•</span>
            <span><strong>Aclara responsabilidades:</strong> "Los trabajos de pintura pertenecen a Mantenimiento, pero la limpieza profunda es de Maestranza (no generar OTM)."</span>
          </li>
          <li style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>•</span>
            <span><strong>Tono:</strong> "Sé siempre formal y pide disculpas si algo no se puede hacer."</span>
          </li>
          <li style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>•</span>
            <span><strong>Ejemplos:</strong> Usa ejemplos claros de cuándo sí y cuándo no generar una orden.</span>
          </li>
        </ul>
      </div>

      <div className="glass-card slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Instrucciones del Sistema (System Prompt Adicional)</h3>
        <textarea
          className="form-input"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Ejemplo: Si un usuario pide algo relacionado a jardinería que implique comprar plantas, dile que requiere aprobación previa. Nunca asumas un piso si no te lo dicen..."
          style={{ 
            width: '100%', 
            minHeight: '400px', 
            fontFamily: 'monospace',
            padding: '16px',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            resize: 'vertical'
          }}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            style={{ padding: '12px 32px' }}
          >
            {isSaved ? '✓ Guardado' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
