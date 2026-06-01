const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'reports', 'dashboard-mayo-2026.html');
let content = fs.readFileSync(filePath, 'utf8');

// Target 1: The OTs Pendientes (Carga Activa) card in page1Html
const oldPage1Row = `            <!-- Page 1 Row: Doughnut of States & OTs Pendientes Carga Activa -->
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 15px; width: 100%; box-sizing: border-box;">
                <!-- Left: Dona de Estados -->
                <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; display: flex; flex-direction: column; justify-content: space-between; height: 320px; width: 49%;">
                    <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Estado de OTs (4 Estados)</h4>
                    <div style="height: 260px; position: relative;">
                        <canvas id="chartReportEstado"></canvas>
                    </div>
                </div>
                <!-- Right: OTs Pendientes Carga Activa Premium Widget -->
                <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; display: flex; flex-direction: column; justify-content: space-between; height: 320px; width: 49%;">
                    <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; font-family: 'Inter', sans-serif; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">OTs Pendientes (Carga Activa)</h4>
                    <div style="display: flex; flex-direction: column; justify-content: center; flex: 1; gap: 12px;">
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span style="font-size: 32px; font-weight: 900; color: #dc2626; line-height: 1;">\${totalPending}</span>
                            <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Solicitudes Pendientes Totales</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 4px;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #d97706; display: inline-block;"></span>
                                    En Cola
                                </span>
                                <strong style="font-size: 13px; color: #1e293b;">\${pendientesCount}</strong>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 4px;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284c7; display: inline-block;"></span>
                                    Programadas
                                </span>
                                <strong style="font-size: 13px; color: #1e293b;">\${programadasCount}</strong>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 4px;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #9333ea; display: inline-block;"></span>
                                    Con RQ
                                </span>
                                <strong style="font-size: 13px; color: #1e293b;">\${rqPending}</strong>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 4px;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                                    Riesgo Crítico
                                </span>
                                <strong style="font-size: 13px; color: #1e293b;">\${pendingOTs.filter(o => o.prioridad && (o.prioridad.includes('Alto') || o.prioridad.includes('Emergencia'))).length}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

const newPage1Row = `            <!-- Page 1 Row: Doughnut of States & Motivos de OTs Pendientes side-by-side -->
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 15px; width: 100%; box-sizing: border-box;">
                <!-- Left: Dona de Estados -->
                <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; display: flex; flex-direction: column; justify-content: space-between; height: 320px; width: 49%;">
                    <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Estado de OTs (4 Estados)</h4>
                    <div style="height: 260px; position: relative;">
                        <canvas id="chartReportEstado"></canvas>
                    </div>
                </div>
                <!-- Right: Motivos de OTs Pendientes (Distribución RQ vs Stock) -->
                <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; display: flex; flex-direction: column; justify-content: space-between; height: 320px; width: 49%;">
                    <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Motivos de OTs Pendientes (Distribución RQ vs Stock)</h4>
                    <div style="height: 260px; position: relative;">
                        <canvas id="chartReportPendingReason"></canvas>
                    </div>
                </div>
            </div>`;

// Target 2: The entire page4Html block
const oldPage4 = `    // 4. Análisis de Pendientes (Page 4)
    if (chkReportQuality.checked) {
        const page4Html = \`
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
                    <span>INFORME DE MANTENIMIENTO — MAYO 2026</span>
                    <span style="font-weight: 800;">CLUB DE REGATAS LIMA</span>
                </div>
            </div>

            <div style="margin: 15px 0 10px 0; width: 100%;">
                <span style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">Sección Operativa IV</span>
                <h2 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 4px 0 6px 0; text-transform: uppercase;">Análisis de Pendientes</h2>
            </div>

            <!-- KPIs Grid of Pending OTs -->
            <div style="margin-top: 10px; box-sizing: border-box; width: 100%;">
                <div class="report-kpi-grid" style="grid-template-columns: repeat(5, 1fr); gap: 8px;">
                    <div class="report-kpi-card" style="border: 1px solid rgba(148,163,184,0.3); background: #f8fafc; padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Pendientes</span>
                        <strong style="color: #1e293b; font-size: 15px; display: block; margin: 2px 0;">\${totalPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">En plataforma</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(147,51,234,0.15); background: rgba(147,51,234,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">Con RQ (Stock)</span>
                        <strong style="color: #9333ea; font-size: 15px; display: block; margin: 2px 0;">\${rqPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Falta materiales</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(217,119,6,0.15); background: rgba(217,119,6,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Carpintería</span>
                        <strong style="color: #d97706; font-size: 15px; display: block; margin: 2px 0;">\${carpinteriaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(8,145,178,0.15); background: rgba(8,145,178,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Pintura</span>
                        <strong style="color: #0891b2; font-size: 15px; display: block; margin: 2px 0;">\${pinturaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(220,38,38,0.15); background: rgba(220,38,38,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Albañilería</span>
                        <strong style="color: #dc2626; font-size: 15px; display: block; margin: 2px 0;">\${albanileriaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                </div>
            </div>

            <!-- Wide chart for motivos of pending OTs -->
            <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; height: 320px; width: 100%; margin-top: 25px; display: flex; flex-direction: column; justify-content: space-between;">
                <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Motivos de OTs Pendientes (Distribución RQ vs Stock)</h4>
                <div style="height: 260px; position: relative;">
                    <canvas id="chartReportPendingReason"></canvas>
                </div>
            </div>
        \`;
        addPrintPage(page4Html);
    }`;

const newPage4 = `    // 4. Análisis de Pendientes (Page 4)
    if (chkReportQuality.checked) {
        const page4Html = \`
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
                    <span>INFORME DE MANTENIMIENTO — MAYO 2026</span>
                    <span style="font-weight: 800;">CLUB DE REGATAS LIMA</span>
                </div>
            </div>

            <div style="margin: 15px 0 10px 0; width: 100%;">
                <span style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">Sección Operativa IV</span>
                <h2 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 4px 0 6px 0; text-transform: uppercase;">Análisis de Pendientes</h2>
            </div>

            <!-- KPIs Grid of Pending OTs -->
            <div style="margin-top: 10px; box-sizing: border-box; width: 100%;">
                <div class="report-kpi-grid" style="grid-template-columns: repeat(5, 1fr); gap: 8px;">
                    <div class="report-kpi-card" style="border: 1px solid rgba(148,163,184,0.3); background: #f8fafc; padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Pendientes</span>
                        <strong style="color: #1e293b; font-size: 15px; display: block; margin: 2px 0;">\${totalPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">En plataforma</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(147,51,234,0.15); background: rgba(147,51,234,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">Con RQ (Stock)</span>
                        <strong style="color: #9333ea; font-size: 15px; display: block; margin: 2px 0;">\${rqPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Falta materiales</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(217,119,6,0.15); background: rgba(217,119,6,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Carpintería</span>
                        <strong style="color: #d97706; font-size: 15px; display: block; margin: 2px 0;">\${carpinteriaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(8,145,178,0.15); background: rgba(8,145,178,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Pintura</span>
                        <strong style="color: #0891b2; font-size: 15px; display: block; margin: 2px 0;">\${pinturaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                    <div class="report-kpi-card" style="border: 1px solid rgba(220,38,38,0.15); background: rgba(220,38,38,0.02); padding: 8px 4px;">
                        <span style="display: block; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase;">En Albañilería</span>
                        <strong style="color: #dc2626; font-size: 15px; display: block; margin: 2px 0;">\${albanileriaPending}</strong>
                        <span style="display: block; font-size: 6px; color: #94a3b8;">Por operario</span>
                    </div>
                </div>
            </div>

            <!-- Elegant observations and action plan notes card (replacing the highlighted reason chart) -->
            <div style="border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; box-sizing: border-box; background: #fafafa; margin-top: 25px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
                <h4 style="font-size: 11px; font-weight: 800; color: #475569; margin: 0 0 8px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Observaciones y Plan de Acción de OTs Pendientes</h4>
                <p style="font-size: 10px; color: #64748b; margin: 0 0 16px 0;">Espacio reservado para el planeamiento de soluciones técnicas, priorización de compras y asignación de recursos extraordinarios para la atención de la carga de trabajo pendiente.</p>
                <div style="border: 1.5px dashed #cbd5e1; border-radius: 6px; flex: 1; min-height: 250px; background: white; padding: 12px; font-size: 10px; color: #94a3b8; font-family: 'Inter', sans-serif;">
                    Anotaciones del plan operativo...
                </div>
            </div>
        \`;
        addPrintPage(page4Html);
    }`;

// Perform standard replacements
const index1 = content.indexOf(oldPage1Row);
if (index1 === -1) {
    console.error("oldPage1Row not found!");
    process.exit(1);
}
content = content.replace(oldPage1Row, newPage1Row);

const index2 = content.indexOf(oldPage4);
if (index2 === -1) {
    console.error("oldPage4 not found!");
    process.exit(1);
}
content = content.replace(oldPage4, newPage4);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched Page 1 and Page 4 successfully!");
