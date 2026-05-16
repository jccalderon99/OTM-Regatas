import React, { useState } from 'react';
import { useOTM } from '../../context/OTMContext';
import { UserRole, Profile } from '../../types';

export default function UserManagement() {
  const { 
    users, addUser, updateUser,
    areas, addArea, updateArea, deleteArea,
    specialties, addSpecialty, updateSpecialty, deleteSpecialty,
    locations, addLocation, updateLocation, deleteLocation,
    deleteUser
  } = useOTM();

  const [activeTab, setActiveTab] = useState<'areas' | 'especialidades' | 'ubicaciones' | 'supervisores' | 'tecnicos' | 'usuarios'>('areas');

  // Unified Form States
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'supervisor' | 'technician' | 'user' | 'area' | 'specialty' | 'location'>('user');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Field States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('requester');
  const [area, setArea] = useState('');
  const [jefaturaName, setJefaturaName] = useState('');
  const [jefaturaPosition, setJefaturaPosition] = useState('');
  const [jefaturaEmail, setJefaturaEmail] = useState('');
  const [singleValue, setSingleValue] = useState(''); // Used for Area name or Specialty name

  // Filter States
  const [techSpecialtyFilter, setTechSpecialtyFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userAreaFilter, setUserAreaFilter] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Clear selection on tab change
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const supervisors = users.filter(u => u.role === 'supervisor');
  
  const technicians = users
    .filter(u => u.role === 'technician')
    .filter(u => !techSpecialtyFilter || (u.position && u.position.toLowerCase().includes(techSpecialtyFilter.toLowerCase())))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
    
  const generalUsers = users
    .filter(u => u.role === 'requester' || u.role === 'jefatura' || u.role === 'admin')
    .filter(u => !userRoleFilter || u.role === userRoleFilter)
    .filter(u => !userAreaFilter || u.area_sector === userAreaFilter);

  const resetForm = () => {
    setFullName(''); setEmail(''); setPosition(''); setRole('requester'); setArea('');
    setJefaturaName(''); setJefaturaPosition(''); setJefaturaEmail('');
    setSingleValue('');
    setIsEditing(false);
    setEditId(null);
    setSelectedIds(new Set());
  };

  const openForm = (type: typeof formType, itemToEdit?: any) => {
    resetForm();
    setFormType(type);
    
    if (itemToEdit) {
      setIsEditing(true);
      if (type === 'area' || type === 'specialty' || type === 'location') {
        setSingleValue(itemToEdit);
        setEditId(itemToEdit); // Using original string as ID to find and replace
      } else {
        const u = itemToEdit as Profile;
        setEditId(u.id);
        setFullName(u.full_name);
        setEmail(u.email);
        setPosition(u.position || '');
        setRole(u.role);
        setArea(u.area_sector || '');
        setJefaturaName(u.jefatura_name || '');
        setJefaturaPosition(u.jefatura_position || '');
        setJefaturaEmail(u.jefatura_email || '');
      }
    }
    setShowForm(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formType === 'area') {
      if (isEditing && editId) updateArea(editId, singleValue);
      else addArea(singleValue);
    } 
    else if (formType === 'specialty') {
      if (isEditing && editId) updateSpecialty(editId, singleValue);
      else addSpecialty(singleValue);
    } 
    else if (formType === 'location') {
      if (isEditing && editId) updateLocation(editId, singleValue);
      else addLocation(singleValue);
    } 
    else {
      const targetRole = formType === 'supervisor' ? 'supervisor' : formType === 'technician' ? 'technician' : role;
      const targetArea = (formType === 'supervisor' || formType === 'technician') ? '22. MANTENIMIENTO' : (area || null);
      
      if (isEditing && editId) {
        const existing = users.find(u => u.id === editId);
        if (existing) {
          updateUser({
            ...existing,
            full_name: fullName,
            email, position, role: targetRole,
            area_sector: targetArea,
            jefatura_name: jefaturaName || undefined,
            jefatura_position: jefaturaPosition || undefined,
            jefatura_email: jefaturaEmail || undefined,
            updated_at: new Date().toISOString()
          });
        }
      } else {
        addUser({
          id: `user-${Date.now()}`,
          full_name: fullName, email, position, role: targetRole,
          area_sector: targetArea,
          jefatura_name: jefaturaName || undefined,
          jefatura_position: jefaturaPosition || undefined,
          jefatura_email: jefaturaEmail || undefined,
          phone: null, avatar_url: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        });
      }
    }
    
    setShowForm(false);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = (ids: string[]) => {
    if (selectedIds.size === ids.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(ids));
  };

  const handleDelete = () => {
    selectedIds.forEach(id => {
      if (activeTab === 'areas') deleteArea(id);
      else if (activeTab === 'especialidades') deleteSpecialty(id);
      else if (activeTab === 'ubicaciones') deleteLocation(id);
      else deleteUser(id);
    });
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header responsive-header">
        <div>
          <h1 className="page-title">Panel de Administración</h1>
          <p className="page-subtitle">Configuración Maestra: Áreas, Especialidades y Gestión de Personal</p>
        </div>
      </div>

      <style>{`
        .responsive-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .responsive-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        @media (max-width: 768px) {
          .responsive-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .responsive-actions { width: 100%; justify-content: space-between; }
          .responsive-actions select { flex: 1; min-width: 120px; }
          .responsive-actions button { flex: 1; }
        }
      `}</style>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => setActiveTab('areas')}>Áreas</button>
        <button className={`tab ${activeTab === 'especialidades' ? 'active' : ''}`} onClick={() => setActiveTab('especialidades')}>Especialidades</button>
        <button className={`tab ${activeTab === 'ubicaciones' ? 'active' : ''}`} onClick={() => setActiveTab('ubicaciones')}>Ubicaciones</button>
        <button className={`tab ${activeTab === 'supervisores' ? 'active' : ''}`} onClick={() => setActiveTab('supervisores')}>Supervisores</button>
        <button className={`tab ${activeTab === 'tecnicos' ? 'active' : ''}`} onClick={() => setActiveTab('tecnicos')}>Técnicos</button>
        <button className={`tab ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>Usuarios</button>
      </div>

      <div className="glass-card slide-up" style={{ minHeight: 400 }}>
        
        {/* TAB 1: AREAS */}
        {activeTab === 'areas' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Directorio de Áreas del Club ({areas.length})</h3>
              <div className="responsive-actions">
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('area')}>+ Nueva Área</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === areas.length} onChange={() => toggleAll(areas)} /></th>
                    <th>N° / Código</th><th>Nombre del Área</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" checked={selectedIds.has(a)} onChange={() => toggleSelection(a)} /></td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.split('.')[0] || String(i+1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 600 }}>{a.replace(/^\d+\.\s*/, '')}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('area', a)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ESPECIALIDADES */}
        {activeTab === 'especialidades' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Especialidades de Mantenimiento ({specialties.length})</h3>
              <div className="responsive-actions">
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('specialty')}>+ Nueva Especialidad</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === specialties.length} onChange={() => toggleAll(specialties)} /></th>
                    <th>Código</th><th>Especialidad</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {specialties.map((f, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" checked={selectedIds.has(f)} onChange={() => toggleSelection(f)} /></td>
                      <td style={{ color: 'var(--text-muted)' }}>{f.split('.')[0] || String(i+1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 600 }}>{f.split('. ')[1] || f}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('specialty', f)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: UBICACIONES */}
        {activeTab === 'ubicaciones' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Directorio de Ubicaciones del Club ({locations.length})</h3>
              <div className="responsive-actions">
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('location')}>+ Nueva Ubicación</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === locations.length} onChange={() => toggleAll(locations)} /></th>
                    <th>N°</th><th>Nombre de la Ubicación</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((l, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" checked={selectedIds.has(l)} onChange={() => toggleSelection(l)} /></td>
                      <td style={{ color: 'var(--text-muted)' }}>{l.split('.')[0] || String(i+1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 600 }}>{l.replace(/^\d+\.\s*/, '')}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('location', l)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SUPERVISORES */}
        {activeTab === 'supervisores' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registro de Supervisores ({supervisors.length})</h3>
              <div className="responsive-actions">
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('supervisor')}>+ Nuevo Supervisor</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === supervisors.length} onChange={() => toggleAll(supervisors.map(s => s.id))} /></th>
                    <th>Nombre</th><th>Cargo</th><th>Correo</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.map(u => (
                    <tr key={u.id}>
                      <td><input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelection(u.id)} /></td>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td>{u.position || 'Supervisor de Área'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('supervisor', u)}>Editar</button></td>
                    </tr>
                  ))}
                  {supervisors.length === 0 && <tr><td colSpan={4} className="text-center" style={{ padding: 40 }}>No hay supervisores registrados</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TECNICOS */}
        {activeTab === 'tecnicos' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registro de Personal Técnico ({technicians.length})</h3>
              <div className="responsive-actions">
                <select className="form-select" style={{ width: 220, fontSize: '0.85rem' }} value={techSpecialtyFilter} onChange={e => setTechSpecialtyFilter(e.target.value)}>
                  <option value="">Todas las especialidades</option>
                  {specialties.map(s => <option key={s} value={s.split('. ')[1] || s}>{s.split('. ')[1] || s}</option>)}
                </select>
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('technician')}>+ Nuevo Técnico</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === technicians.length} onChange={() => toggleAll(technicians.map(t => t.id))} /></th>
                    <th>Nombre</th><th>Especialidad / Cargo</th><th>Correo Institucional</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map(u => (
                    <tr key={u.id}>
                      <td><input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelection(u.id)} /></td>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td>{u.position || 'Técnico Especialista'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('technician', u)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div>
            <div className="flex justify-between items-center mb-4" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Personal Usuario del Sistema ({generalUsers.length})</h3>
              <div className="responsive-actions">
                <select className="form-select" style={{ width: 180, fontSize: '0.85rem' }} value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                  <option value="">Todos los roles</option>
                  <option value="requester">Solicitante</option>
                  <option value="jefatura">Jefatura</option>
                  <option value="admin">Administrador</option>
                </select>
                <select className="form-select" style={{ width: 200, fontSize: '0.85rem' }} value={userAreaFilter} onChange={e => setUserAreaFilter(e.target.value)}>
                  <option value="">Todas las áreas</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {selectedIds.size > 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Eliminar ({selectedIds.size})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => openForm('user')}>+ Nuevo Usuario</button>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === generalUsers.length} onChange={() => toggleAll(generalUsers.map(u => u.id))} /></th>
                    <th>Usuario</th><th>Rol</th><th>Área</th><th>Jefatura Asignada</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {generalUsers.map(u => (
                    <tr key={u.id}>
                      <td><input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelection(u.id)} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.position || 'Colaborador'} | {u.email}</div>
                      </td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>{u.role === 'admin' ? 'Administrador' : u.role === 'jefatura' ? 'Jefatura' : 'Solicitante'}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{u.area_sector || 'Global'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {u.jefatura_name ? (
                          <><div>{u.jefatura_name}</div><div style={{ fontSize: '0.7rem' }}>{u.jefatura_position}</div></>
                        ) : '—'}
                      </td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => openForm('user', u)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Dynamic Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {isEditing ? 'Editar Registro' : 
                formType === 'area' ? 'Registrar Nueva Área' :
                formType === 'specialty' ? 'Registrar Nueva Especialidad' :
                formType === 'location' ? 'Registrar Nueva Ubicación' :
                formType === 'supervisor' ? 'Registrar Supervisor' : 
                formType === 'technician' ? 'Registrar Técnico' : 'Registrar Personal Usuario'}
            </h3>
            
            <form onSubmit={handleAddSubmit} className="flex-col gap-4">
              
              {/* Single String Field (Areas, Specialties & Locations) */}
              {(formType === 'area' || formType === 'specialty' || formType === 'location') && (
                <div className="form-group">
                  <label className="form-label">Nombre Completo (incluir número si aplica) *</label>
                  <input className="form-input" required value={singleValue} onChange={e => setSingleValue(e.target.value)} placeholder={formType === 'area' ? 'Ej: 33. NUEVA ÁREA' : formType === 'location' ? 'Ej: 57. NUEVA UBICACIÓN' : 'Ej: 08. Gasfitería Especial'} />
                </div>
              )}

              {/* User Fields */}
              {(formType === 'supervisor' || formType === 'technician' || formType === 'user') && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Nombre Completo *</label>
                      <input className="form-input" required value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo Electrónico *</label>
                      <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Cargo / Puesto *</label>
                      <input className="form-input" required value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej: Especialista" />
                    </div>
                    
                    {formType === 'user' && (
                      <div className="form-group">
                        <label className="form-label">Nivel de Acceso *</label>
                        <select className="form-select" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                          <option value="requester">Solicitante</option>
                          <option value="jefatura">Jefatura</option>
                          <option value="admin">Administrador Global</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {formType === 'user' && (
                    <div className="form-group">
                      <label className="form-label">Área a la que pertenece</label>
                      <select className="form-select" value={area} onChange={e => setArea(e.target.value)}>
                        <option value="">Seleccionar área...</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  )}

                  {formType === 'user' && (
                    <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>Datos de Jefatura Directa (Opcional)</h4>
                      <div className="grid-2" style={{ marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Nombre de Jefatura</label>
                          <input className="form-input" value={jefaturaName} onChange={e => setJefaturaName(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Cargo de Jefatura</label>
                          <input className="form-input" value={jefaturaPosition} onChange={e => setJefaturaPosition(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Correo de Jefatura</label>
                        <input className="form-input" type="email" value={jefaturaEmail} onChange={e => setJefaturaEmail(e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 justify-end" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">✓ {isEditing ? 'Guardar Cambios' : 'Guardar Registro'}</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Confirmar Eliminación</h3>
            <p style={{ margin: '16px 0', color: 'var(--text-secondary)' }}>
              ¿Estás seguro de que deseas eliminar los {selectedIds.size} registros seleccionados? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--accent-red)' }} onClick={handleDelete}>✓ Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
