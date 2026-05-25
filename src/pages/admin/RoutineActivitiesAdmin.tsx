// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { ROUTINE_SPECIALTIES } from '../../lib/routineActivities';
import { RoutineQuestion } from '../../types/routine';

const PAGE_SIZE = 12;

export default function RoutineActivitiesAdmin() {
  const { activities, addRoutineActivity, updateRoutineActivity, deleteRoutineActivity } = useRoutineActivity();

  // Filter/Search states
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [page, setPage] = useState(0);

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [activityText, setActivityText] = useState('');
  const [questions, setQuestions] = useState<RoutineQuestion[]>([]);
  const [error, setError] = useState('');

  // Question builder temporary states
  const [newQLabel, setNewQLabel] = useState('');
  const [newQType, setNewQType] = useState<RoutineQuestion['type']>('checkbox');
  const [newQOptions, setNewQOptions] = useState('');
  const [newQRequired, setNewQRequired] = useState(true);

  // Filtering sub-specialty options
  const subOptions = useMemo(() => {
    const base = specialtyFilter
      ? activities.filter(a => a.specialty === specialtyFilter)
      : activities;
    return [...new Set(base.map(a => a.sub_specialty))].sort();
  }, [activities, specialtyFilter]);

  // Main catalog table filter
  const filtered = useMemo(() => {
    return activities
      .filter(a => !specialtyFilter || a.specialty === specialtyFilter)
      .filter(a => !subFilter || a.sub_specialty === subFilter)
      .filter(a => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.specialty.toLowerCase().includes(q) ||
          a.sub_specialty.toLowerCase().includes(q) ||
          a.activity.toLowerCase().includes(q)
        );
      });
  }, [activities, search, specialtyFilter, subFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openNew = () => {
    setEditingId(null);
    setSpecialty(ROUTINE_SPECIALTIES[0] || 'Piscinas');
    setSubSpecialty('');
    setActivityText('');
    setQuestions([]);
    setError('');
    resetQBuilder();
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const row = activities.find(a => a.id === id);
    if (!row) return;
    setEditingId(id);
    setSpecialty(row.specialty);
    setSubSpecialty(row.sub_specialty);
    setActivityText(row.activity);
    setQuestions(row.questions || []);
    setError('');
    resetQBuilder();
    setModalOpen(true);
  };

  const resetQBuilder = () => {
    setNewQLabel('');
    setNewQType('checkbox');
    setNewQOptions('');
    setNewQRequired(true);
  };

  const addQuestion = () => {
    if (!newQLabel.trim()) return;
    const newQ: RoutineQuestion = {
      id: `q-${Date.now()}`,
      label: newQLabel.trim(),
      type: newQType,
      required: newQRequired,
    };
    if (newQType === 'button_group' && newQOptions.trim()) {
      newQ.options = newQOptions.split(',').map(o => o.trim()).filter(Boolean);
    }
    setQuestions(prev => [...prev, newQ]);
    resetQBuilder();
  };

  const removeQuestion = (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const handleSave = async () => {
    if (!specialty.trim() || !subSpecialty.trim() || !activityText.trim()) {
      setError('Complete especialidad, sub-especialidad y descripción.');
      return;
    }
    try {
      const payload = {
        specialty: specialty.trim(),
        sub_specialty: subSpecialty.trim(),
        activity: activityText.trim(),
        questions: questions,
      };

      if (editingId) {
        await updateRoutineActivity(editingId, payload);
      } else {
        await addRoutineActivity(payload);
      }
      setModalOpen(false);
    } catch {
      setError('No se pudo guardar. Intente de nuevo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad preventora del catálogo?')) return;
    try {
      await deleteRoutineActivity(id);
    } catch {
      alert('No se pudo eliminar.');
    }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Catálogo de Actividades Rutinarias (Checklists)</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.8rem' }}>
            Constructor maestro de checklists preventivos diarios por Especialidad.
          </p>
        </div>
        
        <div>
          <button className="btn" style={{ background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem' }} onClick={openNew}>
            + Nueva Actividad Checklist
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, border: '1px solid var(--border)' }}>
        <input
          className="form-input"
          placeholder="🔍 Buscar por especialidad, sub-área o actividad..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: '2 1 300px' }}
        />
        <select className="form-select" value={specialtyFilter} onChange={e => { setSpecialtyFilter(e.target.value); setSubFilter(''); setPage(0); }} style={{ flex: '1 1 160px' }}>
          <option value="">Todas las especialidades</option>
          {ROUTINE_SPECIALTIES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="form-select" value={subFilter} onChange={e => { setSubFilter(e.target.value); setPage(0); }} style={{ flex: '1 1 160px' }}>
          <option value="">Todas las sub-especialidades</option>
          {subOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} registro(s)
        </span>
      </div>

      {/* MAIN CHECKLIST CATALOG TABLE */}
      <div className="scrollable-list-container" style={{ border: 'none', boxShadow: 'none' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Especialidad</th>
                <th>Sub-especialidad / Ubicación</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'center' }}>Preguntas</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.specialty}</td>
                  <td style={{ fontWeight: 600 }}>{row.sub_specialty}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.activity}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)', padding: '3px 8px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800 }}>
                      📋 {row.questions?.length || 0} items
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" style={{ marginRight: 6 }} onClick={() => openEdit(row.id)}>Editar</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }} onClick={() => handleDelete(row.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Sin actividades preventivas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Página {page + 1} de {totalPages}</span>
          <button className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}

      {/* DYNAMIC MODAL CREATOR */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="glass-card slide-up"
            style={{ width: '100%', maxWidth: 580, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-primary)', margin: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 18, color: 'var(--text-primary)' }}>
              {editingId ? '✍️ Editar Actividad Checklist' : '✨ Crear Actividad Checklist'}
            </h3>
            
            {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}
            
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Especialidad *</label>
                  <input className="form-input w-full" value={specialty} onChange={e => setSpecialty(e.target.value)} list="routine-specialties" style={{ background: 'var(--bg-secondary)' }} />
                  <datalist id="routine-specialties">
                    {ROUTINE_SPECIALTIES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sub-especialidad / Ubicación *</label>
                  <input className="form-input w-full" value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} placeholder="Ej: Calderas Piso 5" style={{ background: 'var(--bg-secondary)' }} />
                </div>
              </div>
              
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Descripción de la tarea preventora *</label>
                <textarea className="form-textarea w-full" rows={2} value={activityText} onChange={e => setActivityText(e.target.value)} placeholder="Ej: Inspección y purgado semanal de válvulas" style={{ background: 'var(--bg-secondary)' }} />
              </div>

              {/* DYNAMIC QUESTION CONSTRUCTOR BOX */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📋 Cuestionario Dinámico (Ficha Técnica)
                </h4>

                {/* Questions list */}
                {questions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6, marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
                    {questions.map((q, idx) => (
                      <div key={q.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{idx + 1}. {q.label}</strong> 
                          <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {q.type}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ color: '#ef4444', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 800 }}
                          onClick={() => removeQuestion(q.id)}
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', marginBottom: 14 }}>
                    Sin preguntas. Añade al menos una abajo para construir tu formulario preventor.
                  </div>
                )}

                {/* Add new question inputs */}
                <div style={{ display: 'grid', gap: 8, background: 'var(--bg-secondary)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-purple)' }}>➕ Añadir pregunta</div>
                  
                  <input
                    className="form-input w-full"
                    placeholder="Etiqueta/Pregunta (Ej: Temperatura en °C o ¿Aspirado completado?)"
                    value={newQLabel}
                    onChange={e => setNewQLabel(e.target.value)}
                    style={{ fontSize: '0.8rem', height: 36 }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <select
                      className="form-select"
                      value={newQType}
                      onChange={e => setNewQType(e.target.value as any)}
                      style={{ fontSize: '0.8rem', height: 36 }}
                    >
                      <option value="checkbox">☑ Casilla (Conforme)</option>
                      <option value="number">🔢 Campo numérico</option>
                      <option value="text">✍️ Campo de texto</option>
                      <option value="button_group">🔘 Botones únicos (chips)</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', justifySelf: 'end' }}>
                      <input
                        type="checkbox"
                        checked={newQRequired}
                        onChange={e => setNewQRequired(e.target.checked)}
                      />
                      Obligatorio
                    </label>
                  </div>

                  {newQType === 'button_group' && (
                    <input
                      className="form-input w-full"
                      placeholder="Opciones separadas por comas (Ej: Zona 1, Zona 2, Zona 3)"
                      value={newQOptions}
                      onChange={e => setNewQOptions(e.target.value)}
                      style={{ fontSize: '0.8rem', height: 36 }}
                    />
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--accent-purple)', border: '1px dashed var(--accent-purple)', fontSize: '0.8rem', padding: '6px 12px', height: 34, fontWeight: 700, borderRadius: 8 }}
                    onClick={addQuestion}
                  >
                    Añadir al Formulario
                  </button>
                </div>
              </div>
            </div>

            {/* SAVE ACTION BAR */}
            <div className="flex gap-2" style={{ marginTop: 24 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn flex-1" style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)', color: 'white', border: 'none', fontWeight: 800 }} onClick={handleSave}>
                💾 Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
