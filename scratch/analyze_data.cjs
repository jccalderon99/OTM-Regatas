const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Bitácora - Ordenes de trabajo.xlsx`;

console.log('Loading Excel file...');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Orden de trabajos'];
const range = XLSX.utils.decode_range(ws['!ref']);

const headers = {};
for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c})];
    if (cell) headers[c] = String(cell.v).trim();
}

console.log(`Analyzing rows from Row 2 to Row ${range.e.r + 1}...`);

let totalRows = 0;
const statusCounts = {};
const priorityCounts = {};
const specialtyCounts = {};
const supervisorCounts = {};
const typeOfWorkCounts = {};
const assignmentTypeCounts = { own: 0, contractor: 0, unassigned: 0 };
const ratings = [];
let ratedCount = 0;
let ratingSum = 0;

// Technician stats
const techStats = {};

// Response time variables
let validDurationsCount = 0;
let totalDurationHours = 0;

// Contractor list from our platform rules
const contractorKeywords = ['TKE', 'CONTRATISTA', 'TERCERO', 'EXTERNO', 'PROVEEDOR', 'ASCENSORES', 'CLIMATIZACIÓN', 'SISTEMAS'];

function isContractor(name) {
    if (!name) return false;
    const upper = name.toUpperCase();
    return contractorKeywords.some(kw => upper.includes(kw));
}

for (let r = 1; r <= range.e.r; r++) {
    const tempCell = ws[XLSX.utils.encode_cell({r, c: 1})]; // Col 2: Marca temporal
    if (!tempCell || tempCell.v === undefined || tempCell.v === null || String(tempCell.v).trim() === '') {
        continue;
    }

    totalRows++;

    const row = {};
    for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        row[headers[c] || `Col_${c+1}`] = cell ? cell.v : null;
    }

    // Status
    const status = row['Estado de ot'] ? String(row['Estado de ot']).trim() : 'Pendiente';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Priority
    const priority = row['Prioridad de trabajo'] ? String(row['Prioridad de trabajo']).trim() : 'Medio';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

    // Specialty
    const rawSpecialty = row['Especialidad del trabajo'] ? String(row['Especialidad del trabajo']).trim() : 'Otros';
    const cleanSpecialty = rawSpecialty.replace(/^\d+\.\s*/, '').trim();
    specialtyCounts[cleanSpecialty] = (specialtyCounts[cleanSpecialty] || 0) + 1;

    // Supervisor
    const supervisor = row['Supervisor'] ? String(row['Supervisor']).trim() : 'Sin Asignar';
    supervisorCounts[supervisor] = (supervisorCounts[supervisor] || 0) + 1;

    // Type of work
    const typeOfWork = row['Tipo de trabajo'] ? String(row['Tipo de trabajo']).trim() : 'Correctivo';
    typeOfWorkCounts[typeOfWork] = (typeOfWorkCounts[typeOfWork] || 0) + 1;

    // Technician assignments
    const mainTech = row['Técnico Principal'] ? String(row['Técnico Principal']).trim() : '';
    const supportTech = row['Técnico de Apoyo'] ? String(row['Técnico de Apoyo']).trim() : '';

    if (mainTech) {
        const hasContractor = isContractor(mainTech) || isContractor(supportTech);
        if (hasContractor) {
            assignmentTypeCounts.contractor++;
        } else {
            assignmentTypeCounts.own++;
        }

        // Aggregate by main technician
        if (!techStats[mainTech]) {
            techStats[mainTech] = { total: 0, completed: 0, ratingSum: 0, ratingCount: 0, hours: 0 };
        }
        techStats[mainTech].total++;
        if (status.toLowerCase().includes('finaliz') || status.toLowerCase().includes('cerr')) {
            techStats[mainTech].completed++;
        }
    } else {
        assignmentTypeCounts.unassigned++;
    }

    // User ratings (CSAT)
    const ratingVal = row['Calificación de trabajo'];
    if (ratingVal !== undefined && ratingVal !== null && ratingVal !== '') {
        const rNum = parseFloat(ratingVal);
        if (!isNaN(rNum) && rNum >= 1 && rNum <= 5) {
            ratedCount++;
            ratingSum += rNum;
            ratings.push(rNum);

            if (mainTech && techStats[mainTech]) {
                techStats[mainTech].ratingSum += rNum;
                techStats[mainTech].ratingCount++;
            }
        }
    }

    // Execution time (Col 35: Tiempo de ejecución)
    const execTimeVal = row['Tiempo de ejecución'];
    if (execTimeVal !== undefined && execTimeVal !== null && execTimeVal !== '') {
        const hours = parseFloat(execTimeVal);
        if (!isNaN(hours) && hours > 0) {
            validDurationsCount++;
            totalDurationHours += hours;

            if (mainTech && techStats[mainTech]) {
                techStats[mainTech].hours += hours;
            }
        }
    }
}

const avgRating = ratedCount > 0 ? (ratingSum / ratedCount).toFixed(2) : 'N/A';
const avgDuration = validDurationsCount > 0 ? (totalDurationHours / validDurationsCount).toFixed(2) : 'N/A';

console.log('\n======================================');
console.log('            ANALYSIS RESULTS          ');
console.log('======================================');
console.log(`Total Work Orders analyzed: ${totalRows}`);
console.log(`Average User Satisfaction Rating (CSAT): ${avgRating} / 5.0 (from ${ratedCount} reviews)`);
console.log(`Average Execution Time per OT: ${avgDuration} hours (from ${validDurationsCount} jobs)`);

console.log('\n--- STATUS DISTRIBUTION ---');
Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- PRIORITY DISTRIBUTION ---');
Object.entries(priorityCounts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- SPECIALTY DISTRIBUTION (Top 8) ---');
Object.entries(specialtyCounts).sort((a,b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => {
    console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- ASSIGNMENT TYPE ---');
Object.entries(assignmentTypeCounts).forEach(([k, v]) => {
    console.log(`  ${k}: ${v} (${((v/totalRows)*100).toFixed(1)}%)`);
});

console.log('\n--- TOP TECHNICIANS BY COMPLETED WORK ---');
Object.entries(techStats)
    .sort((a,b) => b[1].completed - a[1].completed)
    .slice(0, 5)
    .forEach(([name, stats]) => {
        const techAvgRating = stats.ratingCount > 0 ? (stats.ratingSum / stats.ratingCount).toFixed(2) : 'N/A';
        console.log(`  ${name}: ${stats.completed} completed / ${stats.total} total OTs, Avg CSAT: ${techAvgRating}, Total Hours: ${stats.hours.toFixed(1)}h`);
    });

const highPriorityPending = totalRows - (statusCounts['Finalizado'] || 0) - (statusCounts['Cerrado'] || 0);
console.log(`\n  Total Pending OTs: ${highPriorityPending}`);
console.log('======================================');
