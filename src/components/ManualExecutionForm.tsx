import React, { useState, useMemo } from 'react';
import { OTMRequest, SupplyUsed } from '../types';
import inventoryData from '../lib/mockInventoryData.json';
import { uploadToCloudinary } from '../lib/cloudinary';
import SupplySelector from './SupplySelector';

interface ManualExecutionFormProps {
  otm: OTMRequest;
  role: 'technician' | 'supervisor';
  onSubmit: (data: {
    job_start_time: string;
    job_end_time: string;
    technician_notes: string;
    supplies_used: SupplyUsed[];
    photos: { file_url: string; file_name: string }[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ManualExecutionForm({ otm, role, onSubmit, onCancel }: ManualExecutionFormProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [supplies, setSupplies] = useState<SupplyUsed[]>([]);
  const [photos, setPhotos] = useState<{ name: string; type: string; url: string; file?: File }[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotos(p => [...p, { name: file.name, type: file.type, url, file }]);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || notes.length < 5) {
      alert("Por favor complete las fechas y una descripción válida.");
      return;
    }
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end <= start) {
      alert("La fecha final debe ser posterior a la fecha de inicio.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload photos if any
      const uploadedPhotos = await Promise.all(
        photos.map(async p => {
          if (p.file) {
            const result = await uploadToCloudinary(p.file, 'otm-regatas/execution');
            return { file_url: result.url, file_name: p.name };
          }
          return { file_url: p.url, file_name: p.name };
        })
      );

      await onSubmit({
        job_start_time: new Date(startTime).toISOString(),
        job_end_time: new Date(endTime).toISOString(),
        technician_notes: notes,
        supplies_used: supplies,
        photos: uploadedPhotos
      });
    } catch (err) {
      console.error('Error submitting execution:', err);
      alert('Hubo un error al registrar la actividad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: 16, borderLeft: '4px solid #8b5cf6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📋</span> Regularizar Actividad (Manual)
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ margin: 0, height: 32 }}>✕ Cancelar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>📅 Fecha y Hora de Inicio <span style={{color:'red'}}>*</span></label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={startTime} 
              onChange={e => setStartTime(e.target.value)} 
              style={{ fontSize: '0.85rem', width: '100%' }}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>📅 Fecha y Hora Final <span style={{color:'red'}}>*</span></label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)} 
              style={{ fontSize: '0.85rem', width: '100%' }}
              required 
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>📝 Descripción del trabajo realizado <span style={{color:'red'}}>*</span></label>
          <textarea 
            className="form-textarea" 
            placeholder="Describe en detalle el trabajo realizado..." 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            style={{ minHeight: 100 }}
            required
            minLength={5}
          />
        </div>

        <SupplySelector supplies={supplies} onChange={setSupplies} />

        {/* Photos Section */}
        <div style={{ marginBottom: 24 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>📷 Evidencia Fotográfica (Post-Trabajo)</label>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            Sube fotos que demuestren que el trabajo fue realizado.
          </div>
          <label className="file-drop-zone" style={{ display: 'block', padding: '16px' }}>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click para subir fotos del antes y después</div>
          </label>
          {photos.length > 0 && (
            <div className="file-preview-grid" style={{ marginTop: 12 }}>
              {photos.map((p, i) => (
                <div key={i} className="file-preview-item">
                  <img src={p.url} alt={p.name} />
                  <button type="button" onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? '⏳ Procesando...' : '✓ Registrar Actividad'}
          </button>
        </div>
      </form>
    </div>
  );
}
