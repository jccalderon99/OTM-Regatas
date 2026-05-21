import React, { useState, useMemo } from 'react';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { ROUTINE_SPECIALTIES } from '../../lib/routineActivities';

const PAGE_SIZE = 15;

export default function RoutineActivitiesAdmin() {
  const { activities, addRoutineActivity, updateRoutineActivity, deleteRoutineActivity } = useRoutineActivity();
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [activityText, setActivityText] = useState('');
  const [error, setError] = useState('');

  const subOptions = useMemo(() => {
    const base = specialtyFilter
      ? activities.filter(a => a.specialty === specialtyFilter)
      : activities;
    return [...new Set(base.map(a => a.sub_specialty))].sort();
  }, [activities, specialtyFilter]);

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
    setSpecialty(ROUTINE_SPECIALTIES[0] || '');
    setSubSpecialty('');
    setActivityText('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const row = activities.find(a => a.id === id);
    if (!row) return;
    setEditingId(id);
    setSpecialty(row.specialty);
    setSubSpecialty(row.sub_specialty);
    setActivityText(row.activity);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!specialty.trim() || !subSpecialty.trim() || !activityText.trim()) {
      setError('Complete especialidad, sub-especialidad y actividad.');
      return;
    }
    try {
      if (editingId) {
        await updateRoutineActivity(editingId, {
          specialty: specialty.trim(),
          sub_specialty: subSpecialty.trim(),
          activity: activityText.trim(),
        });
      } else {
        await addRoutineActivity({
          specialty: specialty.trim(),
          sub_specialty: subSpecialty.trim(),
          activity: activityText.trim(),
        });
      }
      setModalOpen(false);
    } catch {
      setError('No se pudo guardar. Intente de nuevo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad del catálogo?')) return;
    try {
      await deleteRoutineActivity(id);
    } catch {
      alert('No se pudo eliminar.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Actividades Rutinarias</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Catálogo maestro de tareas preventivas diarias</p>
        </div>
        <button className="btn" style={{ background: 'var(--accent-blue)', color: 'white' }} onClick={openNew}>
          + Nueva actividad
        </button>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input
          className="input"
          placeholder="Buscar..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: '1 1 200px' }}
        />
        <select className="input" value={specialtyFilter} onChange={e => { setSpecialtyFilter(e.target.value); setSubFilter(''); setPage(0); }} style={{ flex: '1 1 160px' }}>
          <option value="">Todas las especialidades</option>
          {[...new Set([...ROUTINE_SPECIALTIES, ...activities.map(a => a.specialty)])].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="input" value={subFilter} onChange={e => { setSubFilter(e.target.value); setPage(0); }} style={{ flex: '1 1 160px' }}>
          <option value="">Todas las sub-especialidades</option>
          {subOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {filtered.length} resultado(s)
        </span>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Especialidad</th>
              <th style={{ padding: 12 }}>Sub-especialidad</th>
              <th style={{ padding: 12 }}>Actividad</th>
              <th style={{ padding: 12, width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(row => (
              <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{row.specialty}</td>
                <td style={{ padding: 12 }}>{row.sub_specialty}</td>
                <td style={{ padding: 12 }}>{row.activity}</td>
                <td style={{ padding: 12 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', marginRight: 4 }} onClick={() => openEdit(row.id)}>Editar</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDelete(row.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Sin actividades que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span style={{ fontSize: '0.85rem' }}>Página {page + 1} de {totalPages}</span>
          <button className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}

      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>
              {editingId ? 'Editar actividad' : 'Nueva actividad'}
            </h2>
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: '0.85rem' }}>{error}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Especialidad *</label>
                <input className="input w-full" value={specialty} onChange={e => setSpecialty(e.target.value)} list="routine-specialties" />
                <datalist id="routine-specialties">
                  {ROUTINE_SPECIALTIES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sub-especialidad *</label>
                <input className="input w-full" value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descripción de la tarea *</label>
                <textarea className="input w-full" rows={3} value={activityText} onChange={e => setActivityText(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn flex-1" style={{ background: 'var(--accent-blue)', color: 'white' }} onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
