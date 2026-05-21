import React, { useState, useMemo } from 'react';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { ROUTINE_SPECIALTIES, getSubSpecialties, getActivitiesForSub } from '../../lib/routineActivities';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../lib/cloudinary';

export default function RoutineRegister() {
  const { activities, createRoutineRecord } = useRoutineActivity();
  const [step, setStep] = useState(1);
  const [specialty, setSpecialty] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [photos, setPhotos] = useState<{ name: string; url: string; file?: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const specialties = useMemo(
    () => [...new Set([...ROUTINE_SPECIALTIES, ...activities.map(a => a.specialty)])],
    [activities]
  );

  const subSpecialties = useMemo(
    () => (specialty ? getSubSpecialties(specialty, activities) : []),
    [specialty, activities]
  );

  const catalogItems = useMemo(
    () => (specialty && subSpecialty ? getActivitiesForSub(specialty, subSpecialty, activities) : []),
    [specialty, subSpecialty, activities]
  );

  const useFreeText = catalogItems.length === 0;

  const toggleCheck = (label: string) => {
    setChecked(prev => (prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      setPhotos(p => [...p, { name: file.name, url: URL.createObjectURL(file), file }]);
    });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setError('');
    if (!specialty || !subSpecialty) {
      setError('Seleccione especialidad y sub-especialidad.');
      return;
    }
    if (useFreeText && !freeText.trim()) {
      setError('Describa la labor realizada.');
      return;
    }
    if (!useFreeText && checked.length === 0) {
      setError('Marque al menos una actividad del checklist.');
      return;
    }

    setUploading(true);
    try {
      const photoUrls: string[] = [];
      for (const p of photos) {
        if (p.file && isCloudinaryConfigured()) {
          const result = await uploadToCloudinary(p.file, 'otm-regatas/routines');
          photoUrls.push(result.url);
        } else if (p.url.startsWith('blob:')) {
          continue;
        } else {
          photoUrls.push(p.url);
        }
      }

      const today = new Date().toISOString().slice(0, 10);
      await createRoutineRecord({
        specialty,
        sub_specialty: subSpecialty,
        activities_executed: useFreeText ? [] : checked,
        free_text_activity: useFreeText ? freeText.trim() : null,
        record_date: today,
        start_time: startTime,
        end_time: endTime,
        photos: photoUrls,
      });
      setDone(true);
    } catch {
      setError('Error al registrar la rutina. Intente de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSpecialty('');
    setSubSpecialty('');
    setChecked([]);
    setFreeText('');
    setStartTime('08:00');
    setEndTime('09:00');
    setPhotos([]);
    setDone(false);
    setError('');
  };

  if (done) {
    return (
      <div className="glass-card fade-in" style={{ padding: 40, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✓</div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Rutina registrada</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Tu reporte ya está visible en el calendario del equipo.
        </p>
        <button className="btn w-full" style={{ background: 'var(--accent-blue)', color: 'white' }} onClick={resetForm}>
          Registrar otra rutina
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Registrar Rutina</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Reporte diario de actividades preventivas</p>

      <div className="flex gap-2" style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 4,
              background: step >= n ? 'var(--accent-blue)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div className="glass-card" style={{ padding: 24 }}>
        {step === 1 && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Paso 1: Especialidad</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {specialties.map(s => (
                <button
                  key={s}
                  type="button"
                  className="btn"
                  style={{
                    textAlign: 'left',
                    background: specialty === s ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: specialty === s ? 'white' : 'inherit',
                    border: '1px solid var(--border)',
                  }}
                  onClick={() => { setSpecialty(s); setSubSpecialty(''); setChecked([]); }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="btn w-full" style={{ marginTop: 20, background: 'var(--accent-blue)', color: 'white' }} disabled={!specialty} onClick={() => setStep(2)}>
              Siguiente
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Paso 2: Sub-especialidad</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{specialty}</p>
            {subSpecialties.length === 0 ? (
              <>
                <p style={{ marginBottom: 12 }}>Sin sub-especialidades en catálogo. Ingrese una:</p>
                <input className="input w-full" value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} placeholder="Ej. General" />
              </>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {subSpecialties.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="btn"
                    style={{
                      textAlign: 'left',
                      background: subSpecialty === s ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: subSpecialty === s ? 'white' : 'inherit',
                      border: '1px solid var(--border)',
                    }}
                    onClick={() => { setSubSpecialty(s); setChecked([]); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setStep(1)}>Atrás</button>
              <button className="btn flex-1" style={{ background: 'var(--accent-blue)', color: 'white' }} disabled={!subSpecialty.trim()} onClick={() => setStep(3)}>
                Siguiente
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Paso 3: Actividades</h2>
            {useFreeText ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  No hay checklist predefinido. Describa la labor realizada:
                </p>
                <textarea className="input w-full" rows={5} value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="Detalle de la rutina..." />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {catalogItems.map(item => (
                  <label key={item.id} className="flex items-start gap-3" style={{ cursor: 'pointer', padding: 8, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <input
                      type="checkbox"
                      checked={checked.includes(item.activity)}
                      onChange={() => toggleCheck(item.activity)}
                      style={{ marginTop: 4 }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{item.activity}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setStep(2)}>Atrás</button>
              <button
                className="btn flex-1"
                style={{ background: 'var(--accent-blue)', color: 'white' }}
                disabled={useFreeText ? !freeText.trim() : checked.length === 0}
                onClick={() => setStep(4)}
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Paso 4: Horario y fotos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hora inicio *</label>
                <input type="time" className="input w-full" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hora fin *</label>
                <input type="time" className="input w-full" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fotos (opcional)</label>
              <input type="file" accept="image/*" multiple className="input w-full" onChange={handleFiles} style={{ marginTop: 8 }} />
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap" style={{ marginTop: 8 }}>
                  {photos.map((p, i) => (
                    <img key={i} src={p.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1" onClick={() => setStep(3)} disabled={uploading}>Atrás</button>
              <button className="btn flex-1" style={{ background: 'var(--accent-blue)', color: 'white' }} disabled={uploading} onClick={handleSubmit}>
                {uploading ? 'Guardando...' : 'Registrar rutina'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
