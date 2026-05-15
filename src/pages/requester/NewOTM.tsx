import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOTM } from '../../context/OTMContext';
import { Urgency, URGENCY_LABELS } from '../../types';

interface FormData {
  area_sector: string;
  failure_type: string;
  asset: string;
  description: string;
  urgency: Urgency;
  exact_location: string;
}

const INITIAL: FormData = { area_sector: '', failure_type: '', asset: '', description: '', urgency: 'medium', exact_location: '' };

export default function NewOTM({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { createOTM, areas, specialties } = useOTM();
  const [form, setForm] = useState<FormData>({ ...INITIAL, area_sector: user?.area_sector || '' });
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const set = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const steps = [
    { title: 'Ubicación', subtitle: 'Área y ubicación del problema' },
    { title: 'Problema', subtitle: 'Tipo de falla y descripción' },
    { title: 'Prioridad', subtitle: 'Nivel de urgencia' },
    { title: 'Confirmar', subtitle: 'Revisión y envío' },
  ];

  const canNext = () => {
    if (step === 0) return form.area_sector.length > 0;
    if (step === 1) return form.failure_type.length > 0 && form.description.length >= 10;
    if (step === 2) return true;
    return true;
  };

  const handleSubmit = () => {
    const otm = createOTM(form);
    setCreatedCode(otm.otm_code);
    setSubmitted(true);
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
      <div style={{ display: 'flex', marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', margin: '0 auto 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
              background: i <= step ? 'linear-gradient(135deg, var(--accent-blue), #2563eb)' : 'var(--bg-secondary)',
              color: i <= step ? 'white' : 'var(--text-muted)',
              border: `2px solid ${i <= step ? 'var(--accent-blue)' : 'var(--border)'}`,
              transition: 'all 0.3s'
            }}>{i + 1}</div>
            <div style={{ fontSize: '0.7rem', color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s.title}</div>
          </div>
        ))}
      </div>

      <div className="glass-card slide-up">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>{steps[step].title}</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>{steps[step].subtitle}</p>

        {/* Step 0: Location */}
        {step === 0 && (
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Área / Sector *</label>
              <select className="form-select" value={form.area_sector} onChange={e => set('area_sector', e.target.value)}>
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
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
              <label className="form-label">Activo / Equipo</label>
              <input className="form-input" placeholder="Ej: Motor Banda #3, Compresor de aire..." value={form.asset} onChange={e => set('asset', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción del problema * (mín. 10 caracteres)</label>
              <textarea className="form-textarea" placeholder="Describa detalladamente el problema..." value={form.description} onChange={e => set('description', e.target.value)} />
              <span style={{ fontSize: '0.7rem', color: form.description.length >= 10 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{form.description.length}/10+ caracteres</span>
            </div>
          </div>
        )}

        {/* Step 2: Urgency */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {(Object.entries(URGENCY_LABELS) as [Urgency, string][]).map(([key, label]) => (
              <button key={key} className={`glass-card`} onClick={() => set('urgency', key)}
                style={{ cursor: 'pointer', textAlign: 'center', padding: 20,
                  borderColor: form.urgency === key ? 'var(--accent-blue)' : undefined,
                  boxShadow: form.urgency === key ? 'var(--shadow-glow)' : undefined }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>
                  {key === 'low' ? '🟢' : key === 'medium' ? '🔵' : '🟠'}
                </div>
                <div style={{ fontWeight: 600 }}>{label.split(' (')[0]}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {label.includes('(') ? '(' + label.split(' (')[1] : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="flex-col gap-3">
            {[
              ['Área', form.area_sector],
              ['Ubicación Exacta', form.exact_location || '—'],
              ['Especialidad', form.failure_type],
              ['Activo', form.asset || '—'],
              ['Urgencia', URGENCY_LABELS[form.urgency]],
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
          {step < 3 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Siguiente →</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleSubmit}>✓ Enviar Solicitud</button>
          )}
        </div>
      </div>
    </div>
  );
}
