const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];

for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 38; c <= 46; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        row.push(cell ? String(cell.v).trim() : '(empty)');
    }
    console.log(`Row ${r}: `, row);
}
