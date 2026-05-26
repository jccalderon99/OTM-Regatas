import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import { OTI_SPECIALTIES } from '../../types';

export default function NewOTI({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { createOTI, users, locations } = useOTM();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    location: '',
    exact_location: '',
    description: '',
    specialty: '',
    scheduled_date: '',
    estimated_time: '',
    technician_ids: [] as string[]
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedTechToAdd, setSelectedTechToAdd] = useState('');

  const technicians = users.filter(u => u.role === 'technician');

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleAddTech = () => {
    if (selectedTechToAdd && !form.technician_ids.includes(selectedTechToAdd)) {
      set('technician_ids', [...form.technician_ids, selectedTechToAdd]);
    }
    setSelectedTechToAdd('');
  };

  const handleRemoveTech = (techId: string) => {
    set('technician_ids', form.technician_ids.filter(id => id !== techId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location || !form.specialty || !form.description || form.technician_ids.length === 0 || !form.scheduled_date) {
      alert('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    setLoading(true);
    try {
      let image_url = null;
      if (imageFile) {
        // Local simulation of upload
        image_url = URL.createObjectURL(imageFile);
      }

      await createOTI({
        location: form.location,
        exact_location: form.exact_location || null,
        description: form.description,
        specialty: form.specialty,
        scheduled_date: form.scheduled_date,
        estimated_time: form.estimated_time ? parseFloat(form.estimated_time) : null,
        technician_ids: form.technician_ids,
        image_url: image_url
      });

      alert('¡Orden de Trabajo Interna (OTI) creada exitosamente!');
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al crear la OTI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">📝 Generar Orden de Trabajo Interna (OTI)</h1>
        <p className="page-subtitle">Asigne una tarea interna directamente a uno o más técnicos.</p>
      </div>

      <div className="glass-card slide-up">
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Ubicación (Sede/Área) *</label>
              <select 
                className="form-select" 
                value={form.location} 
                onChange={e => set('location', e.target.value)}
                required
              >
                <option value="">Seleccionar ubicación...</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ubicación Exacta</label>
              <input 
                className="form-input" 
                placeholder="Ej: Sótano, Puerta Principal, etc."
                value={form.exact_location} 
                onChange={e => set('exact_location', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Especialidad *</label>
              <select 
                className="form-select" 
                value={form.specialty} 
                onChange={e => set('specialty', e.target.value)}
                required
              >
                <option value="">Seleccionar especialidad...</option>
                {OTI_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tiempo Estimado (horas)</label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                className="form-input" 
                placeholder="Ej: 2.5 (dos horas y media)"
                value={form.estimated_time} 
                onChange={e => set('estimated_time', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Fecha y Hora Programada *</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={form.scheduled_date} 
                onChange={e => set('scheduled_date', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adjuntar Imagen</label>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  id="oti-image"
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="oti-image" className="btn btn-outline file-upload-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: 'fit-content' }}>
                  <span>📸</span> {imageFile ? imageFile.name : 'Seleccionar archivo'}
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción de la Actividad *</label>
            <textarea 
              className="form-textarea" 
              placeholder="Describa la tarea a realizar por el técnico..."
              value={form.description} 
              onChange={e => set('description', e.target.value)}
              required
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Técnicos Asignados *</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select
                className="form-select"
                value={selectedTechToAdd}
                onChange={e => setSelectedTechToAdd(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Seleccionar técnico...</option>
                {technicians.filter(t => !form.technician_ids.includes(t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.position || 'Técnico'})</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddTech}
                disabled={!selectedTechToAdd}
              >
                Agregar
              </button>
            </div>
            
            {form.technician_ids.length > 0 && (
              <div className="selected-techs-list">
                {form.technician_ids.map(techId => {
                  const t = technicians.find(u => u.id === techId);
                  if (!t) return null;
                  return (
                    <div key={techId} className="selected-tech-item">
                      <div className="tech-info">
                        <span className="tech-name">{t.full_name}</span>
                        <span className="tech-badge">{t.position || 'Técnico'}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-tech"
                        onClick={() => handleRemoveTech(techId)}
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {form.technician_ids.length === 0 && (
              <div className="no-techs-msg" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No hay técnicos asignados. Agregue al menos uno.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => onCreated?.()}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Generando...' : 'Crear OTI'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .file-upload-btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px dashed var(--border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          transition: all 0.2s;
        }
        .file-upload-btn:hover {
          border-color: var(--accent-blue);
          background: rgba(78, 181, 230, 0.1);
        }
        
        .selected-techs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          background: rgba(0,0,0,0.2);
          max-height: 200px;
          overflow-y: auto;
        }
        .selected-tech-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .tech-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tech-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .tech-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.1);
          color: var(--text-muted);
        }
        .btn-remove-tech {
          background: none;
          border: none;
          color: var(--danger, #ff4d4d);
          cursor: pointer;
          font-size: 1.1rem;
          opacity: 0.7;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .btn-remove-tech:hover {
          opacity: 1;
          background: rgba(255, 77, 77, 0.1);
        }
      `}</style>
    </div>
  );
}
