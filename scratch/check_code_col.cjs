const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

let count = 0;
const sampleCodes = [];

for (let r = 1; r <= range.e.r; r++) {
    const codeCell = ws[XLSX.utils.encode_cell({r, c: 0})]; // Col 1: OTM Code
    if (codeCell && codeCell.v !== undefined && codeCell.v !== null && String(codeCell.v).trim() !== '') {
        count++;
        if (sampleCodes.length < 10) {
            sampleCodes.push({ row: r + 1, code: codeCell.v });
        }
    }
}

console.log('=== ROW COUNT WITH OTM CODE ===');
console.log('Total rows with OTM code:', count);
console.log('Samples:', sampleCodes);
