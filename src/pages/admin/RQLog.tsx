import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRQ } from '../../context/RQContext';
import { useOTM } from '../../context/OTMContext';
import { useAuth } from '../../context/AuthContext';
import { RQRecord, RQStatus, RQ_STATUS_LABELS, RQMaterial, RQObservation } from '../../types';

interface RQLogProps {
  onNavigate?: (view: string) => void;
}

// Inline editable input component with save confirmation
function EditableCell({
  value,
  onSave
}: {
  value: string | null;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVal(value || '');
  }, [value]);

  const handleBlur = () => {
    const trimmed = val.trim();
    if (trimmed !== (value || '')) {
      onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', justifyContent: 'center' }}>
      <input
        type="text"
        value={val}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="-"
        style={{
          width: '100px',
          background: isEditing ? 'rgba(30, 41, 59, 0.7)' : 'transparent',
          border: isEditing ? '1px solid var(--accent-blue)' : '1px solid transparent',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          textAlign: 'center',
          transition: 'all 0.2s',
          cursor: isEditing ? 'text' : 'pointer',
          outline: 'none',
          boxShadow: isEditing ? '0 0 0 2px rgba(14, 165, 233, 0.15)' : 'none'
        }}
      />
      {saved && (
        <span
          style={{
            position: 'absolute',
            right: -10,
            fontSize: '0.75rem',
            color: 'var(--accent-green)',
            fontWeight: 'bold',
            opacity: 1,
            transition: 'opacity 0.3s'
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}

// Function to render RQ status badges with styled borders and shadows
function getStatusBadgeStyle(status: RQStatus): React.CSSProperties {
  switch (status) {
    case 'in_approval':
      return {
        background: 'rgba(217, 119, 6, 0.12)',
        color: '#f59e0b',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      };
    case 'in_logistics':
      return {
        background: 'rgba(139, 92, 246, 0.12)',
        color: '#a78bfa',
        border: '1px solid rgba(167, 139, 250, 0.3)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      };
    case 'attended':
      return {
        background: 'rgba(16, 185, 129, 0.12)',
        color: '#34d399',
        border: '1px solid rgba(52, 211, 153, 0.3)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      };
    case 'rejected':
      return {
        background: 'rgba(244, 63, 94, 0.12)',
        color: '#fb7185',
        border: '1px solid rgba(251, 113, 133, 0.3)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      };
    default:
      return {};
  }
}

// Inline editable observation component
function EditableObservationItem({
  observation,
  onUpdate,
  onDelete
}: {
  observation: RQObservation;
  onUpdate: (id: string, text: string, date: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(observation.text);
  const [date, setDate] = useState(() => {
    if (!observation.date) return '';
    try {
      const d = new Date(observation.date);
      if (isNaN(d.getTime())) return '';
      const tzoffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    setText(observation.text);
    if (observation.date) {
      try {
        const d = new Date(observation.date);
        if (!isNaN(d.getTime())) {
          const tzoffset = d.getTimezoneOffset() * 60000;
          setDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [observation]);

  const handleTextBlur = () => {
    if (text.trim() !== observation.text) {
      onUpdate(observation.id, text.trim(), observation.date);
    }
  };

  const handleDateChange = (newDateStr: string) => {
    setDate(newDateStr);
    const isoDate = newDateStr ? new Date(newDateStr).toISOString() : new Date().toISOString();
    onUpdate(observation.id, text, isoDate);
  };

  return (
    <div style={{ 
      padding: '12px 14px', 
      background: 'rgba(255, 255, 255, 0.45)', 
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', 
      flexDirection: 'column', 
      gap: 8,
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          type="datetime-local" 
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{ 
            fontSize: '0.72rem', 
            padding: '4px 8px', 
            width: '145px', 
            background: '#ffffff', 
            border: '1px solid var(--border)', 
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            height: '26px',
            outline: 'none',
            fontFamily: 'inherit',
            fontWeight: 600
          }}
        />
        <button 
          type="button" 
          onClick={() => onDelete(observation.id)}
          style={{ 
            color: 'var(--accent-rose)', 
            background: 'transparent',
            border: 'none',
            fontSize: '0.7rem',
            cursor: 'pointer',
            padding: '2px 4px',
            fontWeight: 700,
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
        >
          ✕ Eliminar
        </button>
      </div>
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comentario de la observación..."
        style={{ 
          fontSize: '0.78rem', 
          minHeight: '44px', 
          padding: '6px 10px', 
          background: 'rgba(255, 255, 255, 0.7)', 
          border: '1px solid var(--border)', 
          borderRadius: '6px',
          color: 'var(--text-primary)',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.4,
          transition: 'all 0.2s'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-blue)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-blue-glow)';
          e.currentTarget.style.background = '#ffffff';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
          handleTextBlur();
        }}
      />
    </div>
  );
}

export default function RQLog({ onNavigate }: RQLogProps) {
  const { rqs, createRQRecord, updateRQRecord, updateRQStatus } = useRQ();
  const { users } = useOTM();
  const { user } = useAuth();

  // Filters State
  const [statusFilter, setStatusFilter] = useState<RQStatus | ''>('');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Selected/Managing RQ Panel
  const [selectedRQ, setSelectedRQ] = useState<RQRecord | null>(null);
  const [manageStatus, setManageStatus] = useState<RQStatus>('in_approval');
  const [manageRQNumber, setManageRQNumber] = useState<string>('');
  const [manageSAPNumber, setManageSAPNumber] = useState<string>('');

  // Observation editable timeline state
  const [newObsText, setNewObsText] = useState('');
  const [newObsDate, setNewObsDate] = useState(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  });

  // New RQ Form State
  const [showNewRQModal, setShowNewRQModal] = useState(false);
  const [newRQType, setNewRQType] = useState<'supply' | 'service'>('supply');
  const [newMagnitude, setNewMagnitude] = useState<'puntual' | 'integral'>('puntual');
  const [newDescription, setNewDescription] = useState('');
  const [newRQNumber, setNewRQNumber] = useState('');
  
  // Materials list for new supply RQ
  const [materialsList, setMaterialsList] = useState<RQMaterial[]>([]);
  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState('Unidades');
  const [matQty, setMatQty] = useState(1);

  // List of unique supervisors in RQs
  const supervisorsList = useMemo(() => {
    const uniq = new Set<string>();
    rqs.forEach(r => {
      if (r.supervisor_name) uniq.add(r.supervisor_name);
    });
    return Array.from(uniq).sort();
  }, [rqs]);

  // Filter & Sort RQs
  const filteredRQs = useMemo(() => {
    let result = [...rqs];

    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter);
    }
    if (supervisorFilter) {
      result = result.filter(r => r.supervisor_name === supervisorFilter);
    }
    if (fromDate) {
      result = result.filter(r => {
        const rqDate = r.created_at.slice(0, 10);
        return rqDate >= fromDate;
      });
    }
    if (toDate) {
      result = result.filter(r => {
        const rqDate = r.created_at.slice(0, 10);
        return rqDate <= toDate;
      });
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(r => 
        (r.rq_number && r.rq_number.toLowerCase().includes(q)) ||
        (r.sap_number && r.sap_number.toLowerCase().includes(q)) ||
        (r.otm_code && r.otm_code.toLowerCase().includes(q)) ||
        r.description.toLowerCase().includes(q) ||
        r.supervisor_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rqs, statusFilter, supervisorFilter, fromDate, toDate, searchText]);

  // Keep selectedRQ in sync with context data
  const currentSelectedRQ = useMemo(() => {
    if (!selectedRQ) return null;
    return rqs.find(r => r.id === selectedRQ.id) || null;
  }, [rqs, selectedRQ]);

  useEffect(() => {
    if (currentSelectedRQ) {
      setManageStatus(currentSelectedRQ.status);
      setManageRQNumber(currentSelectedRQ.rq_number || '');
      setManageSAPNumber(currentSelectedRQ.sap_number || '');
    }
  }, [currentSelectedRQ]);

  const handleUpdateObservation = (obsId: string, text: string, date: string) => {
    if (!currentSelectedRQ) return;
    const updatedObs = currentSelectedRQ.observations.map(o => 
      o.id === obsId ? { ...o, text, date } : o
    );
    updateRQRecord(currentSelectedRQ.id, { observations: updatedObs });
  };

  const handleDeleteObservation = (obsId: string) => {
    if (!currentSelectedRQ) return;
    const updatedObs = currentSelectedRQ.observations.filter(o => o.id !== obsId);
    updateRQRecord(currentSelectedRQ.id, { observations: updatedObs });
  };

  const handleAddObservation = () => {
    if (!currentSelectedRQ || !newObsText.trim()) return;
    const dateToUse = newObsDate ? new Date(newObsDate).toISOString() : new Date().toISOString();
    const newObsItem = {
      id: `obs-${Date.now()}`,
      text: newObsText.trim(),
      date: dateToUse
    };
    const updatedObs = [...(currentSelectedRQ.observations || []), newObsItem];
    updateRQRecord(currentSelectedRQ.id, { observations: updatedObs });
    setNewObsText('');
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    setNewObsDate(new Date(Date.now() - tzoffset).toISOString().slice(0, 16));
  };

  // Open Details Panel
  const handleOpenManage = (rq: RQRecord) => {
    setSelectedRQ(rq);
    setManageStatus(rq.status);
    setManageRQNumber(rq.rq_number || '');
    setManageSAPNumber(rq.sap_number || '');
    setNewObsText('');
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    setNewObsDate(new Date(Date.now() - tzoffset).toISOString().slice(0, 16));
  };

  useEffect(() => {
    const pendingRqId = localStorage.getItem('selected_rq_id_for_log');
    if (pendingRqId) {
      const targetRq = rqs.find(r => r.id === pendingRqId);
      if (targetRq) {
        handleOpenManage(targetRq);
      }
      localStorage.removeItem('selected_rq_id_for_log');
    }
  }, [rqs]);

  // Save changes from details panel
  const handleSaveManage = () => {
    if (!currentSelectedRQ) return;
    
    // Save numbers
    updateRQRecord(currentSelectedRQ.id, {
      rq_number: manageRQNumber.trim() || null,
      sap_number: manageSAPNumber.trim() || null,
    });

    // Update status if it changed
    if (manageStatus !== currentSelectedRQ.status) {
      updateRQStatus(currentSelectedRQ.id, manageStatus);
    }
  };

  // Add material to temp list
  const handleAddMaterial = () => {
    if (!matName.trim() || matQty <= 0) return;
    setMaterialsList(prev => [...prev, {
      name: matName.trim(),
      unit: matUnit,
      quantity: matQty
    }]);
    setMatName('');
    setMatQty(1);
  };

  // Remove material from temp list
  const handleRemoveMaterial = (index: number) => {
    setMaterialsList(prev => prev.filter((_, i) => i !== index));
  };

  // Create Independent RQ
  const handleCreateIndependentRQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !user) return;

    createRQRecord({
      otm_id: null,
      otm_code: null,
      supervisor_id: user.id,
      supervisor_name: user.full_name,
      type: newRQType,
      description: newDescription.trim(),
      materials: newRQType === 'supply' ? materialsList : undefined,
      rq_number: newRQNumber.trim() || null,
      sap_number: null,
      observations: [
        {
          id: `obs-${Date.now()}`,
          text: 'Requerimiento independiente creado directamente en la bitácora.',
          date: new Date().toISOString()
        }
      ]
    });

    // Reset Form & Close Modal
    setShowNewRQModal(false);
    setNewDescription('');
    setNewRQNumber('');
    setMaterialsList([]);
    setNewRQType('supply');
  };

  // Navigate to OTM details in management view
  const handleNavigateToOTM = (otmId: string) => {
    if (!onNavigate) return;
    localStorage.setItem('selected_otm_id_for_management', otmId);
    onNavigate('management');
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSupervisorFilter('');
    setFromDate('');
    setToDate('');
    setSearchText('');
  };

  const kpis = useMemo(() => {
    const total = filteredRQs.length;
    const inApproval = filteredRQs.filter(r => r.status === 'in_approval').length;
    const inLogistics = filteredRQs.filter(r => r.status === 'in_logistics').length;
    const attended = filteredRQs.filter(r => r.status === 'attended').length;
    return { total, inApproval, inLogistics, attended };
  }, [filteredRQs]);

  return (
    <div className="rq-log-page" style={{ padding: '24px 0', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header View */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📋 Bitácora de Requerimientos (RQ)
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Visualización y control de solicitudes de suministros y servicios complementarios.
          </p>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={() => setShowNewRQModal(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '10px 20px', 
            fontSize: '0.85rem', 
            fontWeight: 700 
          }}
        >
          ➕ Nuevo RQ Independiente
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.05, pointerEvents: 'none' }}>📋</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Requerimientos</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kpis.total}</span>
        </div>
        
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', borderLeft: '3px solid rgba(245, 158, 11, 0.4)' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.05, pointerEvents: 'none' }}>⏳</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Aprobación</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>{kpis.inApproval}</span>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', borderLeft: '3px solid rgba(139, 92, 246, 0.4)' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.05, pointerEvents: 'none' }}>🚚</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Proceso Logístico</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a78bfa' }}>{kpis.inLogistics}</span>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', borderLeft: '3px solid rgba(52, 211, 153, 0.4)' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.05, pointerEvents: 'none' }}>✅</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atendido/Entregado</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>{kpis.attended}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Main Section: Filters & Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Advanced Filters */}
          <div className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
            
            <div style={{ flex: '2 1 200px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Búsqueda General</label>
              <input 
                className="form-input" 
                placeholder="N° RQ, N° SAP, Código OTM o detalle..." 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)} 
                style={{ width: '100%', minHeight: 38 }}
              />
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Estado</label>
              <select 
                className="form-select" 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as RQStatus | '')}
                style={{ width: '100%', minHeight: 38 }}
              >
                <option value="">Todos los Estados</option>
                {Object.entries(RQ_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Supervisor</label>
              <select 
                className="form-select" 
                value={supervisorFilter} 
                onChange={e => setSupervisorFilter(e.target.value)}
                style={{ width: '100%', minHeight: 38 }}
              >
                <option value="">Todos</option>
                {supervisorsList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 130px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Desde</label>
              <input 
                type="date" 
                className="form-input" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                style={{ width: '100%', minHeight: 38 }}
              />
            </div>

            <div style={{ flex: '1 1 130px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Hasta</label>
              <input 
                type="date" 
                className="form-input" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                style={{ width: '100%', minHeight: 38 }}
              />
            </div>

            {(statusFilter || supervisorFilter || fromDate || toDate || searchText) && (
              <button 
                className="btn btn-secondary" 
                onClick={handleClearFilters}
                style={{ height: 38, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Table Card */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: '60px' }}>N° Item</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '130px' }}>OTM Asociada</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '120px' }}>Fecha Reg.</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '120px' }}>Supervisor</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '110px' }}>Tipo RQ</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción / Materiales</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '220px' }}>Última Observación</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: '120px' }}>N° RQ</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: '120px' }}>N° SAP/Solped</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: '150px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRQs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No se encontraron registros de requerimientos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRQs.map((rq: RQRecord) => (
                      <tr 
                        key={rq.id} 
                        onClick={() => handleOpenManage(rq)}
                        style={{ 
                          borderBottom: '1px solid var(--border)', 
                          cursor: 'pointer',
                          background: selectedRQ?.id === rq.id ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          #{rq.item_number}
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                          {rq.otm_id ? (
                            <button
                              onClick={() => handleNavigateToOTM(rq.otm_id!)}
                              className="btn btn-ghost"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.75rem', 
                                color: 'var(--accent-blue)', 
                                fontWeight: 700,
                                textDecoration: 'underline',
                                display: 'inline-block'
                              }}
                            >
                              🔗 {rq.otm_code}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 8 }}>
                              Independiente
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(rq.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {rq.supervisor_name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: rq.type === 'supply' ? 'rgba(78, 181, 230, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                            color: rq.type === 'supply' ? 'var(--accent-blue)' : '#eab308',
                            border: rq.type === 'supply' ? '1px solid rgba(78, 181, 230, 0.2)' : '1px solid rgba(234, 179, 8, 0.2)'
                          }}>
                            {rq.type === 'supply' ? '📦 Suministro' : '🔧 Servicio'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '350px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rq.description}
                          </div>
                          
                          {/* List preview of materials if supply */}
                          {rq.type === 'supply' && rq.materials && rq.materials.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {rq.materials.slice(0, 3).map((m: RQMaterial, i: number) => (
                                <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px', color: 'var(--text-muted)' }}>
                                  {m.name} ({m.quantity} {m.unit.slice(0, 3)}.)
                                </span>
                              ))}
                              {rq.materials.length > 3 && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 700, alignSelf: 'center' }}>
                                  +{rq.materials.length - 3} más
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(() => {
                            if (!rq.observations || rq.observations.length === 0) return '-';
                            const latest = rq.observations[rq.observations.length - 1];
                            const dateObj = new Date(latest.date);
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            return `[${day}/${month}] ${latest.text}`;
                          })()}
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                          <EditableCell 
                            value={rq.rq_number} 
                            onSave={(val) => updateRQRecord(rq.id, { rq_number: val || null })} 
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                          <EditableCell 
                            value={rq.sap_number} 
                            onSave={(val) => updateRQRecord(rq.id, { sap_number: val || null })} 
                          />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={getStatusBadgeStyle(rq.status)}>
                            {RQ_STATUS_LABELS[rq.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Side Panel slide-over drawer (Detail View & Update Actions) */}
      {currentSelectedRQ && (
        <>
          <div className="slide-panel-overlay" onClick={() => setSelectedRQ(null)} />
          <div className="slide-panel">
            <div className="slide-panel-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                Detalle del Item #{currentSelectedRQ.item_number}
              </h3>
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => setSelectedRQ(null)}
              >
                ✕
              </button>
            </div>

            <div className="slide-panel-content" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 60, overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
              
              {/* Basic Info */}
              <div className="flex-col gap-1" style={{ fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tipo:</span>
                  <span style={{ fontWeight: 700 }}>{currentSelectedRQ.type === 'supply' ? '📦 Suministro' : '🔧 Servicio'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registrado por:</span>
                  <span style={{ fontWeight: 600 }}>{currentSelectedRQ.supervisor_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fecha:</span>
                  <span>{new Date(currentSelectedRQ.created_at).toLocaleString('es-PE')}</span>
                </div>
                {currentSelectedRQ.otm_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>OTM Vinculada:</span>
                    <button 
                      onClick={() => handleNavigateToOTM(currentSelectedRQ.otm_id!)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--accent-blue)', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      {currentSelectedRQ.otm_code}
                    </button>
                  </div>
                )}
              </div>

              {/* Description & Items */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>Descripción General:</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{currentSelectedRQ.description}</div>

                {currentSelectedRQ.type === 'supply' && currentSelectedRQ.materials && currentSelectedRQ.materials.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Materiales Solicitados:</div>
                    <div className="flex-col gap-2">
                      {currentSelectedRQ.materials.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</span>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{m.quantity} {m.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Workflow Status Forms */}
              <div className="flex-col gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>GESTIÓN LOGÍSTICA</h4>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>N° Requerimiento (RQ)</label>
                  <input 
                    className="form-input" 
                    value={manageRQNumber} 
                    onChange={e => setManageRQNumber(e.target.value)} 
                    placeholder="Ej: RQ-10042"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>N° SAP / Código Solped</label>
                  <input 
                    className="form-input" 
                    value={manageSAPNumber} 
                    onChange={e => setManageSAPNumber(e.target.value)} 
                    placeholder="Ej: 100029348"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Estado del Flujo</label>
                  <select 
                    className="form-select" 
                    value={manageStatus} 
                    onChange={e => setManageStatus(e.target.value as RQStatus)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {Object.entries(RQ_STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <button 
                  className="btn btn-primary w-full" 
                  onClick={handleSaveManage}
                  style={{ fontSize: '0.8rem', fontWeight: 700, padding: '10px' }}
                >
                  💾 Guardar Cambios
                </button>
              </div>

              {/* Bitácora / Observaciones Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>BITÁCORA / OBSERVACIONES</h4>
                
                {/* Timeline of existing observations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {currentSelectedRQ.observations && currentSelectedRQ.observations.length > 0 ? (
                    currentSelectedRQ.observations.map((obs) => (
                      <EditableObservationItem 
                        key={obs.id}
                        observation={obs}
                        onUpdate={handleUpdateObservation}
                        onDelete={handleDeleteObservation}
                      />
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Sin observaciones registradas.
                    </span>
                  )}
                </div>

                {/* Add New Observation form */}
                 <div style={{ 
                   background: 'linear-gradient(135deg, rgba(78, 181, 230, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)', 
                   border: '1px solid rgba(78, 181, 230, 0.15)', 
                   padding: 16, 
                   borderRadius: 12, 
                   display: 'flex', 
                   flexDirection: 'column', 
                   gap: 12,
                   boxShadow: 'var(--shadow-sm)'
                 }}>
                   <h5 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                     ➕ Nueva Observación
                   </h5>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                     <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fecha y Hora:</label>
                     <input 
                       type="datetime-local"
                       className="form-input"
                       value={newObsDate}
                       onChange={e => setNewObsDate(e.target.value)}
                       style={{ 
                         fontSize: '0.78rem', 
                         padding: '6px 10px', 
                         height: '34px',
                         fontFamily: 'inherit',
                         borderRadius: '8px',
                         background: '#ffffff',
                         border: '1px solid var(--border)'
                       }}
                     />
                   </div>
 
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                     <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>Comentario:</label>
                     <textarea
                       className="form-textarea"
                       value={newObsText}
                       onChange={e => setNewObsText(e.target.value)}
                       placeholder="Escriba un nuevo comentario..."
                       style={{ 
                         fontSize: '0.78rem', 
                         minHeight: '54px', 
                         padding: '8px 12px',
                         fontFamily: 'inherit',
                         borderRadius: '8px',
                         background: '#ffffff',
                         border: '1px solid var(--border)',
                         resize: 'vertical',
                         lineHeight: 1.4
                       }}
                     />
                   </div>
 
                   <button
                     type="button"
                     className="btn btn-primary btn-sm"
                     onClick={handleAddObservation}
                     disabled={!newObsText.trim()}
                     style={{ 
                       fontSize: '0.75rem', 
                       fontWeight: 700, 
                       padding: '8px 16px', 
                       alignSelf: 'flex-end',
                       borderRadius: '8px',
                       opacity: !newObsText.trim() ? 0.5 : 1,
                       cursor: !newObsText.trim() ? 'not-allowed' : 'pointer',
                       background: 'var(--accent-blue)',
                       color: '#ffffff',
                       border: 'none',
                       boxShadow: !newObsText.trim() ? 'none' : '0 2px 6px rgba(78, 181, 230, 0.3)',
                       transition: 'all 0.2s'
                     }}
                   >
                     Agregar Observación
                   </button>
                 </div>
              </div>

              {/* Status Dates Timeline */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>HISTORIAL DE ESTADOS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 6, position: 'relative' }}>
                  {/* Vertical line indicator */}
                  <div style={{ position: 'absolute', left: 10, top: 6, bottom: 6, width: '1px', background: 'var(--border)' }}></div>

                  {Object.entries(RQ_STATUS_LABELS).map(([statusKey, label]) => {
                    const statusDate = currentSelectedRQ.status_dates[statusKey as RQStatus];
                    const isActive = currentSelectedRQ.status === statusKey;
                    return (
                      <div key={statusKey} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                        <div style={{ 
                          width: 9, 
                          height: 9, 
                          borderRadius: '50%', 
                          background: statusDate ? (isActive ? 'var(--accent-blue)' : 'var(--accent-green)') : 'var(--border)', 
                          marginTop: 4,
                          boxShadow: isActive ? '0 0 8px var(--accent-blue)' : 'none',
                          border: '2px solid var(--bg-primary)'
                        }}></div>
                        <div style={{ fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: isActive ? 700 : 500, color: statusDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {label}
                          </div>
                          {statusDate && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              {new Date(statusDate).toLocaleString('es-PE')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* New RQ Modal Form */}
      {showNewRQModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 99999,
          padding: 16
        }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '500px', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>➕ Nuevo Requerimiento Independiente</h3>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowNewRQModal(false)}
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIndependentRQ} className="flex-col gap-4">
              
              <div className="form-group">
                <label className="form-label">Tipo de Requerimiento</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button 
                    type="button"
                    className={`btn ${newRQType === 'supply' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setNewRQType('supply')}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '8px 0' }}
                  >
                    📦 Suministro (Materiales)
                  </button>
                  <button 
                    type="button"
                    className={`btn ${newRQType === 'service' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setNewRQType('service')}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '8px 0' }}
                  >
                    🔧 Servicio
                  </button>
                </div>
              </div>

              {newRQType === 'service' && (
                <div className="form-group">
                  <label className="form-label">Magnitud del Servicio</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button 
                      type="button"
                      className={`btn btn-sm ${newMagnitude === 'puntual' ? 'btn-primary' : 'btn-secondary'}`} 
                      onClick={() => setNewMagnitude('puntual')}
                      style={{ flex: 1 }}
                    >
                      Puntual
                    </button>
                    <button 
                      type="button"
                      className={`btn btn-sm ${newMagnitude === 'integral' ? 'btn-primary' : 'btn-secondary'}`} 
                      onClick={() => setNewMagnitude('integral')}
                      style={{ flex: 1 }}
                    >
                      Integral
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="rq-description">
                  {newRQType === 'supply' ? 'Detalle General de Compra' : 'Descripción detallada del Servicio'}
                </label>
                <textarea 
                  id="rq-description"
                  className="form-textarea" 
                  value={newDescription} 
                  onChange={e => setNewDescription(e.target.value)} 
                  placeholder={newRQType === 'supply' ? "Ej: Materiales sanitarios de repuesto para vestuarios..." : "Ej: Servicio de calibración de bombas hidrostáticas..."}
                  required
                  style={{ minHeight: '80px', marginTop: 4 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rq-number-input">Número de RQ (Opcional)</label>
                <input 
                  id="rq-number-input"
                  className="form-input" 
                  value={newRQNumber} 
                  onChange={e => setNewRQNumber(e.target.value)} 
                  placeholder="Ej: RQ-10048"
                  style={{ marginTop: 4 }}
                />
              </div>

              {/* Supply Item Creator */}
              {newRQType === 'supply' && (
                <div style={{ background: 'rgba(0,0,0,0.12)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Añadir Materiales a la Lista:
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }} htmlFor="material-name-input">Nombre del Material</label>
                    <input 
                      id="material-name-input"
                      className="form-input" 
                      value={matName} 
                      onChange={e => setMatName(e.target.value)} 
                      placeholder="Ej: Cable vulcanizado 3x14"
                      style={{ fontSize: '0.8rem', marginTop: 4 }}
                    />
                  </div>

                  <div className="grid-2" style={{ marginTop: 8, gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }} htmlFor="material-unit-select">Unidad</label>
                      <select 
                        id="material-unit-select"
                        className="form-select" 
                        value={matUnit} 
                        onChange={e => setMatUnit(e.target.value)}
                        style={{ fontSize: '0.8rem', marginTop: 4 }}
                      >
                        <option value="Unidades">Unidades</option>
                        <option value="Metros">Metros</option>
                        <option value="Kilogramos">Kilogramos</option>
                        <option value="Galones">Galones</option>
                        <option value="Rollos">Rollos</option>
                        <option value="Bolsas">Bolsas</option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }} htmlFor="material-qty-input">Cantidad</label>
                      <input 
                        id="material-qty-input"
                        type="number" 
                        min="1" 
                        className="form-input" 
                        value={matQty} 
                        onChange={e => setMatQty(parseInt(e.target.value, 10) || 1)}
                        style={{ fontSize: '0.8rem', marginTop: 4 }}
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm w-full" 
                    onClick={handleAddMaterial}
                    style={{ marginTop: 10, fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    + Añadir Material
                  </button>

                  {/* Temp materials list render */}
                  {materialsList.length > 0 && (
                    <div style={{ marginTop: 10, maxHeight: '100px', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      {materialsList.map((m: RQMaterial, index: number) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span>{m.name} ({m.quantity} {m.unit})</span>
                          <button 
                            type="button" 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleRemoveMaterial(index)}
                            style={{ color: 'var(--accent-rose)', padding: '1px 4px', fontSize: '0.7rem' }}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewRQModal(false)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!newDescription.trim() || (newRQType === 'supply' && materialsList.length === 0)}
                  style={{ flex: 1, padding: '10px', fontWeight: 700 }}
                >
                  ✓ Crear Requerimiento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Embedded style keyframe animation for the checkmark */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.6); }
          20% { opacity: 1; transform: scale(1.1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; }
        }
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.01) !important;
        }
      `}</style>

    </div>
  );
}
