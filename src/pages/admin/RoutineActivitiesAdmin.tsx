import React, { useState, useMemo } from 'react';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { useOTM } from '../../context/OTMContext';
import { ROUTINE_SPECIALTIES } from '../../lib/routineActivities';
import { RoutineQuestion, RoutineActivity } from '../../types/routine';

const PAGE_SIZE = 12;

export default function RoutineActivitiesAdmin() {
  const { activities, records, addRoutineActivity, updateRoutineActivity, deleteRoutineActivity } = useRoutineActivity();
  const { users } = useOTM();

  // Tabs: 'catalog' (catálogo) or 'stats' (estadísticas)
  const [activeTab, setActiveTab] = useState<'catalog' | 'stats'>('catalog');

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

  // Technicians list for statistics
  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'technician');
  }, [users]);

  // Statistics calculation
  const statsByTech = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; inProgress: number; lastActive: string }> = {};
    
    // Initialize technicians
    technicians.forEach(t => {
      stats[t.id] = { total: 0, completed: 0, inProgress: 0, lastActive: 'Sin registro' };
    });

    // Populate from records
    records.forEach(r => {
      const tId = r.technician_id;
      if (!stats[tId]) {
        stats[tId] = { total: 0, completed: 0, inProgress: 0, lastActive: 'Sin registro' };
      }
      stats[tId].total += 1;
      if (r.status === 'completed') {
        stats[tId].completed += 1;
      } else {
        stats[tId].inProgress += 1;
      }
      if (r.created_at) {
        const dStr = new Date(r.created_at).toLocaleDateString('es-PE', { dateStyle: 'short' });
        stats[tId].lastActive = dStr;
      }
    });

    return stats;
  }, [records, technicians]);

  // Total metrics
  const totalRoutinesCompleted = useMemo(() => {
    return records.filter(r => r.status === 'completed').length;
  }, [records]);

  const totalRoutinesInProgress = useMemo(() => {
    return records.filter(r => r.status === 'in_progress').length;
  }, [records]);

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
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* HEADER BANNER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Gestión de Actividades Rutinarias</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
            Constructor maestro de checklists preventivos diarios y panel de cumplimiento técnico.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'catalog' && (
            <button className="btn" style={{ background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)', color: 'white', border: 'none', fontWeight: 700 }} onClick={openNew}>
              + Nueva Actividad Checklist
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2" style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('catalog')}
          style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            background: activeTab === 'catalog' ? 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)' : 'transparent',
            color: activeTab === 'catalog' ? 'white' : 'var(--text-secondary)',
            border: 'none'
          }}
        >
          📁 Catálogo Checklist Maestro
        </button>
        <button
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('stats')}
          style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            background: activeTab === 'stats' ? 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)' : 'transparent',
            color: activeTab === 'stats' ? 'white' : 'var(--text-secondary)',
            border: 'none'
          }}
        >
          📊 Panel de Cumplimiento Técnico
        </button>
      </div>

      {/* -------------------- STATS TAB -------------------- */}
      {activeTab === 'stats' && (
        <div className="fade-in">
          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 20, textAlign: 'center', borderLeft: '4px solid #22c55e' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rutinas Completadas</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#22c55e', margin: '8px 0' }}>{totalRoutinesCompleted}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hoy e históricos registrados</div>
            </div>
            <div className="glass-card" style={{ padding: 20, textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rutinas Activas En Curso</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444', margin: '8px 0' }}>{totalRoutinesInProgress}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Técnicos operando en campo hoy</div>
            </div>
            <div className="glass-card" style={{ padding: 20, textAlign: 'center', borderLeft: '4px solid var(--accent-purple)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cumplimiento Promedio</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-purple)', margin: '8px 0' }}>
                {technicians.length > 0 
                  ? `${Math.round((totalRoutinesCompleted / Math.max(1, records.length)) * 100)}%` 
                  : '0%'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasa de efectividad de checklists</div>
            </div>
          </div>

          {/* TECHNICIANS STATS LIST */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>Rendimiento Rutinario de Técnicos</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: 12 }}>Técnico</th>
                    <th style={{ padding: 12 }}>Especialidad / Cargo</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>Total Rutinas</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>Completadas</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>En Curso</th>
                    <th style={{ padding: 12 }}>Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map(t => {
                    const tStats = statsByTech[t.id] || { total: 0, completed: 0, inProgress: 0, lastActive: 'Sin registro' };
                    return (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={t.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div style={{ fontWeight: 700 }}>{t.full_name}</div>
                        </td>
                        <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{t.position || 'Técnico General'}</td>
                        <td style={{ padding: 12, textAlign: 'center', fontWeight: 700 }}>{tStats.total}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                            {tStats.completed}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {tStats.inProgress > 0 ? (
                            <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                              {tStats.inProgress}
                            </span>
                          ) : '0'}
                        </td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{tStats.lastActive}</td>
                      </tr>
                    );
                  })}
                  {technicians.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Sin técnicos registrados en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- CATALOG TAB -------------------- */}
      {activeTab === 'catalog' && (
        <div className="fade-in">
          {/* SEARCH & FILTERS */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: 14 }}>Especialidad</th>
                  <th style={{ padding: 14 }}>Sub-especialidad / Ubicación</th>
                  <th style={{ padding: 14 }}>Descripción</th>
                  <th style={{ padding: 14, textAlign: 'center' }}>Preguntas</th>
                  <th style={{ padding: 14, width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(row => (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{row.specialty}</td>
                    <td style={{ padding: 14, fontWeight: 600 }}>{row.sub_specialty}</td>
                    <td style={{ padding: 14, color: 'var(--text-secondary)' }}>{row.activity}</td>
                    <td style={{ padding: 14, textAlign: 'center' }}>
                      <span style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)', padding: '3px 8px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800 }}>
                        📋 {row.questions?.length || 0} items
                      </span>
                    </td>
                    <td style={{ padding: 14 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', marginRight: 6, fontWeight: 700 }} onClick={() => openEdit(row.id)}>✍️ Editar</button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', color: '#ef4444', fontWeight: 700 }} onClick={() => handleDelete(row.id)}>✕ Eliminar</button>
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

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Página {page + 1} de {totalPages}</span>
              <button className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      {/* -------------------- DYNAMIC MODAL CREATOR (WITH QUESTION BUILDER) -------------------- */}
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
            style={{ width: '100%', maxWidth: 580, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(255,255,255,0.95)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 18, color: 'var(--text-primary)' }}>
              {editingId ? '✍️ Editar Actividad Checklist' : '✨ Crear Actividad Checklist'}
            </h2>
            
            {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}
            
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Especialidad *</label>
                  <input className="form-input w-full" value={specialty} onChange={e => setSpecialty(e.target.value)} list="routine-specialties" style={{ background: 'white' }} />
                  <datalist id="routine-specialties">
                    {ROUTINE_SPECIALTIES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Sub-especialidad / Ubicación *</label>
                  <input className="form-input w-full" value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} placeholder="Ej: Calderas Piso 5" style={{ background: 'white' }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Descripción de la tarea preventora *</label>
                <textarea className="form-textarea w-full" rows={2} value={activityText} onChange={e => setActivityText(e.target.value)} placeholder="Ej: Inspección y purgado semanal de válvulas" style={{ background: 'white' }} />
              </div>

              {/* DYNAMIC QUESTION CONSTRUCTOR BOX */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📋 Cuestionario Dinámico (Google Forms)
                </h3>

                {/* Questions list */}
                {questions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6, marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
                    {questions.map((q, idx) => (
                      <div key={q.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{idx + 1}. {q.label}</strong> 
                          <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 600 }}>
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
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 8, background: 'white', marginBottom: 14 }}>
                    Sin preguntas. Añade al menos una abajo para construir tu formulario preventor.
                  </div>
                )}

                {/* Add new question inputs */}
                <div style={{ display: 'grid', gap: 8, background: 'white', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
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
