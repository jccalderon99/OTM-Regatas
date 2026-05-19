import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { DEMO_USERS } from '../../lib/demoData';

export default function AttendanceTable() {
  const { records, updateRecord } = useAttendance();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Solamente personal técnico (operativos)
  const technicians = DEMO_USERS.filter(u => u.role === 'technician');
  
  // Agrupar por especialidad
  const grouped = technicians.reduce((acc, tech) => {
    const spec = tech.position || 'Otros';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(tech);
    return acc;
  }, {} as Record<string, typeof technicians>);

  // Ordenar A-Z
  Object.keys(grouped).forEach(spec => {
    grouped[spec].sort((a, b) => a.full_name.localeCompare(b.full_name));
  });

  const specs = Object.keys(grouped).sort();

  const handleEditTime = (recordId: string, field: 'check_in_time' | 'check_out_time', val: string) => {
    updateRecord(recordId, { [field]: val });
  };

  const handleAddTag = (recordId: string, currentTags: string[], newTag: string) => {
    if (!newTag.trim() || currentTags.includes(newTag.trim())) return;
    updateRecord(recordId, { tags: [...currentTags, newTag.trim()] });
  };

  const handleRemoveTag = (recordId: string, currentTags: string[], tagToRemove: string) => {
    updateRecord(recordId, { tags: currentTags.filter(t => t !== tagToRemove) });
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ingreso y Salida del Personal</h1>
        <input 
          type="date" 
          className="form-input" 
          value={filterDate} 
          onChange={e => setFilterDate(e.target.value)}
          style={{ width: 'auto' }}
        />
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {specs.map(spec => (
          <details key={spec} className="attendance-group" open>
            <summary style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.02)', fontWeight: 700, cursor: 'pointer', borderBottom: '1px solid var(--border)', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
              <span>{spec}</span>
              <span style={{ color: 'var(--text-muted)' }}>({grouped[spec].length})</span>
            </summary>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Personal</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, width: 140 }}>Ingreso</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, width: 140 }}>Salida</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Etiquetas</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[spec].map(tech => {
                    const record = records.find(r => r.user_id === tech.id && r.date === filterDate);
                    const isAbsent = !record?.check_in_time;
                    
                    return (
                      <tr key={tech.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 500 }}>
                          {tech.full_name}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <input 
                            type="time" 
                            className="form-input" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                            value={record?.check_in_time || ''}
                            onChange={e => record && handleEditTime(record.id, 'check_in_time', e.target.value)}
                            disabled={!record}
                          />
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <input 
                            type="time" 
                            className="form-input" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                            value={record?.check_out_time || ''}
                            onChange={e => record && handleEditTime(record.id, 'check_out_time', e.target.value)}
                            disabled={!record}
                          />
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isAbsent && <span className="urgency-badge urgency-high">Falta</span>}
                            {record?.tags.map(tag => (
                              <span key={tag} className="urgency-badge" style={{ background: tag === 'Tarde' ? '#fee2e2' : '#f1f5f9', color: tag === 'Tarde' ? '#b91c1c' : '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {tag}
                                <button onClick={() => handleRemoveTag(record.id, record.tags, tag)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, opacity: 0.5 }}>✕</button>
                              </span>
                            ))}
                            {record && (
                              <input 
                                type="text" 
                                placeholder="+ Etiqueta" 
                                className="form-input"
                                style={{ padding: '2px 8px', fontSize: '0.75rem', width: 80, height: 24, borderRadius: 12 }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleAddTag(record.id, record.tags, e.currentTarget.value);
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
