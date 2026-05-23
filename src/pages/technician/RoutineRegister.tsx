import React, { useState, useMemo, useEffect } from 'react';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { useAuth } from '../../context/AuthContext';
import { getSubSpecialties, getActivitiesForSub, ROUTINE_SPECIALTIES } from '../../lib/routineActivities';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../lib/cloudinary';

// Map profile position cargo to the routine specialty
function mapPositionToSpecialty(position: string | undefined | null): string {
  if (!position) return '';
  const pos = position.toLowerCase();
  if (pos.includes('caldero')) return 'Calderos';
  if (pos.includes('elec')) return 'Electricidad';
  if (pos.includes('gas') || pos.includes('fit')) return 'Gasfitería';
  if (pos.includes('jar')) return 'Jardinería';
  if (pos.includes('pisc')) return 'Piscinas';
  return '';
}

// Icon helper for specialties
function getSpecialtyIcon(specialty: string): string {
  switch (specialty) {
    case 'Calderos': return '🔥';
    case 'Electricidad': return '⚡';
    case 'Gasfitería': return '💧';
    case 'Jardinería': return '🌱';
    case 'Piscinas': return '🏊‍♂️';
    default: return '🛠️';
  }
}

export default function RoutineRegister() {
  const { user } = useAuth();
  const { activities, records, startRoutineActivity, finishRoutineActivity } = useRoutineActivity();

  // Determine specialty or let user choose if not matched (for testing/admin override)
  const detectedSpecialty = useMemo(() => mapPositionToSpecialty(user?.position), [user?.position]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(detectedSpecialty || ROUTINE_SPECIALTIES[0] || '');

  // Keep selectedSpecialty synchronized if user profile changes
  useEffect(() => {
    if (detectedSpecialty) {
      setSelectedSpecialty(detectedSpecialty);
    }
  }, [detectedSpecialty]);

  // Current active (in_progress) records for this technician
  const activeRecords = useMemo(() => {
    return records.filter(r => r.technician_id === (user?.id || 'current-user') && r.status === 'in_progress');
  }, [records, user?.id]);

  // Current completed records of today for this technician (for history view)
  const completedTodayRecords = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return records.filter(r => r.technician_id === (user?.id || 'current-user') && r.status === 'completed' && r.record_date === today);
  }, [records, user?.id]);

  // Subspecialties for the selected specialty
  const subSpecialties = useMemo(() => {
    return selectedSpecialty ? getSubSpecialties(selectedSpecialty, activities) : [];
  }, [selectedSpecialty, activities]);

  // UI States
  const [activeFormRecordId, setActiveFormRecordId] = useState<string | null>(null);
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<{ name: string; url: string; file?: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentFormRecord = useMemo(() => {
    return records.find(r => r.id === activeFormRecordId);
  }, [records, activeFormRecordId]);

  // Load questions for the currently selected record's activity
  const currentActivity = useMemo(() => {
    if (!currentFormRecord) return null;
    return activities.find(
      a => a.specialty === currentFormRecord.specialty && a.sub_specialty === currentFormRecord.sub_specialty
    );
  }, [currentFormRecord, activities]);

  // Initialize form answers when form record changes
  useEffect(() => {
    if (currentActivity) {
      const initialAnswers: Record<string, any> = {};
      currentActivity.questions?.forEach(q => {
        if (q.type === 'checkbox') initialAnswers[q.label] = false;
        else if (q.type === 'number') {
          // Smart defaults for numbers to enable zero-typing
          if (q.label.toLowerCase().includes('ph')) initialAnswers[q.label] = 7.4;
          else if (q.label.toLowerCase().includes('cloro')) initialAnswers[q.label] = 1.5;
          else if (q.label.toLowerCase().includes('temp')) initialAnswers[q.label] = 24;
          else initialAnswers[q.label] = 0;
        } else if (q.type === 'button_group') {
          initialAnswers[q.label] = '';
        } else {
          initialAnswers[q.label] = '';
        }
      });
      setFormAnswers(initialAnswers);
      setPhotos([]);
      setError('');
    }
  }, [currentActivity]);

  // Start a new routine
  const handleStart = async (sub: string) => {
    setError('');
    setSuccessMsg('');
    try {
      const newRecord = await startRoutineActivity(selectedSpecialty, sub, user?.id || 'current-user');
      setActiveFormRecordId(newRecord.id);
    } catch (err) {
      setError('Error al iniciar la actividad preventora.');
    }
  };

  // Check-all OK button handler for ultra-fast ticking
  const handleMarkAllOK = () => {
    if (!currentActivity) return;
    const newAnswers = { ...formAnswers };
    currentActivity.questions?.forEach(q => {
      if (q.type === 'checkbox') {
        newAnswers[q.label] = true;
      }
    });
    setFormAnswers(newAnswers);
  };

  // Adjust number inputs with +/- buttons (Zero Typing)
  const adjustNumber = (label: string, delta: number) => {
    setFormAnswers(prev => {
      const currentVal = Number(prev[label]) || 0;
      // Use 0.1 precision for pH and chlorine, 1 for temperature and others
      const isDecimal = label.toLowerCase().includes('ph') || label.toLowerCase().includes('cloro');
      const step = isDecimal ? 0.1 : 1;
      const newVal = parseFloat((currentVal + delta * step).toFixed(2));
      return { ...prev, [label]: Math.max(0, newVal) };
    });
  };

  // Handle image files
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      setPhotos(p => [...p, { name: file.name, url: URL.createObjectURL(file), file }]);
    });
    e.target.value = '';
  };

  // Remove selected photo before submit
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Finish routine registration and upload photos
  const handleFinish = async () => {
    setError('');
    if (!activeFormRecordId || !currentActivity) return;

    // Validate required questions
    let validationError = '';
    currentActivity.questions?.forEach(q => {
      const answer = formAnswers[q.label];
      if (q.required) {
        if (q.type === 'checkbox' && answer !== true) {
          // Allow unchecked if it's fine, but let's check validation rules
          // For routine activities, typically checking checkboxes indicates they are done
        } else if (q.type === 'button_group' && !answer) {
          validationError = `El campo "${q.label}" es obligatorio.`;
        } else if (q.type === 'number' && (answer === undefined || answer === '')) {
          validationError = `El campo "${q.label}" es obligatorio.`;
        } else if (q.type === 'text' && !String(answer).trim()) {
          validationError = `El campo "${q.label}" es obligatorio.`;
        }
      }
    });

    if (validationError) {
      setError(validationError);
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
          // If in local/demo mode, use a lovely placeholder
          photoUrls.push(p.url);
        }
      }

      await finishRoutineActivity(activeFormRecordId, formAnswers, photoUrls);
      setSuccessMsg(`🎉 ¡Actividad de ${currentActivity.sub_specialty} completada con éxito!`);
      setActiveFormRecordId(null);
      setPhotos([]);
    } catch (err) {
      setError('Ocurrió un error al intentar registrar los resultados. Intente nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 60 }}>
      {/* HEADER BANNER */}
      <div className="glass-card fade-in" style={{ padding: '24px 20px', borderRadius: 16, marginBottom: 24, background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.12) 100%)', border: '1px solid rgba(255,255,255,0.4)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>{getSpecialtyIcon(selectedSpecialty)}</div>
        <h1 className="page-title" style={{ fontSize: '1.65rem', marginBottom: 8, fontWeight: 900 }}>Actividades Rutinarias</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          {detectedSpecialty ? (
            <>Especialidad detectada por tu cargo: <strong style={{ color: 'var(--accent-purple)' }}>{selectedSpecialty}</strong></>
          ) : (
            'Reporta tus checklists preventivos diarios de forma ágil'
          )}
        </p>

        {/* Override dropdown if not detected or for super admin testing */}
        {!detectedSpecialty && (
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Probar como:</span>
            <select
              style={{ background: 'transparent', border: 'none', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none' }}
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setActiveFormRecordId(null);
              }}
            >
              {ROUTINE_SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="fade-in" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="fade-in" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)' }}>
          {successMsg}
        </div>
      )}

      {/* FORM FILLING INTERACTIVE PANEL */}
      {activeFormRecordId && currentFormRecord && currentActivity && (
        <div className="glass-card fade-in" style={{ padding: 24, borderRadius: 16, border: '2px solid var(--accent-purple)', boxShadow: '0 8px 30px rgba(168,85,247,0.1)', marginBottom: 24, background: 'rgba(255,255,255,0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(168,85,247,0.15)', color: 'var(--accent-purple)', padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 4 }}>
                ⚡ ACTIVIDAD EN CURSO
              </span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {currentFormRecord.sub_specialty}
              </h2>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setActiveFormRecordId(null)}
            >
              Ocultar y dejar en pausa
            </button>
          </div>

          <div style={{ padding: '8px 12px', background: 'rgba(168,85,247,0.04)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            🕒 Iniciado a las <strong>{currentFormRecord.start_time}</strong>. Llena los detalles a continuación.
          </div>

          {/* CHECKLIST & ZERO TYPING QUESTIONS */}
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            {/* Mark all button if checkboxes exist */}
            {currentActivity.questions?.some(q => q.type === 'checkbox') && (
              <button
                type="button"
                className="btn btn-secondary w-full"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px dashed #22c55e', padding: 10, fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem' }}
                onClick={handleMarkAllOK}
              >
                ✨ Marcar todo conforme
              </button>
            )}

            {currentActivity.questions?.map(q => (
              <div
                key={q.id}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: q.type === 'checkbox' ? 'row' : 'column',
                  alignItems: q.type === 'checkbox' ? 'center' : 'stretch',
                  justifyContent: q.type === 'checkbox' ? 'space-between' : 'flex-start',
                  gap: 12
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {q.label} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                </div>

                {/* CHECKBOX INPUT */}
                {q.type === 'checkbox' && (
                  <button
                    type="button"
                    onClick={() => setFormAnswers(prev => ({ ...prev, [q.label]: !prev[q.label] }))}
                    style={{
                      background: formAnswers[q.label] ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' : 'rgba(0,0,0,0.05)',
                      border: 'none',
                      color: formAnswers[q.label] ? 'white' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '8px 16px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: formAnswers[q.label] ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {formAnswers[q.label] ? '✓ Sí' : ' Pendiente'}
                  </button>
                )}

                {/* NUMBER INPUT WITH +/- BUTTONS (Zero Typing) */}
                {q.type === 'number' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: 40, height: 40, borderRadius: 10, padding: 0, fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => adjustNumber(q.label, -1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step={q.label.toLowerCase().includes('ph') || q.label.toLowerCase().includes('cloro') ? '0.1' : '1'}
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', flex: 1, height: 40, color: 'var(--accent-purple)', background: 'white' }}
                      value={formAnswers[q.label] ?? ''}
                      onChange={(e) => setFormAnswers(prev => ({ ...prev, [q.label]: parseFloat(e.target.value) || 0 }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: 40, height: 40, borderRadius: 10, padding: 0, fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => adjustNumber(q.label, 1)}
                    >
                      +
                    </button>
                  </div>
                )}

                {/* BUTTON GROUP FOR MULTIPLE CHOICES (Single Select) */}
                {q.type === 'button_group' && (
                  <div className="flex gap-2 flex-wrap" style={{ marginTop: 8 }}>
                    {q.options?.map(opt => {
                      const isSelected = formAnswers[q.label] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className="btn"
                          style={{
                            flex: '1 1 auto',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '10px 14px',
                            background: isSelected ? 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)' : 'white',
                            color: isSelected ? 'white' : 'var(--text-secondary)',
                            border: isSelected ? '1px solid transparent' : '1px solid var(--border)',
                            boxShadow: isSelected ? '0 4px 12px rgba(168,85,247,0.2)' : 'none',
                          }}
                          onClick={() => setFormAnswers(prev => ({ ...prev, [q.label]: opt }))}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TEXT / VOICE FIELD */}
                {q.type === 'text' && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      className="form-textarea w-full"
                      rows={2}
                      placeholder="Escribe o pulsa para transcribir..."
                      value={formAnswers[q.label] ?? ''}
                      onChange={(e) => setFormAnswers(prev => ({ ...prev, [q.label]: e.target.value }))}
                      style={{ background: 'white', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* PHOTO EVIDENCING */}
          <div style={{ marginBottom: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
              📸 Fotos de Evidencia
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  border: '2px dashed var(--accent-blue)',
                  background: 'rgba(14,165,233,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'var(--accent-blue)',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.4rem', marginBottom: 2 }}>📷</span>
                Foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFiles}
                />
              </label>
            </div>
          </div>

          {/* SUBMIT OR CANCEL ACTION BAR */}
          <div className="flex gap-3">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => {
                if (confirm('¿Deseas posponer esta actividad? Quedará activa en tu menú principal.')) {
                  setActiveFormRecordId(null);
                }
              }}
              disabled={uploading}
              style={{ padding: 12, borderRadius: 10 }}
            >
              Posponer
            </button>
            <button
              className="btn flex-1"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', padding: 12, borderRadius: 10, fontWeight: 800, boxShadow: '0 4px 15px rgba(34,197,94,0.3)', border: 'none' }}
              onClick={handleFinish}
              disabled={uploading}
            >
              {uploading ? 'Guardando...' : '🏁 Finalizar Actividad'}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE RUNNING PROCESSES LIST (CONCURRENT TIMERS) */}
      {activeRecords.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            Actividades en ejecución ({activeRecords.length})
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {activeRecords.map(r => (
              <div
                key={r.id}
                className="glass-card fade-in"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: '4px solid #3b82f6',
                  background: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveFormRecordId(r.id)}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.sub_specialty}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ▶ Iniciado a las <strong>{r.start_time}</strong>
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  ✍️ Completar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABLE ACTIVITIES IN MASTER CATALOG */}
      <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 10 }}>
        Actividades de {selectedSpecialty}
      </h2>

      <div style={{ display: 'grid', gap: 14 }}>
        {subSpecialties.map(sub => {
          // Check if this subspecialty is currently in progress
          const inProgressRec = activeRecords.find(r => r.sub_specialty === sub);

          return (
            <div
              key={sub}
              className="glass-card hover-lift fade-in"
              style={{
                padding: 18,
                borderRadius: 16,
                background: inProgressRec ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
                border: inProgressRec ? '1px dashed #3b82f6' : '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {sub}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  {inProgressRec ? '⚠️ Ya iniciada y en curso' : 'Lista para reporte de prevención'}
                </p>
              </div>

              {inProgressRec ? (
                <button
                  className="btn btn-secondary"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.8rem', fontWeight: 800, borderRadius: 10, padding: '10px 14px' }}
                  onClick={() => setActiveFormRecordId(inProgressRec.id)}
                >
                  ⚡ Retomar Formulario
                </button>
              ) : (
                <button
                  className="btn"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontSize: '0.8rem', fontWeight: 800, borderRadius: 10, padding: '10px 14px', border: 'none', boxShadow: '0 4px 10px rgba(59,130,246,0.2)' }}
                  onClick={() => handleStart(sub)}
                >
                  ▶ Iniciar Actividad
                </button>
              )}
            </div>
          );
        })}
        {subSpecialties.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            No hay actividades rutinarias registradas para la especialidad de {selectedSpecialty}.
          </div>
        )}
      </div>

      {/* TODAY'S HISTORIC SUBMITTED LOGS */}
      {completedTodayRecords.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: '0.05em', marginBottom: 10 }}>
            Reportadas hoy ({completedTodayRecords.length})
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {completedTodayRecords.map(r => (
              <div
                key={r.id}
                className="glass-card fade-in"
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid var(--border)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.sub_specialty}</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ⏱️ Completado de {r.start_time} a {r.end_time}
                  </span>
                </div>
                <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  ✓ Enviado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
