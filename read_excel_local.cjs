const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

// Get all column headers (row 1)
const headers = {};
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell) headers[c] = String(cell.v);
}
console.log('=== ALL COLUMN HEADERS ===');
Object.entries(headers).forEach(([c, h]) => console.log(`  Col ${parseInt(c)+1}: ${h}`));

// Get date range or print some values
console.log('\n=== DATE RANGE AND VALUES IN MAY 2026 ===');
let mayCount = 0;
const sampleRows = [];
for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (dateCell && typeof dateCell.v === 'number') {
        const date = new Date((dateCell.v - 25569) * 86400000);
        if (date.getFullYear() === 2026 && date.getMonth() === 4) { // May = month 4
            mayCount++;
            const rowData = {};
            for (let c = 0; c <= range.e.c; c++) {
                const cell = ws[XLSX.utils.encode_cell({r, c})];
                if (cell) {
                    rowData[headers[c] || `Col_${c+1}`] = cell.v;
                }
            }
            sampleRows.push(rowData);
        }
    }
}
console.log(`Total May 2026 rows found in Excel: ${mayCount}`);
if (sampleRows.length > 0) {
    console.log('\n=== FIRST MAY 2026 ROW ===');
    console.log(JSON.stringify(sampleRows[0], null, 2));
    
    // Group and count statuses by headers
    console.log('\n=== VALUE COUNTS FOR Columns ===');
    const colsToAnalyze = ['Programado', 'Estado de ot', 'Tipo de OT', 'Supervisor', 'Prioridad', 'Marca de riesgo'];
    colsToAnalyze.forEach(col => {
        const counts = {};
        sampleRows.forEach(row => {
            const val = row[col] !== undefined ? String(row[col]).trim() : '(VACIO)';
            counts[val] = (counts[val] || 0) + 1;
        });
        console.log(`\nCounts for "${col}":`);
        Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([val, count]) => console.log(`  "${val}": ${count}`));
    });
}
