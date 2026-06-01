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

console.log('Specialty Column headers mapping check:');
const colEspIdx = Object.entries(headers).find(([c, h]) => h.toLowerCase().includes('especialidad'))?.[0];
console.log(`Found specialty column at index: ${colEspIdx} (${headers[colEspIdx]})`);

const counts = {};
for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({r, c: Number(colEspIdx)})];
    const val = cell ? String(cell.v).trim() : '(VACIO)';
    counts[val] = (counts[val] || 0) + 1;
}

console.log('Unique values and counts in Specialty column:');
console.log(JSON.stringify(counts, null, 2));
