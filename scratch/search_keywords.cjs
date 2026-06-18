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

console.log('Searching for keywords "propio" or "contratista" in the rows...');

const foundCols = new Set();
for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        if (cell && cell.v !== undefined) {
            const val = String(cell.v).toLowerCase();
            if (val.includes('propio') || val.includes('contratista') || val.includes('tercero') || val.includes('tke')) {
                foundCols.add(c);
                if (foundCols.size < 10) {
                    console.log(`Found in Row ${r+1}, Col ${c+1} (${headers[c] || 'No Header'}): "${cell.v}"`);
                }
            }
        }
    }
}

console.log('\nAll columns containing matching keywords:');
Array.from(foundCols).forEach(c => {
    console.log(`  Col ${c+1}: ${headers[c] || `Col_${c+1}`}`);
});
