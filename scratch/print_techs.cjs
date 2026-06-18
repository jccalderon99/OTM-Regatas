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

const techs = new Set();
const supervisors = new Set();
const states = new Set();

for (let r = 1; r <= range.e.r; r++) {
    const tempCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (!tempCell || tempCell.v === undefined || tempCell.v === null || String(tempCell.v).trim() === '') {
        continue;
    }
    const tCell = ws[XLSX.utils.encode_cell({r, c: 14})]; // Col 15: Técnico Principal
    if (tCell && tCell.v) techs.add(String(tCell.v).trim());
    
    const sCell = ws[XLSX.utils.encode_cell({r, c: 12})]; // Col 13: Supervisor
    if (sCell && sCell.v) supervisors.add(String(sCell.v).trim());

    const stCell = ws[XLSX.utils.encode_cell({r, c: 25})]; // Col 26: Estado de ot
    if (stCell && stCell.v) states.add(String(stCell.v).trim());
}

console.log('=== UNIQUE TECHNICIANS ===');
console.log(Array.from(techs).sort());

console.log('\n=== UNIQUE SUPERVISORS ===');
console.log(Array.from(supervisors).sort());

console.log('\n=== UNIQUE STATES ===');
console.log(Array.from(states).sort());
