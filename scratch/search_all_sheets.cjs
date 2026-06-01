const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

const wb = XLSX.readFile(filePath);

wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const ref = ws['!ref'];
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);
    
    // Get headers
    const headers = {};
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
        if (cell) headers[c] = String(cell.v).trim();
    }
    
    let found = 0;
    for (let r = 1; r <= range.e.r; r++) {
        for (let c = 0; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({r, c})];
            if (cell) {
                const val = String(cell.v);
                if (val.toLowerCase().includes('electromec') || val.toLowerCase().includes('electro mec')) {
                    found++;
                    if (found <= 5) {
                        console.log(`Sheet "${sheetName}" | Row ${r+1}, Col ${c+1} (${headers[c]}): "${val}"`);
                    }
                }
            }
        }
    }
    if (found > 0) {
        console.log(`Sheet "${sheetName}": found ${found} occurrences of 'electromec'`);
    }
});
