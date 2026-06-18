const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Personal'];
const range = XLSX.utils.decode_range(ws['!ref']);

console.log('=== PERSONAL SHEET ROWS ===');
for (let r = 0; r <= range.e.r; r++) {
    const row = [];
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        row.push(cell ? String(cell.v).trim() : '');
    }
    console.log(`Row ${r}: `, row);
}
