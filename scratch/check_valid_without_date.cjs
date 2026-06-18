const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

let count = 0;
const sampleRows = [];

for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})];
    const hasDate = dateCell && dateCell.v !== undefined && dateCell.v !== null && String(dateCell.v).trim() !== '';
    
    if (!hasDate) {
        const techCell = ws[XLSX.utils.encode_cell({r, c: 14})]; // Col 15: Técnico Principal
        const statusCell = ws[XLSX.utils.encode_cell({r, c: 25})]; // Col 26: Estado de ot
        const descCell = ws[XLSX.utils.encode_cell({r, c: 8})]; // Col 9: Descripción de trabajo
        
        const hasTech = techCell && techCell.v !== undefined && techCell.v !== null && String(techCell.v).trim() !== '';
        const hasStatus = statusCell && statusCell.v !== undefined && statusCell.v !== null && String(statusCell.v).trim() !== '';
        const hasDesc = descCell && descCell.v !== undefined && descCell.v !== null && String(descCell.v).trim() !== '';
        
        if (hasTech || hasStatus || hasDesc) {
            count++;
            if (sampleRows.length < 5) {
                sampleRows.push({
                    row: r + 1,
                    desc: descCell ? descCell.v : '',
                    tech: techCell ? techCell.v : '',
                    status: statusCell ? statusCell.v : ''
                });
            }
        }
    }
}

console.log('=== VALID DATA ROWS WITHOUT DATE ===');
console.log('Count:', count);
console.log('Samples:', JSON.stringify(sampleRows, null, 2));
