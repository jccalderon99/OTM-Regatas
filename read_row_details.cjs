const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

for (let r = 1; r <= 15; r++) {
    const cellCol0 = ws[XLSX.utils.encode_cell({r, c: 0})];
    const cellCol1 = ws[XLSX.utils.encode_cell({r, c: 1})];
    const valCol0 = cellCol0 ? cellCol0.v : '(VACIO)';
    
    // Excel date to string
    let dateStr = '(VACIO)';
    if (cellCol1 && typeof cellCol1.v === 'number') {
        const date = new Date((cellCol1.v - 25569) * 86400000);
        dateStr = date.toISOString().substring(0, 10);
    }
    console.log(`Row ${r+1}: Col_1=${valCol0} | Date=${dateStr}`);
}
