const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

const headers = {};
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell) headers[c] = String(cell.v).trim();
}

// 1. Column matching
let colEspecialidad = 9;
let colEspecialidadScore = 0;
let colObservaciones = 28;
let colObservacionesScore = 0;

Object.entries(headers).forEach(([idxStr, val]) => {
  const c = parseInt(idxStr, 10);
  const v = val.toLowerCase().trim();
  
  let scoreEsp = 0;
  if (v === 'especialidad del trabajo' || v === 'especialidad' || v === 'especialidad de la ot') scoreEsp = 4;
  else if (v.includes('especialidad')) scoreEsp = 3;
  else if (v.includes('rama') || v.includes('rubro') || v === 'esp') scoreEsp = 2;
  else if (v.includes('falla') && !v.includes('descripción') && !v.includes('descripcion') && !v.includes('detalle')) scoreEsp = 1;
  if (scoreEsp > colEspecialidadScore) {
    colEspecialidad = c;
    colEspecialidadScore = scoreEsp;
  }

  let scoreObs = 0;
  if (v === 'observaciones' || v === 'observacion' || v === 'observación') scoreObs = 4;
  else if (v.includes('observación') || v.includes('observacion') || v.includes('observaciones')) scoreObs = 3;
  else if (v.includes('obervación') || v.includes('obervacion') || v.includes('obs')) scoreObs = 2;
  if (scoreObs > colObservacionesScore) {
    colObservaciones = c;
    colObservacionesScore = scoreObs;
  }
});

console.log(`Matched specialty column: Col ${colEspecialidad + 1} (${headers[colEspecialidad]})`);
console.log(`Matched observations column: Col ${colObservaciones + 1} (${headers[colObservaciones]})`);

// 2. Count observations by specialty in "Por revisar" OTs
const pendingOTs = [];
let validRowsCount = 0;

for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '') {
        validRowsCount++;
        const getVal = (colIdx) => {
            const cell = ws[XLSX.utils.encode_cell({r, c: colIdx})];
            return cell ? String(cell.v).trim() : '';
        };

        const statusVal = getVal(25).toLowerCase();
        let estado = 'Pendiente';
        if (statusVal.includes('finalizado') || statusVal.includes('cerrado')) {
          estado = 'Finalizado';
        } else if (statusVal.includes('cancelado') || statusVal.includes('cierre')) {
          estado = 'Cierre';
        }

        const progStatus = getVal(17);
        let isRQ = (progStatus === 'RQ' || progStatus.toLowerCase().includes('con rq'));
        
        // Clean specialty
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
          esp = sValRawCleaned.charAt(0).toUpperCase() + sValRawCleaned.slice(1);
        }

        const obsVal = getVal(colObservaciones);

        if (estado === 'Pendiente' && !isRQ) {
            pendingOTs.push({
                especialidad: esp,
                observaciones: obsVal
            });
        }
    }
}

const hasRealObs = (o) => {
    if (!o.observaciones) return false;
    const txt = o.observaciones.toLowerCase().trim();
    return txt !== '' && txt !== '-' && txt !== 'ninguna' && txt !== 'sin observaciones' && txt !== 'no' && txt !== 'sin novedad';
};

const obsPorRevisar = pendingOTs.filter(hasRealObs);

const counts = {};
obsPorRevisar.forEach(o => {
    counts[o.especialidad] = (counts[o.especialidad] || 0) + 1;
});

console.log(`\nFound ${pendingOTs.length} OTs in "Por revisar".`);
console.log(`Found ${obsPorRevisar.length} OTs with active observations.`);
console.log('\n=== OBSERVATIONS COUNT BY SPECIALTY (En "Por revisar") ===');
console.log(JSON.stringify(counts, null, 2));

console.log('\n=== SAMPLE OBSERVATIONS ===');
obsPorRevisar.slice(0, 5).forEach((o, i) => {
    console.log(`${i+1}. [${o.especialidad}]: "${o.observaciones}"`);
});
