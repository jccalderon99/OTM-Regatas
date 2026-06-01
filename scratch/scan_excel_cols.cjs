const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

console.log('=== SCANNING ALL COLUMNS IN ROW 0 (Headers) ===');
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell && cell.v !== undefined) {
        console.log(`Col ${c+1} (${XLSX.utils.encode_col(c)}): "${cell.v}"`);
    }
}

console.log('\n=== SCANNING ROW 1 (First data row) ===');
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 1, c})];
    if (cell && cell.v !== undefined) {
        console.log(`Col ${c+1} (${XLSX.utils.encode_col(c)}): v="${cell.v}", t="${cell.t}", w="${cell.w || ''}"`);
    }
}

console.log('\n=== SCANNING ROW 2 ===');
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 2, c})];
    if (cell && cell.v !== undefined) {
        console.log(`Col ${c+1} (${XLSX.utils.encode_col(c)}): v="${cell.v}", t="${cell.t}", w="${cell.w || ''}"`);
    }
}
