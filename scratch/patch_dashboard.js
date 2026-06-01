import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.resolve(__dirname, '../public/reports/dashboard-mayo-2026.html');
const destPath = path.resolve(__dirname, '../public/reports/dashboard-externo.html');

console.log('Cloning and patching dashboard-mayo-2026.html into dashboard-externo.html...');

if (!fs.existsSync(srcPath)) {
    console.error('ERROR: Source dashboard-mayo-2026.html not found!');
    process.exit(1);
}

let html = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Replace static date badge in HTML layout
const originalBadgeHtml = '<div class="date-badge">📅 Mayo 2026 (4 - 25 mayo)</div>';
const newBadgeHtml = '<div class="date-badge">📅 Bitácora Importada</div>';
html = html.replace(originalBadgeHtml, newBadgeHtml);

// 2. Replace loadOtData helper
const originalLoadOtData = `function loadOtData() {
    // For this specific May 2026 Dashboard, we ONLY use the 
    // static data extracted from the official Excel.
    // Bypassing localStorage because the dynamic app logic 
    // overwrites the "Programada" state into "Pendiente".
    return staticOtData;
}`;

const newLoadOtData = `function loadOtData() {
    const rawData = localStorage.getItem('external_report_data');
    return rawData ? JSON.parse(rawData) : staticOtData;
}`;
html = html.replace(originalLoadOtData, newLoadOtData);

// 3. Inject supervisor populator and update initDashboard
const originalInitDashboard = `async function initDashboard() {
    try {
        const response = await fetch('otData.json');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                otData = data;
                console.log("Loaded " + otData.length + " OTs from otData.json successfully.");
            }
        }
    } catch (e) {
        console.log("otData.json not found or failed to load, falling back to localStorage/static data:", e);
    }
    updateDashboard();
}`;

const newInitDashboard = `function populateSupervisorSelect() {
    const select = document.getElementById('globalSupervisorSelect');
    if (!select) return;
    
    // Get unique supervisors
    const supervisors = Array.from(new Set(otData.map(o => o.supervisor))).filter(s => s && s.trim() !== '').sort();
    
    select.innerHTML = '<option value="all" style="background:#0f172a; color:#ffffff;">Todos</option>';
    supervisors.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.style.background = '#0f172a';
        opt.style.color = '#ffffff';
        opt.textContent = s;
        select.appendChild(opt);
    });
}

async function initDashboard() {
    const rawData = localStorage.getItem('external_report_data');
    if (rawData) {
        otData = JSON.parse(rawData);
        console.log("Loaded " + otData.length + " OTs from localStorage successfully.");
    } else {
        try {
            const response = await fetch('otData.json');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    otData = data;
                }
            }
        } catch (e) {}
    }
    populateSupervisorSelect();
    updateDashboard();
}`;
html = html.replace(originalInitDashboard, newInitDashboard);

// 4. Replace date badge logic in updateDashboard()
const originalUpdateBadge = `    // Update Header Date Description dynamically
    let badgeText = \`📅 Mayo 2026 (4 - 25 mayo)\`;
    if (currentGlobalDateRange === 'all') {
        badgeText = \`📅 Todo el Período (4 - 25 Mayo)\`;
    } else if (currentGlobalDateRange === '1d') {
        badgeText = \`📅 Último Día (25 Mayo)\`;
    } else if (currentGlobalDateRange === '1w') {
        badgeText = \`📅 Última Semana (19 - 25 Mayo)\`;
    } else if (currentGlobalDateRange === '1m') {
        badgeText = \`📅 Último Mes\`;
    } else if (currentGlobalDateRange === 'custom') {
        const fromDesc = customDateFromVal ? customDateFromVal.split('-').reverse().join('/') : 'Inicio';
        const toDesc = customDateToVal ? customDateToVal.split('-').reverse().join('/') : 'Fin';
        badgeText = \`📅 Personalizado: \${fromDesc} a \${toDesc}\`;
    } else {
        badgeText = \`📅 Rango: \${currentGlobalDateRange.toUpperCase()}\`;
    }
    document.querySelector('.date-badge').textContent = badgeText;`;

const newUpdateBadge = `    // Update Header Date Description dynamically
    const excelTitle = localStorage.getItem('external_report_title') || 'Bitácora Importada';
    let minDateStr = '';
    let maxDateStr = '';
    if (otData.length > 0) {
        const sortedDates = otData.map(o => parseDateStr(o.fecha)).filter(Boolean).sort((a,b) => a - b);
        if (sortedDates.length > 0) {
            const minD = sortedDates[0];
            const maxD = sortedDates[sortedDates.length - 1];
            minDateStr = \`\${minD.getDate()}/\${minD.getMonth()+1}/\${minD.getFullYear()}\`;
            maxDateStr = \`\${maxD.getDate()}/\${maxD.getMonth()+1}/\${maxD.getFullYear()}\`;
        }
    }
    const rangeText = minDateStr && maxDateStr ? \`(\${minDateStr} - \${maxDateStr})\` : '';
    let badgeText = \`📅 \${excelTitle} \${rangeText}\`;
    
    if (currentGlobalDateRange === 'all') {
        badgeText = \`📅 \${excelTitle} — Todo el Período\`;
    } else if (currentGlobalDateRange === '1d') {
        badgeText = \`📅 \${excelTitle} — Último Día\`;
    } else if (currentGlobalDateRange === '1w') {
        badgeText = \`📅 \${excelTitle} — Última Semana\`;
    } else if (currentGlobalDateRange === '1m') {
        badgeText = \`📅 \${excelTitle} — Último Mes\`;
    } else if (currentGlobalDateRange === 'custom') {
        const fromDesc = customDateFromVal ? customDateFromVal.split('-').reverse().join('/') : 'Inicio';
        const toDesc = customDateToVal ? customDateToVal.split('-').reverse().join('/') : 'Fin';
        badgeText = \`📅 \${excelTitle} — Personalizado: \${fromDesc} a \${toDesc}\`;
    }
    document.querySelector('.date-badge').textContent = badgeText;`;

html = html.replace(originalUpdateBadge, newUpdateBadge);

// 5. Replace PDF print title
// We find: <h3>MAYO 2026</h3> inside HTML block
const originalPdfTitle = '<h3 style="font-size: 14px; font-weight: 800; color: #475569; text-transform: uppercase; font-family: \'Inter\', sans-serif;">MAYO 2026</h3>';
const newPdfTitle = '<h3 style="font-size: 14px; font-weight: 800; color: #475569; text-transform: uppercase; font-family: \'Inter\', sans-serif;">${(localStorage.getItem(\'external_report_title\') || \'Bitácora\').toUpperCase()}</h3>';
html = html.replace(originalPdfTitle, newPdfTitle);

// Replace "MAYO 2026" with dynamic file title in the PDF header
html = html.replaceAll('INFORME DE MANTENIMIENTO — MAYO 2026', 'INFORME DE MANTENIMIENTO — ${(localStorage.getItem(\'external_report_title\') || \'Bitácora\').toUpperCase()}');
html = html.replaceAll('Informe Mensual de Mantenimiento CRL', 'Informe de Mantenimiento CRL — ${localStorage.getItem(\'external_report_title\') || \'Bitácora\'}');

// ========================== DYNAMIC ANALYTICS & STATUSES PATCHES ==========================

// 6. Add "Por revisar" KPI Card in HTML layout
const originalRqKpi = `<div class="kpi-card" style="padding: 16px; border-color: rgba(167,139,250,0.5);">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">📦</div>
                    <div class="kpi-label" style="font-size:10px;">Falta Suministros (RQ)</div>
                    <div class="kpi-value" style="color: var(--accent-purple); font-size: 26px;" id="kpiPendingRQ">0</div>
                </div>`;

const newRqKpi = `<div class="kpi-card" style="padding: 16px; border-color: rgba(167,139,250,0.5);">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">📦</div>
                    <div class="kpi-label" style="font-size:10px;">Falta Suministros (RQ)</div>
                    <div class="kpi-value" style="color: var(--accent-purple); font-size: 26px;" id="kpiPendingRQ">0</div>
                </div>
                <div class="kpi-card" style="padding: 16px; border-color: rgba(52,211,153,0.5);">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">🔍</div>
                    <div class="kpi-label" style="font-size:10px;">Por Revisar</div>
                    <div class="kpi-value" style="color: var(--accent-green); font-size: 26px;" id="kpiPendingPorRevisar">0</div>
                </div>`;

html = html.replace(originalRqKpi, newRqKpi);

// 7. Make espLabels dynamic in renderOverviewTab
const originalEspLabelsOverview = `    // 2. Especialidad
    const espLabels = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura','Otros'];
    const espCount = espLabels.map(e => data.filter(o => o.especialidad === e).length);`;

const newEspLabelsOverview = `    // 2. Especialidad
    const uniqueSpecialties = Array.from(new Set(data.map(o => o.especialidad))).filter(Boolean);
    const standardEsp = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura'];
    const otherEsp = uniqueSpecialties.filter(s => !standardEsp.includes(s) && s !== 'Otros');
    const espLabels = [...standardEsp, ...otherEsp, 'Otros'].filter(s => uniqueSpecialties.includes(s) || standardEsp.includes(s));
    const espCount = espLabels.map(e => data.filter(o => o.especialidad === e).length);`;

html = html.replace(originalEspLabelsOverview, newEspLabelsOverview);

// 8. Make pending calculations and chart dynamic and support "Por revisar" segment
const originalPendingCalculations = `    // Dynamic calculations
    const totalPending = pendingOTs.length;
    const rqPending = pendingOTs.filter(o => o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))).length;
    const sinRqPending = totalPending - rqPending;
    
    const carpinteriaPending = pendingOTs.filter(o => o.especialidad === 'Carpintería').length;
    const pinturaPending = pendingOTs.filter(o => o.especialidad === 'Pintura').length;
    const albanileriaPending = pendingOTs.filter(o => o.especialidad === 'Albañilería').length;

    // Update KPIs
    document.getElementById('kpiPendingTotal').textContent = totalPending;
    document.getElementById('kpiPendingRQ').textContent = rqPending;
    document.getElementById('kpiPendingCarpinteria').textContent = carpinteriaPending;
    document.getElementById('kpiPendingPintura').textContent = pinturaPending;
    document.getElementById('kpiPendingAlbanileria').textContent = albanileriaPending;

    const highPriorityPending = pendingOTs.filter(o => priorityClass(o.prioridad) === 'alto').length;
    document.getElementById('alertAltaCount').textContent = highPriorityPending + ' OTs de prioridad ALTA';

    // 1. Pending Reason chart (Doughnut) - 2 segments
    safeCreateChart('chartPendingReason', {
        type: 'doughnut',
        data: {
            labels: ['Con RQ', 'Sin RQ'],
            datasets: [{
                data: [rqPending, sinRqPending],
                backgroundColor: [colors.purple, colors.amber],
                borderWidth: 0, hoverOffset: 8
            }]
        },`;

const newPendingCalculations = `    // Dynamic calculations
    const totalPending = pendingOTs.length;
    const rqPending = pendingOTs.filter(o => o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))).length;
    const porRevisarPending = totalPending - rqPending;

    // Update KPIs
    document.getElementById('kpiPendingTotal').textContent = totalPending;
    document.getElementById('kpiPendingRQ').textContent = rqPending;
    if (document.getElementById('kpiPendingPorRevisar')) {
        document.getElementById('kpiPendingPorRevisar').textContent = porRevisarPending;
    }

    // 1. Pending Reason chart (Doughnut) - 2 segments
    safeCreateChart('chartPendingReason', {
        type: 'doughnut',
        data: {
            labels: ['Con RQ', 'Por revisar'],
            datasets: [{
                data: [rqPending, porRevisarPending],
                backgroundColor: [colors.purple, colors.green],
                borderWidth: 0, hoverOffset: 8
            }]
        },`;

html = html.replace(originalPendingCalculations, newPendingCalculations);

// 9. Make pendEspLabels dynamic in renderPendingTab
const originalPendEspLabels = `    // 2. Pending by Specialty chart (Stacked Bar)
    const pendEspLabels = ['Carpintería', 'Electricidad', 'Gasfitería', 'Albañilería', 'Pintura', 'Otros'];
    const totals = {};
    pendEspLabels.forEach(esp => {
        totals[esp] = pendingOTs.filter(o => o.especialidad === esp).length;
    });`;

const newPendEspLabels = `    // 2. Pending by Specialty chart (Stacked Bar)
    const uniquePendSpecialties = Array.from(new Set(pendingOTs.map(o => o.especialidad))).filter(Boolean);
    const standardEsp = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura'];
    const otherEsp = uniquePendSpecialties.filter(s => !standardEsp.includes(s) && s !== 'Otros');
    const pendEspLabels = [...standardEsp, ...otherEsp, 'Otros'].filter(s => uniquePendSpecialties.includes(s) || standardEsp.includes(s));
    const totals = {};
    pendEspLabels.forEach(esp => {
        totals[esp] = pendingOTs.filter(o => o.especialidad === esp).length;
    });`;

html = html.replace(originalPendEspLabels, newPendEspLabels);

// 10. Make renderDetailTable dynamic
const originalRenderDetailTable = `function renderDetailTable(filter) {
    const data = window.detailDataRef || otData;
    const tbody = document.getElementById('detailTableBody');
    if (!tbody) return;

    let filtered = data;
    if (filter === 'finalizado') filtered = data.filter(o => o.estado === 'Finalizado');
    else if (filter === 'programado') filtered = data.filter(o => o.estado !== 'Finalizado' && o.programadoStatus === 'Programado');
    else if (filter === 'pendiente') filtered = data.filter(o => o.estado !== 'Finalizado');
    else if (filter === 'electricidad') filtered = data.filter(o => o.especialidad === 'Electricidad');
    else if (filter === 'carpinteria') filtered = data.filter(o => o.especialidad === 'Carpintería');
    else if (filter === 'gasfiteria') filtered = data.filter(o => o.especialidad === 'Gasfitería');
    else if (filter === 'albanileria') filtered = data.filter(o => o.especialidad === 'Albañilería');
    else if (filter === 'pintura') filtered = data.filter(o => o.especialidad === 'Pintura');
    
    document.getElementById('detailCount').textContent = filtered.length + ' registros';`;

const newRenderDetailTable = `function renderDetailTable(filter) {
    const data = window.detailDataRef || otData;
    const tbody = document.getElementById('detailTableBody');
    if (!tbody) return;

    let filtered = data;
    if (filter === 'finalizado') filtered = data.filter(o => o.estado === 'Finalizado');
    else if (filter === 'programado') filtered = data.filter(o => o.estado !== 'Finalizado' && o.programadoStatus === 'Programado');
    else if (filter === 'pendiente') filtered = data.filter(o => o.estado !== 'Finalizado');
    else {
        const normFilter = filter.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
        filtered = data.filter(o => {
            const normSpec = (o.especialidad || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            return normSpec === normFilter || (normFilter === 'carpinteria' && normSpec === 'carpinteria');
        });
    }
    
    document.getElementById('detailCount').textContent = filtered.length + ' registros';`;

html = html.replace(originalRenderDetailTable, newRenderDetailTable);

// 11. Inject populateSpecialtyFilters and call it in initDashboard
const originalInitDashboardCall = `    populateSupervisorSelect();
    updateDashboard();
}`;

const newInitDashboardCall = `function populateSpecialtyFilters() {
    const uniqueSpecialties = Array.from(new Set(otData.map(o => o.especialidad))).filter(Boolean);
    const standardEsp = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura'];
    const otherEsp = uniqueSpecialties.filter(s => !standardEsp.includes(s) && s !== 'Otros');
    const allSpecialties = [...standardEsp, ...otherEsp, 'Otros'].filter(s => uniqueSpecialties.includes(s) || standardEsp.includes(s));

    const emojiMap = {
        'Carpintería': '🪚',
        'Electricidad': '⚡',
        'Gasfitería': '🚿',
        'Albañilería': '🧱',
        'Pintura': '🎨',
        'Electromecánica': '⚙️',
        'Jardinería': '🌱',
        'Piscina': '🏊',
        'Calderos': '🔥',
        'Otros': '🛠️'
    };

    const techFiltersDiv = document.getElementById('techSpecialtyFilters');
    if (techFiltersDiv) {
        techFiltersDiv.innerHTML = \`
            <span class="filter-group-label" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Especialidad:</span>
            <button class="filter-btn active" data-specialty="all">Todas</button>
\`;
        allSpecialties.forEach(spec => {
            const btn = document.createElement('button');
            btn.className = \`filter-btn\`;
            btn.dataset.specialty = spec;
            btn.textContent = \`\${emojiMap[spec] || '🛠️'} \${spec}\`;
            btn.addEventListener('click', () => {
                techFiltersDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTechSpecialty = spec;
                updateDashboard();
            });
            techFiltersDiv.appendChild(btn);
        });
        
        const allBtn = techFiltersDiv.querySelector('[data-specialty="all"]');
        allBtn.addEventListener('click', () => {
            techFiltersDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            currentTechSpecialty = 'all';
            updateDashboard();
        });
    }

    const detailFiltersDiv = document.getElementById('detailFilters');
    if (detailFiltersDiv) {
        detailFiltersDiv.innerHTML = \`
            <button class="filter-btn active" data-filter="all">Todas</button>
            <button class="filter-btn" data-filter="finalizado">✅ Finalizadas</button>
            <button class="filter-btn" data-filter="programado">📅 Programadas</button>
            <button class="filter-btn" data-filter="pendiente">⏳ Pendientes</button>
\`;
        
        allSpecialties.forEach(spec => {
            const lowerSpec = spec.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            const btn = document.createElement('button');
            btn.className = \`filter-btn\`;
            btn.dataset.filter = lowerSpec;
            btn.textContent = \`\${emojiMap[spec] || '🛠️'} \${spec}\`;
            detailFiltersDiv.appendChild(btn);
        });

        detailFiltersDiv.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                detailFiltersDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderDetailTable(btn.dataset.filter);
            });
        });
    }
}

    populateSupervisorSelect();
    populateSpecialtyFilters();
    updateDashboard();
}`;

html = html.replace(originalInitDashboardCall, newInitDashboardCall);

// 12. Make PDF espLabels dynamic
const originalPdfEspLabels = `    // --- 3. chartReportEspecialidad (Bar - Total vs Finalizadas) ---
    if (document.getElementById('chartReportEspecialidad')) {
        const espLabels = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura','Otros'];
        const espCount = espLabels.map(e => filteredData.filter(o => o.especialidad === e).length);`;

const newPdfEspLabels = `    // --- 3. chartReportEspecialidad (Bar - Total vs Finalizadas) ---
    if (document.getElementById('chartReportEspecialidad')) {
        const uniqueSpecialties = Array.from(new Set(filteredData.map(o => o.especialidad))).filter(Boolean);
        const standardEsp = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura'];
        const otherEsp = uniqueSpecialties.filter(s => !standardEsp.includes(s) && s !== 'Otros');
        const espLabels = [...standardEsp, ...otherEsp, 'Otros'].filter(s => uniqueSpecialties.includes(s) || standardEsp.includes(s));
        const espCount = espLabels.map(e => filteredData.filter(o => o.especialidad === e).length);`;

html = html.replace(originalPdfEspLabels, newPdfEspLabels);

// 13. Make PDF pending reason chart dynamic with 2 segments ('Con RQ' vs 'Por revisar')
const originalPdfPendingReason = `    // --- 12. chartReportPendingReason (Doughnut - 2 segments) ---
    if (document.getElementById('chartReportPendingReason')) {
        const rqPending = unplannedPendingOTs.filter(o => o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))).length;
        const sinRqPending = unplannedPendingOTs.length - rqPending;

        const doughnutOpts = getPrintDoughnutOptions(rqPending + sinRqPending);
        safeCreateReportChart('chartReportPendingReason', {
            type: 'doughnut',
            data: {
                labels: ['Con RQ', 'Sin RQ'],
                datasets: [{
                    data: [rqPending, sinRqPending],
                    backgroundColor: [printColors.purple, printColors.amber],`;

const newPdfPendingReason = `    // --- 12. chartReportPendingReason (Doughnut - 2 segments) ---
    if (document.getElementById('chartReportPendingReason')) {
        const rqPending = unplannedPendingOTs.filter(o => o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))).length;
        const porRevisarPending = unplannedPendingOTs.length - rqPending;

        const doughnutOpts = getPrintDoughnutOptions(rqPending + porRevisarPending);
        safeCreateReportChart('chartReportPendingReason', {
            type: 'doughnut',
            data: {
                labels: ['Con RQ', 'Por revisar'],
                datasets: [{
                    data: [rqPending, porRevisarPending],
                    backgroundColor: [printColors.purple, printColors.green || '#16a34a'],`;

html = html.replace(originalPdfPendingReason, newPdfPendingReason);

// 14. Make PDF pendEspLabels dynamic
const originalPdfPendEspLabels = `    // --- 13. chartReportPendingSpecialty (Stacked Bar - RQ vs Sin RQ) ---
    if (document.getElementById('chartReportPendingSpecialty')) {
        const pendEspLabels = ['Carpintería', 'Electricidad', 'Gasfitería', 'Albañilería', 'Pintura', 'Otros'];
        const totals = {};
        pendEspLabels.forEach(esp => {
            totals[esp] = unplannedPendingOTs.filter(o => o.especialidad === esp).length;
        });`;

const newPdfPendEspLabels = `    // --- 13. chartReportPendingSpecialty (Stacked Bar - RQ vs Sin RQ) ---
    if (document.getElementById('chartReportPendingSpecialty')) {
        const uniquePendSpecialties = Array.from(new Set(unplannedPendingOTs.map(o => o.especialidad))).filter(Boolean);
        const standardEsp = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura'];
        const otherEsp = uniquePendSpecialties.filter(s => !standardEsp.includes(s) && s !== 'Otros');
        const pendEspLabels = [...standardEsp, ...otherEsp, 'Otros'].filter(s => uniquePendSpecialties.includes(s) || standardEsp.includes(s));
        const totals = {};
        pendEspLabels.forEach(esp => {
            totals[esp] = unplannedPendingOTs.filter(o => o.especialidad === esp).length;
        });`;

html = html.replace(originalPdfPendEspLabels, newPdfPendEspLabels);

// 15. Unified Chart Titles Renamings
html = html.replace('Pendientes: Requerimientos (RQ) vs Resto', 'Pendientes: Con RQ vs Por revisar');
html = html.replace('Motivos de OTs Pendientes (Distribución RQ vs Stock)', 'Motivos de OTs Pendientes (Con RQ vs Por revisar)');
html = html.replace('Pendientes por Especialidad (RQ vs Sin RQ)', 'Pendientes por Especialidad (Con RQ vs Por revisar)');

// 16. Stacked Bar Chart Legend and Colors Renamings ('Sin RQ' -> 'Por revisar')
html = html.replaceAll("label: 'Sin RQ'", "label: 'Por revisar'");
html = html.replaceAll("backgroundColor: 'rgba(245, 158, 11, 0.75)', // Amber", "backgroundColor: 'rgba(52, 211, 153, 0.75)', // Green");
html = html.replaceAll("borderColor: printColors.amber", "borderColor: printColors.green || '#34d399'");

// 16b. CSS Styles for Observations Board Explorer
const originalClosingStyle = `        @page {
            size: A4 portrait;
            margin: 0;
        }
    </style>`;

const newClosingStyle = `        @page {
            size: A4 portrait;
            margin: 0;
        }
        
        /* Custom styles for Observations Explorer */
        .obs-board-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-lg);
            width: 100%;
        }
        .obs-board-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 16px;
        }
        .obs-board-header h3 {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .obs-board-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            width: 100%;
            margin-bottom: 20px;
        }
        .obs-search-wrapper {
            position: relative;
            flex: 1;
            min-width: 260px;
        }
        .obs-search-input {
            width: 100%;
            padding: 10px 16px 10px 40px;
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            font-size: 13px;
            transition: all 0.3s ease;
        }
        .obs-search-input:focus {
            outline: none;
            border-color: var(--accent-green);
            box-shadow: 0 0 10px rgba(52, 211, 153, 0.15);
            background: rgba(15, 23, 42, 0.7);
        }
        .obs-search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 14px;
            pointer-events: none;
        }
        .obs-specialty-pills {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .obs-pill {
            padding: 8px 14px;
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 30px;
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .obs-pill:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
        }
        .obs-pill.active {
            background: var(--gradient-3);
            border-color: transparent;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(52, 211, 153, 0.2);
        }
        .obs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 16px;
            margin-top: 10px;
        }
        .obs-card {
            background: rgba(15, 23, 42, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-left-width: 4px;
            border-radius: var(--radius-sm);
            padding: 16px;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 180px;
        }
        .obs-card:hover {
            transform: translateY(-2px);
            background: rgba(15, 23, 42, 0.55);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .obs-card.prio-alto { border-left-color: var(--accent-red); }
        .obs-card.prio-emergencia { border-left-color: var(--accent-red); }
        .obs-card.prio-medio { border-left-color: var(--accent-amber); }
        .obs-card.prio-bajo { border-left-color: var(--accent-green); }
        
        .obs-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 11px;
            color: var(--text-muted);
        }
        .obs-card-id {
            font-weight: 700;
            color: var(--text-primary);
            font-size: 12px;
            background: rgba(255,255,255,0.05);
            padding: 2px 6px;
            border-radius: 4px;
        }
        .obs-card-tags {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .obs-card-desc {
            font-size: 12.5px;
            color: var(--text-primary);
            line-height: 1.4;
            margin-bottom: 14px;
            flex-grow: 1;
        }
        .obs-card-location {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .obs-card-bubble {
            background: rgba(251, 191, 36, 0.08);
            border-left: 3px solid var(--accent-amber);
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: #fef08a;
            font-weight: 500;
            line-height: 1.4;
        }
        .obs-card.prio-alto .obs-card-bubble {
            background: rgba(248, 113, 113, 0.08);
            border-left-color: var(--accent-red);
            color: #fecaca;
        }
        .obs-card.prio-bajo .obs-card-bubble {
            background: rgba(52, 211, 153, 0.08);
            border-left-color: var(--accent-green);
            color: #a7f3d0;
        }
        .obs-empty-state {
            grid-column: 1 / -1;
            padding: 40px;
            text-align: center;
            background: rgba(15, 23, 42, 0.2);
            border: 1px dashed rgba(255,255,255,0.06);
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            font-size: 13px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        .obs-empty-icon {
            font-size: 28px;
            opacity: 0.6;
        }
    </style>`;

html = html.replace(originalClosingStyle, newClosingStyle);

// 17. Inject chartPendingObservations HTML container in layout
const originalPendingSpecialtyCard = `                <div class="chart-card">
                    <h3><span>🔧</span> Pendientes por Especialidad</h3>
                    <div class="chart-wrapper" style="height: 320px;">
                        <canvas id="chartPendingSpecialty"></canvas>
                    </div>
                </div>
            </div>`;

const newPendingSpecialtyCard = `                <div class="chart-card">
                    <h3><span>🔧</span> Pendientes por Especialidad</h3>
                    <div class="chart-wrapper" style="height: 320px;">
                        <canvas id="chartPendingSpecialty"></canvas>
                    </div>
                </div>
            </div>`;

html = html.replace(originalPendingSpecialtyCard, newPendingSpecialtyCard);

// 17b. Replace entire squished priority table card with our new Observations Board
const originalPendingTableBlock = `            <div class="table-card">
                <div class="table-card-header">
                    <h3>📋 OTs Pendientes ordenadas por prioridad</h3>
                    <span class="badge badge-red" id="pendingCount">25 pendientes</span>
                </div>
                <div class="table-scroll" style="max-height: 700px;">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ID OT</th>
                                <th>Prioridad</th>
                                <th>Descripción</th>
                                <th>Ubicación</th>
                                <th>Especialidad</th>
                                <th>Solicitante</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Riesgo</th>
                            </tr>
                        </thead>
                        <tbody id="pendingTableBody"></tbody>
                    </table>
                </div>
            </div>`;

const newPendingTableBlock = `            <!-- Observations Board for "Por revisar" (Replaces the old squished priority table) -->
            <div class="obs-board-card no-print">
                <div class="obs-board-header">
                    <h3><span>📋</span> Detalle de Observaciones (En "Por revisar")</h3>
                    <span class="badge badge-green" id="obsCount">0 observaciones</span>
                </div>
                
                <div class="obs-board-controls">
                    <div class="obs-search-wrapper">
                        <span class="obs-search-icon">🔍</span>
                        <input type="text" id="obsSearchInput" class="obs-search-input" placeholder="Buscar por observación, descripción, ID o ubicación...">
                    </div>
                    <div class="obs-specialty-pills" id="obsSpecialtyPills">
                        <!-- Dynamic specialty pills will be injected here -->
                    </div>
                </div>
                
                <div class="obs-grid" id="obsGridContainer">
                    <!-- Dynamic observation cards will be injected here -->
                </div>
            </div>`;

html = html.replace(originalPendingTableBlock, newPendingTableBlock);

// 18. Inject chartPendingObservations rendering logic in renderPendingTab
const originalRenderPendingTabClose = `    // Render local pending table
    const currentActivePendingFilter = document.querySelector('#pendingFilters .filter-btn.active')?.dataset.filter || 'all';`;

const newRenderPendingTabClose = `    // 3. Observations in 'Por revisar' by Specialty (Helpers & Data Store)
    const porRevisarOTs = pendingOTs.filter(o => !(o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro'))));
    const hasRealObs = (o) => {
        if (!o.observaciones) return false;
        const txt = o.observaciones.toLowerCase().trim();
        return txt !== '' && txt !== '-' && txt !== 'ninguna' && txt !== 'sin observaciones' && txt !== 'no' && txt !== 'sin novedad';
    };

    // 4. Render/Update Observations Board for 'Por revisar'
    window.porRevisarOTsRef = porRevisarOTs;
    
    // Maintain state across renders (active specialty filter & active search text)
    const activePill = document.querySelector('#obsSpecialtyPills .obs-pill.active');
    const prevSpecialty = activePill ? activePill.dataset.obsEsp : 'all';
    const prevSearch = document.getElementById('obsSearchInput')?.value || '';

    // Observations rendering function
    window.renderObservationsBoard = function(specialtyFilter = 'all', searchQuery = '') {
        const obsContainer = document.getElementById('obsGridContainer');
        const pillsContainer = document.getElementById('obsSpecialtyPills');
        const countBadge = document.getElementById('obsCount');
        if (!obsContainer) return;

        const allPorRevisar = (window.porRevisarOTsRef || []).filter(hasRealObs);
        
        // Fetch active priority filter from global pending filters bar!
        const activePrio = document.querySelector('#pendingFilters .filter-btn.active')?.dataset.filter || 'all';
        
        // Filter by priority first for correct specialty counts
        let prioFiltered = allPorRevisar;
        if (activePrio !== 'all') {
            prioFiltered = prioFiltered.filter(o => {
                const p = (o.prioridad || '').toLowerCase();
                if (activePrio === 'alto') return p.includes('alto') || p.includes('emergencia');
                if (activePrio === 'medio') return p.includes('medio');
                if (activePrio === 'bajo') return p.includes('bajo');
                return true;
            });
        }
        
        // Render specialty pills dynamically
        const specialtiesWithObs = Array.from(new Set(prioFiltered.map(o => o.especialidad))).filter(Boolean).sort();
        
        let pillsHtml = \`<button class="obs-pill \${specialtyFilter === 'all' ? 'active' : ''}" data-obs-esp="all">📂 Todas (\${prioFiltered.length})</button>\`;
        
        const emojiMap = {
            'Carpintería': '🪚',
            'Electricidad': '⚡',
            'Gasfitería': '🚿',
            'Albañilería': '🧱',
            'Pintura': '🎨',
            'Electromecánica': '⚙️',
            'Otros': '📁'
        };

        specialtiesWithObs.forEach(esp => {
            const count = prioFiltered.filter(o => o.especialidad === esp).length;
            const emoji = emojiMap[esp] || '🔧';
            pillsHtml += \`<button class="obs-pill \${specialtyFilter === esp ? 'active' : ''}" data-obs-esp="\${esp}">\${emoji} \${esp} (\${count})</button>\`;
        });
        
        if (pillsContainer) {
            pillsContainer.innerHTML = pillsHtml;
            pillsContainer.querySelectorAll('.obs-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const nextEsp = pill.dataset.obsEsp;
                    const query = document.getElementById('obsSearchInput')?.value || '';
                    window.renderObservationsBoard(nextEsp, query);
                });
            });
        }

        // Filter observations by specialty and search query
        let filteredObs = prioFiltered;
        if (specialtyFilter !== 'all') {
            filteredObs = filteredObs.filter(o => o.especialidad === specialtyFilter);
        }
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            filteredObs = filteredObs.filter(o => 
                (o.id && o.id.toLowerCase().includes(q)) || 
                (o.observaciones && o.observaciones.toLowerCase().includes(q)) || 
                (o.desc && o.desc.toLowerCase().includes(q)) ||
                (o.ubicacion && o.ubicacion.toLowerCase().includes(q))
            );
        }

        if (countBadge) {
            countBadge.textContent = \`\${filteredObs.length} observaciones\`;
        }

        if (filteredObs.length === 0) {
            obsContainer.innerHTML = \`<div class="obs-empty-state"><span class="obs-empty-icon">✨</span><div>No hay observaciones activas que coincidan con la búsqueda o filtro.</div></div>\`;
            return;
        }

        obsContainer.innerHTML = filteredObs.map(o => {
            const prioClass = (o.prioridad || 'Bajo').toLowerCase().split(' ')[0];
            const badgeClass = o.especialidad === 'Electricidad' ? 'badge-amber' : 
                                o.especialidad === 'Carpintería' ? 'badge-purple' : 
                                o.especialidad === 'Gasfitería' ? 'badge-cyan' : 
                                o.especialidad === 'Albañilería' ? 'badge-red' : 
                                o.especialidad === 'Pintura' ? 'badge-green' : 'badge-blue';
            const emoji = emojiMap[o.especialidad] || '🔧';
            
            return \`
                <div class="obs-card prio-\${prioClass}">
                    <div>
                        <div class="obs-card-meta">
                            <span class="obs-card-id">\${o.id}</span>
                            <div class="obs-card-tags">
                                <span class="badge badge-\${prioClass === 'alto' || prioClass === 'emergencia' ? 'red' : prioClass === 'medio' ? 'amber' : 'green'}">\${o.prioridad}</span>
                                <span class="badge \${badgeClass}">\${emoji} \${o.especialidad}</span>
                            </div>
                        </div>
                        <div class="obs-card-desc">\${o.desc}</div>
                        <div class="obs-card-location">📍 <strong>\${o.ubicacion}</strong> \${o.solicitante ? ' | Solicitante: ' + o.solicitante : ''}</div>
                    </div>
                    <div class="obs-card-bubble">
                        💬 <strong>Motivo de detención:</strong> \${o.observaciones}
                    </div>
                </div>
            \`;
        }).join('');
    };

    // Render observations board
    window.renderObservationsBoard(prevSpecialty, prevSearch);

    // Rebind search listener
    const searchInput = document.getElementById('obsSearchInput');
    if (searchInput) {
        if (prevSearch) searchInput.value = prevSearch;
        
        searchInput.replaceWith(searchInput.cloneNode(true));
        const newSearchInput = document.getElementById('obsSearchInput');
        newSearchInput.addEventListener('input', (e) => {
            const activePill = document.querySelector('#obsSpecialtyPills .obs-pill.active');
            const specialty = activePill ? activePill.dataset.obsEsp : 'all';
            window.renderObservationsBoard(specialty, e.target.value);
        });
    }

    // Render local pending table
    const currentActivePendingFilter = document.querySelector('#pendingFilters .filter-btn.active')?.dataset.filter || 'all';`;

html = html.replace(originalRenderPendingTabClose, newRenderPendingTabClose);

// 19. Sincronizar filtros de prioridad (#pendingFilters) con el Tablero de Observaciones
const originalPendingFiltersPatch = `// Sub-filters on Pending tab
document.querySelectorAll('#pendingFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#pendingFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPendingTable(btn.dataset.filter);
    });
});`;

const newPendingFiltersPatch = `// Sub-filters on Pending tab
document.querySelectorAll('#pendingFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#pendingFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPendingTable(btn.dataset.filter);
        if (window.renderObservationsBoard) {
            const activePill = document.querySelector('#obsSpecialtyPills .obs-pill.active');
            const specialty = activePill ? activePill.dataset.obsEsp : 'all';
            const query = document.getElementById('obsSearchInput')?.value || '';
            window.renderObservationsBoard(specialty, query);
        }
    });
});`;

html = html.replace(originalPendingFiltersPatch, newPendingFiltersPatch);

// 20. Align Pendientes KPI card count with Doughnut chart's "Pendientes" segment
html = html.replace(/const activePendingTotal = programadasCount \+ pendientesCount;/g, 'const activePendingTotal = pendientesCount;');

// 21. Remove high-priority alert banner from OTs Pendientes tab (Requested by user)
html = html.replace(`            <div class="alert-banner">
                <div class="alert-icon">⚠️</div>
                <div>
                    <strong>Atención:</strong> Hay <strong id="alertAltaCount">13 OTs de prioridad ALTA</strong> sin finalizar. Muchas se encuentran detenidas por falta de suministros (RQ).
                </div>
            </div>`, '');

// 22. Remove Carpinteria, Pintura, and Albanileria KPI cards from OTs Pendientes tab (Requested by user)
const originalKpiCardsToRemove = `                <div class="kpi-card" style="padding: 16px;">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">🪚</div>
                    <div class="kpi-label" style="font-size:10px;">En Carpintería</div>
                    <div class="kpi-value" style="color: var(--accent-orange); font-size: 26px;" id="kpiPendingCarpinteria">0</div>
                </div>
                <div class="kpi-card" style="padding: 16px;">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">🎨</div>
                    <div class="kpi-label" style="font-size:10px;">En Pintura</div>
                    <div class="kpi-value" style="color: var(--accent-cyan); font-size: 26px;" id="kpiPendingPintura">0</div>
                </div>
                <div class="kpi-card" style="padding: 16px;">
                    <div class="kpi-icon" style="top:10px;right:10px;font-size:20px;">🧱</div>
                    <div class="kpi-label" style="font-size:10px;">En Albañilería</div>
                    <div class="kpi-value" style="color: var(--accent-red); font-size: 26px;" id="kpiPendingAlbanileria">0</div>
                </div>`;

html = html.replace(originalKpiCardsToRemove, '');

// 23. Move Calificacion Prom. KPI card from Overview (Resumen General) tab to Technicians tab (Requested by user)
html = html.replace(`                <div class="kpi-card">
                    <div class="kpi-icon">⭐</div>
                    <div class="kpi-label">Calificación Prom.</div>
                    <div class="kpi-value" style="color: var(--accent-amber)" id="mainKpiRating">3.4</div>
                    <div class="kpi-sub" id="mainKpiRatingSub">De 15 evaluaciones</div>
                </div>`, '');

// 24. Replace single wide Man-Hours card with a 3-column layout (Propio + Contratista + Average Rating)
const originalManHoursCard = `            <!-- Single large KPI card for Man-Hours -->
            <div style="margin-bottom: 20px;">
                <div class="kpi-card" style="padding: 24px 30px; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--accent-cyan);">
                    <div>
                        <div class="kpi-label" style="font-size: 13px; margin-bottom: 6px;">Total de Horas Hombre Ejecutadas</div>
                        <div class="kpi-value" id="kpiTotalHorasHombre" style="color: var(--accent-cyan); font-size: 42px; margin-bottom: 4px;">0.0 hrs</div>
                        <div class="kpi-sub" id="kpiTotalHorasHombreSub" style="font-size: 13px;">Acumulado en el período filtrado</div>
                    </div>
                    <div style="font-size: 50px; opacity: 0.6; margin-right: 10px;">⏱️</div>
                </div>
            </div>`;

const newManHoursAndRatingGrid = `            <!-- KPIs Grid: Total Man-Hours (Propio & Contratista) & Average Rating -->
            <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
                <!-- Propio Hours Card -->
                <div class="kpi-card" style="padding: 20px 24px; border-left: 4px solid var(--accent-cyan); box-sizing: border-box; height: 100%;">
                    <div class="kpi-icon" style="top:12px; right:16px; font-size:24px;">👷</div>
                    <div class="kpi-label" style="font-size: 12px; margin-bottom: 4px;">Horas Hombre - Personal Propio</div>
                    <div class="kpi-value" id="kpiHorasPropio" style="color: var(--accent-cyan); font-size: 34px; margin-bottom: 4px;">0.0 hrs</div>
                    <div class="kpi-sub" id="kpiHorasPropioSub" style="font-size: 11px;">0 OTs ejecutadas</div>
                </div>

                <!-- Contratista Hours Card -->
                <div class="kpi-card" style="padding: 20px 24px; border-left: 4px solid var(--accent-purple); box-sizing: border-box; height: 100%;">
                    <div class="kpi-icon" style="top:12px; right:16px; font-size:24px;">🏢</div>
                    <div class="kpi-label" style="font-size: 12px; margin-bottom: 4px;">Horas Hombre - Contratistas</div>
                    <div class="kpi-value" id="kpiHorasContratista" style="color: var(--accent-purple); font-size: 34px; margin-bottom: 4px;">0.0 hrs</div>
                    <div class="kpi-sub" id="kpiHorasContratistaSub" style="font-size: 11px;">0 OTs ejecutadas</div>
                </div>

                <!-- Rating Card (Moved from Resumen General) -->
                <div class="kpi-card" style="padding: 20px 24px; border-left: 4px solid var(--accent-amber); box-sizing: border-box; height: 100%;">
                    <div class="kpi-icon" style="top:12px; right:16px; font-size:24px;">⭐</div>
                    <div class="kpi-label" style="font-size: 12px; margin-bottom: 4px;">Calificación Prom. (CSAT)</div>
                    <div class="kpi-value" id="mainKpiRating" style="color: var(--accent-amber); font-size: 34px; margin-bottom: 4px;">0.0</div>
                    <div class="kpi-sub" id="mainKpiRatingSub" style="font-size: 11px;">De 0 evaluaciones</div>
                </div>
            </div>`;

html = html.replace(originalManHoursCard, newManHoursAndRatingGrid);

// 25. Override isContractor function to use dynamic assignmentType from Excel column
const originalIsContractorDefinition = `function isContractor(name) {
    if (!name) return false;
    const n = name.toUpperCase();
    return n.includes('CONTRATISTA') || n.includes('CONTRATA') || n.includes('EMPRESA') || n.includes('SAC') || n.includes('S.A.C.') || n.includes('SERVICE') || n.includes('S.R.L.');
}`;

const newIsContractorDefinition = `// Initialize dynamic technician assignment mapping from parsed data
window.technicianAssignmentTypes = {};
if (typeof otData !== 'undefined' && Array.isArray(otData)) {
    otData.forEach(o => {
        if (o.tecPrincipal && o.assignmentType) {
            window.technicianAssignmentTypes[o.tecPrincipal.trim()] = o.assignmentType;
        }
        if (o.tecApoyo && o.assignmentType) {
            window.technicianAssignmentTypes[o.tecApoyo.trim()] = o.assignmentType;
        }
    });
}

function isContractor(name) {
    if (!name) return false;
    const nameKey = name.trim();
    if (window.technicianAssignmentTypes && window.technicianAssignmentTypes[nameKey] !== undefined) {
        return window.technicianAssignmentTypes[nameKey] === 'contractor';
    }
    const n = name.toUpperCase();
    return n.includes('CONTRATISTA') || n.includes('CONTRATA') || n.includes('EMPRESA') || n.includes('SAC') || n.includes('S.A.C.') || n.includes('SERVICE') || n.includes('S.R.L.') || n.includes('TKE');
}`;

html = html.replace(originalIsContractorDefinition, newIsContractorDefinition);

// 26. Update renderTechniciansTab's loop to use dynamic assignmentType and skip unassigned
const originalTechnicianStatsLoop = '    let totalMinutes = 0;\n    techData.forEach(o => {\n        totalMinutes += o.tiempoMin || 0;\n    });\n    const totalHours = totalMinutes / 60;\n    document.getElementById(\'kpiTotalHorasHombre\').textContent = \`\${totalHours.toFixed(1)} hrs\`;\n    document.getElementById(\'kpiTotalHorasHombreSub\').textContent = \`Acumulado para \${techData.length} OTs en el período filtrado\`;\n\n    // Process statistics\n    const internalStats = {};\n    const contractorStats = {};\n\n    techData.forEach(o => {\n        const name = o.tecPrincipal;\n        if (!name) return; // skip unassigned\n        \n        const minutes = o.tiempoMin || 0;\n        const hours = minutes / 60;\n        \n        if (isContractor(name)) {\n            if (!contractorStats[name]) {\n                contractorStats[name] = { count: 0, hours: 0, completed: 0, ratings: [], times: [] };\n            }\n            contractorStats[name].count += 1;\n            contractorStats[name].hours += hours;\n            if (o.estado === \'Finalizado\') {\n                contractorStats[name].completed += 1;\n                if (o.calificacion > 0) contractorStats[name].ratings.push(o.calificacion);\n                contractorStats[name].times.push(o.tiempoMin || 0);\n            }\n        } else {\n            if (!internalStats[name]) {\n                internalStats[name] = { count: 0, hours: 0, completed: 0, ratings: [], times: [] };\n            }\n            internalStats[name].count += 1;\n            internalStats[name].hours += hours;\n            if (o.estado === \'Finalizado\') {\n                internalStats[name].completed += 1;\n                if (o.calificacion > 0) internalStats[name].ratings.push(o.calificacion);\n                internalStats[name].times.push(o.tiempoMin || 0);\n            }\n        }\n    });';

const newTechnicianStatsLoop = '    // Calculate total and breakdown hours\n    let ownMin = 0;\n    let contMin = 0;\n    let ownCount = 0;\n    let contCount = 0;\n    \n    // Process statistics\n    const internalStats = {};\n    const contractorStats = {};\n\n    techData.forEach(o => {\n        const name = o.tecPrincipal;\n        if (!name || name.toLowerCase().includes(\'sin asignar\')) return; // skip unassigned\n        \n        const minutes = o.tiempoMin || 0;\n        const hours = minutes / 60;\n        const assignment = o.assignmentType || (name && isContractor(name) ? \'contractor\' : \'own\');\n        \n        if (assignment === \'unassigned\') return; // skip unassigned\n        \n        if (assignment === \'contractor\') {\n            contMin += minutes;\n            contCount++;\n            if (!contractorStats[name]) {\n                contractorStats[name] = { count: 0, hours: 0, completed: 0, ratings: [], times: [] };\n            }\n            contractorStats[name].count += 1;\n            contractorStats[name].hours += hours;\n            if (o.estado === \'Finalizado\') {\n                contractorStats[name].completed += 1;\n                if (o.calificacion > 0) contractorStats[name].ratings.push(o.calificacion);\n                contractorStats[name].times.push(o.tiempoMin || 0);\n            }\n        } else {\n            ownMin += minutes;\n            ownCount++;\n            if (!internalStats[name]) {\n                internalStats[name] = { count: 0, hours: 0, completed: 0, ratings: [], times: [] };\n            }\n            internalStats[name].count += 1;\n            internalStats[name].hours += hours;\n            if (o.estado === \'Finalizado\') {\n                internalStats[name].completed += 1;\n                if (o.calificacion > 0) internalStats[name].ratings.push(o.calificacion);\n                internalStats[name].times.push(o.tiempoMin || 0);\n            }\n        }\n    });\n\n    const ownHrs = ownMin / 60;\n    const contHrs = contMin / 60;\n    const totalHours = ownHrs + contHrs;\n    const ownPct = totalHours > 0 ? ((ownHrs * 100) / totalHours).toFixed(1) : \'0.0\';\n    const contPct = totalHours > 0 ? ((contHrs * 100) / totalHours).toFixed(1) : \'0.0\';\n\n    if (document.getElementById(\'kpiHorasPropio\')) {\n        document.getElementById(\'kpiHorasPropio\').textContent = \`\${ownHrs.toFixed(1)} hrs\`;\n        document.getElementById(\'kpiHorasPropioSub\').textContent = \`\${ownCount} OTs (\${ownPct}% del total)\`;\n    }\n    if (document.getElementById(\'kpiHorasContratista\')) {\n        document.getElementById(\'kpiHorasContratista\').textContent = \`\${contHrs.toFixed(1)} hrs\`;\n        document.getElementById(\'kpiHorasContratistaSub\').textContent = \`\${contCount} OTs (\${contPct}% del total)\`;\n    }';

html = html.replace(originalTechnicianStatsLoop, newTechnicianStatsLoop);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully generated public/reports/dashboard-externo.html!');
