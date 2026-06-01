const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];

console.log('=== SCANNING ALL COLUMNS IN ROW 0 (Headers) ===');
for (let c = 0; c < 100; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell && cell.v !== undefined) {
        console.log(`Col ${c+1} (${XLSX.utils.encode_col(c)}): "${cell.v}"`);
    }
}

console.log('\n=== SCANNING ROW 1 VALUES (First data row) ===');
for (let c = 0; c < 100; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 1, c})];
    if (cell && cell.v !== undefined) {
        console.log(`Col ${c+1} (${XLSX.utils.encode_col(c)}): "${cell.v}"`);
    }
}
