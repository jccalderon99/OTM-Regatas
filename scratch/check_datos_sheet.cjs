const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Datos'];

if (!ws) {
    console.log('Sheet [Datos] not found.');
    return;
}

const range = XLSX.utils.decode_range(ws['!ref']);
console.log(`=== DATOS SHEET ===`);
console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);

// Print row 0 to 5
for (let r = 0; r < Math.min(10, range.e.r + 1); r++) {
    const row = [];
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        row.push(cell ? String(cell.v).trim() : '');
    }
    console.log(`Row ${r}:`, row);
}
