import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import { Urgency, URGENCY_LABELS } from '../../types';

interface FormData {
  area_sector: string;
  location: string;
  failure_type: string;
  description: string;
  urgency: Urgency;
  exact_location: string;
}

const INITIAL: FormData = { area_sector: '', location: '', failure_type: '', description: '', urgency: 'medium', exact_location: '' };

export default function NewOTM({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { createOTM, areas, specialties, locations } = useOTM();
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState<FormData>({ ...INITIAL, area_sector: user?.area_sector || '' });
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const set = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const steps = [
    { title: 'Ubicación', subtitle: 'Área y ubicación del problema' },
    { title: 'Problema', subtitle: 'Tipo de falla y descripción' },
    { title: 'Prioridad', subtitle: 'Nivel de urgencia' },
    { title: 'Imágenes', subtitle: 'Adjunte fotos (opcional)' },
    { title: 'Confirmar', subtitle: 'Revisión y envío' },
  ];

  const canNext = () => {
    if (step === 0) return form.location.length > 0;
    if (step === 1) return form.failure_type.length > 0 && form.description.length > 0;
    if (step === 2) return true;
    if (step === 3) return true;
    return true;
  };

  const handleSubmit = () => {
    const attachments = images.map((img, i) => ({
      id: `att-${Date.now()}-${i}`,
      otm_id: '',
      uploaded_by: user!.id,
      file_url: URL.createObjectURL(img),
      file_name: img.name,
      file_type: 'other' as const,
      phase: 'request' as const,
      created_at: new Date().toISOString(),
    }));
    
    const otm = createOTM({ ...form, attachments });
    setCreatedCode(otm.otm_code);
    setSubmitted(true);
    setImages([]); // clear for next time
  };

  if (submitted) {
    return (
      <div className="fade-in" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>¡Solicitud Enviada!</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Tu orden de trabajo ha sido registrada exitosamente.</p>
        <div className="glass-card" style={{ marginTop: 24, textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Código de seguimiento</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 4 }}>{createdCode}</div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => { setSubmitted(false); setForm({ ...INITIAL, area_sector: user?.area_sector || '' }); setStep(0); onCreated?.(); }}>
          Crear otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Nueva Solicitud OTM</h1>
        <p className="page-subtitle">Complete el formulario para reportar una falla o requerimiento de mantenimiento</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {steps.map((s, i) => (
          <div key={i} className={`progress-step ${i <= step ? 'completed' : ''} ${i === step ? 'active' : ''}`}>
            <div className="step-number">{i + 1}</div>
            <div className="step-title">{s.title}</div>
          </div>
        ))}
        <style>{`
          .progress-steps { display: flex; margin-bottom: 32px; gap: 8px; }
          .progress-step { flex: 1; textAlign: center; position: relative; }
          .step-number {
            width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 6px;
            display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;
            background: var(--bg-secondary); color: var(--text-muted); border: 2px solid var(--border);
            transition: all 0.3s;
          }
          .step-title { font-size: 0.7rem; color: var(--text-muted); font-weight: 400; transition: all 0.3s; }
          
          .progress-step.completed .step-number {
            background: linear-gradient(135deg, var(--accent-blue), #2563eb);
            color: white; border-color: var(--accent-blue);
          }
          .progress-step.completed .step-title { color: var(--text-primary); }
          .progress-step.active .step-title { font-weight: 700; }
          
          @media (max-width: 480px) {
            .step-title { display: none; }
            .progress-step.active .step-title { display: block; position: absolute; top: 38px; left: 50%; transform: translateX(-50%); white-space: nowrap; }
            .progress-steps { margin-bottom: 48px; }
          }
        `}</style>
      </div>

      <div className="glass-card slide-up">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>{steps[step].title}</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>{steps[step].subtitle}</p>

        {/* Step 0: Location */}
        {step === 0 && (
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Ubicación *</label>
              <select className="form-select" value={form.location} onChange={e => set('location', e.target.value)}>
                <option value="">Seleccionar ubicación...</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ubicación exacta</label>
              <input className="form-input" placeholder="Ej: Cancha de Frontón N° 3, Baño de mujeres..." value={form.exact_location} onChange={e => set('exact_location', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 1: Problem */}
        {step === 1 && (
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Especialidad del trabajo *</label>
              <select className="form-select" value={form.failure_type} onChange={e => set('failure_type', e.target.value)}>
                <option value="">Seleccionar tipo...</option>
                {specialties.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción del problema *</label>
              <textarea className="form-textarea" placeholder="Describa brevemente el problema..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2: Urgency */}
        {step === 2 && (
          <div className="priority-grid">
            {[
              { key: 'low', label: 'Baja', icon: '🛠️', desc: 'Mantenimiento preventivo / leve' },
              { key: 'medium', label: 'Media', icon: '👷', desc: 'Requiere atención en el día' },
              { key: 'high', label: 'Alta', icon: '💥', desc: 'Urgente / Riesgo inminente' },
            ].map((p) => (
              <button key={p.key} className={`glass-card priority-btn ${form.urgency === p.key ? 'active' : ''}`} 
                onClick={() => set('urgency', p.key as Urgency)}>
                <div className="priority-icon">{p.icon}</div>
                <div className="priority-label">{p.label}</div>
                <div className="priority-desc">{p.desc}</div>
              </button>
            ))}
            <style>{`
              .priority-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
              .priority-btn { cursor: pointer; textAlign: center; padding: 24px 12px; transition: all 0.2s; }
              .priority-btn.active { border-color: var(--accent-blue); box-shadow: var(--shadow-glow); transform: scale(1.05); }
              .priority-icon { font-size: 48px; margin-bottom: 12px; }
              .priority-label { font-weight: 700; font-size: 1rem; }
              .priority-desc { font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; }
              
              @media (max-width: 640px) {
                .priority-grid { grid-template-columns: 1fr; }
                .priority-btn { display: flex; align-items: center; text-align: left; padding: 16px; gap: 16px; }
                .priority-icon { font-size: 32px; margin-bottom: 0; }
                .priority-desc { display: none; }
              }
            `}</style>
          </div>
        )}

        {/* Step 3: Images */}
        {step === 3 && (
          <div className="flex-col gap-4">
            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <input type="file" multiple accept="image/*" id="img-upload" style={{ display: 'none' }} 
                onChange={e => {
                  const files = Array.from(e.target.files || []).filter(f => f.size <= 100 * 1024 * 1024);
                  setImages(prev => [...prev, ...files].slice(0, 2));
                }} />
              <label htmlFor="img-upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 600 }}>Haga clic para subir imágenes</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Máximo 2 imágenes (100MB cada una)</div>
              </label>
            </div>
            {images.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={URL.createObjectURL(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="flex-col gap-3">
            {[
              ['Ubicación', form.location || '—'],
              ['Ubicación Exacta', form.exact_location || '—'],
              ['Especialidad', form.failure_type],
              ['Urgencia', URGENCY_LABELS[form.urgency]],
              ['Imágenes', `${images.length} adjunta(s)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{k}</span>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Descripción</span>
              <p style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{form.description}</p>
            </div>
          </div>
        )}

        {/* Nav Buttons */}
        <div className="flex justify-between" style={{ marginTop: 28 }}>
          {step > 0 ? <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Anterior</button> : <div />}
          {step < 4 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Siguiente →</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleSubmit}>✓ Enviar Solicitud</button>
          )}
        </div>
      </div>
    </div>
  );
}
