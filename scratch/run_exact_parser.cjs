const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

// Column indices initialized as in Reports.tsx
let colDate = 1; // "Marca temporal"
let colLocation = 6;
let colExactLocation = 7;
let colDescription = 8;
let colSpecialty = 9;
let colPriority = 10;
let colSupervisor = 12;
let colTecPrincipal = 14;
let colTecApoyo = 15;
let colTipo = 16;
let colProgramadoStatus = 17;
let colEstado = 25;
let colCalificacion = 27;
let colTiempo = 34;
let colObservaciones = 28;
let colHoraInicio = 19;
let colHoraFin = 21;
let colResponseTime = -1;
let colConRQ = -1;
let colPorRevisar = -1;
let colAssignmentType = -1;

const headers = {};
for (let c = 0; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
  if (cell) {
    const val = String(cell.v).trim();
    headers[c] = val;
    const v = val.toLowerCase();
    
    // Mimic Reports.tsx scanner
    if (v.includes('con rq') || v === 'rq') colConRQ = c;
    if (v.includes('por revisar') || v.includes('revisar')) colPorRevisar = c;
    
    if (v === 'tipo de personal' || v.includes('tipo de personal') || v === 'tipodepersonal') {
      colAssignmentType = c;
    } else if (((v.includes('propio') || v.includes('contratista') || v.includes('contrata') || v.includes('interno') || v.includes('externo') || (v.includes('personal') && !v.includes('cuello') && !v.includes('tecnico') && !v.includes('técnico')))
        && !v.includes('principal') && !v.includes('apoyo') && !v.includes('nombre') && !v.includes('trabajo') && !v.includes('supervisor')) && colAssignmentType === -1) {
      colAssignmentType = c;
    }

    if (v === 'tiempo de respuesta' || v === 'días de respuesta' || v === 'dias de respuesta' || v === 'tiempo de atención' || v === 'tiempo de atencion') {
      colResponseTime = c;
    }
  }
}

console.log(`Matched Columns:`);
console.log(`  colConRQ: ${colConRQ !== -1 ? headers[colConRQ] : 'Not Found'}`);
console.log(`  colPorRevisar: ${colPorRevisar !== -1 ? headers[colPorRevisar] : 'Not Found'}`);
console.log(`  colAssignmentType: ${colAssignmentType !== -1 ? headers[colAssignmentType] : 'Not Found'}`);
console.log(`  colResponseTime: ${colResponseTime !== -1 ? headers[colResponseTime] : 'Not Found'}`);

let totalRows = 0;
const statusCounts = {};
const priorityCounts = {};
const specialtyCounts = {};
const assignmentTypeCounts = { own: 0, contractor: 0, unassigned: 0 };
const typeOfWorkCounts = {};
const ratings = [];
let ratingSum = 0;
let ratingCount = 0;
let totalHours = 0;
let totalHoursCount = 0;

// Risk elements
let rqCount = 0;
let pendingReviewCount = 0;

// Technician performance
const techPerformance = {};

const contractorKeywords = ['TKE', 'CONTRATISTA', 'TERCERO', 'EXTERNO', 'PROVEEDOR', 'ASCENSORES', 'CLIMATIZACIÓN', 'SISTEMAS'];
function isContractor(name) {
  if (!name) return false;
  const upper = name.toUpperCase();
  return contractorKeywords.some(kw => upper.includes(kw));
}

for (let r = 1; r <= range.e.r; r++) {
  const dateCell = ws[XLSX.utils.encode_cell({ r, c: colDate })];
  if (dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '') {
    totalRows++;

    const getVal = (colIdx) => {
      if (colIdx < 0 || colIdx === undefined) return '';
      const cell = ws[XLSX.utils.encode_cell({ r, c: colIdx })];
      return cell ? String(cell.v).trim() : '';
    };

    const statusVal = getVal(colEstado);
    const tecPrincipal = getVal(colTecPrincipal);
    const tecApoyo = getVal(colTecApoyo);
    const priorityVal = getVal(colPriority);
    const specialtyVal = getVal(colSpecialty);
    const tipoVal = getVal(colTipo) || 'Correctivo';
    const califVal = getVal(colCalificacion);
    const tiempoVal = getVal(colTiempo);
    const conRQVal = colConRQ !== -1 ? getVal(colConRQ).toLowerCase() : '';
    const porRevisarVal = colPorRevisar !== -1 ? getVal(colPorRevisar).toLowerCase() : '';

    // Status mapping
    let status = 'Pendiente';
    if (statusVal.toLowerCase().includes('finaliz') || statusVal.toLowerCase().includes('cerr')) {
      status = 'Finalizado';
    }
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Con RQ / Por revisar
    const hasRQ = conRQVal.includes('si') || conRQVal.includes('sí') || conRQVal === 'true' || conRQVal === '1';
    const hasPorRevisar = porRevisarVal.includes('si') || porRevisarVal.includes('sí') || porRevisarVal === 'true' || porRevisarVal === '1';
    
    if (hasRQ) rqCount++;
    if (hasPorRevisar) pendingReviewCount++;

    // Specialty clean
    let cleanSpec = 'Otros';
    const sValRawCleaned = specialtyVal.replace(/^\d+\.\s*/, "").trim();
    const sVal = sValRawCleaned.toLowerCase();
    
    if (sVal.includes('electric')) cleanSpec = 'Electricidad';
    else if (sVal.includes('carpinter')) cleanSpec = 'Carpintería';
    else if (sVal.includes('gasfiter') || sVal.includes('plomer') || sVal.includes('sanitar')) cleanSpec = 'Gasfitería';
    else if (sVal.includes('albañil') || sVal.includes('albanil')) cleanSpec = 'Albañilería';
    else if (sVal.includes('pint')) cleanSpec = 'Pintura';
    else if (sVal.includes('jardin')) cleanSpec = 'Jardinería';
    else if (sVal.includes('pisc')) cleanSpec = 'Piscina';
    else if (sVal.includes('calder')) cleanSpec = 'Calderos';
    else if (sVal.includes('electromec') || sVal.includes('mecanic') || sVal.includes('mecánic')) cleanSpec = 'Electromecánica';
    else if (sValRawCleaned !== '') cleanSpec = sValRawCleaned;

    specialtyCounts[cleanSpec] = (specialtyCounts[cleanSpec] || 0) + 1;

    // Priority mapping
    let priority = 'Medio';
    if (priorityVal.toLowerCase().includes('alt')) priority = 'Alto';
    else if (priorityVal.toLowerCase().includes('baj')) priority = 'Bajo';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

    // Assignment Type mapping
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
      const pName = tecPrincipal.toUpperCase();
      if (pName.includes('CONTRATISTA') || pName.includes('CONTRATA') || pName.includes('EMPRESA') || pName.includes('SAC') || pName.includes('S.A.C.') || pName.includes('SERVICE') || pName.includes('S.R.L.') || pName.includes('TKE')) {
        assignmentType = 'contractor';
      } else if (pName === '' || pName.includes('SIN ASIGNAR')) {
        assignmentType = 'unassigned';
      }
    }
    assignmentTypeCounts[assignmentType]++;

    // Rating
    if (califVal !== '') {
      const num = parseFloat(califVal);
      if (!isNaN(num) && num >= 1 && num <= 5) {
        ratingSum += num;
        ratingCount++;
        ratings.push(num);
      }
    }

    // Execution time
    if (tiempoVal !== '') {
      const hours = parseFloat(tiempoVal);
      if (!isNaN(hours) && hours > 0) {
        totalHours += hours;
        totalHoursCount++;
      }
    }

    // Technician performance aggregates
    if (tecPrincipal && tecPrincipal !== 'Sin Asignar' && tecPrincipal !== 'SIN ASIGNAR') {
      if (!techPerformance[tecPrincipal]) {
        techPerformance[tecPrincipal] = { total: 0, completed: 0, hours: 0, ratingSum: 0, ratingCount: 0 };
      }
      techPerformance[tecPrincipal].total++;
      if (status === 'Finalizado') {
        techPerformance[tecPrincipal].completed++;
      }
      if (tiempoVal !== '') {
        const h = parseFloat(tiempoVal);
        if (!isNaN(h) && h > 0) techPerformance[tecPrincipal].hours += h;
      }
      if (califVal !== '') {
        const rVal = parseFloat(califVal);
        if (!isNaN(rVal) && rVal >= 1 && rVal <= 5) {
          techPerformance[tecPrincipal].ratingSum += rVal;
          techPerformance[tecPrincipal].ratingCount++;
        }
      }
    }
  }
}

console.log('\n======================================================');
console.log('             EXACT PLATFORM ALIGNED METRICS           ');
console.log('======================================================');
console.log(`Total Work Orders: ${totalRows}`);
console.log(`Completed: ${statusCounts['Finalizado'] || 0} (${(( (statusCounts['Finalizado'] || 0) / totalRows ) * 100).toFixed(1)}%)`);
console.log(`Pending / Programmed: ${statusCounts['Pendiente'] || 0} (${(( (statusCounts['Pendiente'] || 0) / totalRows ) * 100).toFixed(1)}%)`);
console.log(`Average CSAT: ${ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : 'N/A'} (from ${ratingCount} reviews)`);
console.log(`Average Execution Time: ${totalHoursCount > 0 ? (totalHours / totalHoursCount).toFixed(1) : 'N/A'} hrs (from ${totalHoursCount} jobs)`);
console.log(`Total Execution Hours logged: ${totalHours.toFixed(1)} hrs`);

console.log('\n--- BY ASSIGNMENT TYPE ---');
Object.entries(assignmentTypeCounts).forEach(([k, v]) => {
  console.log(`  ${k === 'own' ? 'Personal Propio' : k === 'contractor' ? 'Contratistas' : 'Sin Asignar'}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- BY PRIORITY ---');
Object.entries(priorityCounts).forEach(([k, v]) => {
  console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- BY SPECIALTY (TOP 5) ---');
Object.entries(specialtyCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => {
  console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- SYSTEM ALERTS / RISK ---');
console.log(`  OTs requiring supplies (Con RQ): ${rqCount}`);
console.log(`  OTs needing review (Por revisar): ${pendingReviewCount}`);

console.log('\n--- TOP TECHNICIANS BY WORK VOLUME ---');
Object.entries(techPerformance)
  .sort((a, b) => b[1].completed - a[1].completed)
  .slice(0, 5)
  .forEach(([name, stats]) => {
    const avgR = stats.ratingCount > 0 ? (stats.ratingSum / stats.ratingCount).toFixed(2) : 'N/A';
    console.log(`  - ${name}: ${stats.completed} OTs completed (${stats.total} assigned), CSAT: ${avgR}, Executed: ${stats.hours.toFixed(1)} hrs`);
  });
console.log('======================================================');
