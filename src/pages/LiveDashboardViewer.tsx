import React, { useMemo, useEffect } from 'react';
import { useOTM } from '../context/OTMContext';
import { useRoutineActivity } from '../context/RoutineActivityContext';
import { useAuth } from '../context/AuthContext';

export default function LiveDashboardViewer() {
  const { otms, otis, users } = useOTM();
  const { records: routineRecords } = useRoutineActivity();
  const { user } = useAuth();

  // Helper to map urgency labels for OTM
  const getOTMUrgency = (urgency: string): string => {
    switch (urgency) {
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return 'Medio';
    }
  };

  // Helper to map OTM status to simplified dashboard status
  const getOTMStatusLabel = (status: string): string => {
    if (status === 'closed') return 'Finalizado';
    if (status === 'cancelled') return 'Cierre';
    if (status === 'scheduled' || status === 'in_progress') return 'Programado';
    return 'Pendiente';
  };

  // Compile and save live data to localStorage whenever dynamic records change
  const dataKey = useMemo(() => {
    // A. Map OTMs
    const mappedOtms = otms.map(o => {
      let techs = 'No Asignado';
      if (o.assigned_technicians && o.assigned_technicians.length > 0) {
        techs = o.assigned_technicians.map(t => t.technician?.full_name || 'Técnico').join(', ');
      } else if (o.technician_id) {
        const u = users.find(x => x.id === o.technician_id);
        techs = u ? u.full_name : 'Técnico';
      }

      const superName = o.supervisor_id 
        ? (users.find(x => x.id === o.supervisor_id)?.full_name || 'Supervisor')
        : 'Sin Asignar';

      // Clean failure type (e.g. "03. Electricista" -> "Electricidad")
      let cleanSpec = 'Otros';
      const fVal = (o.failure_type || '').toLowerCase();
      if (fVal.includes('electric') || fVal.includes('03.')) cleanSpec = 'Electricidad';
      else if (fVal.includes('carpinter') || fVal.includes('04.')) cleanSpec = 'Carpintería';
      else if (fVal.includes('gasfiter') || fVal.includes('06.')) cleanSpec = 'Gasfitería';
      else if (fVal.includes('albañil') || fVal.includes('07.')) cleanSpec = 'Albañilería';
      else if (fVal.includes('pint') || fVal.includes('08.')) cleanSpec = 'Pintura';
      else if (fVal.includes('jardin') || fVal.includes('05.')) cleanSpec = 'Jardinería';
      else if (fVal.includes('pisc') || fVal.includes('02.')) cleanSpec = 'Piscina';
      else if (fVal.includes('calder') || fVal.includes('01.')) cleanSpec = 'Calderos';

      // Calculate execution hours
      const execHours = o.net_execution_time ? Number((o.net_execution_time / 60).toFixed(2)) : 0;

      return {
        id: o.id,
        code: o.otm_code,
        activity_type: 'OTM',
        description: o.description,
        specialty: cleanSpec,
        location: (o.location || 'General').replace(/^\d+\.\s*/, ""),
        exact_location: o.exact_location || '',
        technician_names: techs,
        supervisor_name: superName,
        record_date: o.created_at.slice(0, 10),
        start_time: o.job_start_time,
        end_time: o.job_end_time,
        execution_time_hours: execHours,
        status: getOTMStatusLabel(o.status),
        raw_status: o.status,
        rating: o.conformity_rating || 0,
        urgency: getOTMUrgency(o.urgency),
        assignment_type: o.assignment_type || 'own',
        cancellation_reason: o.cancellation_reason || null
      };
    });

    // B. Map OTIs
    const mappedOtis = otis.map(o => {
      const techs = o.technician_ids && o.technician_ids.length > 0 
        ? o.technician_ids.map(tid => users.find(x => x.id === tid)?.full_name || 'Técnico').join(', ')
        : 'No Asignado';

      const execHours = o.status === 'completed' ? (o.estimated_time || 1) : 0;

      return {
        id: o.id,
        code: o.oti_code,
        activity_type: 'OTI',
        description: o.description,
        specialty: o.specialty,
        location: o.location.replace(/^\d+\.\s*/, ""),
        exact_location: o.exact_location || '',
        technician_names: techs,
        supervisor_name: o.supervisor_name || 'Supervisor',
        record_date: o.scheduled_date.slice(0, 10),
        start_time: o.scheduled_date,
        end_time: o.status === 'completed' ? o.scheduled_date : null,
        execution_time_hours: execHours,
        status: o.status === 'completed' ? 'Finalizado' : 'Programado',
        raw_status: o.status,
        rating: 0,
        urgency: 'Medio',
        assignment_type: 'own',
        cancellation_reason: null
      };
    });

    // C. Map Routine Records (Rutinarias)
    const mappedRoutines = routineRecords.map(r => {
      const u = users.find(x => x.id === r.technician_id || x.id === r.user_id);
      const techName = u ? u.full_name : 'Técnico';

      // Specialty formatting
      let spec = r.specialty;
      if (spec === 'Calderos') spec = 'Calderos';
      else if (spec === 'Piscina') spec = 'Piscina';
      else if (spec === 'Electricidad') spec = 'Electricidad';
      else if (spec === 'Gasfitería') spec = 'Gasfitería';
      else if (spec === 'Jardinería') spec = 'Jardinería';

      // Location auto-assignment
      let loc = '056. Polideportivo - al exterior del Club';
      if (r.specialty === 'Piscina') loc = '031. Piscina Olímpica y Patera';
      else if (r.specialty === 'Calderos') loc = '017. Edificio de servicios';

      // Duration calculation
      let diffHours = 1.0;
      if (r.start_time && r.end_time) {
        const [sh, sm] = r.start_time.split(':').map(Number);
        const [eh, em] = r.end_time.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
          diffHours = Number((Math.max(10, diffMinutes) / 60).toFixed(2));
          if (diffHours < 0) diffHours += 24; // overnight boundary
        }
      }

      const idSuffix = r.id.startsWith('rec-') ? r.id.replace('rec-', '').slice(-6) : r.id.slice(-6);

      return {
        id: r.id,
        code: `RUT-${idSuffix.toUpperCase()}`,
        activity_type: 'RUTINARIA',
        description: `${r.specialty} — ${r.sub_specialty}: ${r.activities_executed?.join(', ') || ''}${r.free_text_activity ? ' (' + r.free_text_activity + ')' : ''}`,
        specialty: spec,
        location: loc.replace(/^\d+\.\s*/, ""),
        exact_location: r.sub_specialty || '',
        technician_names: techName,
        supervisor_name: 'Sistema',
        record_date: r.record_date,
        start_time: `${r.record_date}T${r.start_time}:00`,
        end_time: r.end_time ? `${r.record_date}T${r.end_time}:00` : null,
        execution_time_hours: diffHours,
        status: 'Finalizado',
        raw_status: 'completed',
        rating: 5,
        urgency: 'Bajo',
        assignment_type: 'own',
        cancellation_reason: null
      };
    });

    // D. Assemble consolidated data
    const unifiedActivities = [...mappedOtms, ...mappedOtis, ...mappedRoutines];

    const internalData = {
      activities: unifiedActivities,
      otmsCount: mappedOtms.length,
      otisCount: mappedOtis.length,
      routinesCount: mappedRoutines.length,
      totalCount: unifiedActivities.length,
      lastUpdated: new Date().toLocaleString()
    };

    localStorage.setItem('internal_report_data', JSON.stringify(internalData));

    // We return a string fingerprint to reload iframe only when actual record counts or completion status changes
    const closedCount = otms.filter(o => o.status === 'closed').length;
    return `${otms.length}-${otis.length}-${routineRecords.length}-${closedCount}`;
  }, [otms, otis, routineRecords, users]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 0px)', display: 'flex', flexDirection: 'column', background: '#0a0e1a' }}>
      <iframe
        key={dataKey}
        src={`/reports/dashboard-interno.html?embedded=true&v=${Date.now()}`}
        style={{ width: '100%', height: '100vh', border: 'none', background: '#0a0e1a' }}
        title="Dashboard Supabase Real-time"
      />
    </div>
  );
}
