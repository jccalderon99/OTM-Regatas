const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

console.log('=== CHECKING TIME VALUES FOR MAY 2026 OTs ===');
let count = 0;
for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (dateCell && typeof dateCell.v === 'number') {
        const date = new Date((dateCell.v - 25569) * 86400000);
        if (date.getFullYear() === 2026 && date.getMonth() === 4) { // May
            count++;
            const idCell = ws[XLSX.utils.encode_cell({r, c: 0})];
            const tExecCell = ws[XLSX.utils.encode_cell({r, c: 34})]; // Col 35
            const tRespCell = ws[XLSX.utils.encode_cell({r, c: 40})]; // Let's check some surrounding cols
            
            console.log(`Row ${r+1} (${idCell ? idCell.v : ''}): Col 35 (Tiempo Ejecución) v="${tExecCell ? tExecCell.v : ''}", t="${tExecCell ? tExecCell.t : ''}", w="${tExecCell ? tExecCell.w : ''}"`);
        }
    }
}
console.log(`Total checked: ${count}`);
