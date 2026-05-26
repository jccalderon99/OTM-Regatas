import fs from 'fs';
import path from 'path';

const csvPath = 'C:\\Users\\jccalderon\\Downloads\\Bitácora - Ordenes de trabajo - Orden de trabajos (1).csv';
const outputPath = path.resolve('public/reports/otData.json');

console.log('Reading Bitácora CSV from:', csvPath);

if (!fs.existsSync(csvPath)) {
    console.error('ERROR: CSV file not found at:', csvPath);
    process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];

        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') {
                i++;
            }
            lines.push(row);
            row = [''];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== '') {
        lines.push(row);
    }
    return lines;
}

function parseExecutionTime(timeStr) {
    if (!timeStr) return 0;
    let totalMin = 0;
    const hoursMatch = timeStr.match(/(\d+)\s*h/i);
    const minsMatch = timeStr.match(/(\d+)\s*min/i);
    if (hoursMatch) {
        totalMin += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minsMatch) {
        totalMin += parseInt(minsMatch[1], 10);
    }
    if (totalMin === 0) {
        const numberMatch = timeStr.match(/(\d+)/);
        if (numberMatch && timeStr.toLowerCase().includes('h')) {
            totalMin = parseInt(numberMatch[1], 10) * 60;
        } else if (numberMatch) {
            totalMin = parseInt(numberMatch[1], 10);
        }
    }
    return totalMin;
}

const rows = parseCSV(csvContent);
console.log(`Parsed ${rows.length} rows (including header).`);

if (rows.length <= 1) {
    console.error('ERROR: No data rows found.');
    process.exit(1);
}

// Skip header row
const dataRows = rows.slice(1);
const mappedOts = dataRows.map((col, index) => {
    let targetCol = col;
    if (col.length === 1 && col[0].includes(',')) {
        const subRows = parseCSV(col[0]);
        if (subRows.length > 0) {
            targetCol = subRows[0];
        }
    }

    if (targetCol.length < 10) return null; // skip malformed lines

    // Date formatting: extract date part
    let fechaStr = "4/5/2026";
    if (targetCol[1]) {
        fechaStr = targetCol[1].split(' ')[0].trim();
    }

    // Specialty mapping
    let esp = "Otros";
    const s = targetCol[9] || "";
    if (s.includes("Electric")) esp = "Electricidad";
    else if (s.includes("Carpinter")) esp = "Carpintería";
    else if (s.includes("Gasfiter")) esp = "Gasfitería";
    else if (s.includes("Albañil") || s.includes("Albañilería")) esp = "Albañilería";
    else if (s.includes("Pint")) esp = "Pintura";

    // Priority mapping
    let prio = "Bajo";
    const p = (targetCol[10] || "").toLowerCase();
    if (p.includes("alto")) prio = "Alto";
    else if (p.includes("medio")) prio = "Medio";
    else if (p.includes("emergencia")) prio = "Emergencia";

    // Location formatting
    let ubi = targetCol[6] || "Club Regatas";
    if (ubi.match(/^\d+\.\s*/)) {
        ubi = ubi.replace(/^\d+\.\s*/, "");
    }

    // Solicitante mapping
    let solicitante = targetCol[4] || "jccalderon";
    if (!solicitante && targetCol[2]) {
        solicitante = targetCol[2].split('@')[0];
    }

    // Time parsing
    const tiempoStr = targetCol[34] || "";
    const min = parseExecutionTime(tiempoStr);

    // ID generation if empty
    let otId = targetCol[0] || "";
    if (!otId) {
        otId = `OT-${String(index + 1).padStart(4, '0')}`;
    }

    return {
        id: otId,
        fecha: fechaStr,
        desc: targetCol[8] || "",
        ubicacion: ubi,
        ubExacta: targetCol[7] || "",
        especialidad: esp,
        prioridad: prio,
        supervisor: targetCol[12] || "",
        tecPrincipal: targetCol[14] || "",
        tecApoyo: targetCol[15] || "",
        tipo: targetCol[16] || "Correctivo",
        estado: (targetCol[25] || "").toLowerCase().includes("finalizado") ? "Finalizado" : "Pendiente",
        calificacion: parseInt(targetCol[27], 10) || 0,
        tiempo: tiempoStr,
        tiempoMin: min,
        area: targetCol[3] || "22. MANTENIMIENTO",
        solicitante: solicitante,
        riesgo: (targetCol[10] || "").toLowerCase().includes("emergencia") ? "🚨 Emergencia" : ""
    };
}).filter(Boolean);

console.log(`Successfully mapped ${mappedOts.length} active OTs.`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(mappedOts, null, 2), 'utf-8');

console.log('Data saved successfully to:', outputPath);
