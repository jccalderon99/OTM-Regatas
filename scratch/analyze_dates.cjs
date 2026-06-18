const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

let total = 0;
const months = {};
let emptyDates = 0;

for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({r, c: 1})]; // Col 2: Marca temporal
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        total++;
        let d;
        if (typeof cell.v === 'number') {
            d = new Date((cell.v - 25569) * 86400000);
        } else {
            d = new Date(String(cell.v));
        }
        if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            months[key] = (months[key] || 0) + 1;
        }
    } else {
        emptyDates++;
    }
}

console.log('=== ROW COUNTS & DATES ===');
console.log('Total rows with Marca temporal:', total);
console.log('Total rows without Marca temporal:', emptyDates);
console.log('Months distribution:', JSON.stringify(months, null, 2));
console.log('Workbook range:', ws['!ref']);
