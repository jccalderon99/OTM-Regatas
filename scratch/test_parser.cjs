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
});

console.log(`Matched specialty column: Col ${colEspecialidad + 1} (${headers[colEspecialidad]}) with score ${colEspecialidadScore}`);

// 2. Specialty cleaning and counting
const counts = {};
const originalCounts = {};
let totalRows = 0;

for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '') {
        // We only parse rows with valid dates (same as main parser)
        totalRows++;
        
        const cell = ws[XLSX.utils.encode_cell({r, c: colEspecialidad})];
        const valRaw = cell ? String(cell.v).trim() : '';
        originalCounts[valRaw] = (originalCounts[valRaw] || 0) + 1;
        
        // Clean specialty
        const sValRawCleaned = valRaw.replace(/^\d+\.\s*/, "").trim();
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
        
        counts[esp] = (counts[esp] || 0) + 1;
    }
}

console.log(`\nProcessed ${totalRows} valid rows.`);
console.log('\n=== COUNTS AFTER ROBUST CLEANING ===');
console.log(JSON.stringify(counts, null, 2));
