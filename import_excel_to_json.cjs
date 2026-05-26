const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;
const outputPath = path.resolve(__dirname, 'public/reports/otData.json');

console.log('Reading Excel from:', excelPath);

if (!fs.existsSync(excelPath)) {
    console.error('ERROR: Excel file not found at:', excelPath);
    process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

// Get headers
const headers = {};
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell) headers[c] = String(cell.v).trim();
}

function parseExecutionTime(timeStr) {
    if (!timeStr) return 0;
    let totalMin = 0;
    const hoursMatch = String(timeStr).match(/(\d+)\s*h/i);
    const minsMatch = String(timeStr).match(/(\d+)\s*min/i);
    if (hoursMatch) {
        totalMin += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minsMatch) {
        totalMin += parseInt(minsMatch[1], 10);
    }
    if (totalMin === 0) {
        const numberMatch = String(timeStr).match(/(\d+)/);
        if (numberMatch && String(timeStr).toLowerCase().includes('h')) {
            totalMin = parseInt(numberMatch[1], 10) * 60;
        } else if (numberMatch) {
            totalMin = parseInt(numberMatch[1], 10);
        }
    }
    return totalMin;
}

let mayCount = 0;
const mappedOts = [];

for (let r = 1; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({r, c: 1})]; // Col 2: Marca temporal
    if (dateCell && typeof dateCell.v === 'number') {
        const date = new Date((dateCell.v - 25569) * 86400000);
        
        // Filter for May 2026
        if (date.getFullYear() === 2026 && date.getMonth() === 4) { // May is month 4
            mayCount++;
            
            // Get cells
            const getVal = (colIdx) => {
                const cell = ws[XLSX.utils.encode_cell({r, c: colIdx})];
                return cell ? String(cell.v).trim() : "";
            };

            const otIdVal = getVal(0); // Col 1
            const otId = otIdVal ? otIdVal : `OT-${String(mayCount).padStart(4, '0')}`;

            // Format date to D/M/YYYY
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            // Specialty
            let esp = "Otros";
            const sVal = getVal(9); // Col 10: Especialidad del trabajo
            if (sVal.includes("Electric")) esp = "Electricidad";
            else if (sVal.includes("Carpinter")) esp = "Carpintería";
            else if (sVal.includes("Gasfiter")) esp = "Gasfitería";
            else if (sVal.includes("Albañil") || sVal.includes("Albañilería")) esp = "Albañilería";
            else if (sVal.includes("Pint")) esp = "Pintura";

            // Priority
            let prio = "Bajo";
            const pVal = getVal(10).toLowerCase(); // Col 11: Prioridad de trabajo
            if (pVal.includes("alto")) prio = "Alto";
            else if (pVal.includes("medio")) prio = "Medio";
            else if (pVal.includes("emergencia")) prio = "Emergencia";

            const estadoVal = getVal(25); // Col 26: Estado de ot
            const estado = estadoVal.toLowerCase().includes("finalizado") ? "Finalizado" : "Pendiente";

            const programadoStatus = getVal(17); // Col 18: Programado (Programado, RQ, Cierre, Vacio)

            const tecPrincipal = getVal(14); // Col 15: Técnico Principal
            const tecApoyo = getVal(15); // Col 16: Técnico de Apoyo

            const tipo = getVal(16) || "Correctivo"; // Col 17: Tipo de trabajo

            // Risk/Riesgo mapping
            let riesgo = "";
            if (programadoStatus === "RQ") {
                riesgo = "⚠️ Requiere Suministro";
            } else if (prio === "Emergencia") {
                riesgo = "🚨 Emergencia";
            } else if (prio === "Alto" && estado !== "Finalizado") {
                riesgo = "🚨 Alta prioridad pendiente";
            } else if (programadoStatus === "Cierre") {
                riesgo = "🚨 Alta prioridad pendiente";
            }

            const califVal = getVal(27); // Col 28: Calificación de trabajo
            const calificacion = parseInt(califVal, 10) || 0;

            const tiempoStr = getVal(34); // Col 35: Tiempo de ejecución
            const tiempoMin = parseExecutionTime(tiempoStr);

            mappedOts.push({
                id: otId,
                fecha: dateStr,
                desc: getVal(8), // Col 9: Descripción de trabajo
                ubicacion: getVal(6).replace(/^\d+\.\s*/, ""), // Col 7: Ubicación (strip starting numbers)
                ubExacta: getVal(7), // Col 8: Ubicación exacta
                especialidad: esp,
                prioridad: prio,
                supervisor: getVal(12), // Col 13: Supervisor
                tecPrincipal: tecPrincipal,
                tecApoyo: tecApoyo,
                tipo: tipo,
                estado: estado,
                programadoStatus: programadoStatus,
                calificacion: calificacion,
                tiempo: tiempoStr,
                tiempoMin: tiempoMin,
                area: getVal(3), // Col 4: Area solicitante
                solicitante: getVal(4), // Col 5: Nombre usuario
                riesgo: riesgo
            });
        }
    }
}

console.log(`Mapped ${mappedOts.length} active OTs for May 2026.`);

// Ensure output dir exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(mappedOts, null, 2), 'utf8');
console.log('Successfully saved to:', outputPath);

// Print counts verification
console.log('\n=== COUNTS VERIFICATION FROM GENERATED JSON ===');
let finalizadas = 0;
let programadas = 0;
let cierre = 0;
let pendientes = 0;

mappedOts.forEach(o => {
    if (o.estado === 'Finalizado') {
        finalizadas++;
    } else if (o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre') {
        cierre++;
    } else if (o.programadoStatus === 'Programado') {
        programadas++;
    } else {
        pendientes++;
    }
});

console.log(`General 4 states classification:`);
console.log(`- Finalizadas: ${finalizadas}`);
console.log(`- Programadas: ${programadas}`);
console.log(`- Cierre (Canceladas): ${cierre}`);
console.log(`- Pendientes: ${pendientes}`);
console.log(`- Sum: ${finalizadas + programadas + cierre + pendientes}`);

console.log(`\nPending sub-segmentation:`);
const pendingList = mappedOts.filter(o => o.estado !== 'Finalizado' && !(o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre'));
console.log(`Total active pending (not finalized, not closed): ${pendingList.length}`);

let pendingRQ = 0;
let pendingSinAsignar = 0;
let pendingProgramadas = 0;
let pendingOtras = 0;

pendingList.forEach(o => {
    if (o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))) {
        pendingRQ++;
    } else if (!o.tecPrincipal || o.tecPrincipal.trim() === '') {
        pendingSinAsignar++;
    } else if (o.programadoStatus === 'Programado') {
        pendingProgramadas++;
    } else {
        pendingOtras++;
    }
});

console.log(`- Con RQ (Falta Suministros): ${pendingRQ}`);
console.log(`- Sin Asignar (Vacías / Sin técnico): ${pendingSinAsignar}`);
console.log(`- Programadas (Asignadas en cronograma): ${pendingProgramadas}`);
console.log(`- Otras (Asignadas en proceso): ${pendingOtras}`);
