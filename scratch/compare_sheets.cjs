const XLSX = require('xlsx');
const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);

const ws1 = wb.Sheets['Orden de trabajos'];
const ws2 = wb.Sheets['Ordenes atendidas'];

const codes1 = new Set();
const range1 = XLSX.utils.decode_range(ws1['!ref']);
for (let r = 1; r <= range1.e.r; r++) {
    // Check if row is valid first
    const tempCell = ws1[XLSX.utils.encode_cell({r, c: 1})];
    if (tempCell && tempCell.v !== undefined && tempCell.v !== null && String(tempCell.v).trim() !== '') {
        const codeCell = ws1[XLSX.utils.encode_cell({r, c: 0})]; // Col 1: OTM Code
        if (codeCell && codeCell.v) {
            codes1.add(String(codeCell.v).trim());
        }
    }
}

const codes2 = new Set();
const range2 = XLSX.utils.decode_range(ws2['!ref']);
for (let r = 1; r <= range2.e.r; r++) {
    const codeCell = ws2[XLSX.utils.encode_cell({r, c: 1})]; // Col 2: Ingresar el Código de OTM
    if (codeCell && codeCell.v) {
        codes2.add(String(codeCell.v).trim());
    }
}

console.log('=== COMPARE SHEET CODES ===');
console.log('Unique codes in [Orden de trabajos] (May 2026):', codes1.size);
console.log('Unique codes in [Ordenes atendidas]:', codes2.size);

const union = new Set([...codes1, ...codes2]);
console.log('Union of both sheets (Total unique OTMs):', union.size);

// Check intersection
const intersection = [...codes1].filter(x => codes2.has(x));
console.log('Intersection of both sheets (OTMs in both):', intersection.length);

// Check codes in Ordenes atendidas but NOT in Orden de trabajos
const onlyIn2 = [...codes2].filter(x => !codes1.has(x));
console.log('OTMs only in [Ordenes atendidas]:', onlyIn2.length);
if (onlyIn2.length > 0) {
    console.log('Samples only in [Ordenes atendidas]:', onlyIn2.slice(0, 10));
}
