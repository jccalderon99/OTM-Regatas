const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

let filledRowsWithoutDate = 0;
const sampleRows = [];

for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    const hasDate = dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '';
    
    if (!hasDate) {
        // Check if any other cell in the row has data
        let hasData = false;
        const rowData = { rowNumber: r + 1 };
        for (let c = 0; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({r, c})];
            if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
                hasData = true;
                rowData[`Col_${c+1}`] = cell.v;
            }
        }
        if (hasData) {
            filledRowsWithoutDate++;
            if (sampleRows.length < 5) {
                sampleRows.push(rowData);
            }
        }
    }
}

console.log('=== DATA ROWS WITHOUT MARCA TEMPORAL ===');
console.log('Total filled rows without Marca temporal:', filledRowsWithoutDate);
if (sampleRows.length > 0) {
    console.log('Sample rows without Marca temporal:');
    console.log(JSON.stringify(sampleRows, null, 2));
}
