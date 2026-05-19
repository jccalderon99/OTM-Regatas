import React, { useState, useEffect } from 'react';
import { useOTM } from '../../context/OTMContext';
import { UserRole, Profile } from '../../types';
import { useAttendance } from '../../context/AttendanceContext';

export default function UserManagement() {
  const { 
    users, addUser, updateUser,
    areas, addArea, updateArea, deleteArea,
    specialties, addSpecialty, updateSpecialty, deleteSpecialty,
    locations, addLocation, updateLocation, deleteLocation,
    deleteUser
  } = useOTM();

  const { geoConfig, updateGeoConfig } = useAttendance();

  const [activeTab, setActiveTab] = useState<'areas' | 'especialidades' | 'ubicaciones' | 'supervisores' | 'tecnicos' | 'usuarios' | 'localizacion' | 'atributos'>('areas');

  // Geo states for Localizacion tab
  const [geoLat, setGeoLat] = useState(geoConfig.lat);
  const [geoLng, setGeoLng] = useState(geoConfig.lng);
  const [geoDist, setGeoDist] = useState(geoConfig.maxDistance);

  // Sync geo state if config updates from elsewhere
  useEffect(() => {
    setGeoLat(geoConfig.lat);
    setGeoLng(geoConfig.lng);
    setGeoDist(geoConfig.maxDistance);
  }, [geoConfig]);

  // Role adjustments states for Atributos tab
  const [assignedAttributes, setAssignedAttributes] = useState<{
    email: string;
    assignedRole: UserRole;
    originalRole: UserRole;
  }[]>(() => {
    const saved = localStorage.getItem('assigned_attributes');
    return saved ? JSON.parse(saved) : [];
  });

  const [attrEmail, setAttrEmail] = useState('');
  const [attrRole, setAttrRole] = useState<UserRole>('admin');
  const [attrError, setAttrError] = useState('');
  const [attrSuccess, setAttrSuccess] = useState('');

  // Sync attributes with users state to maintain consistency
  useEffect(() => {
    // If a user in the assignedAttributes list has been updated elsewhere or needs re-sync
    assignedAttributes.forEach(attr => {
      const u = users.find(x => x.email.toLowerCase() === attr.email.toLowerCase());
      if (u && u.role !== attr.assignedRole) {
        // Enforce the attribute role
        updateUser({ ...u, role: attr.assignedRole });
      }
    });
  }, [users, assignedAttributes]);

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
      <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button className={`tab ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => setActiveTab('areas')}>Áreas</button>
        <button className={`tab ${activeTab === 'especialidades' ? 'active' : ''}`} onClick={() => setActiveTab('especialidades')}>Especialidades</button>
        <button className={`tab ${activeTab === 'ubicaciones' ? 'active' : ''}`} onClick={() => setActiveTab('ubicaciones')}>Ubicaciones</button>
        <button className={`tab ${activeTab === 'supervisores' ? 'active' : ''}`} onClick={() => setActiveTab('supervisores')}>Supervisores</button>
        <button className={`tab ${activeTab === 'tecnicos' ? 'active' : ''}`} onClick={() => setActiveTab('tecnicos')}>Técnicos</button>
        <button className={`tab ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>Usuarios</button>
        <button className={`tab ${activeTab === 'localizacion' ? 'active' : ''}`} onClick={() => setActiveTab('localizacion')}>🛰️ Localización</button>
        <button className={`tab ${activeTab === 'atributos' ? 'active' : ''}`} onClick={() => setActiveTab('atributos')}>🔑 Atributos</button>
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
            <div className="scrollable-list-container">
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
            <div className="scrollable-list-container">
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
            <div className="scrollable-list-container">
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
            <div className="scrollable-list-container">
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
            <div className="scrollable-list-container">
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
            <div className="scrollable-list-container">
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
          </div>
        )}

        {/* TAB 7: LOCALIZACION (FUTURISTA Y GEODÉSICA) */}
        {activeTab === 'localizacion' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🛰️ Configuración Satelital de Cobertura
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Establece las coordenadas maestras de geolocalización y el perímetro de seguridad para el marcado de asistencia.
              </p>
            </div>

            <div className="grid-2-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
              
              {/* Controls Column */}
              <div className="flex-col gap-4">
                <div style={{ background: 'rgba(14, 165, 233, 0.03)', border: '1px solid rgba(14, 165, 233, 0.1)', padding: 20, borderRadius: 16 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: '#1e293b', letterSpacing: '0.02em' }}>
                    🎛️ PANEL DE CONTROL GEODÉSICO
                  </h4>
                  
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Latitud Maestro (GPS)</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{geoLat.toFixed(8)}°</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.00000000000001" 
                      className="form-input" 
                      value={geoLat} 
                      onChange={e => setGeoLat(parseFloat(e.target.value) || 0)} 
                      style={{ fontFamily: 'monospace' }}
                    />
                    <input 
                      type="range" 
                      min="-12.200000" 
                      max="-12.100000" 
                      step="0.000100" 
                      value={geoLat} 
                      onChange={e => setGeoLat(parseFloat(e.target.value))} 
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Longitud Maestro (GPS)</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{geoLng.toFixed(8)}°</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.00000000000001" 
                      className="form-input" 
                      value={geoLng} 
                      onChange={e => setGeoLng(parseFloat(e.target.value) || 0)} 
                      style={{ fontFamily: 'monospace' }}
                    />
                    <input 
                      type="range" 
                      min="-77.100000" 
                      max="-77.000000" 
                      step="0.000100" 
                      value={geoLng} 
                      onChange={e => setGeoLng(parseFloat(e.target.value))} 
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Radio Máximo de Marcado</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{geoDist} Metros</span>
                    </label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="50" 
                        max="1000" 
                        step="50" 
                        value={geoDist} 
                        onChange={e => setGeoDist(parseInt(e.target.value) || 400)} 
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number" 
                        className="form-input" 
                        value={geoDist} 
                        onChange={e => setGeoDist(parseInt(e.target.value) || 0)} 
                        style={{ width: 80, textAlign: 'center', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary w-full" 
                    onClick={() => {
                      updateGeoConfig(geoLat, geoLng, geoDist);
                      alert('🛰️ Parámetros geodésicos actualizados con éxito. Sincronizado en tiempo real.');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)',
                      fontWeight: 700,
                      letterSpacing: '0.05em'
                    }}
                  >
                    🚀 APLICAR CAMBIOS Y RE-SINCRONIZAR GPS
                  </button>
                </div>

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h5 style={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: 6 }}>ℹ️ Acerca del Perímetro Geodésico</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                    El sistema utiliza la fórmula de <strong>Haversine</strong> para calcular la distancia en arco sobre la superficie terrestre entre las coordenadas reales del celular del técnico y este punto maestro del Club. Si excede el rango máximo definido, el sistema denegará la marcación de asistencia.
                  </p>
                </div>
              </div>

              {/* Futuristic Radar Visualizer Column */}
              <div style={{ 
                background: 'linear-gradient(135deg, #0b0f19, #111827)', 
                borderRadius: 24, 
                padding: 24, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 400
              }}>
                <style>{`
                  @keyframes rotateRadar {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  @keyframes pulseRadar {
                    0% { transform: scale(0.6); opacity: 0.1; }
                    50% { opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0; }
                  }
                  .radar-grid {
                    width: 240px; height: 240px; border-radius: 50%;
                    border: 1px solid rgba(14, 165, 233, 0.3);
                    position: relative;
                    display: flex; align-items: center; justify-content: center;
                    background: radial-gradient(circle, rgba(14,165,233,0.05) 0%, rgba(14,165,233,0) 70%);
                  }
                  .radar-ring-1 {
                    width: 180px; height: 180px; border-radius: 50%;
                    border: 1px dashed rgba(14, 165, 233, 0.2); position: absolute;
                  }
                  .radar-ring-2 {
                    width: 120px; height: 120px; border-radius: 50%;
                    border: 1px solid rgba(14, 165, 233, 0.15); position: absolute;
                  }
                  .radar-ring-pulse {
                    width: 240px; height: 240px; border-radius: 50%;
                    border: 2px solid var(--accent-blue); position: absolute;
                    animation: pulseRadar 3s infinite linear;
                    pointer-events: none;
                  }
                  .radar-crosshair-h {
                    width: 100%; height: 1px; background: rgba(14, 165, 233, 0.15); position: absolute;
                  }
                  .radar-crosshair-v {
                    height: 100%; width: 1px; background: rgba(14, 165, 233, 0.15); position: absolute;
                  }
                  .radar-sweeper {
                    width: 120px; height: 120px;
                    background: linear-gradient(45deg, rgba(14, 165, 233, 0.4) 0%, rgba(14, 165, 233, 0) 60%);
                    position: absolute; top: 0; left: 0;
                    transform-origin: bottom right;
                    border-radius: 100% 0 0 0;
                    animation: rotateRadar 6s infinite linear;
                  }
                  .radar-target {
                    font-size: 24px; z-index: 10; position: absolute;
                    filter: drop-shadow(0 0 8px var(--accent-blue));
                    animation: bounce 2s infinite;
                  }
                  .radar-stat-box {
                    margin-top: 24px; width: 100%;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(14, 165, 233, 0.1);
                    border-radius: 12px; padding: 12px;
                    font-family: monospace; font-size: 0.75rem; color: #38bdf8;
                    box-sizing: border-box;
                  }
                `}</style>

                {/* Radar visualization */}
                <div className="radar-grid">
                  <div className="radar-sweeper"></div>
                  <div className="radar-ring-1"></div>
                  <div className="radar-ring-2"></div>
                  <div className="radar-ring-pulse"></div>
                  <div className="radar-crosshair-h"></div>
                  <div className="radar-crosshair-v"></div>
                  <span className="radar-target">🎯</span>
                </div>

                <div className="radar-stat-box">
                  <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    GPS STATUS: OPERATIONAL
                  </div>
                  <div>LOC: CRL - BARRANCO/CHORRILLOS</div>
                  <div>LAT: {geoLat.toFixed(8)}°</div>
                  <div>LNG: {geoLng.toFixed(8)}°</div>
                  <div style={{ color: 'var(--accent-gold)' }}>SAFE RADIUS: {geoDist} METERS</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ATRIBUTOS (GESTIÓN DE ROLES DINÁMICA POR EMAIL) */}
        {activeTab === 'atributos' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔑 Panel de Atribución Dinámica de Privilegios
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Modifica y sobreescribe los atributos y paneles de los colaboradores ingresando su correo electrónico. Si los quitas de la lista, volverán automáticamente a su rol anterior.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
              
              {/* Form Section */}
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: '#334155' }}>
                  Añadir Atribución Especial
                </h4>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setAttrError('');
                  setAttrSuccess('');

                  const foundUser = users.find(u => u.email.toLowerCase() === attrEmail.trim().toLowerCase());
                  if (!foundUser) {
                    setAttrError('⚠️ El correo ingresado no pertenece a ningún usuario registrado. Regístralo primero en la pestaña de Usuarios.');
                    return;
                  }

                  // Check if already in attributes list
                  const alreadyAssigned = assignedAttributes.find(x => x.email.toLowerCase() === attrEmail.trim().toLowerCase());
                  if (alreadyAssigned) {
                    setAttrError('⚠️ Este usuario ya tiene una atribución especial asignada. Edítala o restablécela en la tabla de la derecha.');
                    return;
                  }

                  const newAttr = {
                    email: foundUser.email,
                    assignedRole: attrRole,
                    originalRole: foundUser.role
                  };

                  // 1. Update the user role in the global OTM context
                  updateUser({
                    ...foundUser,
                    role: attrRole
                  });

                  // 2. Save in attributesList state and persist
                  const updatedList = [...assignedAttributes, newAttr];
                  setAssignedAttributes(updatedList);
                  localStorage.setItem('assigned_attributes', JSON.stringify(updatedList));

                  setAttrSuccess(`✓ Atribución concedida con éxito. Correo ${attrEmail} asignado como ${attrRole === 'admin' ? 'Administrador' : attrRole === 'supervisor' ? 'Supervisor' : attrRole === 'technician' ? 'Técnico' : attrRole === 'jefatura' ? 'Jefatura' : 'Solicitante'}.`);
                  setAttrEmail('');
                }} className="flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label">Correo Institucional *</label>
                    <input 
                      type="email" 
                      required 
                      className="form-input" 
                      placeholder="Ej: colaborador@regatas.pe"
                      value={attrEmail} 
                      onChange={e => setAttrEmail(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Atributos / Rol a Conceder *</label>
                    <select 
                      className="form-select" 
                      value={attrRole} 
                      onChange={e => setAttrRole(e.target.value as UserRole)}
                    >
                      <option value="admin">Administrador Global 🛡️</option>
                      <option value="supervisor">Supervisor de Mantenimiento 👷</option>
                      <option value="technician">Personal Técnico 🛠️</option>
                      <option value="jefatura">Jefatura de Área 📈</option>
                      <option value="requester">Solicitante Común 👥</option>
                    </select>
                  </div>

                  {attrError && <div style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>{attrError}</div>}
                  {attrSuccess && <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{attrSuccess}</div>}

                  <button className="btn btn-primary w-full" type="submit" style={{ background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>
                    Conceder Atributos
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <h4 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                  Listado de Roles Sobreescritos ({assignedAttributes.length})
                </h4>

                <div className="scrollable-list-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Usuario (Correo)</th>
                        <th>Atributo Especial</th>
                        <th>Rol Original</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedAttributes.map((attr, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{attr.email}</td>
                          <td>
                            <span className={`role-badge role-${attr.assignedRole}`}>
                              {attr.assignedRole === 'admin' ? 'Administrador' : attr.assignedRole === 'supervisor' ? 'Supervisor' : attr.assignedRole === 'technician' ? 'Técnico' : attr.assignedRole === 'jefatura' ? 'Jefatura' : 'Solicitante'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {attr.originalRole === 'admin' ? 'Administrador' : attr.originalRole === 'supervisor' ? 'Supervisor' : attr.originalRole === 'technician' ? 'Técnico' : attr.originalRole === 'jefatura' ? 'Jefatura' : 'Solicitante'}
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              style={{ color: 'var(--accent-red)' }}
                              onClick={() => {
                                // Find user
                                const foundUser = users.find(u => u.email.toLowerCase() === attr.email.toLowerCase());
                                if (foundUser) {
                                  // Restore original role
                                  updateUser({
                                    ...foundUser,
                                    role: attr.originalRole
                                  });
                                }

                                // Remove from attributesList
                                const updatedList = assignedAttributes.filter(x => x.email.toLowerCase() !== attr.email.toLowerCase());
                                setAssignedAttributes(updatedList);
                                localStorage.setItem('assigned_attributes', JSON.stringify(updatedList));

                                setAttrSuccess(`Restablecido rol de ${attr.email} a su estado original (${attr.originalRole}).`);
                              }}
                            >
                              Restablecer Rol
                            </button>
                          </td>
                        </tr>
                      ))}
                      {assignedAttributes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                            No hay atribuciones especiales registradas en este momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
                    {formType === 'technician' ? (
                      <div className="form-group">
                        <label className="form-label">Especialidad *</label>
                        <select className="form-select" required value={position} onChange={e => setPosition(e.target.value)}>
                          <option value="">Seleccionar especialidad...</option>
                          {specialties.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label">Cargo / Puesto *</label>
                        <input className="form-input" required value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej: Especialista" />
                      </div>
                    )}
                    
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
