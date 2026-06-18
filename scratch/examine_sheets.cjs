const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);

const sheetsToExamine = ['Ordenes atendidas', 'Personal', 'RQ', 'Conformidad'];

sheetsToExamine.forEach(name => {
    const ws = wb.Sheets[name];
    if (!ws) {
        console.log(`\nSheet [${name}] not found.`);
        return;
    }
    const ref = ws['!ref'];
    if (!ref) {
        console.log(`\nSheet [${name}] is empty.`);
        return;
    }
    const range = XLSX.utils.decode_range(ref);
    console.log(`\n=============================================`);
    console.log(`Sheet: [${name}], Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
    console.log(`=============================================`);

    // Print headers (Row 0)
    const headers = [];
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
        headers.push(cell ? String(cell.v).trim() : `Col_${c+1}`);
    }
    console.log('Headers:');
    headers.forEach((h, idx) => console.log(`  Col ${idx+1} (${XLSX.utils.encode_col(idx)}): "${h}"`));

    // Print first data row (Row 1)
    console.log('\nRow 1 Data:');
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r: 1, c})];
        if (cell && cell.v !== undefined) {
            console.log(`  Col ${c+1} (${headers[c]}): "${cell.v}"`);
        }
    }
});
