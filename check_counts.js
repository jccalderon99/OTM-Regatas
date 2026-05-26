import fs from 'fs';

// Read public/reports/dashboard-mayo-2026.html to find the static data block
const html = fs.readFileSync('public/reports/dashboard-mayo-2026.html', 'utf8');

// Find staticOtData block
const match = html.match(/const staticOtData = (\[[\s\S]*?\]);/);
if (!match) {
    console.error("Could not find staticOtData");
    process.exit(1);
}

// Evaluate staticOtData safely
const staticOtData = new Function(`return ${match[1]}`)();
console.log(`Total OTs in staticOtData: ${staticOtData.length}`);

// Calculate counts
let finalizadas = 0;
let programadas = 0;
let cierre = 0;
let pendientes = 0;

staticOtData.forEach(o => {
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
console.log(`- Sum of states: ${finalizadas + programadas + cierre + pendientes}`);

console.log(`\nPending sub-segmentation:`);
// Pending sub-segmentation on those who are NOT Finalizado and NOT Cierre:
const pendingList = staticOtData.filter(o => o.estado !== 'Finalizado' && !(o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre'));
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
