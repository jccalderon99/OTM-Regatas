import { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';
import { useRoutineActivity } from '../../context/RoutineActivityContext';
import { routineEventTitle } from '../../types/routine';

// Define the unified Gantt item format
interface GanttItem {
  id: string;
  source: 'otm' | 'oti' | 'routine';
  code: string;
  description: string;
  type: 'Correctivo' | 'Preventivo' | 'Soporte' | 'Emergencia' | 'Rutina';
  specialty: string;
  responsible: string;
  isContractor: boolean;
  supervisorId: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  status: 'Culminado' | 'En Proceso' | 'Programado';
  progress: number; // 0, 50, 100
}

const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Sunday is 0, Monday is 1, etc.

const PERU_HOLIDAYS_2026 = new Set([
  '2026-01-01', // Año Nuevo
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-06-07', // Batalla de Arica / Día de la Bandera
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-23', // Día de la Fuerza Aérea
  '2026-07-28', // Fiestas Patrias
  '2026-07-29', // Fiestas Patrias
  '2026-08-06', // Batalla de Junín
  '2026-08-30', // Santa Rosa de Lima
  '2026-10-08', // Combate de Angamos
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-09', // Batalla de Ayacucho
  '2026-12-25', // Navidad
]);

export default function GanttChart() {
  const { otms, otis, users, supervisors } = useOTM();
  const { records } = useRoutineActivity();

  // Selected view time state
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(4); // Default to Mayo (index 4)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Filters state
  const [filterStaff, setFilterStaff] = useState<'all' | 'own' | 'contractor'>('all');
  const [filterType, setFilterType] = useState<'all' | 'otm' | 'oti' | 'routine'>('all');
  const [filterSupervisor, setFilterSupervisor] = useState<string>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  // Hovered item for premium tooltip preview
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Unified mapping logic
  const unifiedGanttData = useMemo<GanttItem[]>(() => {
    const list: GanttItem[] = [];

    // Map OTMs
    otms.forEach((o) => {
      // Determine responsible technician name
      let techName = 'Sin Asignar';
      if (o.assignment_type === 'contractor') {
        techName = o.contractor_name || 'Contratista';
      } else if (o.assigned_technicians && o.assigned_technicians.length > 0) {
        techName = o.assigned_technicians.map(t => t.technician?.full_name || users.find(u => u.id === t.technician_id)?.full_name).filter(Boolean).join(', ');
      } else if (o.technician_id) {
        techName = users.find(u => u.id === o.technician_id)?.full_name || 'Técnico';
      }

      // Format dates
      const startStr = o.scheduled_date 
        ? o.scheduled_date.slice(0, 10) 
        : o.created_at.slice(0, 10);
      
      const endStr = o.closed_at 
        ? o.closed_at.slice(0, 10) 
        : (o.status === 'closed' || o.status === 'awaiting_conformity' || o.status === 'awaiting_supervisor') 
          ? o.updated_at.slice(0, 10)
          : new Date().toISOString().slice(0, 10); // Active tasks extend to current day

      // Calculate diff in days
      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Status mapping
      let itemStatus: 'Culminado' | 'En Proceso' | 'Programado' = 'Programado';
      let progressVal = 0;
      if (o.status === 'closed' || o.status === 'awaiting_conformity' || o.status === 'awaiting_supervisor') {
        itemStatus = 'Culminado';
        progressVal = 100;
      } else if (o.status === 'in_progress' || o.status === 'rq') {
        itemStatus = 'En Proceso';
        progressVal = 50;
      }

      // Specialty label cleaning
      const specClean = o.failure_type ? o.failure_type.replace(/^\d+\.\s*/, '') : 'Otros';

      // Type mapping
      let typeLabel: GanttItem['type'] = 'Correctivo';
      if (o.maintenance_type === 'preventive') typeLabel = 'Preventivo';
      else if (o.maintenance_type === 'support') typeLabel = 'Soporte';
      else if (o.maintenance_type === 'emergency') typeLabel = 'Emergencia';

      list.push({
        id: `otm-${o.id}`,
        source: 'otm',
        code: o.otm_code,
        description: o.description,
        type: typeLabel,
        specialty: specClean,
        responsible: techName,
        isContractor: o.assignment_type === 'contractor',
        supervisorId: o.supervisor_id,
        startDate: startStr,
        endDate: endStr,
        durationDays: diffDays,
        status: itemStatus,
        progress: progressVal
      });
    });

    // Map OTIs
    otis.forEach((o) => {
      // Tech assignment
      const techNames = o.technician_ids
        .map(tid => users.find(u => u.id === tid)?.full_name)
        .filter(Boolean)
        .join(', ') || 'Técnico';

      const startStr = o.scheduled_date ? o.scheduled_date.slice(0, 10) : o.created_at.slice(0, 10);
      const endStr = o.status === 'completed' 
        ? o.updated_at.slice(0, 10) 
        : new Date().toISOString().slice(0, 10);

      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      let itemStatus: 'Culminado' | 'En Proceso' | 'Programado' = 'Programado';
      let progressVal = 0;
      if (o.status === 'completed') {
        itemStatus = 'Culminado';
        progressVal = 100;
      } else if (o.status === 'in_progress') {
        itemStatus = 'En Proceso';
        progressVal = 50;
      }

      list.push({
        id: `oti-${o.id}`,
        source: 'oti',
        code: o.oti_code,
        description: o.description,
        type: 'Preventivo', // Internal maintenance plan is preventive
        specialty: o.specialty.replace(/^\d+\.\s*/, ''),
        responsible: techNames,
        isContractor: false,
        supervisorId: o.supervisor_id || null,
        startDate: startStr,
        endDate: endStr,
        durationDays: diffDays,
        status: itemStatus,
        progress: progressVal
      });
    });

    // Map Routine Records (Daily Preventives)
    records.forEach((r) => {
      const techName = r.technician?.full_name || users.find(u => u.id === r.technician_id)?.full_name || 'Técnico';
      
      let itemStatus: 'Culminado' | 'En Proceso' | 'Programado' = 'Culminado';
      let progressVal = 100;
      if (r.status === 'in_progress') {
        itemStatus = 'En Proceso';
        progressVal = 50;
      }

      list.push({
        id: `routine-${r.id}`,
        source: 'routine',
        code: `RUT-${r.specialty.slice(0,4).toUpperCase()}-${r.id.slice(-4).toUpperCase()}`,
        description: routineEventTitle(r.specialty, r.sub_specialty),
        type: 'Rutina',
        specialty: r.specialty.replace(/^\d+\.\s*/, ''),
        responsible: techName,
        isContractor: false,
        supervisorId: null, // Routine preventive tasks are managed directly
        startDate: r.record_date,
        endDate: r.record_date,
        durationDays: 1,
        status: itemStatus,
        progress: progressVal
      });
    });

    return list;
  }, [otms, otis, users, records]);

  // 2. Specialty & Supervisor lists derived from data for filters
  const uniqueSpecialties = useMemo(() => {
    const specs = new Set<string>();
    unifiedGanttData.forEach(d => { if (d.specialty) specs.add(d.specialty); });
    return Array.from(specs).sort();
  }, [unifiedGanttData]);

  // 3. Grid Date Generation (2026 Calendar Days)
  const gridDays = useMemo(() => {
    const year = 2026;
    const result = [];

    if (viewMode === 'month') {
      const daysInMonth = new Date(year, selectedMonthIndex + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, selectedMonthIndex, day);
        const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday...
        const formattedDateString = `${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        result.push({
          dayNumber: day,
          dayLetter: DAYS_LETTERS[dayOfWeek],
          isSunday: dayOfWeek === 0,
          isHoliday: PERU_HOLIDAYS_2026.has(formattedDateString),
          formattedDate: formattedDateString,
          monthIndex: selectedMonthIndex
        });
      }
    } else {
      // Entire year 2026
      for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, monthIdx, day);
          const dayOfWeek = date.getDay();
          const formattedDateString = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          result.push({
            dayNumber: day,
            dayLetter: DAYS_LETTERS[dayOfWeek],
            isSunday: dayOfWeek === 0,
            isHoliday: PERU_HOLIDAYS_2026.has(formattedDateString),
            formattedDate: formattedDateString,
            monthIndex: monthIdx
          });
        }
      }
    }
    return result;
  }, [selectedMonthIndex, viewMode]);

  // Month structure for top row span grouping
  const gridMonthGroups = useMemo(() => {
    const groups: { monthIndex: number; span: number }[] = [];
    gridDays.forEach(d => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthIndex === d.monthIndex) {
        lastGroup.span++;
      } else {
        groups.push({ monthIndex: d.monthIndex, span: 1 });
      }
    });
    return groups;
  }, [gridDays]);

  // 4. Filtering Logic
  const filteredData = useMemo(() => {
    return unifiedGanttData
      .filter((item) => {
        // Staff filter
        if (filterStaff === 'own' && item.isContractor) return false;
        if (filterStaff === 'contractor' && !item.isContractor) return false;

        // Type filter
        if (filterType === 'otm' && item.source !== 'otm') return false;
        if (filterType === 'oti' && item.source !== 'oti') return false;
        if (filterType === 'routine' && item.source !== 'routine') return false;

        // Supervisor filter
        if (filterSupervisor !== 'all' && item.supervisorId !== filterSupervisor) return false;

        // Specialty filter
        if (filterSpecialty !== 'all' && item.specialty !== filterSpecialty) return false;

        // Search text
        if (searchText.trim() !== '') {
          const match = searchText.toLowerCase();
          const inCode = item.code.toLowerCase().includes(match);
          const inDesc = item.description.toLowerCase().includes(match);
          const inResp = item.responsible.toLowerCase().includes(match);
          if (!inCode && !inDesc && !inResp) return false;
        }

        // Active Month/Year filter (only items overlapping with the displayed timeline)
        if (viewMode === 'month') {
          const mStart = `${2026}-${String(selectedMonthIndex + 1).padStart(2, '0')}-01`;
          const lastDayStr = String(new Date(2026, selectedMonthIndex + 1, 0).getDate());
          const mEnd = `${2026}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${lastDayStr}`;
          
          return item.startDate <= mEnd && item.endDate >= mStart;
        } else {
          // Entire year 2026
          return item.startDate <= '2026-12-31' && item.endDate >= '2026-01-01';
        }

        return true;
      });
  }, [unifiedGanttData, filterStaff, filterType, filterSupervisor, filterSpecialty, searchText, selectedMonthIndex, viewMode]);

  // 5. Total statistics derived from all active filtered items (Google Sheets style summaries)
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    filteredData.forEach(d => {
      if (d.status === 'Culminado') completed++;
      else if (d.status === 'En Proceso') inProgress++;
      else pending++;
    });

    return { completed, inProgress, pending, total: filteredData.length };
  }, [filteredData]);

  // Show hover tooltip
  const handleMouseEnterBar = (e: React.MouseEvent, item: GanttItem) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: bounds.left + window.scrollX + bounds.width / 2,
      y: bounds.top + window.scrollY - 10
    });
    setHoveredItem(item);
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', paddingBottom: 40 }}>
      {/* ─── TITLE & METADATA SECTION ─── */}
      <div className="flex justify-between items-center py-4" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="page-title">Programación de Mantenimiento (Diagrama Gantt)</h1>
          <p className="page-subtitle">Visualización cronológica interactiva estilo hoja de cálculo para el año 2026</p>
        </div>
      </div>

      {/* ─── GENERAL STATISTICS SUMMARY CARD ─── */}
      <div className="glass-card fade-in" style={{ padding: '16px 24px', borderRadius: 16, marginBottom: 20, border: '1px solid rgba(255,255,255,0.4)', background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(241,245,249,0.7) 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Top Quick Stats Grid matching the user's Excel style */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: 20 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Filtrados</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{stats.total}</div>
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ background: '#d1fae5', border: '1px solid #10b981', borderRadius: 8, padding: '6px 12px', minWidth: 100, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Culminado</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{stats.completed}</div>
              </div>
              <div style={{ background: '#f1f5f9', border: '1px solid #64748b', borderRadius: 8, padding: '6px 12px', minWidth: 100, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>En Proceso</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>{stats.inProgress}</div>
              </div>
              <div style={{ background: '#ffe4e6', border: '1px solid #f43f5e', borderRadius: 8, padding: '6px 12px', minWidth: 100, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Programado</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#be123c' }}>{stats.pending}</div>
              </div>
            </div>
          </div>

          {/* Quick Switch Month Buttons matching the screenshot Enero block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'year' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}
              onClick={() => setViewMode('year')}
            >
              📅 Ver Todo 2026
            </button>
            <select
              className="form-select"
              style={{ width: 140, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
              value={selectedMonthIndex}
              onChange={(e) => {
                setViewMode('month');
                setSelectedMonthIndex(parseInt(e.target.value));
              }}
            >
              {MONTHS_SPANISH.map((m, idx) => (
                <option key={idx} value={idx}>{m} 2026</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ─── FILTER CONTROL BAR (GLASSMORPHIC) ─── */}
      <div className="filter-bar responsive-actions glass-card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 14, border: '1px solid var(--border)' }}>
        
        {/* Search Bar */}
        <input 
          className="form-input" 
          placeholder="🔍 Buscar código, descripción o técnico..." 
          value={searchText} 
          onChange={e => setSearchText(e.target.value)} 
          style={{ maxWidth: 260, flex: '1 1 180px', fontSize: '0.82rem', padding: '8px 12px' }} 
        />

        {/* Staff filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: 4 }}>Personal</span>
          <select className="form-select" value={filterStaff} onChange={e => setFilterStaff(e.target.value as any)} style={{ minWidth: 140, fontSize: '0.82rem', padding: '6px 10px' }}>
            <option value="all">Propio + Tercero</option>
            <option value="own">👤 Propio (Interno)</option>
            <option value="contractor">🏗️ Tercero (Contrata)</option>
          </select>
        </div>

        {/* Task Type Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: 4 }}>Categoría</span>
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value as any)} style={{ minWidth: 140, fontSize: '0.82rem', padding: '6px 10px' }}>
            <option value="all">Todas las tareas</option>
            <option value="otm">🔵 Solicitud OTM</option>
            <option value="oti">🟣 Plan OTI</option>
            <option value="routine">🟢 Rutina Preventora</option>
          </select>
        </div>

        {/* Supervisor Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: 4 }}>Supervisor</span>
          <select className="form-select" value={filterSupervisor} onChange={e => setFilterSupervisor(e.target.value)} style={{ minWidth: 145, fontSize: '0.82rem', padding: '6px 10px' }}>
            <option value="all">Todos los Supervisores</option>
            {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>

        {/* Specialty Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: 4 }}>Especialidad</span>
          <select className="form-select" value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)} style={{ minWidth: 150, fontSize: '0.82rem', padding: '6px 10px' }}>
            <option value="all">Todas las disciplinas</option>
            {uniqueSpecialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        {/* Clear filters shortcut */}
        {(filterStaff !== 'all' || filterType !== 'all' || filterSupervisor !== 'all' || filterSpecialty !== 'all' || searchText !== '') && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ alignSelf: 'flex-end', height: 34, fontSize: '0.8rem', padding: '0 12px', border: '1px dashed var(--accent-rose)', color: 'var(--accent-rose)' }}
            onClick={() => {
              setFilterStaff('all');
              setFilterType('all');
              setFilterSupervisor('all');
              setFilterSpecialty('all');
              setSearchText('');
            }}
          >
            🧹 Resetear
          </button>
        )}
      </div>

      {/* ─── SHEET GANTT CHART SPLIT LAYOUT ─── */}
      <div className="glass-card fade-in" style={{ padding: 0, borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: '#ffffff', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Style configurations for spreadsheet feel */}
        <style>{`
          .gantt-wrapper {
            display: flex;
            width: 100%;
            overflow: hidden;
            background: #ffffff;
            position: relative;
          }
          
          /* Frozen Left Side Table Details */
          .gantt-left-frozen {
            width: 530px;
            flex-shrink: 0;
            border-right: 2px solid var(--border);
            box-shadow: 4px 0 10px rgba(0,0,0,0.03);
            z-index: 10;
            background: #ffffff;
            overflow-x: hidden;
          }
          
          /* Scrollable Right Side Grid Calendar */
          .gantt-right-scrollable {
            flex: 1;
            overflow-x: auto;
            position: relative;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }
          .gantt-right-scrollable::-webkit-scrollbar {
            height: 8px;
          }
          .gantt-right-scrollable::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .gantt-right-scrollable::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          /* Spreadsheet Table Rows */
          .sheet-row {
            display: flex;
            align-items: center;
            height: 38px;
            border-bottom: 1px solid rgba(226, 232, 240, 0.7);
            font-size: 0.76rem;
            color: var(--text-primary);
          }
          .sheet-header-row {
            background: #f8fafc;
            font-weight: 700;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border);
          }
          .sheet-cell {
            padding: 0 8px;
            display: flex;
            align-items: center;
            height: 100%;
            border-right: 1px solid rgba(226, 232, 240, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Dynamic Calendar Grid Column Layout */
          .calendar-grid-cols {
            display: grid;
            grid-template-columns: repeat(${gridDays.length}, 32px);
          }

          /* Status Badges */
          .badge-completed {
            background: #d1fae5;
            color: #065f46;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .badge-progress {
            background: #f1f5f9;
            color: #334155;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .badge-scheduled {
            background: #fee2e2;
            color: #991b1b;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
          }
        `}</style>

        {/* Dynamic Month Layout Grid */}
        <div className="gantt-wrapper">
          
          {/* ======================================================== */}
          {/* LEFT PANEL: CONGELADO / FROZEN DETAILS TABLE             */}
          {/* ======================================================== */}
          <div className="gantt-left-frozen">
            
            {/* Frozen Headers */}
            <div className="sheet-row sheet-header-row" style={{ height: 76, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ height: 38, borderBottom: '1px solid rgba(226, 232, 240, 0.7)', display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                📋 DETALLES DE LA PROGRAMACIÓN
              </div>
              <div style={{ height: 38, display: 'flex', alignItems: 'center' }}>
                <div className="sheet-cell" style={{ width: 90, fontWeight: 800 }}>Código</div>
                <div className="sheet-cell" style={{ width: 140 }}>Actividad</div>
                <div className="sheet-cell" style={{ width: 80 }}>Tipo</div>
                <div className="sheet-cell" style={{ width: 100 }}>Especialidad</div>
                <div className="sheet-cell" style={{ width: 120, borderRight: 'none' }}>Responsable</div>
              </div>
            </div>

            {/* Frozen Rows */}
            {filteredData.map((item) => (
              <div key={item.id} className="sheet-row" style={{ background: hoveredItem?.id === item.id ? 'rgba(78, 181, 230, 0.05)' : '#ffffff' }}>
                
                {/* Code (colored indicators by OTM/OTI source) */}
                <div className="sheet-cell" style={{ width: 90 }}>
                  <span style={{ 
                    fontWeight: 800, 
                    color: item.source === 'otm' ? 'var(--accent-blue)' : item.source === 'oti' ? 'var(--accent-purple)' : 'var(--accent-emerald)',
                    fontSize: '0.7rem'
                  }}>
                    {item.source === 'otm' ? '🔵 ' : item.source === 'oti' ? '🟣 ' : '⚡ '}
                    {item.code}
                  </span>
                </div>

                {/* Activity Description */}
                <div className="sheet-cell" style={{ width: 140, fontWeight: 500 }} title={item.description}>
                  {item.description}
                </div>

                {/* Maintenance Type */}
                <div className="sheet-cell" style={{ width: 80 }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: item.type === 'Correctivo' ? 'var(--accent-rose)' : item.type === 'Preventivo' ? 'var(--accent-blue)' : item.type === 'Rutina' ? 'var(--accent-purple)' : 'var(--text-secondary)'
                  }}>
                    {item.type}
                  </span>
                </div>

                {/* Specialty */}
                <div className="sheet-cell" style={{ width: 100 }}>
                  {item.specialty}
                </div>

                {/* Responsible Name */}
                <div className="sheet-cell" style={{ width: 120, borderRight: 'none' }} title={item.responsible}>
                  {item.responsible}
                </div>

              </div>
            ))}

            {/* Empty State */}
            {filteredData.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                🔍 Ningún registro coincide con los filtros aplicados.
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: HORIZONTALLY SCROLLABLE TIMELINE GRID       */}
          {/* ======================================================== */}
          <div className="gantt-right-scrollable">
            
            <div className="calendar-grid-cols">
              
              {/* 1. Month name header row spanning days of each month */}
              <div className="sheet-row sheet-header-row" style={{ gridColumn: 'span ' + gridDays.length, padding: 0, borderRight: 'none', display: 'contents' }}>
                {gridMonthGroups.map((g, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      gridColumn: 'span ' + g.span, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRight: idx === gridMonthGroups.length - 1 ? 'none' : '2px solid var(--border)',
                      height: 38,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: 'var(--text-primary)',
                      background: '#f1f5f9',
                      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    {MONTHS_SPANISH[g.monthIndex].toUpperCase()} 2026
                  </div>
                ))}
              </div>

              {/* 2. Days and week letters header row */}
              <div className="sheet-row sheet-header-row" style={{ height: 38, gridColumn: 'span ' + gridDays.length, padding: 0, display: 'contents' }}>
                {gridDays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className="sheet-cell" 
                    style={{ 
                      width: 32, 
                      padding: 0,
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: day.isSunday 
                        ? 'rgba(153, 27, 27, 0.08)' 
                        : day.isHoliday 
                          ? 'rgba(139, 92, 246, 0.12)' 
                          : '#f8fafc',
                      borderRight: '1px solid rgba(226, 232, 240, 0.7)'
                    }}
                    title={day.isHoliday ? `Feriado: ${day.formattedDate}` : ''}
                  >
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: day.isSunday ? '#be123c' : day.isHoliday ? '#6d28d9' : 'var(--text-muted)' }}>{day.dayLetter}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: day.isSunday ? '#be123c' : day.isHoliday ? '#6d28d9' : 'var(--text-primary)', marginTop: 1 }}>{day.dayNumber}</span>
                  </div>
                ))}
              </div>

              {/* 3. Grid Rows filled with floating bars */}
              {filteredData.map((item) => {
                const itemStart = new Date(item.startDate);
                const itemEnd = new Date(item.endDate);

                return (
                  <div 
                    key={item.id} 
                    className="sheet-row" 
                    style={{ 
                      gridColumn: 'span ' + gridDays.length, 
                      padding: 0, 
                      display: 'contents',
                      background: hoveredItem?.id === item.id ? 'rgba(78, 181, 230, 0.05)' : '#ffffff' 
                    }}
                  >
                    {gridDays.map((day, idx) => {
                      const cellDate = new Date(day.formattedDate);
                      const isInside = cellDate >= itemStart && cellDate <= itemEnd;

                      const isStartDay = cellDate.getTime() === itemStart.getTime() || (idx === 0);
                      const isEndDay = cellDate.getTime() === itemEnd.getTime() || (idx === gridDays.length - 1);

                      // Color mapping based on progress and OTM/OTI/Routine source
                      let barBg = 'transparent';
                      let hoverScale = 'scale(1)';
                      
                      if (isInside) {
                        if (item.status === 'Culminado') {
                          barBg = item.source === 'otm' 
                            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                            : item.source === 'oti'
                              ? 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)' 
                              : 'linear-gradient(90deg, #22c55e 0%, #15803d 100%)'; 
                        } else if (item.status === 'En Proceso') {
                          barBg = 'linear-gradient(90deg, #64748b 0%, #475569 100%)'; 
                        } else {
                          barBg = 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)'; 
                        }
                        hoverScale = 'scale(1.08)';
                      }

                      return (
                        <div
                          key={idx}
                          onMouseEnter={(e) => isInside && handleMouseEnterBar(e, item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={{
                            width: 32,
                            height: 38,
                            borderRight: '1px solid rgba(226, 232, 240, 0.5)',
                            background: day.isSunday 
                              ? 'rgba(153, 27, 27, 0.03)' 
                              : day.isHoliday 
                                ? 'rgba(139, 92, 246, 0.05)' 
                                : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            padding: '0 1px'
                          }}
                        >
                          {/* Gantt Bar Segment */}
                          {isInside && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: '6px 0',
                                background: barBg,
                                borderLeft: isStartDay ? '2px solid rgba(255,255,255,0.4)' : 'none',
                                borderRight: isEndDay ? '2px solid rgba(255,255,255,0.4)' : 'none',
                                borderRadius: `${isStartDay ? '4px' : '0px'} ${isEndDay ? '4px' : '0px'} ${isEndDay ? '4px' : '0px'} ${isStartDay ? '4px' : '0px'}`,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                cursor: 'pointer',
                                zIndex: hoveredItem?.id === item.id ? 20 : 1,
                                transition: 'all 0.1s ease',
                                transform: hoveredItem?.id === item.id ? hoverScale : 'scale(1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.55rem',
                                fontWeight: 900,
                                color: '#ffffff'
                              }}
                            >
                              {isStartDay && (
                                <span>
                                  {item.progress}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

      {/* ─── HOVER OVERLAY GANTT TOOLTIP ─── */}
      {hoveredItem && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: 12,
          fontSize: '0.78rem',
          zIndex: 99999,
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
            <span style={{ fontWeight: 800, color: hoveredItem.source === 'otm' ? '#38bdf8' : hoveredItem.source === 'oti' ? '#c084fc' : '#4ade80' }}>
              {hoveredItem.code}
            </span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              background: hoveredItem.status === 'Culminado' ? 'rgba(34,197,94,0.2)' : hoveredItem.status === 'En Proceso' ? 'rgba(100,116,139,0.2)' : 'rgba(239,68,68,0.2)',
              color: hoveredItem.status === 'Culminado' ? '#4ade80' : hoveredItem.status === 'En Proceso' ? '#cbd5e1' : '#f87171'
            }}>
              {hoveredItem.status} ({hoveredItem.progress}%)
            </span>
          </div>

          {/* Body */}
          <div style={{ fontWeight: 600, color: '#f8fafc', lineHeight: '1.3' }}>
            {hoveredItem.description}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4, fontSize: '0.72rem', color: '#94a3b8' }}>
            <div>
              <strong>Tipo:</strong> {hoveredItem.type}
            </div>
            <div>
              <strong>Especialidad:</strong> {hoveredItem.specialty}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong>Responsable:</strong> {hoveredItem.responsible}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong>Período:</strong> {new Date(hoveredItem.startDate).toLocaleDateString('es')} al {new Date(hoveredItem.endDate).toLocaleDateString('es')}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong>Duración:</strong> {hoveredItem.durationDays} día(s)
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
