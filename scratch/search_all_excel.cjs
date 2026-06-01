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

console.log('=== SEARCHING FOR ELECTROMEC IN ALL ROWS ===');
let foundCount = 0;
for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        if (cell) {
            const val = String(cell.v);
            if (val.toLowerCase().includes('electromec') || val.toLowerCase().includes('electro mec')) {
                foundCount++;
                if (foundCount <= 10) {
                    console.log(`Row ${r+1}, Col ${c+1} (${headers[c]}): "${val}"`);
                }
            }
        }
    }
}
console.log(`Total occurrences of 'electromec' found: ${foundCount}`);

console.log('\n=== SEARCHING FOR OT COLUMNS THAT MIGHT CONTAIN SPECIALTY VALUES ===');
// Let's count where "Gasfiter" or "Electric" appear in other columns
const colCounts = {};
for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        if (cell) {
            const val = String(cell.v).toLowerCase();
            if (val.includes('gasfiter') || val.includes('electric') || val.includes('carpinter')) {
                colCounts[c] = (colCounts[c] || 0) + 1;
            }
        }
    }
}
Object.entries(colCounts).forEach(([c, count]) => {
    console.log(`Col ${parseInt(c)+1} (${headers[c]}): has ${count} matching cells`);
});
