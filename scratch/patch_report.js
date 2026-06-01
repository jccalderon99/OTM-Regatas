const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'reports', 'dashboard-mayo-2026.html');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement text starts from "// 4. Render Pages HTML" up to "function safeCreateReportChart(id, config) {"
const startMarker = '    // 4. Render Pages HTML';
const endMarker = 'function safeCreateReportChart(id, config) {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found!");
    process.exit(1);
}

const replacementText = `    // 4. Render Pages HTML
    let compiledHtml = '';
    let currentPageIndex = 1;

    // Helper function to append a printed page
    function addPrintPage(pageContentHtml) {
        // Shared signatures for final page
        const isFinalPageOfReport = (currentPageIndex === totalPages);
        let signaturesHtml = '';
        if (isFinalPageOfReport) {
            signaturesHtml = \`
                <!-- Signature Block -->
                <div style="display: flex; justify-content: space-around; margin-top: 20px; margin-bottom: 5px; width: 100%; box-sizing: border-box; flex-shrink: 0;">
                    <div style="text-align: center; font-size: 9px; width: 160px; border-top: 1px solid #cbd5e1; padding-top: 5px; color: #64748b; font-family: 'Inter', sans-serif; font-weight: 700;">
                        Firma Supervisor CRL
                        <div style="font-size: 8px; font-weight: 400; color: #94a3b8; margin-top: 2px;">Mantenimiento y Servicios</div>
                    </div>
                    <div style="text-align: center; font-size: 9px; width: 160px; border-top: 1px solid #cbd5e1; padding-top: 5px; color: #64748b; font-family: 'Inter', sans-serif; font-weight: 700;">
                        Jefatura de Servicios CRL
                        <div style="font-size: 8px; font-weight: 400; color: #94a3b8; margin-top: 2px;">Dirección de Infraestructura</div>
                    </div>
                </div>
            \`;
        }

        // Footer details
        const footerHtml = \`
            <!-- Footer -->
            <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; font-family: 'Inter', sans-serif; box-sizing: border-box; width: 100%; margin-top: auto; flex-shrink: 0;">
                <span>Informe Mensual de Mantenimiento CRL</span>
                <span style="font-weight: 700;">Página \${currentPageIndex} de \${totalPages}</span>
            </div>
        \`;

        compiledHtml += \`
            <div class="print-page print-shadow" style="display: flex; flex-direction: column; justify-content: space-between; height: 1123px; box-sizing: border-box;">
                <div style="display: flex; flex-direction: column; flex: 1; width: 100%; box-sizing: border-box;">
                    \${pageContentHtml}
                </div>
                \${signaturesHtml}
                \${footerHtml}
            </div>
        \`;

        currentPageIndex++;
    }

    // 1. Overview (Page 1)
    if (chkReportOverview.checked) {
        const page1Html = \`
            <!-- Grouped Top Section to avoid vertical stretching -->
            <div style="display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; width: 100%;">
                <!-- Main Header -->
                <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="font-size: 11px; font-weight: 800; color: #475569; letter-spacing: 0.15em; margin: 0; font-family: 'Inter', sans-serif;">CLUB DE REGATAS LIMA</h4>
                            <h5 style="font-size: 9px; font-weight: 700; color: #94a3b8; margin: 2px 0 0 0; font-family: 'Inter', sans-serif;">DEPARTAMENTO DE MANTENIMIENTO</h5>
                        </div>
                        <span style="font-size: 14px; font-weight: 900; color: #0284c7; font-family: 'Georgia', serif;">CRL 1875</span>
                    </div>
                </div>

                <!-- Title Block -->
                <div style="margin: 5px 0; text-align: center;">
                    <span style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'Inter', sans-serif;">Reporte de Auditoría y Detalle Operativo</span>
                    <h1 style="font-size: 22px; font-weight: 900; color: #1e293b; margin: 4px 0 6px 0; letter-spacing: -0.02em; text-transform: uppercase; font-family: 'Inter', sans-serif;">Informe de Mantenimiento</h1>
                    <div style="width: 30px; height: 3px; background: #fbbf24; margin: 0 auto 8px auto; border-radius: 2px;"></div>
                    <h3 style="font-size: 14px; font-weight: 800; color: #475569; text-transform: uppercase; font-family: 'Inter', sans-serif;">MAYO 2026</h3>
                </div>

                <!-- Metadata Grid -->
                <div class="report-meta-grid" style="margin-top: 5px;">
                    <div>
                        <div style="margin-bottom: 4px;"><span style="color: #64748b; font-weight: 600;">Periodo de Análisis:</span> <strong style="color: #334155;">\${startDateStr} al \${endDateStr}</strong></div>
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-bottom: 4px;"><span style="color: #64748b; font-weight: 600;">Fecha de Emisión:</span> <strong style="color: #334155;">26/05/2026</strong></div>
                        <div><span style="color: #64748b; font-weight: 600;">Tipo de Reporte:</span> <strong style="color: #334155;">Detallado (Operativo)</strong></div>
                    </div>
                </div>
            </div>

            <!-- Page 1 Charts Row: Balance Diario (Wide, full width) -->
            <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; box-sizing: border-box; background: white; display: flex; flex-direction: column; justify-content: space-between; height: 260px; margin-top: 15px; width: 100%;">
                <h4 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; text-transform: uppercase; font-family: 'Inter', sans-serif;">Balance Diario: Creadas vs Finalizadas</h4>
                <div style="height: 210px; position: relative; width: 100%;">
                    <canvas id="chartReportBalance"></canvas>
                </div>
            </div>

            <!-- Page 1 Row: Doughnut of States & OTs Pendientes Carga Activa -->
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
            </div>
        \`;
        addPrintPage(page1Html);
    }

    // 2. Demanda y Eficiencia (Page 2A & 2B)
    if (chkReportAreas.checked) {
        // Page 2A Content HTML
        const page2AHtml = \`
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
                    <span>INFORME DE MANTENIMIENTO — MAYO 2026</span>
                    <span style="font-weight: 800;">CLUB DE REGATAS LIMA</span>
                </div>
            </div>

            <div style="margin: 15px 0 10px 0; width: 100%;">
                <span style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">Sección Operativa II-A</span>
                <h2 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 4px 0 6px 0; text-transform: uppercase;">Distribución de la Demanda y Criterios Operativos</h2>
            </div>

            <!-- Specialty Pending stacked bar chart (Full width, same size as Balance Diario) -->
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 260px; margin-bottom: 15px; width: 100%;">
                <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">Pendientes por Especialidad (RQ vs Sin RQ)</h4>
                <div style="height: 210px; position: relative;">
                    <canvas id="chartReportPendingSpecialty"></canvas>
                </div>
            </div>

            <!-- Row with 2 large donuts side-by-side: Tipo de Mantenimiento and Prioridad -->
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 240px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">Tipo de Mantenimiento</h4>
                    <div style="height: 190px; position: relative;">
                        <canvas id="chartReportTipoMantenimiento"></canvas>
                    </div>
                </div>
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 240px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">Distribución por Prioridad</h4>
                    <div style="height: 190px; position: relative;">
                        <canvas id="chartReportPrioridad"></canvas>
                    </div>
                </div>
            </div>

            <!-- Specialty Quantity chart (Wide, full width) -->
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 210px; width: 100%;">
                <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">OTs Planificadas vs Finalizadas por Especialidad</h4>
                <div style="height: 165px; position: relative;">
                    <canvas id="chartReportEspecialidad"></canvas>
                </div>
            </div>
        \`;
        addPrintPage(page2AHtml);

        // Page 2B Content HTML
        const page2BHtml = \`
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
                    <span>INFORME DE MANTENIMIENTO — MAYO 2026</span>
                    <span style="font-weight: 800;">CLUB DE REGATAS LIMA</span>
                </div>
            </div>

            <div style="margin: 15px 0 10px 0; width: 100%;">
                <span style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">Sección Operativa II-B</span>
                <h2 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 4px 0 6px 0; text-transform: uppercase;">Análisis de Demanda por Áreas y Ubicaciones</h2>
            </div>

            <!-- Areas sollicitantes (Wide, full width) -->
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 230px; margin-bottom: 15px; width: 100%;">
                <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">OTs por Área Solicitante</h4>
                <div style="height: 185px; position: relative;">
                    <canvas id="chartReportArea"></canvas>
                </div>
            </div>

            <!-- Ubicaciones (Wide, full width) -->
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 230px; margin-bottom: 15px; width: 100%;">
                <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">Top 10 Ubicaciones</h4>
                <div style="height: 185px; position: relative;">
                    <canvas id="chartReportUbicacion"></canvas>
                </div>
            </div>

            <!-- OTs por Supervisor (Wide, full width) -->
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 230px; width: 100%;">
                <h4 style="font-size: 10px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">OTs por Supervisor</h4>
                <div style="height: 185px; position: relative;">
                    <canvas id="chartReportSupervisor"></canvas>
                </div>
            </div>
        \`;
        addPrintPage(page2BHtml);
    }

    // 3. Desempeño Operativo (Page 3)
    if (chkReportTechs.checked) {
        const page3Html = \`
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
                    <span>INFORME DE MANTENIMIENTO — MAYO 2026</span>
                    <span style="font-weight: 800;">CLUB DE REGATAS LIMA</span>
                </div>
            </div>

            <div style="margin: 15px 0 10px 0; width: 100%;">
                <span style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">Sección Operativa III</span>
                <h2 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 4px 0 6px 0; text-transform: uppercase;">Desempeño Operativo</h2>
            </div>

            <!-- Man hours banner -->
            <div style="margin-bottom: 15px; box-sizing: border-box; width: 100%;">
                <div style="border: 1px solid #cbd5e1; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid #06b6d4; border-radius: 6px; background: #fafafa;">
                    <div>
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Total de Horas Hombre Ejecutadas</div>
                        <div style="color: #0891b2; font-size: 26px; font-weight: 900;">\${totalHours.toFixed(1)} hrs</div>
                        <div style="font-size: 8px; color: #94a3b8;">Suma del tiempo total de trabajo registrado en el período</div>
                    </div>
                    <div style="font-size: 32px;">⏱️</div>
                </div>
            </div>

            <!-- Row 1: Personal Propio (Cantidad & Horas) -->
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 245px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #0284c7; margin: 0 0 6px 0; text-transform: uppercase;">Internos: Cantidad OTs</h4>
                    <div style="height: 200px; position: relative;">
                        <canvas id="chartReportTechCantidad"></canvas>
                    </div>
                </div>
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 245px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #0284c7; margin: 0 0 6px 0; text-transform: uppercase;">Internos: Horas Hombre</h4>
                    <div style="height: 200px; position: relative;">
                        <canvas id="chartReportTechHoras"></canvas>
                    </div>
                </div>
            </div>

            <!-- Row 2: Contratistas (Cantidad & Horas) -->
            <div style="display: flex; justify-content: space-between; gap: 16px; width: 100%; box-sizing: border-box;">
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 245px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #9333ea; margin: 0 0 6px 0; text-transform: uppercase;">Contratistas: OTs</h4>
                    <div style="height: 200px; position: relative;">
                        <canvas id="chartReportContrCantidad"></canvas>
                    </div>
                </div>
                <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; box-sizing: border-box; background: white; height: 245px; width: 49%;">
                    <h4 style="font-size: 10px; font-weight: 800; color: #9333ea; margin: 0 0 6px 0; text-transform: uppercase;">Contratistas: Horas</h4>
                    <div style="height: 200px; position: relative;">
                        <canvas id="chartReportContrHoras"></canvas>
                    </div>
                </div>
            </div>
        \`;
        addPrintPage(page3Html);
    }

    // 4. Análisis de Pendientes (Page 4)
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
    }

    printArea.innerHTML = compiledHtml;

    // 5. Asynchronously render all the 13 Chart.js graphs inside the generated printArea
    setTimeout(() => {
        renderReportCharts(filteredData, activeSections);
    }, 100);
}

// Instantiate Chart.js graphs in the report pages with white-background/print-mode configurations
function renderReportCharts(filteredData, activeSections) {
    const activeKeys = activeSections.map(s => s.key);
    const unplannedPendingOTs = filteredData.filter(o => o.estado !== 'Finalizado' && !(o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre') && o.programadoStatus !== 'Programado');

    // --- 1. chartReportBalance (Line) ---
    if (document.getElementById('chartReportBalance')) {
        const datesMap = {};
        filteredData.forEach(o => {
            const d = parseDateStr(o.fecha);
            if (!d) return;
            const time = d.getTime();
            if (!datesMap[time]) {
                datesMap[time] = { dateStr: o.fecha, created: 0, resolved: 0 };
            }
            datesMap[time].created += 1;
            if (o.estado === 'Finalizado') {
                datesMap[time].resolved += 1;
            }
        });
        const sortedTimes = Object.keys(datesMap).map(Number).sort((a, b) => a - b);
        const dailyLabels = sortedTimes.map(t => datesMap[t].dateStr);
        const dailyCreated = sortedTimes.map(t => datesMap[t].created);
        const dailyResolved = sortedTimes.map(t => datesMap[t].resolved);

        safeCreateReportChart('chartReportBalance', {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [
                    {
                        label: 'Creadas',
                        data: dailyCreated,
                        borderColor: printColors.blue,
                        backgroundColor: 'rgba(2,132,199,0.06)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointBackgroundColor: printColors.blue,
                        pointRadius: 2.5
                    },
                    {
                        label: 'Finalizadas',
                        data: dailyResolved,
                        borderColor: printColors.green,
                        backgroundColor: 'rgba(22,163,74,0.06)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointBackgroundColor: printColors.green,
                        pointRadius: 2.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, boxHeight: 6, color: printColors.text, font: { family: "'Inter'", size: 8, weight: 'bold' } }
                    },
                    datalabels: { display: false }
                },
                scales: {
                    x: { ticks: { color: printColors.mutedText, font: { size: 7, weight: 'bold' } }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: printColors.mutedText, font: { size: 7 }, precision: 0 }, grid: { color: printColors.border } }
                }
            }
        });
    }

    // --- 2. chartReportEstado (Doughnut - 4 states) ---
    if (document.getElementById('chartReportEstado')) {
        const finalizadasCount = filteredData.filter(o => o.estado === 'Finalizado').length;
        const cierreCount = filteredData.filter(o => o.estado !== 'Finalizado' && (o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre')).length;
        const programadasCount = filteredData.filter(o => o.estado !== 'Finalizado' && !(o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre') && o.programadoStatus === 'Programado').length;
        const pendientesCount = filteredData.filter(o => o.estado !== 'Finalizado' && !(o.estado === 'Cierre' || o.programadoStatus === 'Cierre' || o.tipo === 'Cierre') && o.programadoStatus !== 'Programado').length;

        safeCreateReportChart('chartReportEstado', {
            type: 'doughnut',
            data: {
                labels: ['Finalizadas', 'Programadas', 'Cierre (Canceladas)', 'Pendientes'],
                datasets: [{
                    data: [finalizadasCount, programadasCount, cierreCount, pendientesCount],
                    backgroundColor: [printColors.green, printColors.blue, '#64748b', printColors.amber],
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: getPrintDoughnutOptions(finalizadasCount + programadasCount + cierreCount + pendientesCount)
        });
    }

    // --- 3. chartReportEspecialidad (Bar - Total vs Finalizadas) ---
    if (document.getElementById('chartReportEspecialidad')) {
        const espLabels = ['Carpintería','Electricidad','Gasfitería','Albañilería','Pintura','Otros'];
        const espCount = espLabels.map(e => filteredData.filter(o => o.especialidad === e).length);
        const espFinished = espLabels.map(e => filteredData.filter(o => o.especialidad === e && o.estado === 'Finalizado').length);

        safeCreateReportChart('chartReportEspecialidad', {
            type: 'bar',
            data: {
                labels: espLabels,
                datasets: [
                    { label: 'Planificadas', data: espCount, backgroundColor: 'rgba(2,132,199,0.3)', borderColor: printColors.blue, borderWidth: 1, borderRadius: 3 },
                    { label: 'Finalizadas', data: espFinished, backgroundColor: 'rgba(22,163,74,0.6)', borderColor: printColors.green, borderWidth: 1, borderRadius: 3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, boxHeight: 6, color: printColors.text, font: { size: 7, weight: 'bold' } } },
                    datalabels: {
                        color: printColors.text,
                        font: { weight: 'bold', size: 7.5 },
                        anchor: 'end',
                        align: 'top',
                        offset: 1,
                        formatter: (val) => val || null
                    }
                },
                scales: {
                    x: { ticks: { color: printColors.mutedText, font: { size: 7.5, weight: 'bold' } }, grid: { display: false } },
                    y: { beginAtZero: true, grace: '15%', ticks: { color: printColors.mutedText, font: { size: 7.5 }, precision: 0 }, grid: { color: printColors.border } }
                }
            }
        });
    }

    // --- 4. chartReportPrioridad (Doughnut) ---
    if (document.getElementById('chartReportPrioridad')) {
        const prioLabels = ['Alto','Medio','Bajo','Emergencia'];
        const prioColors = [printColors.red, printColors.amber, printColors.green, '#ff0040'];
        const prioCount = prioLabels.map(p => filteredData.filter(o => o.prioridad.includes(p) || (p === 'Emergencia' && o.prioridad === 'Emergencia')).length);
        const activePrioLabels = prioLabels.filter((_, i) => prioCount[i] > 0);
        const activePrioCount = prioCount.filter(c => c > 0);
        const activePrioColors = prioColors.filter((_, i) => prioCount[i] > 0);

        safeCreateReportChart('chartReportPrioridad', {
            type: 'doughnut',
            data: {
                labels: activePrioLabels,
                datasets: [{
                    data: activePrioCount,
                    backgroundColor: activePrioColors,
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: getPrintDoughnutOptions(activePrioCount.reduce((a, b) => a + b, 0))
        });
    }

    // --- 5. chartReportArea (Horizontal Bar) ---
    if (document.getElementById('chartReportArea')) {
        const areaCounts = {};
        filteredData.forEach(o => {
            if (o.area) areaCounts[o.area] = (areaCounts[o.area] || 0) + 1;
        });
        const sortedAreas = Object.keys(areaCounts).sort((a, b) => areaCounts[b] - areaCounts[a]).slice(0, 5);
        const areaLabels = sortedAreas.map(a => a.length > 25 ? a.slice(0, 25) + '...' : a);
        const areaData = sortedAreas.map(a => areaCounts[a]);

        safeCreateReportChart('chartReportArea', {
            type: 'bar',
            data: {
                labels: areaLabels,
                datasets: [{ label: 'OTs por Área', data: areaData, backgroundColor: 'rgba(2,132,199,0.5)', borderColor: printColors.blue, borderWidth: 1, borderRadius: 3 }]
            },
            options: getPrintBarOptions(true, false)
        });
    }

    // --- 6. chartReportUbicacion (Bar) ---
    if (document.getElementById('chartReportUbicacion')) {
        const ubiCounts = {};
        filteredData.forEach(o => {
            if (o.ubicacion) ubiCounts[o.ubicacion] = (ubiCounts[o.ubicacion] || 0) + 1;
        });
        const sortedUbis = Object.keys(ubiCounts).sort((a, b) => ubiCounts[b] - ubiCounts[a]).slice(0, 8);
        const ubiLabels = sortedUbis.map(u => u.length > 20 ? u.slice(0, 20) + '...' : u);
        const ubiData = sortedUbis.map(u => ubiCounts[u]);

        safeCreateReportChart('chartReportUbicacion', {
            type: 'bar',
            data: {
                labels: ubiLabels,
                datasets: [{ label: 'OTs por Ubicación', data: ubiData, backgroundColor: 'rgba(22,163,74,0.5)', borderColor: printColors.green, borderWidth: 1, borderRadius: 3 }]
            },
            options: getPrintBarOptions(false, false)
        });
    }

    // --- 7. chartReportSupervisor (Bar) ---
    if (document.getElementById('chartReportSupervisor')) {
        const supCounts = {};
        filteredData.forEach(o => {
            if (o.supervisor) supCounts[o.supervisor] = (supCounts[o.supervisor] || 0) + 1;
        });
        const sortedSups = Object.keys(supCounts).sort((a, b) => supCounts[b] - supCounts[a]);
        const supLabels = sortedSups;
        const supData = sortedSups.map(s => supCounts[s]);

        safeCreateReportChart('chartReportSupervisor', {
            type: 'bar',
            data: {
                labels: supLabels,
                datasets: [{ label: 'OTs por Supervisor', data: supData, backgroundColor: 'rgba(217,119,6,0.5)', borderColor: printColors.amber, borderWidth: 1, borderRadius: 3 }]
            },
            options: getPrintBarOptions(false, false)
        });
    }

    // --- 7b. chartReportTipoMantenimiento (Doughnut) ---
    if (document.getElementById('chartReportTipoMantenimiento')) {
        const typeCounts = {};
        filteredData.forEach(o => {
            if (o.tipo) typeCounts[o.tipo] = (typeCounts[o.tipo] || 0) + 1;
        });
        const typeLabels = Object.keys(typeCounts);
        const typeData = Object.values(typeCounts);
        const typeColors = [printColors.blue, printColors.green, printColors.amber, printColors.purple, printColors.cyan, printColors.red];

        safeCreateReportChart('chartReportTipoMantenimiento', {
            type: 'doughnut',
            data: {
                labels: typeLabels,
                datasets: [{
                    data: typeData,
                    backgroundColor: typeColors.slice(0, typeLabels.length),
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: getPrintDoughnutOptions(typeData.reduce((a, b) => a + b, 0))
        });
    }

    // --- 8. chartReportTechCantidad ---
    if (document.getElementById('chartReportTechCantidad')) {
        const internalStats = {};
        const contractorStats = {};
        filteredData.forEach(o => {
            const name = o.tecPrincipal;
            if (!name) return;
            const hours = (o.tiempoMin || 0) / 60;
            if (isContractor(name)) {
                if (!contractorStats[name]) contractorStats[name] = { count: 0, hours: 0 };
                contractorStats[name].count++;
                contractorStats[name].hours += hours;
            } else {
                if (!internalStats[name]) internalStats[name] = { count: 0, hours: 0 };
                internalStats[name].count++;
                internalStats[name].hours += hours;
            }
        });

        const intNames = Object.keys(internalStats).sort((a, b) => internalStats[b].count - internalStats[a].count).slice(0, 4);
        const intCounts = intNames.map(n => internalStats[n].count);
        const intNamesByHours = Object.keys(internalStats).sort((a, b) => internalStats[b].hours - internalStats[a].hours).slice(0, 4);
        const intHours = intNamesByHours.map(n => parseFloat(internalStats[n].hours.toFixed(1)));

        safeCreateReportChart('chartReportTechCantidad', {
            type: 'bar',
            data: {
                labels: intNames.map(n => n.split(' ').slice(0, 2).join(' ')),
                datasets: [{ data: intCounts, backgroundColor: 'rgba(2,132,199,0.5)', borderColor: printColors.blue, borderWidth: 1, borderRadius: 3 }]
            },
            options: getPrintBarOptions(false, false)
        });

        // --- 9. chartReportTechHoras ---
        if (document.getElementById('chartReportTechHoras')) {
            safeCreateReportChart('chartReportTechHoras', {
                type: 'bar',
                data: {
                    labels: intNamesByHours.map(n => n.split(' ').slice(0, 2).join(' ')),
                    datasets: [{ data: intHours, backgroundColor: 'rgba(8,145,178,0.5)', borderColor: printColors.cyan, borderWidth: 1, borderRadius: 3 }]
                },
                options: getPrintBarOptions(false, false)
            });
        }
    }

    // --- 10. chartReportContrCantidad ---
    if (document.getElementById('chartReportContrCantidad')) {
        const contractorStats = {};
        filteredData.forEach(o => {
            const name = o.tecPrincipal;
            if (!name) return;
            const hours = (o.tiempoMin || 0) / 60;
            if (isContractor(name)) {
                if (!contractorStats[name]) contractorStats[name] = { count: 0, hours: 0 };
                contractorStats[name].count++;
                contractorStats[name].hours += hours;
            }
        });

        const contNames = Object.keys(contractorStats).sort((a, b) => contractorStats[b].count - contractorStats[a].count).slice(0, 4);
        const contCounts = contNames.map(n => contractorStats[n].count);
        const contNamesByHours = Object.keys(contractorStats).sort((a, b) => contractorStats[b].hours - contractorStats[a].hours).slice(0, 4);
        const contHours = contNamesByHours.map(n => parseFloat(contractorStats[n].hours.toFixed(1)));

        safeCreateReportChart('chartReportContrCantidad', {
            type: 'bar',
            data: {
                labels: contNames.map(n => n.replace('CONTRATISTA ', '').split(' ').slice(0, 2).join(' ')),
                datasets: [{ data: contCounts, backgroundColor: 'rgba(124,58,237,0.5)', borderColor: printColors.purple, borderWidth: 1, borderRadius: 3 }]
            },
            options: getPrintBarOptions(false, false)
        });

        // --- 11. chartReportContrHoras ---
        if (document.getElementById('chartReportContrHoras')) {
            safeCreateReportChart('chartReportContrHoras', {
                type: 'bar',
                data: {
                    labels: contNamesByHours.map(n => n.replace('CONTRATISTA ', '').split(' ').slice(0, 2).join(' ')),
                    datasets: [{ data: contHours, backgroundColor: 'rgba(124,58,237,0.5)', borderColor: printColors.purple, borderWidth: 1, borderRadius: 3 }]
                },
                options: getPrintBarOptions(false, false)
            });
        }
    }

    // --- 12. chartReportPendingReason (Doughnut - 2 segments) ---
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
                    backgroundColor: [printColors.purple, printColors.amber],
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                ...doughnutOpts,
                rotation: 45,
                layout: { padding: { top: 10, bottom: 35, left: 10, right: 10 } },
                plugins: {
                    ...doughnutOpts.plugins,
                    legend: {
                        ...doughnutOpts.plugins.legend,
                        labels: {
                            ...doughnutOpts.plugins.legend.labels,
                            padding: 25
                        }
                    }
                }
            }
        });
    }

    // --- 13. chartReportPendingSpecialty (Stacked Bar - RQ vs Sin RQ) ---
    if (document.getElementById('chartReportPendingSpecialty')) {
        const pendEspLabels = ['Carpintería', 'Electricidad', 'Gasfitería', 'Albañilería', 'Pintura', 'Otros'];
        const totals = {};
        pendEspLabels.forEach(esp => {
            totals[esp] = unplannedPendingOTs.filter(o => o.especialidad === esp).length;
        });
        const sortedLabels = pendEspLabels.sort((a, b) => totals[b] - totals[a]).slice(0, 5);
        
        const rqData = sortedLabels.map(esp => unplannedPendingOTs.filter(o => o.especialidad === esp && (o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro')))).length);
        const sinRqData = sortedLabels.map(esp => unplannedPendingOTs.filter(o => o.especialidad === esp && !(o.programadoStatus === 'RQ' || o.tipo === 'RQ' || (o.riesgo && o.riesgo.includes('Suministro')))).length);

        safeCreateReportChart('chartReportPendingSpecialty', {
            type: 'bar',
            data: {
                labels: sortedLabels,
                datasets: [
                    {
                        label: 'Con RQ',
                        data: rqData,
                        backgroundColor: 'rgba(147, 51, 234, 0.75)', // Purple
                        borderColor: printColors.purple,
                        borderWidth: 1,
                        borderRadius: 3
                    },
                    {
                        label: 'Sin RQ',
                        data: sinRqData,
                        backgroundColor: 'rgba(245, 158, 11, 0.75)', // Amber
                        borderColor: printColors.amber,
                        borderWidth: 1,
                        borderRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, boxHeight: 6, color: printColors.text, font: { size: 7, weight: 'bold' } } },
                    datalabels: {
                        color: printColors.text,
                        font: { weight: 'bold', size: 7.5 },
                        formatter: (val) => val || null
                    }
                },
                scales: {
                    x: { stacked: true, ticks: { color: printColors.mutedText, font: { size: 7.5, weight: 'bold' } }, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, grace: '15%', ticks: { color: printColors.mutedText, font: { size: 7.5 }, precision: 0 }, grid: { color: printColors.border } }
                }
            }
        });
    }
}
`;

const newContent = content.substring(0, startIndex) + replacementText + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("File patched successfully!");
