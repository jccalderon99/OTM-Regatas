const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

const getVal = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({r, c})];
    return cell ? String(cell.v).trim() : '';
};

console.log('=== PENDING, NON-RQ OTs & THEIR OBSERVATIONS ===');
let count = 0;
for (let r = 1; r <= range.e.r; r++) {
    const id = getVal(r, 0); // Col A or whatever ID is
    const idOT = getVal(r, 1); // Row details ID
    const dateCell = getVal(r, 1);
    if (dateCell !== '') {
        // Calculate status
        const statusVal = getVal(r, 25).toLowerCase(); // Col Z (index 25)
        let estado = 'Pendiente';
        if (statusVal.includes('finalizado') || statusVal.includes('cerrado')) {
          estado = 'Finalizado';
        } else if (statusVal.includes('cancelado') || statusVal.includes('cierre')) {
          estado = 'Cierre';
        }

        const progStatus = getVal(r, 17); // Col R (index 17)
        let isRQ = (progStatus === 'RQ' || progStatus.toLowerCase().includes('con rq'));

        if (estado === 'Pendiente' && !isRQ) {
            count++;
            const obsUser = getVal(r, 28); // Col AC (index 28) "Obervación del usuario"
            const finalCol = getVal(r, 45); // Col AT (index 45) "ESTADO" or whatever the last column is!
            // Let's print all values of row r beyond column 28 to see if there is another column!
            const extraValues = [];
            for (let c = 28; c <= range.e.c; c++) {
                const header = getVal(0, c);
                const val = getVal(r, c);
                if (val !== '') {
                    extraValues.push(`${header || ('Col ' + (c+1))}: "${val}"`);
                }
            }
            console.log(`Row ${r+1} | OT: "${getVal(r, 8)}" (Col I) | UB: "${getVal(r, 6)}" | Obs User: "${obsUser}" | Extras: ${extraValues.join(', ')}`);
        }
    }
}
console.log(`\nTotal checked rows: ${count}`);
