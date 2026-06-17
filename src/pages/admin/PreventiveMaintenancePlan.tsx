import { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useAuth } from '../../context/AuthContext';
import { PreventivePlanItem } from '../../types';

export default function PreventiveMaintenancePlan() {
  const { user } = useAuth();
  const { 
    preventivePlan, 
    updatePreventivePlanItem, 
    addPreventivePlanItem, 
    deletePreventivePlanItem,
    users,
    opexBudget,
    capexBudget
  } = useOTM();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrio, setSelectedPrio] = useState('');
  const [selectedFreq, setSelectedFreq] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUbi, setSelectedUbi] = useState('');

  // Selected Item for Drawer/Modal Edit
  const [editingItem, setEditingItem] = useState<PreventivePlanItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Item State (for adding)
  const [newItem, setNewItem] = useState<Partial<PreventivePlanItem>>({
    actividad: '',
    prio: 'MEDIO',
    ubicacion: '',
    frecuencia: 'MENSUAL',
    presupuesto_proyectado: 0,
    responsable: '',
    estado_original: 'PLANIFICADO',
    status: 'Pendiente',
    active_weeks: []
  });

  // Filter technicians
  const technicians = useMemo(() => users.filter(u => u.role === 'technician'), [users]);

  // Unique values for filter dropdowns
  const frequencies = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
  
  const locations = useMemo(() => {
    const set = new Set<string>();
    preventivePlan.forEach(i => i.ubicacion && set.add(i.ubicacion));
    return Array.from(set).sort();
  }, [preventivePlan]);

  // --- FILTERED PLAN ---
  const filteredPlan = useMemo(() => {
    return preventivePlan.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.actividad.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.proveedor && item.proveedor.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchPrio = selectedPrio === '' || item.prio === selectedPrio;
      const matchFreq = selectedFreq === '' || item.frecuencia === selectedFreq;
      const matchStatus = selectedStatus === '' || item.status === selectedStatus;
      const matchUbi = selectedUbi === '' || item.ubicacion === selectedUbi;
      return matchSearch && matchPrio && matchFreq && matchStatus && matchUbi;
    });
  }, [preventivePlan, searchTerm, selectedPrio, selectedFreq, selectedStatus, selectedUbi]);

  // --- KPI CALCULATIONS ---
  const totalCount = preventivePlan.length;
  const completedCount = useMemo(() => preventivePlan.filter(i => i.status === 'Realizado').length, [preventivePlan]);
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
  
  const totalBudgetProjected = useMemo(() => {
    return preventivePlan.reduce((sum, item) => sum + (item.presupuesto_proyectado || 0), 0);
  }, [preventivePlan]);

  const totalBudgetExecuted = useMemo(() => {
    return preventivePlan.reduce((sum, item) => sum + (item.monto_sin_igv || 0), 0);
  }, [preventivePlan]);

  const formatSoles = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val);
  };

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updatePreventivePlanItem(editingItem.id, editingItem);
    setEditingItem(null);
  };

  // Handle Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addPreventivePlanItem(newItem);
    setShowAddForm(false);
    setNewItem({
      actividad: '',
      prio: 'MEDIO',
      ubicacion: '',
      frecuencia: 'MENSUAL',
      presupuesto_proyectado: 0,
      responsable: '',
      estado_original: 'PLANIFICADO',
      status: 'Pendiente',
      active_weeks: []
    });
  };

  return (
    <div style={{ paddingBottom: 40 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">🛡️ Plan de Mantenimiento Preventivo</h1>
          <p className="page-subtitle">Cronograma interactivo anual de actividades contratistas y personal de planta</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button 
            className="btn btn-primary" 
            style={{ height: 40 }}
            onClick={() => setShowAddForm(true)}
          >
            ➕ Programar Actividad
          </button>
        )}
      </div>

      {/* KPI GRID */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="glass-card hover-glow">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mantenimientos Planificados</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6 }}>{totalCount}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Total de actividades anuales</div>
            </div>
            <span style={{ fontSize: '1.6rem' }}>📅</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Porcentaje de Avance</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: 'var(--accent-green)' }}>{completionRate}%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{completedCount} de {totalCount} realizados</div>
            </div>
            <span style={{ fontSize: '1.6rem' }}>📈</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Presupuesto Proyectado</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: 'var(--accent-blue)' }}>{formatSoles(totalBudgetProjected)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Suma planificada inicial</div>
            </div>
            <span style={{ fontSize: '1.6rem' }}>💵</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monto Adjudicado (Real)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: '#a855f7' }}>{formatSoles(totalBudgetExecuted)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>De contratos formalizados</div>
            </div>
            <span style={{ fontSize: '1.6rem' }}>🤝</span>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Buscar Actividad / Proveedor</label>
          <input 
            className="form-input" 
            placeholder="Ej: Caldero APIN, filtración..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div style={{ minWidth: 120 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Prioridad</label>
          <select className="form-select" value={selectedPrio} onChange={e => setSelectedPrio(e.target.value)}>
            <option value="">Todas</option>
            <option value="ALTO">Alto</option>
            <option value="MEDIO">Medio</option>
          </select>
        </div>

        <div style={{ minWidth: 130 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Frecuencia</label>
          <select className="form-select" value={selectedFreq} onChange={e => setSelectedFreq(e.target.value)}>
            <option value="">Todas</option>
            {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={{ minWidth: 140 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Ubicación</label>
          <select className="form-select" value={selectedUbi} onChange={e => setSelectedUbi(e.target.value)}>
            <option value="">Todas</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={{ minWidth: 130 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Estado</label>
          <select className="form-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Realizado">Realizado</option>
          </select>
        </div>

        {(searchTerm || selectedPrio || selectedFreq || selectedStatus || selectedUbi) && (
          <button 
            className="btn btn-secondary" 
            style={{ alignSelf: 'flex-end', height: 38 }}
            onClick={() => { setSearchTerm(''); setSelectedPrio(''); setSelectedFreq(''); setSelectedStatus(''); setSelectedUbi(''); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* PLAN DETAILS TABLE */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Lista de Actividades Preventivas</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mostrando {filteredPlan.length} actividades</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 16px', width: 40 }}>Nº</th>
                <th style={{ padding: '12px 16px' }}>Prioridad</th>
                <th style={{ padding: '12px 16px' }}>Actividad</th>
                <th style={{ padding: '12px 16px' }}>Ubicación</th>
                <th style={{ padding: '12px 16px' }}>Frecuencia</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Presupuesto Proy.</th>
                <th style={{ padding: '12px 16px' }}>Responsable / Asignado</th>
                <th style={{ padding: '12px 16px' }}>Proveedor / Contratista</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlan.length > 0 ? filteredPlan.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: item.num === 'A' || item.num === 'B' || item.num === 'C' || item.num === 'D' || item.num === 'E' ? 'rgba(14, 165, 233, 0.03)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>{item.num}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.prio && (
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800,
                        background: item.prio === 'ALTO' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: item.prio === 'ALTO' ? 'var(--accent-rose)' : 'var(--accent-yellow)',
                      }}>
                        {item.prio}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: item.num === 'A' || item.num === 'B' || item.num === 'C' || item.num === 'D' ? 800 : 500 }}>
                    {item.actividad}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.ubicacion || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.frecuencia || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{item.presupuesto_proyectado > 0 ? formatSoles(item.presupuesto_proyectado) : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.assigned_staff_id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        👤 {users.find(u => u.id === item.assigned_staff_id)?.full_name || 'Desconocido'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{item.responsable || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.assigned_contractor ? (
                      <span style={{ fontWeight: 600 }}>🚚 {item.assigned_contractor}</span>
                    ) : item.proveedor ? (
                      <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' }}>{item.proveedor}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700,
                      background: item.status === 'Realizado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: item.status === 'Realizado' ? 'var(--accent-green)' : 'var(--text-muted)'
                    }}>
                      {item.status === 'Realizado' ? '✓ Realizado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => setEditingItem({ ...item })}
                    >
                      Editar / Detalle
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron actividades planificadas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LATERAL DRAWER EDIT FORM */}
      {editingItem && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
          background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)', zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>⚙️ Detalles del Preventivo</h3>
            <button className="btn btn-secondary btn-sm" style={{ minWidth: 32, padding: 0 }} onClick={() => setEditingItem(null)}>×</button>
          </div>

          <form onSubmit={handleSaveEdit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Actividad</label>
              <input 
                className="form-input" 
                value={editingItem.actividad} 
                onChange={e => setEditingItem({ ...editingItem, actividad: e.target.value })} 
                required 
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select 
                  className="form-select" 
                  value={editingItem.prio} 
                  onChange={e => setEditingItem({ ...editingItem, prio: e.target.value as any })}
                >
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MEDIO</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Frecuencia</label>
                <select 
                  className="form-select" 
                  value={editingItem.frecuencia} 
                  onChange={e => setEditingItem({ ...editingItem, frecuencia: e.target.value })}
                >
                  {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ubicación</label>
              <input 
                className="form-input" 
                value={editingItem.ubicacion} 
                onChange={e => setEditingItem({ ...editingItem, ubicacion: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ejecución y Responsabilidad</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="assigned_type" 
                    checked={!editingItem.assigned_contractor} 
                    onChange={() => setEditingItem({ ...editingItem, assigned_contractor: undefined })} 
                  />
                  Personal Propio
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="assigned_type" 
                    checked={!!editingItem.assigned_contractor} 
                    onChange={() => setEditingItem({ ...editingItem, assigned_contractor: editingItem.proveedor || 'Contratista Externo' })} 
                  />
                  Contratista Externo
                </label>
              </div>
            </div>

            {editingItem.assigned_contractor !== undefined ? (
              <div className="form-group">
                <label className="form-label">Nombre del Contratista / Proveedor</label>
                <input 
                  className="form-input" 
                  value={editingItem.assigned_contractor} 
                  onChange={e => setEditingItem({ ...editingItem, assigned_contractor: e.target.value, proveedor: e.target.value })} 
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Asignar Técnico de Planta</label>
                <select 
                  className="form-select" 
                  value={editingItem.assigned_staff_id || ''} 
                  onChange={e => setEditingItem({ ...editingItem, assigned_staff_id: e.target.value || null })}
                >
                  <option value="">Sin Asignar</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Presupuesto Proyectado</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editingItem.presupuesto_proyectado} 
                  onChange={e => setEditingItem({ ...editingItem, presupuesto_proyectado: Number(e.target.value) || 0 })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Costo Real (Monto sin IGV)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editingItem.monto_sin_igv} 
                  onChange={e => setEditingItem({ ...editingItem, monto_sin_igv: Number(e.target.value) || 0 })} 
                />
              </div>
            </div>

            {/* BUDGET LINKING */}
            <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🔗 Vincular a Partida Presupuestal</label>
              
              <div style={{ display: 'flex', gap: 10, margin: '6px 0 10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                  <input 
                    type="radio" 
                    name="link_type" 
                    checked={editingItem.budgetItemLinkType === 'OPEX'} 
                    onChange={() => setEditingItem({ ...editingItem, budgetItemLinkType: 'OPEX', budgetItemLinkId: '' })} 
                  />
                  OPEX (Gastos)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                  <input 
                    type="radio" 
                    name="link_type" 
                    checked={editingItem.budgetItemLinkType === 'CAPEX'} 
                    onChange={() => setEditingItem({ ...editingItem, budgetItemLinkType: 'CAPEX', budgetItemLinkId: '' })} 
                  />
                  CAPEX (Inversión)
                </label>
              </div>

              <select 
                className="form-select"
                style={{ fontSize: '0.7rem' }}
                value={editingItem.budgetItemLinkId || ''}
                onChange={e => setEditingItem({ ...editingItem, budgetItemLinkId: e.target.value })}
              >
                <option value="">Ninguna Partida vinculada</option>
                {editingItem.budgetItemLinkType === 'OPEX' ? (
                  opexBudget.map(o => (
                    <option key={o.id} value={o.id}>{o.ctaContable} - {o.concepto} ({formatSoles(Math.abs(o.importeEEFF || 0))})</option>
                  ))
                ) : (
                  capexBudget.map(c => (
                    <option key={c.id} value={c.id}>{c.ctaContable} - {c.concepto} ({formatSoles(c.importe)})</option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  style={{ width: 18, height: 18 }}
                  checked={editingItem.status === 'Realizado'} 
                  onChange={e => setEditingItem({ ...editingItem, status: e.target.checked ? 'Realizado' : 'Pendiente' })} 
                />
                <span style={{ fontWeight: 700 }}>Marcar como Mantenimiento Realizado</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 20 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => {
                  if (confirm('¿Está seguro de eliminar esta actividad preventora?')) {
                    deletePreventivePlanItem(editingItem.id);
                    setEditingItem(null);
                  }
                }}
              >
                🗑️ Eliminar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card slide-up" style={{ width: 460, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>➕ Programar Actividad Preventiva</h3>
              <button className="btn btn-secondary btn-sm" style={{ minWidth: 32, padding: 0 }} onClick={() => setShowAddForm(false)}>×</button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Nombre de Actividad / Equipo *</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: Mantenimiento bomba N° 2..." 
                  value={newItem.actividad} 
                  onChange={e => setNewItem({ ...newItem, actividad: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Prioridad</label>
                  <select 
                    className="form-select" 
                    value={newItem.prio} 
                    onChange={e => setNewItem({ ...newItem, prio: e.target.value as any })}
                  >
                    <option value="MEDIO">MEDIO</option>
                    <option value="ALTO">ALTO</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <select 
                    className="form-select" 
                    value={newItem.frecuencia} 
                    onChange={e => setNewItem({ ...newItem, frecuencia: e.target.value })}
                  >
                    {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: Piscina Olímpica, Calderas..."
                  value={newItem.ubicacion} 
                  onChange={e => setNewItem({ ...newItem, ubicacion: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Presupuesto Proyectado (S/.)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0.00"
                  value={newItem.presupuesto_proyectado || ''} 
                  onChange={e => setNewItem({ ...newItem, presupuesto_proyectado: Number(e.target.value) || 0 })} 
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Programar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
