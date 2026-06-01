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

console.log('=== SEARCHING FOR COLUMNS WITH OBSERV ===');
Object.entries(headers).forEach(([c, h]) => {
    if (h.toLowerCase().includes('observ')) {
        console.log(`Col ${parseInt(c)+1}: "${h}"`);
    }
});
