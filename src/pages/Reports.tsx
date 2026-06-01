import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useOTM } from '../context/OTMContext';
import { useRoutineActivity } from '../context/RoutineActivityContext';

export default function Reports() {
  const { otms, otis, users } = useOTM();
  const { records: routineRecords } = useRoutineActivity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');

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
    if (status === 'cancelled') return 'Cierre'; // Canceladas mapped to "Cierre" as requested
    if (status === 'scheduled' || status === 'in_progress') return 'Programado';
    return 'Pendiente';
  };

  // 1. VIRTUAL UNIFIED ADAPTER FOR SUPABASE LIVE DATA
  const handleOpenLiveDashboard = () => {
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
        rating: 5, // routines always satisfy criteria
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
    window.open('/reports/dashboard-interno.html', '_blank');
  };

  // 2. EXCEL BITÁCORA PARSER LOGIC (SheetJS)
  const parseExecutionTime = (timeStr: any): number => {
    if (!timeStr) return 0;
    let totalMin = 0;
    const hoursMatch = String(timeStr).match(/(\d+)\s*h/i);
    const minsMatch = String(timeStr).match(/(\d+)\s*min/i);
    if (hoursMatch) {
      totalMin += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minsMatch) {
      totalMin += parseInt(minsMatch[1], 10);
    }
    if (totalMin === 0) {
      const numberMatch = String(timeStr).match(/(\d+)/);
      if (numberMatch && String(timeStr).toLowerCase().includes('h')) {
        totalMin = parseInt(numberMatch[1], 10) * 60;
      } else if (numberMatch) {
        totalMin = parseInt(numberMatch[1], 10);
      }
    }
    return totalMin;
  };

  const parseResponseTime = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return val; // Excel serial date/time or raw days
    
    const str = String(val).toLowerCase().trim();
    if (str === 'sin datos' || str === 'n/a' || str === '-') return null;
    
    // Format 1: Time format like "hh:mm:ss" or "hh:mm" (e.g. "08:30:00", "24:15")
    if (str.includes(':')) {
      const parts = str.split(':').map(Number);
      if (parts.length >= 2 && parts.every(p => !isNaN(p))) {
        let hrs = parts[0];
        let mins = parts[1];
        let secs = parts.length > 2 ? parts[2] : 0;
        return (hrs * 3600 + mins * 60 + secs) / 86400; // convert to days
      }
    }
    
    // Format 2: Combined text format like "2 días 5 horas", "0 días 12 horas", "1 d 4 h"
    let totalDays = 0;
    let hasUnits = false;
    
    // Match all numbers and their trailing text units
    const regex = /([0-9.,]+)\s*([a-zñáéíóú]+)?/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const num = parseFloat(match[1].replace(',', '.'));
      if (isNaN(num)) continue;
      
      const unit = match[2] ? match[2].trim() : '';
      
      if (unit.startsWith('dia') || unit === 'd') {
        totalDays += num;
        hasUnits = true;
      } else if (unit.startsWith('hora') || unit === 'h' || unit === 'hr') {
        totalDays += num / 24;
        hasUnits = true;
      } else if (unit.startsWith('min') || unit === 'm') {
        totalDays += num / 1440;
        hasUnits = true;
      } else if (unit.startsWith('seg') || unit === 's') {
        totalDays += num / 86400;
        hasUnits = true;
      }
    }
    
    if (hasUnits) {
      return totalDays;
    }
    
    // Fallback: If it's just a raw number in string format (e.g., "2.5")
    const numMatch = str.match(/([0-9.,]+)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1].replace(',', '.'));
      if (!isNaN(num)) return num; // assume days
    }
    
    return null;
  };

  const handleExcelFile = (file: File) => {
    if (!file) return;
    setIsParsing(true);
    setParseMessage('Leyendo archivo Excel...');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Target Sheet: 'Orden de trabajos' or first available
        const sheetName = workbook.SheetNames.includes('Orden de trabajos') 
          ? 'Orden de trabajos' 
          : workbook.SheetNames[0];
          
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('No se encontró ninguna hoja de trabajo válida.');
        }

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        
        // Extract headers
        const headers: Record<number, string> = {};
        for (let c = 0; c <= range.e.c; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c })];
          if (cell) headers[c] = String(cell.v).trim();
        }

        // Initialize default column index offsets as fallbacks
        let colId = 0;
        let colDate = 1;
        let colArea = 3;
        let colSolicitante = 4;
        let colUbicacion = 6;
        let colUbExacta = 7;
        let colDesc = 8;
        let colEspecialidad = 9;
        let colPrioridad = 10;
        let colSupervisor = 12;
        let colTecPrincipal = 14;
        let colTecApoyo = 15;
        let colTipo = 16;
        let colProgramadoStatus = 17;
        let colEstado = 25;
        let colCalificacion = 27;
        let colTiempo = 34;
        let colConRQ = -1;
        let colPorRevisar = -1;
        let colAssignmentType = -1;
        let colObservaciones = 28; // Default to Column 29 "Obervación del usuario"
        let colHoraInicio = -1;
        let colHoraFin = -1;
        let colResponseTime = -1;

        // Scoring system for column matching to prevent secondary columns (like "Falla") from overwriting primary ones.
        let colIdScore = 0;
        let colDateScore = 0;
        let colAreaScore = 0;
        let colSolicitanteScore = 0;
        let colUbicacionScore = 0;
        let colUbExactaScore = 0;
        let colDescScore = 0;
        let colEspecialidadScore = 0;
        let colPrioridadScore = 0;
        let colSupervisorScore = 0;
        let colTecPrincipalScore = 0;
        let colTecApoyoScore = 0;
        let colTipoScore = 0;
        let colProgramadoStatusScore = 0;
        let colEstadoScore = 0;
        let colCalificacionScore = 0;
        let colTiempoScore = 0;
        let colObservacionesScore = 0;
        let colHoraInicioScore = 0;
        let colHoraFinScore = 0;
        let colResponseTimeScore = 0;

        // Perform dynamic column matching based on header keywords (extremely flexible)
        Object.entries(headers).forEach(([idxStr, val]) => {
          const c = parseInt(idxStr, 10);
          const v = val.toLowerCase().trim();
          
          // ID / Code matching
          let scoreId = 0;
          if (v === 'código' || v === 'codigo' || v === 'id' || v === 'ot' || v === 'nº' || v === 'n°') scoreId = 3;
          else if (v.includes('código') || v.includes('codigo')) scoreId = 2;
          else if (v.includes('ot') || v.includes('nº') || v.includes('n°')) scoreId = 1;
          if (scoreId > colIdScore) {
            colId = c;
            colIdScore = scoreId;
          }

          // Date matching
          let scoreDate = 0;
          if (v === 'fecha' || v === 'marca temporal' || v === 'timestamp' || v === 'registro') scoreDate = 3;
          else if (v.includes('creación') || v.includes('creacion') || v.includes('registro')) scoreDate = 2;
          else if (v.includes('fecha') && !v.includes('programación') && !v.includes('programacion') && !v.includes('inicio') && !v.includes('fin')) scoreDate = 1;
          if (scoreDate > colDateScore) {
            colDate = c;
            colDateScore = scoreDate;
          }

          // Area matching
          let scoreArea = 0;
          if (v === 'área solicitante' || v === 'area solicitante' || v === 'área' || v === 'area') scoreArea = 3;
          else if (v.includes('área') || v.includes('area')) scoreArea = 2;
          else if (v.includes('solicitante')) scoreArea = 1;
          if (scoreArea > colAreaScore) {
            colArea = c;
            colAreaScore = scoreArea;
          }

          // Solicitante matching
          let scoreSolicitante = 0;
          if (v === 'nombre usuario' || v === 'solicitante') scoreSolicitante = 3;
          else if (v.includes('solicitante')) scoreSolicitante = 2;
          else if (v.includes('nombre') || v.includes('usuario')) scoreSolicitante = 1;
          if (scoreSolicitante > colSolicitanteScore) {
            colSolicitante = c;
            colSolicitanteScore = scoreSolicitante;
          }

          // Ubicacion Exacta matching
          let scoreUbExacta = 0;
          if (v === 'ubicación exacta' || v === 'ubicacion exacta' || v === 'ub. exacta' || v === 'ub exacta') scoreUbExacta = 3;
          else if (v.includes('exacta') || v.includes('exacto')) scoreUbExacta = 2;
          if (scoreUbExacta > colUbExactaScore) {
            colUbExacta = c;
            colUbExactaScore = scoreUbExacta;
          }

          // Ubicacion matching
          let scoreUbicacion = 0;
          if (v === 'ubicación' || v === 'ubicacion' || v === 'lugar' || v === 'zona') scoreUbicacion = 3;
          else if ((v.includes('ubicación') || v.includes('ubicacion')) && !v.includes('exacta')) scoreUbicacion = 2;
          else if (v.includes('lugar') || v.includes('zona')) scoreUbicacion = 1;
          if (scoreUbicacion > colUbicacionScore) {
            colUbicacion = c;
            colUbicacionScore = scoreUbicacion;
          }

          // Descripcion matching
          let scoreDesc = 0;
          if (v === 'descripción de trabajo' || v === 'descripcion de trabajo' || v === 'descripción' || v === 'descripcion') scoreDesc = 3;
          else if (v.includes('descripción') || v.includes('descripcion') || v.includes('problema') || v.includes('detalle')) scoreDesc = 2;
          else if (v === 'desc' || v.includes('asunto')) scoreDesc = 1;
          if (scoreDesc > colDescScore) {
            colDesc = c;
            colDescScore = scoreDesc;
          }

          // Specialty matching (critical to avoid being overwritten by failure text in "Falla" column)
          let scoreEsp = 0;
          if (v === 'especialidad del trabajo' || v === 'especialidad' || v === 'especialidad de la ot') scoreEsp = 4;
          else if (v.includes('especialidad')) scoreEsp = 3;
          else if (v.includes('rama') || v.includes('rubro') || v === 'esp') scoreEsp = 2;
          else if (v.includes('falla') && !v.includes('descripción') && !v.includes('descripcion') && !v.includes('detalle')) scoreEsp = 1;
          if (scoreEsp > colEspecialidadScore) {
            colEspecialidad = c;
            colEspecialidadScore = scoreEsp;
          }

          // Prioridad matching
          let scorePrioridad = 0;
          if (v === 'prioridad de trabajo' || v === 'prioridad' || v === 'urgencia' || v === 'criticidad') scorePrioridad = 3;
          else if (v.includes('prioridad') || v.includes('urgencia')) scorePrioridad = 2;
          if (scorePrioridad > colPrioridadScore) {
            colPrioridad = c;
            colPrioridadScore = scorePrioridad;
          }

          // Supervisor matching
          let scoreSupervisor = 0;
          if (v === 'supervisor' && c > 0) scoreSupervisor = 4; // Col 13 is the true supervisor, Col 1 is OTM Code
          else if (v === 'supervisor') scoreSupervisor = 3;
          else if (v.includes('supervisor')) scoreSupervisor = 2;
          else if (v.includes('encargado') || v.includes('jefe')) scoreSupervisor = 1;
          if (scoreSupervisor > colSupervisorScore) {
            colSupervisor = c;
            colSupervisorScore = scoreSupervisor;
          }

          // Tecnico Principal matching
          let scoreTecPrincipal = 0;
          if (v === 'técnico principal' || v === 'tecnico principal') scoreTecPrincipal = 3;
          else if (v.includes('principal') || v.includes('tecnico 1') || v.includes('técnico 1')) scoreTecPrincipal = 2;
          else if (v.includes('operario 1')) scoreTecPrincipal = 1;
          if (scoreTecPrincipal > colTecPrincipalScore) {
            colTecPrincipal = c;
            colTecPrincipalScore = scoreTecPrincipal;
          }

          // Tecnico Apoyo matching
          let scoreTecApoyo = 0;
          if (v === 'técnico de apoyo' || v === 'tecnico de apoyo' || v === 'técnico apoyo' || v === 'tecnico apoyo') scoreTecApoyo = 3;
          else if (v.includes('apoyo') || v.includes('tecnico 2') || v.includes('técnico 2')) scoreTecApoyo = 2;
          else if (v.includes('operario 2')) scoreTecApoyo = 1;
          if (scoreTecApoyo > colTecApoyoScore) {
            colTecApoyo = c;
            colTecApoyoScore = scoreTecApoyo;
          }

          // Tipo matching
          let scoreTipo = 0;
          if (v === 'tipo de trabajo' || v === 'tipo' || v === 'tipo de ot') scoreTipo = 3;
          else if (v.includes('tipo') && !v.includes('falla') && !v.includes('rubro') && !v.includes('especialidad')) scoreTipo = 2;
          if (scoreTipo > colTipoScore) {
            colTipo = c;
            colTipoScore = scoreTipo;
          }

          // Programado Status matching
          let scoreProgramado = 0;
          if (v === 'programado' || v === 'subestado') scoreProgramado = 3;
          else if (v.includes('programación') || v.includes('programacion') || v.includes('programado')) scoreProgramado = 2;
          if (scoreProgramado > colProgramadoStatusScore) {
            colProgramadoStatus = c;
            colProgramadoStatusScore = scoreProgramado;
          }

          // Estado matching
          let scoreEstado = 0;
          if (v === 'estado de ot' || v === 'estado de la ot' || v === 'estado') scoreEstado = 3;
          else if (v.includes('estado') || v.includes('firma') || v.includes('conformidad')) scoreEstado = 2;
          if (scoreEstado > colEstadoScore) {
            colEstado = c;
            colEstadoScore = scoreEstado;
          }

          // Calificacion matching
          let scoreCalificacion = 0;
          if (v === 'calificación de trabajo' || v === 'calificación' || v === 'calificacion') scoreCalificacion = 3;
          else if (v.includes('calificación') || v.includes('calificacion') || v.includes('nota') || v.includes('satisfacción')) scoreCalificacion = 2;
          if (scoreCalificacion > colCalificacionScore) {
            colCalificacion = c;
            colCalificacionScore = scoreCalificacion;
          }

          // Tiempo matching
          let scoreTiempo = 0;
          if (v === 'tiempo de ejecución' || v === 'tiempo' || v === 'duración') scoreTiempo = 3;
          else if (v.includes('tiempo') || v.includes('duración') || v.includes('duracion') || v.includes('horas')) scoreTiempo = 2;
          if (scoreTiempo > colTiempoScore) {
            colTiempo = c;
            colTiempoScore = scoreTiempo;
          }

          // Observaciones matching
          let scoreObs = 0;
          if (v === 'observaciones' || v === 'observacion' || v === 'observación') scoreObs = 4;
          else if (v.includes('observación') || v.includes('observacion') || v.includes('observaciones')) scoreObs = 3;
          else if (v.includes('obervación') || v.includes('obervacion') || v.includes('obs')) scoreObs = 2;
          if (scoreObs > colObservacionesScore) {
            colObservaciones = c;
            colObservacionesScore = scoreObs;
          }

          // Start time matching
          let scoreHoraInicio = 0;
          if (v === 'hora de inicio' || v === 'hora inicio' || v === 'inicio de actividad' || v === 'hora de inicio de actividad' || v === 'hora de inicio de la actividad') scoreHoraInicio = 3;
          else if (v.includes('inicio') && (v.includes('hora') || v.includes('tiempo') || v.includes('actividad')) && !v.includes('fecha')) scoreHoraInicio = 2;
          else if (v.includes('inicio') && !v.includes('fecha')) scoreHoraInicio = 1;
           
          if (scoreHoraInicio > colHoraInicioScore) {
            colHoraInicio = c;
            colHoraInicioScore = scoreHoraInicio;
          }

          // End time matching
          let scoreHoraFin = 0;
          if (v === 'hora de fin' || v === 'hora fin' || v === 'fin de actividad' || v === 'hora de fin de actividad' || v === 'hora de fin de la actividad' || v === 'hora término' || v === 'hora termino') scoreHoraFin = 3;
          else if ((v.includes('fin') || v.includes('términ') || v.includes('termin')) && (v.includes('hora') || v.includes('tiempo') || v.includes('actividad')) && !v.includes('fecha')) scoreHoraFin = 2;
          else if ((v.includes('fin') || v.includes('términ') || v.includes('termin')) && !v.includes('fecha')) scoreHoraFin = 1;

          if (scoreHoraFin > colHoraFinScore) {
            colHoraFin = c;
            colHoraFinScore = scoreHoraFin;
          }

          // Response time matching
          let scoreResponseTime = 0;
          if (v === 'tiempo de respuesta' || v === 'días de respuesta' || v === 'dias de respuesta' || v === 'tiempo de atención' || v === 'tiempo de atencion') scoreResponseTime = 4;
          else if (v.includes('respuesta') || v.includes('atención') || v.includes('atencion')) scoreResponseTime = 3;
          else if (v.includes('ejecucion') || v.includes('ejecución') || v.includes('atend')) scoreResponseTime = 2;
          
          if (scoreResponseTime > colResponseTimeScore) {
            colResponseTime = c;
            colResponseTimeScore = scoreResponseTime;
          }

          // Detect helper columns specifically
          if (v.includes('con rq') || v === 'rq') colConRQ = c;
          if (v.includes('por revisar') || v.includes('revisar')) colPorRevisar = c;
          if (v === 'tipo de personal' || v.includes('tipo de personal') || v === 'tipodepersonal') {
            colAssignmentType = c;
          } else if (((v.includes('propio') || v.includes('contratista') || v.includes('contrata') || v.includes('interno') || v.includes('externo') || (v.includes('personal') && !v.includes('cuello') && !v.includes('tecnico') && !v.includes('técnico')))
              && !v.includes('principal') && !v.includes('apoyo') && !v.includes('nombre') && !v.includes('trabajo') && !v.includes('supervisor')) && colAssignmentType === -1) {
            colAssignmentType = c;
          }
        });

        setParseMessage('Procesando filas de mantenimiento...');

        const parsedRows: any[] = [];
        let rowCount = 0;

        for (let r = 1; r <= range.e.r; r++) {
          const dateCell = worksheet[XLSX.utils.encode_cell({ r, c: colDate })];
          if (dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '') {
            rowCount++;
            // Try to extract date
            let date: Date;
            if (typeof dateCell.v === 'number') {
              // Convert Excel date serial to Javascript Date
              date = new Date((dateCell.v - 25569) * 86400000);
            } else {
              // Try parsing date string
              date = new Date(String(dateCell.v));
              if (isNaN(date.getTime())) {
                date = new Date(); // fallback to today
              }
            }
            
            const getVal = (colIdx: number) => {
              if (colIdx < 0) return '';
              const cell = worksheet[XLSX.utils.encode_cell({ r, c: colIdx })];
              return cell ? String(cell.v).trim() : '';
            };

            const otIdVal = getVal(colId);
            const otId = otIdVal ? otIdVal : `OT-${String(rowCount).padStart(4, '0')}`;
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            // Clean specialty by stripping any leading number-dot prefix (e.g. "04. Gasfitería" -> "Gasfitería")
            const sValRawCleaned = getVal(colEspecialidad).replace(/^\d+\.\s*/, "").trim();
            const sVal = sValRawCleaned.toLowerCase();
            let esp = 'Otros';
            
            if (sVal.includes('electric')) {
              esp = 'Electricidad';
            } else if (sVal.includes('carpinter')) {
              esp = 'Carpintería';
            } else if (sVal.includes('gasfiter') || sVal.includes('plomer') || sVal.includes('sanitar')) {
              esp = 'Gasfitería';
            } else if (sVal.includes('albañil') || sVal.includes('albañel') || sVal.includes('albanil')) {
              esp = 'Albañilería';
            } else if (sVal.includes('pint')) {
              esp = 'Pintura';
            } else if (sVal.includes('jardin')) {
              esp = 'Jardinería';
            } else if (sVal.includes('pisc')) {
              esp = 'Piscina';
            } else if (sVal.includes('calder')) {
              esp = 'Calderos';
            } else if (sVal.includes('electromec') || sVal.includes('electro mec') || sVal.includes('mecanic') || sVal.includes('mecánic')) {
              esp = 'Electromecánica';
            } else if (sVal === 'otros' || sVal === 'otro') {
              esp = 'Otros';
            } else if (sValRawCleaned !== '') {
              // Capitalize first letter of any other custom specialty dynamically
              esp = sValRawCleaned.charAt(0).toUpperCase() + sValRawCleaned.slice(1);
            }

            // Clean priority
            let prio = 'Bajo';
            const pVal = getVal(colPrioridad).toLowerCase(); 
            if (pVal.includes('alto')) prio = 'Alto';
            else if (pVal.includes('medio')) prio = 'Medio';
            else if (pVal.includes('emergencia')) prio = 'Emergencia';

            const statusVal = getVal(colEstado).toLowerCase(); 
            let estado = 'Pendiente';
            if (statusVal.includes('finalizado') || statusVal.includes('cerrado')) {
              estado = 'Finalizado';
            } else if (statusVal.includes('cancelado') || statusVal.includes('cierre')) {
              estado = 'Cierre'; // Canceladas mapped to Cierre
            } else if (statusVal.includes('programado')) {
              estado = 'Programado';
            }

            // Check if there is a helper column or status string for RQ or Por Revisar
            let hasRQ = false;
            if (colConRQ !== -1) {
              const val = getVal(colConRQ).toLowerCase();
              if (val === 'si' || val === 'sí' || val === 'x' || val === '1' || val.includes('rq')) {
                hasRQ = true;
              }
            }
            const progStatusRaw = getVal(colProgramadoStatus);
            if (progStatusRaw === 'RQ' || progStatusRaw.toLowerCase().includes('con rq')) {
              hasRQ = true;
            }

            let hasPorRevisar = false;
            if (colPorRevisar !== -1) {
              const val = getVal(colPorRevisar).toLowerCase();
              if (val === 'si' || val === 'sí' || val === 'x' || val === '1' || val.includes('revisar')) {
                hasPorRevisar = true;
              }
            }
            if (statusVal.includes('revisar') || statusVal.includes('revisión') || statusVal.includes('revision')) {
              hasPorRevisar = true;
            }

            // Assign programadoStatus
            let programadoStatus = progStatusRaw;
            if (hasRQ) {
              programadoStatus = 'RQ';
            } else if (hasPorRevisar) {
              programadoStatus = 'Por revisar';
            } else if (programadoStatus.toLowerCase().includes('program')) {
              programadoStatus = 'Programado';
            }

            const tecPrincipal = getVal(colTecPrincipal); 
            const tecApoyo = getVal(colTecApoyo); 
            const tipo = getVal(colTipo) || 'Correctivo'; 

            // Assignment Type mapping (contractor vs own) from the new Excel column
            let assignmentType = 'own';
            if (colAssignmentType !== -1) {
              const val = getVal(colAssignmentType).toLowerCase().trim();
              if (val.includes('contrat') || val.includes('contrata') || val.includes('extern') || val.includes('empresa') || val.includes('sac') || val.includes('s.a.c.') || val.includes('tercero')) {
                assignmentType = 'contractor';
              } else if (val.includes('sin asignar') || val === 'sin asignar' || val === '') {
                assignmentType = 'unassigned';
              } else if (val.includes('propio') || val.includes('interno') || val.includes('club')) {
                assignmentType = 'own';
              }
            } else {
              // Fallback to name-based detection
              const pName = tecPrincipal.toUpperCase();
              if (pName.includes('CONTRATISTA') || pName.includes('CONTRATA') || pName.includes('EMPRESA') || pName.includes('SAC') || pName.includes('S.A.C.') || pName.includes('SERVICE') || pName.includes('S.R.L.') || pName.includes('TKE')) {
                assignmentType = 'contractor';
              } else if (pName === '' || pName.includes('SIN ASIGNAR')) {
                assignmentType = 'unassigned';
              }
            }

            // Risk mapping
            let riesgo = '';
            if (hasRQ) {
              riesgo = '⚠️ Requiere Suministro';
            } else if (hasPorRevisar) {
              riesgo = '🔍 Por revisar';
            } else if (prio === 'Emergencia') {
              riesgo = '🚨 Emergencia';
            } else if (prio === 'Alto' && estado !== 'Finalizado') {
              riesgo = '🚨 Alta prioridad pendiente';
            } else if (programadoStatus === 'Cierre' || estado === 'Cierre') {
              riesgo = '❌ Cancelada / Cerrada';
            }

            const califVal = getVal(colCalificacion); 
            const calificacion = parseInt(califVal, 10) || 0;

            const rawTiempoStr = getVal(colTiempo); 
            let tiempoMin = parseExecutionTime(rawTiempoStr);

            if (tiempoMin === 0 && colHoraInicio !== -1 && colHoraFin !== -1) {
              const startStr = getVal(colHoraInicio).trim();
              const endStr = getVal(colHoraFin).trim();
              if (startStr && endStr) {
                const parseTimeStr = (t: string) => {
                  const num = Number(t);
                  if (!isNaN(num) && num > 0 && num < 1) {
                    const totalMin = Math.round(num * 24 * 60);
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    return { h, m };
                  }
                  const matches = t.match(/(\d+)\s*:\s*(\d+)(?:\s*:\s*\d+)?\s*(am|pm)?/i);
                  if (matches) {
                    let h = parseInt(matches[1], 10);
                    const m = parseInt(matches[2], 10);
                    const ampm = matches[3];
                    if (ampm) {
                      if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
                      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
                    }
                    return { h, m };
                  }
                  return null;
                };
                
                const tStart = parseTimeStr(startStr);
                const tEnd = parseTimeStr(endStr);
                
                if (tStart && tEnd) {
                  let diffMinutes = (tEnd.h * 60 + tEnd.m) - (tStart.h * 60 + tStart.m);
                  if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight boundary
                  tiempoMin = diffMinutes;
                }
              }
            }
            
            let tiempoStr = rawTiempoStr;
            if (tiempoMin > 0 && (!rawTiempoStr || rawTiempoStr.trim() === '' || rawTiempoStr === '0' || rawTiempoStr.toLowerCase() === 'sin datos')) {
              const hrs = Math.floor(tiempoMin / 60);
              const mins = tiempoMin % 60;
              tiempoStr = hrs > 0 ? `${hrs} h ${mins} min` : `${mins} min`;
            }

            parsedRows.push({
              id: otId,
              fecha: dateStr,
              desc: getVal(colDesc), 
              ubicacion: getVal(colUbicacion).replace(/^\d+\.\s*/, ""), 
              ubExacta: getVal(colUbExacta), 
              especialidad: esp,
              prioridad: prio,
              supervisor: getVal(colSupervisor), 
              tecPrincipal: tecPrincipal,
              tecApoyo: tecApoyo,
              tipo: tipo,
              estado: estado,
              programadoStatus: programadoStatus,
              calificacion: calificacion,
              tiempo: tiempoStr,
              tiempoMin: tiempoMin,
              area: getVal(colArea), 
              solicitante: getVal(colSolicitante), 
              riesgo: riesgo,
              observaciones: getVal(colObservaciones),
              assignmentType: assignmentType,
              responseTimeDays: colResponseTime !== -1 ? parseResponseTime(
                worksheet[XLSX.utils.encode_cell({ r, c: colResponseTime })] 
                  ? (worksheet[XLSX.utils.encode_cell({ r, c: colResponseTime })].v !== undefined 
                      ? worksheet[XLSX.utils.encode_cell({ r, c: colResponseTime })].v 
                      : worksheet[XLSX.utils.encode_cell({ r, c: colResponseTime })].w)
                  : getVal(colResponseTime)
              ) : null
            });
          }
        }

        if (parsedRows.length === 0) {
          throw new Error('No se encontraron filas con fechas válidas en la hoja "Orden de trabajos".');
        }

        // Save parsed rows and file name metadata
        const docName = file.name.replace(/\.[^/.]+$/, ""); // Strip extension
        localStorage.setItem('external_report_data', JSON.stringify(parsedRows));
        localStorage.setItem('external_report_title', docName);

        setIsParsing(false);
        setParseMessage('');
        
        // Launch dynamic external dashboard in parallel tab
        window.open('/reports/dashboard-externo.html?v=' + Date.now(), '_blank');
      } catch (err: any) {
        console.error(err);
        setIsParsing(false);
        alert(`Error al procesar Excel: ${err.message || 'Estructura incorrecta del archivo.'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        handleExcelFile(file);
      } else {
        alert('Por favor, selecciona únicamente archivos Excel (.xlsx / .xls).');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleExcelFile(e.target.files[0]);
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Análisis y Reportes</h1>
        <p className="page-subtitle">Cuadros de mando interactivos y análisis consolidado del personal de mantenimiento</p>
      </div>

      {isParsing && (
        <div style={{
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid var(--accent-blue)',
          padding: '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-primary)',
          fontWeight: 600,
          animation: 'pulse 1.8s infinite'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <span>{parseMessage}</span>
        </div>
      )}

      {/* Grid horizontal de 3 tarjetas */}
      <div className="grid-3" style={{ gap: '24px', alignItems: 'stretch' }}>
        
        {/* Tarjeta 1: Dashboard de Gestión Interna (Supabase / En Vivo) */}
        <div 
          className="glass-card" 
          style={{ 
            cursor: 'pointer', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: '280px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
          onClick={handleOpenLiveDashboard}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.2)';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
          
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '2.5rem', opacity: 0.9 }}>⚡</div>
              <span className="status-badge status-closed" style={{ 
                background: 'rgba(16,185,129,0.15)', 
                color: '#34d399', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="pulse-indicator" style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: '#34d399',
                  display: 'inline-block'
                }}></span>
                DATA EN VIVO
              </span>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Dashboard Supabase Real-time
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Visualiza en tiempo real todo el volumen de trabajo. Consolida **OTMs, OTIs y Actividades Rutinarias** con gráficos interactivos apilados por especialidad y horas totales ejecutadas.
            </p>
          </div>
          
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Abrir dashboard en vivo <span style={{ fontSize: '1.2rem' }}>→</span>
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Dashboard Mayo 2026 (Data Externa / Histórico) */}
        <div 
          className="glass-card" 
          style={{ 
            cursor: 'pointer', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: '280px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
          onClick={() => window.open('/reports/dashboard-mayo-2026.html', '_blank')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.2)';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent-blue)' }}></div>
          
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '2.5rem', opacity: 0.9 }}>📊</div>
              <span className="status-badge status-awaiting_conformity" style={{ fontWeight: 800 }}>HISTÓRICO</span>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Dashboard Mayo 2026
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Visor estático del análisis de la Bitácora de Actividades original del club (4 - 25 mayo). Útil para auditorías, SLAs históricos y comparación de rendimiento en el periodo.
            </p>
          </div>
          
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--accent-blue)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Abrir dashboard original <span style={{ fontSize: '1.2rem' }}>→</span>
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Cargar Reporte Externo (Importador Excel) */}
        <div 
          className="glass-card" 
          style={{ 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px',
            border: isDragOver ? '2px dashed var(--accent-blue)' : '1px solid rgba(255,255,255,0.08)',
            background: isDragOver ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
            transition: 'all 0.2s ease-in-out'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}></div>
          
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '2.5rem', opacity: 0.9 }}>➕</div>
              <span className="status-badge" style={{ background: 'rgba(167,139,250,0.15)', color: '#c084fc', fontWeight: 800 }}>TEMPORAL</span>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Cargar Reporte Externo
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: 1.4 }}>
              Arrastra aquí cualquier Excel de Bitácora (.xlsx) o haz clic abajo para procesarlo de forma local e interactiva de inmediato.
            </p>

            <div 
              style={{
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                background: 'rgba(0,0,0,0.2)',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              ☁️ Arrastrar aquí o Hacer clic para seleccionar
            </div>
          </div>
          
          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary" 
              style={{ 
                padding: '6px 14px', 
                fontSize: '0.8rem', 
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', 
                color: '#fff',
                border: 'none',
                fontWeight: 700
              }}
            >
              Seleccionar Excel
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
