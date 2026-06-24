import { useState, useMemo } from 'react';
import { useOTM } from '../../context/OTMContext';

interface MultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

function MultiSelectItem({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        background: checked 
          ? 'rgba(78, 181, 230, 0.12)' 
          : hovered 
            ? 'var(--bg-primary)' 
            : 'transparent',
        color: checked ? 'var(--accent-blue)' : 'var(--text-secondary)',
        fontWeight: checked ? 600 : 400,
        transition: 'all 0.15s',
        userSelect: 'none'
      }}
    >
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={() => {}} 
        style={{ 
          cursor: 'pointer',
          accentColor: 'var(--accent-blue)',
          width: '14px',
          height: '14px',
          margin: 0
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function MultiSelectDropdown({ label, options, selectedValues, onChange, placeholder }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredAll, setHoveredAll] = useState(false);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;

  return (
    <div style={{ position: 'relative', minWidth: 200, flex: '1 1 200px' }}>
      <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-blue-glow)' : 'none',
          borderRadius: '10px',
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'all 0.2s',
          minHeight: '40px'
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap', 
          maxWidth: '170px',
          color: selectedValues.length > 0 ? 'var(--text-primary)' : '#94a3b8'
        }}>
          {selectedValues.length === 0 
            ? placeholder 
            : selectedValues.length === options.length 
              ? `Todos (${options.length})` 
              : `${selectedValues.length} seleccionados`
          }
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {/* Backdrop to close */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
        />
      )}

      {/* Options Dropdown list */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {/* Select All Option */}
          <div 
            onClick={handleSelectAll}
            onMouseEnter={() => setHoveredAll(true)}
            onMouseLeave={() => setHoveredAll(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderBottom: '1px solid var(--border)',
              marginBottom: '6px',
              background: hoveredAll ? 'var(--bg-primary)' : 'transparent',
              color: 'var(--text-primary)',
              transition: 'all 0.15s',
              userSelect: 'none'
            }}
          >
            <input 
              type="checkbox" 
              checked={isAllSelected} 
              onChange={() => {}} 
              style={{ 
                cursor: 'pointer',
                accentColor: 'var(--accent-blue)',
                width: '14px',
                height: '14px',
                margin: 0
              }}
            />
            <span>{isAllSelected ? 'Desmarcar todos' : 'Marcar todos'}</span>
          </div>

          {/* Option list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.map(opt => (
              <MultiSelectItem 
                key={opt}
                label={opt}
                checked={selectedValues.includes(opt)}
                onClick={() => toggleOption(opt)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetDashboard() {
  const { opexBudget, capexBudget, preventivePlan, otms, users } = useOTM();
  const [activeTab, setActiveTab] = useState<'overview' | 'opex' | 'capex' | 'supplies'>('overview');
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [opexPage, setOpexPage] = useState(1);
  const [capexPage, setCapexPage] = useState(1);
  const [suppliesPage, setSuppliesPage] = useState(1);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('');
  
  const ITEMS_PER_PAGE = 15;

  // --- FILTERED DATA ---
  const filteredOpex = useMemo(() => {
    return opexBudget.filter(item => {
      const matchSearch = searchTerm === '' || 
        (item.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         item.descripcionArticulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.descripcionCtaContable?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchPeriod = selectedPeriod === '' || item.periodo === selectedPeriod;
      const matchCC = selectedCostCenters.length === 0 || selectedCostCenters.includes(item.cCosto);
      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(item.areaPresupuesto || '');
      return matchSearch && matchPeriod && matchCC && matchArea;
    });
  }, [opexBudget, searchTerm, selectedPeriod, selectedCostCenters, selectedAreas]);

  const filteredCapex = useMemo(() => {
    return capexBudget.filter(item => {
      const matchSearch = searchTerm === '' || 
        (item.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         item.descripcionArticulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.descripcionCtaCont?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchPeriod = selectedPeriod === '' || item.periodo === selectedPeriod;
      const matchCC = selectedCostCenters.length === 0 || selectedCostCenters.includes(item.cCosto);
      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(item.areaPpto || '');
      return matchSearch && matchPeriod && matchCC && matchArea;
    });
  }, [capexBudget, searchTerm, selectedPeriod, selectedCostCenters, selectedAreas]);

  const filteredPreventive = useMemo(() => {
    return preventivePlan.filter(item => {
      let linkedArea = '';
      let linkedCC = '';
      if (item.budgetItemLinkId) {
        if (item.budgetItemLinkType === 'OPEX') {
          const opt = opexBudget.find(b => b.id === item.budgetItemLinkId);
          if (opt) {
            linkedArea = opt.areaPresupuesto || '';
            linkedCC = opt.cCosto;
          }
        } else if (item.budgetItemLinkType === 'CAPEX') {
          const cpt = capexBudget.find(b => b.id === item.budgetItemLinkId);
          if (cpt) {
            linkedArea = cpt.areaPpto;
            linkedCC = cpt.cCosto;
          }
        }
      }
      
      const matchCC = selectedCostCenters.length === 0 || selectedCostCenters.includes(linkedCC);
      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(linkedArea);
      return matchCC && matchArea;
    });
  }, [preventivePlan, opexBudget, capexBudget, selectedCostCenters, selectedAreas]);

  // --- KPI CALCULATIONS ---
  const totalOpex = useMemo(() => filteredOpex.reduce((sum, item) => sum + Math.abs(item.importeEEFF || 0), 0), [filteredOpex]);
  const totalCapex = useMemo(() => filteredCapex.reduce((sum, item) => sum + (item.importe || 0), 0), [filteredCapex]);
  const totalBudget = totalOpex + totalCapex;

  // Real spent/executed from Preventive Plan (monto_sin_igv of PM items)
  const totalExecuted = useMemo(() => {
    return filteredPreventive.reduce((sum, item) => sum + (item.monto_sin_igv || 0), 0);
  }, [filteredPreventive]);

  const totalProjected = useMemo(() => {
    return filteredPreventive.reduce((sum, item) => sum + (item.presupuesto_proyectado || 0), 0);
  }, [filteredPreventive]);

  // --- MATERIAL EXPENSES LOGIC & KPIs ---
  const allSupplies = useMemo(() => {
    const list: Array<{
      id: string;
      otmId: string;
      otmCode: string;
      description: string;
      specialty: string;
      location: string;
      area: string;
      date: string;
      itemCode: string | number;
      name: string;
      unit: string;
      unitPrice: number;
      quantity: number;
      totalCost: number;
      technicianName: string;
    }> = [];

    otms.forEach(otm => {
      if (otm.supplies_used && otm.supplies_used.length > 0) {
        otm.supplies_used.forEach((s, idx) => {
          let techName = 'Sin Asignar';
          if (otm.technician) {
            techName = otm.technician.full_name;
          } else if (otm.technician_id) {
            const u = users.find(x => x.id === otm.technician_id);
            techName = u ? u.full_name : 'Técnico';
          }

          // Format clean specialty name
          let cleanSpec = 'Otros';
          const fVal = (otm.failure_type || '').toLowerCase();
          if (fVal.includes('electric') || fVal.includes('03.')) cleanSpec = 'Electricidad';
          else if (fVal.includes('carpinter') || fVal.includes('04.')) cleanSpec = 'Carpintería';
          else if (fVal.includes('gasfiter') || fVal.includes('06.')) cleanSpec = 'Gasfitería';
          else if (fVal.includes('albañil') || fVal.includes('07.')) cleanSpec = 'Albañilería';
          else if (fVal.includes('pint') || fVal.includes('08.')) cleanSpec = 'Pintura';
          else if (fVal.includes('jardin') || fVal.includes('05.')) cleanSpec = 'Jardinería';
          else if (fVal.includes('pisc') || fVal.includes('02.')) cleanSpec = 'Piscina';
          else if (fVal.includes('calder') || fVal.includes('01.')) cleanSpec = 'Calderos';

          list.push({
            id: `${otm.id}-supply-${idx}`,
            otmId: otm.id,
            otmCode: otm.otm_code,
            description: otm.description,
            specialty: cleanSpec,
            location: otm.location ? otm.location.replace(/^\d+\.\s*/, "") : 'General',
            area: otm.area_sector || '',
            date: otm.job_end_time ? otm.job_end_time.slice(0, 10) : otm.created_at.slice(0, 10),
            itemCode: s.itemCode || '—',
            name: s.name,
            unit: s.unit,
            unitPrice: s.unitPrice || 0,
            quantity: s.quantity,
            totalCost: s.totalCost || ((s.unitPrice || 0) * s.quantity),
            technicianName: techName,
          });
        });
      }
    });
    return list;
  }, [otms, users]);

  // Filter supplies list
  const filteredSupplies = useMemo(() => {
    return allSupplies.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.otmCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const otmMonth = item.date.slice(0, 7); // e.g. "2026-05"
      const matchPeriod = selectedPeriod === '' || otmMonth === selectedPeriod;
      
      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(item.area);
      const matchSpecialty = selectedSpecialtyFilter === '' || item.specialty === selectedSpecialtyFilter;

      return matchSearch && matchPeriod && matchArea && matchSpecialty;
    });
  }, [allSupplies, searchTerm, selectedPeriod, selectedAreas, selectedSpecialtyFilter]);

  // KPIs
  const suppliesTotalCost = useMemo(() => filteredSupplies.reduce((sum, s) => sum + s.totalCost, 0), [filteredSupplies]);
  const suppliesTotalQuantity = useMemo(() => filteredSupplies.reduce((sum, s) => sum + s.quantity, 0), [filteredSupplies]);
  const suppliesUniqueOtmsCount = useMemo(() => {
    const set = new Set(filteredSupplies.map(s => s.otmId));
    return set.size;
  }, [filteredSupplies]);
  const suppliesAvgCostPerOtm = useMemo(() => {
    return suppliesUniqueOtmsCount > 0 ? (suppliesTotalCost / suppliesUniqueOtmsCount) : 0;
  }, [suppliesTotalCost, suppliesUniqueOtmsCount]);

  // Specialty breakdown for supplies chart
  const suppliesSpecialtyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSupplies.forEach(s => {
      map[s.specialty] = (map[s.specialty] || 0) + s.totalCost;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSupplies]);

  // Top 5 materials used
  const suppliesTopMaterials = useMemo(() => {
    const map: Record<string, { totalCost: number; quantity: number; unit: string }> = {};
    filteredSupplies.forEach(s => {
      if (!map[s.name]) {
        map[s.name] = { totalCost: 0, quantity: 0, unit: s.unit };
      }
      map[s.name].totalCost += s.totalCost;
      map[s.name].quantity += s.quantity;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [filteredSupplies]);

  // Paginated supplies
  const paginatedSupplies = useMemo(() => {
    const start = (suppliesPage - 1) * ITEMS_PER_PAGE;
    return filteredSupplies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSupplies, suppliesPage]);

  const suppliesTotalPages = Math.ceil(filteredSupplies.length / ITEMS_PER_PAGE) || 1;


  // Unique Filter Values
  const periods = useMemo(() => {
    const set = new Set<string>();
    opexBudget.forEach(i => i.periodo && set.add(i.periodo));
    capexBudget.forEach(i => i.periodo && set.add(i.periodo));
    return Array.from(set).sort();
  }, [opexBudget, capexBudget]);

  const costCenters = useMemo(() => {
    const set = new Set<string>();
    opexBudget.forEach(i => i.cCosto && set.add(i.cCosto));
    capexBudget.forEach(i => i.cCosto && set.add(i.cCosto));
    return Array.from(set).sort();
  }, [opexBudget, capexBudget]);

  const budgetAreas = useMemo(() => {
    const set = new Set<string>();
    opexBudget.forEach(i => i.areaPresupuesto && set.add(i.areaPresupuesto));
    capexBudget.forEach(i => i.areaPpto && set.add(i.areaPpto));
    return Array.from(set).sort();
  }, [opexBudget, capexBudget]);

  // --- MONTHLY DATA FOR CHART ---
  const monthlyData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
    return months.map(m => {
      const opexSum = opexBudget.filter(item => item.periodo === m).reduce((sum, item) => sum + Math.abs(item.importeEEFF || 0), 0);
      const capexSum = capexBudget.filter(item => item.periodo === m).reduce((sum, item) => sum + (item.importe || 0), 0);
      return {
        month: m.split('-')[1], // Just show '01', '02'
        name: m === '2026-01' ? 'Ene' : m === '2026-02' ? 'Feb' : m === '2026-03' ? 'Mar' : m === '2026-04' ? 'Abr' : m === '2026-05' ? 'May' : m === '2026-06' ? 'Jun' : m === '2026-07' ? 'Jul' : m === '2026-08' ? 'Ago' : m === '2026-09' ? 'Set' : m === '2026-10' ? 'Oct' : m === '2026-11' ? 'Nov' : 'Dic',
        opex: opexSum,
        capex: capexSum,
        total: opexSum + capexSum
      };
    });
  }, [opexBudget, capexBudget]);

  // --- COST CENTER BREAKDOWN FOR CHART ---
  const ccBreakdown = useMemo(() => {
    const opexCC = costCenters.map(cc => {
      const sum = opexBudget.filter(item => item.cCosto === cc).reduce((s, i) => s + Math.abs(i.importeEEFF || 0), 0);
      return { name: cc.split('-')[1] || cc, full: cc, value: sum, type: 'OPEX' };
    }).filter(x => x.value > 0);

    const capexCC = costCenters.map(cc => {
      const sum = capexBudget.filter(item => item.cCosto === cc).reduce((s, i) => s + (i.importe || 0), 0);
      return { name: cc.split('-')[1] || cc, full: cc, value: sum, type: 'CAPEX' };
    }).filter(x => x.value > 0);

    return { opexCC, capexCC };
  }, [opexBudget, capexBudget, costCenters]);

  // Pagination lists
  const paginatedOpex = useMemo(() => {
    const start = (opexPage - 1) * ITEMS_PER_PAGE;
    return filteredOpex.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOpex, opexPage]);

  const paginatedCapex = useMemo(() => {
    const start = (capexPage - 1) * ITEMS_PER_PAGE;
    return filteredCapex.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCapex, capexPage]);

  const opexTotalPages = Math.ceil(filteredOpex.length / ITEMS_PER_PAGE) || 1;
  const capexTotalPages = Math.ceil(filteredCapex.length / ITEMS_PER_PAGE) || 1;

  // Format currency helpers
  const formatSoles = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val);
  };

  // SVG Chart Helper dimensions
  const chartW = 550;
  const chartH = 220;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const maxMonthly = Math.max(...monthlyData.map(d => d.total), 1);
  const toY = (v: number) => padT + innerH - (v / maxMonthly) * innerH;

  return (
    <div style={{ paddingBottom: 40, paddingTop: 10 }} className="fade-in">

      {/* KPI GRID */}
      <div className="kpi-grid" style={{ marginBottom: 24, gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card hover-glow" style={{ '--kpi-color': 'var(--accent-blue)', borderLeft: '4px solid var(--accent-blue)', padding: '12px 16px' } as any}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Presupuesto Total Aprobado</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>{formatSoles(totalBudget)}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>Año Fiscal 2026</div>
            </div>
            <span style={{ fontSize: '1.4rem' }}>💵</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ '--kpi-color': '#a855f7', borderLeft: '4px solid #a855f7', padding: '12px 16px' } as any}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Presupuesto OPEX (Gastos)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: '#a855f7' }}>{formatSoles(totalOpex)}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>92 partidas operativas</div>
            </div>
            <span style={{ fontSize: '1.4rem' }}>⚙️</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ '--kpi-color': '#06b6d4', borderLeft: '4px solid #06b6d4', padding: '12px 16px' } as any}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Presupuesto CAPEX (Inversión)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: '#06b6d4' }}>{formatSoles(totalCapex)}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>53 proyectos capitalizables</div>
            </div>
            <span style={{ fontSize: '1.4rem' }}>🧱</span>
          </div>
        </div>

        <div className="glass-card hover-glow" style={{ '--kpi-color': 'var(--accent-green)', borderLeft: '4px solid var(--accent-green)', padding: '12px 16px' } as any}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Servicios Preventivos Adjudicados</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: 'var(--accent-green)' }}>{formatSoles(totalExecuted)}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {formatSoles(totalProjected)} Proyectado en Plan
              </div>
            </div>
            <span style={{ fontSize: '1.4rem' }}>📝</span>
          </div>
        </div>
      </div>

      {/* FILTER PANEL (When not in overview tab, or general search) */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 20 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Búsqueda General</label>
          <input 
            className="form-input" 
            placeholder={activeTab === 'supplies' ? "Buscar por material, código o OTM..." : "Buscar por concepto, artículo o cuenta..."} 
            value={searchTerm} 
            onChange={e => { 
              setSearchTerm(e.target.value); 
              setOpexPage(1); 
              setCapexPage(1); 
              setSuppliesPage(1);
            }} 
          />
        </div>

        <div style={{ minWidth: 140 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Periodo / Mes</label>
          <select 
            className="form-select" 
            value={selectedPeriod} 
            onChange={e => { 
              setSelectedPeriod(e.target.value); 
              setOpexPage(1); 
              setCapexPage(1); 
              setSuppliesPage(1);
            }}
          >
            <option value="">{activeTab === 'supplies' ? "Todos los meses" : "Todos los Meses"}</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {activeTab === 'supplies' ? (
          <div style={{ minWidth: 160 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Especialidad</label>
            <select
              className="form-select"
              value={selectedSpecialtyFilter}
              onChange={e => { setSelectedSpecialtyFilter(e.target.value); setSuppliesPage(1); }}
            >
              <option value="">Todas las especialidades</option>
              {['Electricidad', 'Pintura', 'Gasfitería', 'Carpintería', 'Albañilería', 'Otros'].map(esp => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
          </div>
        ) : (
          <MultiSelectDropdown 
            label="Centro de Costo"
            options={costCenters}
            selectedValues={selectedCostCenters}
            onChange={vals => { setSelectedCostCenters(vals); setOpexPage(1); setCapexPage(1); }}
            placeholder="Todos los Centros"
          />
        )}

        <MultiSelectDropdown 
          label="Area"
          options={budgetAreas}
          selectedValues={selectedAreas}
          onChange={vals => { setSelectedAreas(vals); setOpexPage(1); setCapexPage(1); setSuppliesPage(1); }}
          placeholder="Todas las Áreas"
        />

        {(searchTerm || selectedPeriod || selectedCostCenters.length > 0 || selectedAreas.length > 0 || selectedSpecialtyFilter) && (
          <button 
            className="btn btn-secondary" 
            style={{ alignSelf: 'flex-end', height: 38, padding: '0 16px' }}
            onClick={() => { 
              setSearchTerm(''); 
              setSelectedPeriod(''); 
              setSelectedCostCenters([]); 
              setSelectedAreas([]); 
              setSelectedSpecialtyFilter('');
            }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'overview', label: '📊 Resumen General', desc: 'Distribución y gráficos' },
          { id: 'supplies', label: '🛠️ Gastos de Materiales', desc: `S/ ${suppliesTotalCost.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} en materiales` },
          { id: 'opex', label: '⚙️ OPEX (Data Operativa)', desc: `${filteredOpex.length} partidas filtradas` },
          { id: 'capex', label: '🧱 CAPEX (Data Inversión)', desc: `${filteredCapex.length} partidas filtradas` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: activeTab === tab.id ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid transparent',
              background: activeTab === tab.id ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500,
              textAlign: 'left',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontSize: '0.85rem' }}>{tab.label}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          {/* MONTHLY DISTRIBUTION CHART */}
          <div className="glass-card hover-glow" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Distribución de Presupuesto Mensual</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 20 }}>Comparación de presupuesto operativo (OPEX) y proyectos de inversión (CAPEX)</p>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#a855f7', display: 'inline-block' }} /> OPEX
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#06b6d4', display: 'inline-block' }} /> CAPEX
              </span>
            </div>

            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 0' }}>
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                <line key={i} x1={padL} x2={chartW - padR} y1={toY(f * maxMonthly)} y2={toY(f * maxMonthly)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {/* Y Axis Labels */}
              {[0, Math.round(maxMonthly / 2), maxMonthly].map((v, i) => (
                <text key={i} x={padL - 8} y={toY(v) + 3} fill="#94a3b8" fontSize="8" fontWeight="600" textAnchor="end">{formatSoles(v)}</text>
              ))}
              
              {/* Stacked Bars */}
              {monthlyData.map((d, i) => {
                const barWidth = 18;
                const gap = (innerW / monthlyData.length);
                const x = padL + i * gap + (gap - barWidth) / 2;
                
                const opexHeight = (d.opex / maxMonthly) * innerH;
                const capexHeight = (d.capex / maxMonthly) * innerH;
                
                const yOpex = toY(0) - opexHeight;
                const yCapex = yOpex - capexHeight;
                
                return (
                  <g key={d.month}>
                    {/* OPEX Bar */}
                    {d.opex > 0 && (
                      <rect 
                        x={x} 
                        y={yOpex} 
                        width={barWidth} 
                        height={opexHeight} 
                        fill="#a855f7" 
                        rx={capexHeight === 0 ? 3 : 0} 
                      >
                        <title>{`OPEX: ${formatSoles(d.opex)}`}</title>
                      </rect>
                    )}
                    {/* CAPEX Bar */}
                    {d.capex > 0 && (
                      <rect 
                        x={x} 
                        y={yCapex} 
                        width={barWidth} 
                        height={capexHeight} 
                        fill="#06b6d4" 
                        rx={3} 
                      >
                        <title>{`CAPEX: ${formatSoles(d.capex)}`}</title>
                      </rect>
                    )}
                    {/* X Axis Label */}
                    <text x={x + barWidth / 2} y={chartH - 8} fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle">{d.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* COST CENTER BREAKDOWN */}
          <div className="glass-card hover-glow" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Distribución por Centro de Costo</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 20 }}>Presupuesto total desglosado por áreas organizacionales del Club</p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 190, paddingRight: 6 }}>
              {costCenters.map((cc, i) => {
                const opexSum = opexBudget.filter(item => item.cCosto === cc).reduce((s, i) => s + Math.abs(i.importeEEFF || 0), 0);
                const capexSum = capexBudget.filter(item => item.cCosto === cc).reduce((s, i) => s + (i.importe || 0), 0);
                const totalCC = opexSum + capexSum;
                if (totalCC === 0) return null;
                
                const percent = ((totalCC / totalBudget) * 100).toFixed(1);
                const color = i % 2 === 0 ? '#a855f7' : '#06b6d4';

                return (
                  <div key={cc} style={{ fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{cc}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formatSoles(totalCC)} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 400 }}>({percent}%)</span></span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: `${(opexSum / totalCC) * 100}%`, height: '100%', background: '#a855f7' }} title="OPEX" />
                      <div style={{ width: `${(capexSum / totalCC) * 100}%`, height: '100%', background: '#06b6d4' }} title="CAPEX" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OPEX */}
      {activeTab === 'opex' && (
        <div className="glass-card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Partidas OPEX (Data Operativa)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mostrando {filteredOpex.length} registros</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px' }}>Periodo</th>
                  <th style={{ padding: '12px 16px' }}>Concepto</th>
                  <th style={{ padding: '12px 16px' }}>C. Costo</th>
                  <th style={{ padding: '12px 16px' }}>Artículo / Descripción</th>
                  <th style={{ padding: '12px 16px' }}>Cta. Contable</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monto Aprobado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOpex.length > 0 ? paginatedOpex.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.periodo}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.concepto}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{item.cCosto}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcionArticulo || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div>{item.ctaContable}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.descripcionCtaContable}</div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#a855f7' }}>{formatSoles(Math.abs(item.importeEEFF || 0))}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros coincidentes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {opexTotalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={opexPage === 1} 
                onClick={() => setOpexPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Página {opexPage} de {opexTotalPages}</span>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={opexPage === opexTotalPages} 
                onClick={() => setOpexPage(p => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CAPEX */}
      {activeTab === 'capex' && (
        <div className="glass-card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Proyectos CAPEX (Data Inversión)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mostrando {filteredCapex.length} registros</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px' }}>Periodo</th>
                  <th style={{ padding: '12px 16px' }}>Concepto</th>
                  <th style={{ padding: '12px 16px' }}>C. Costo</th>
                  <th style={{ padding: '12px 16px' }}>Proyecto</th>
                  <th style={{ padding: '12px 16px' }}>Artículo / Descripción</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monto Aprobado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCapex.length > 0 ? paginatedCapex.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.periodo}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.concepto}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{item.cCosto}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{item.proyecto}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcionArticulo || '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#06b6d4' }}>{formatSoles(item.importe)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros coincidentes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {capexTotalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={capexPage === 1} 
                onClick={() => setCapexPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Página {capexPage} de {capexTotalPages}</span>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={capexPage === capexTotalPages} 
                onClick={() => setCapexPage(p => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SUPPLIES */}
      {activeTab === 'supplies' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* SUPPLIES KPI CARDS */}
          <div className="kpi-grid" style={{ gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="glass-card hover-glow" style={{ '--kpi-color': 'var(--accent-purple)', borderLeft: '4px solid var(--accent-purple)', padding: '12px 16px' } as any}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Costo Total Suministros Usados</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>{formatSoles(suppliesTotalCost)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>En OTMs finalizadas/cerradas</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>🔧</span>
              </div>
            </div>

            <div className="glass-card hover-glow" style={{ '--kpi-color': 'var(--accent-blue)', borderLeft: '4px solid var(--accent-blue)', padding: '12px 16px' } as any}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cantidad de Materiales Usados</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: 'var(--accent-blue)' }}>{suppliesTotalQuantity.toFixed(1)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>Suma de todas las unidades</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>📦</span>
              </div>
            </div>

            <div className="glass-card hover-glow" style={{ '--kpi-color': '#06b6d4', borderLeft: '4px solid #06b6d4', padding: '12px 16px' } as any}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Costo Promedio por OTM</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: '#06b6d4' }}>{formatSoles(suppliesAvgCostPerOtm)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>De OTMs con materiales</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>📈</span>
              </div>
            </div>

            <div className="glass-card hover-glow" style={{ '--kpi-color': 'var(--accent-green)', borderLeft: '4px solid var(--accent-green)', padding: '12px 16px' } as any}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OTMs con Materiales Registrados</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, color: 'var(--accent-green)' }}>{suppliesUniqueOtmsCount}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>Ordenes de Trabajo</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
              </div>
            </div>
          </div>

          {/* SUPPLIES CHARTS SECTION */}
          <div className="grid-2">
            {/* SPECIALTY EXPENSES BAR CHART */}
            <div className="glass-card hover-glow" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Gastos en Materiales por Especialidad</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 20 }}>Distribución del costo de suministros consumidos por cada rama técnica</p>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180, justifyContent: 'center' }}>
                {suppliesSpecialtyBreakdown.length > 0 ? (
                  suppliesSpecialtyBreakdown.map((sb, idx) => {
                    const maxVal = Math.max(...suppliesSpecialtyBreakdown.map(x => x.value), 1);
                    const percentWidth = (sb.value / maxVal) * 100;
                    const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                    const barColor = colors[idx % colors.length];

                    return (
                      <div key={sb.name} style={{ fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{sb.name}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{formatSoles(sb.value)}</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${percentWidth}%`, 
                              height: '100%', 
                              background: barColor, 
                              borderRadius: 4,
                              transition: 'width 0.5s ease-out'
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                    No hay datos de especialidades con los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>

            {/* TOP 5 MOST COSTLY MATERIALS */}
            <div className="glass-card hover-glow" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Top 5 Materiales de Mayor Gasto</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 20 }}>Suministros del almacén que representan el mayor desembolso económico</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {suppliesTopMaterials.length > 0 ? (
                  suppliesTopMaterials.map((m, idx) => (
                    <div 
                      key={m.name} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12, 
                        padding: '10px 14px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 8 
                      }}
                    >
                      <div 
                        style={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          background: 'rgba(139, 92, 246, 0.15)', 
                          color: '#8b5cf6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.8rem', 
                          fontWeight: 700 
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.name}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Consumo: {m.quantity.toFixed(1)} {m.unit}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', textAlign: 'right' }}>
                        {formatSoles(m.totalCost)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    No hay registros de suministros.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAILED LOGS TABLE */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Detalle de Consumos de Materiales en OTMs</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mostrando {filteredSupplies.length} registros</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 16px' }}>Código OTM</th>
                    <th style={{ padding: '12px 16px' }}>Fecha</th>
                    <th style={{ padding: '12px 16px' }}>Cod. Item</th>
                    <th style={{ padding: '12px 16px' }}>Material</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Costo Total</th>
                    <th style={{ padding: '12px 16px' }}>Especialidad</th>
                    <th style={{ padding: '12px 16px' }}>Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSupplies.length > 0 ? (
                    paginatedSupplies.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                          {s.otmCode}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{s.date}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{s.itemCode}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>
                          {s.name}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600 }}>{s.quantity} {s.unit}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>S/ {s.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6' }}>S/ {s.totalCost.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={`role-badge`} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.65rem' }}>
                            {s.specialty}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{s.technicianName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron registros de consumos con los filtros activos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            {suppliesTotalPages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={suppliesPage === 1} 
                  onClick={() => setSuppliesPage(p => p - 1)}
                >
                  ← Anterior
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Página {suppliesPage} de {suppliesTotalPages}
                </span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={suppliesPage === suppliesTotalPages} 
                  onClick={() => setSuppliesPage(p => p + 1)}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
