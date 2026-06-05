const pptxgen = require("pptxgenjs");

console.log("Starting PowerPoint presentation generation...");

let pptx = new pptxgen();

// Set presentation layout to Widescreen (16:9)
// standard 16:9 layout size is 10 x 5.625 inches in pptxgenjs
pptx.layout = "LAYOUT_16x9";

// Define Global Styles / Themes
const colors = {
  bgDark: "0A0E1A",      // Dark Deep Navy
  bgCard: "1A1F35",      // Card Dark Blue
  bgSlate: "0F172A",     // Slate background
  accentBlue: "6366F1",  // Indigo
  accentCyan: "22D3EE",  // Cyan
  accentGreen: "34D399", // Emerald Green
  accentAmber: "FBBF24", // Amber Yellow
  accentPurple: "A78BFA",// Purple
  textPrimary: "F1F5F9",  // Light text
  textSecondary: "94A3B8",// Grey text
  gold: "AE9142"         // Gold
};

// ==========================================
// SLIDE 1: PORTADA (COVER)
// ==========================================
let s1 = pptx.addSlide();
s1.background = { fill: colors.bgDark };

// Title
s1.addText("PLATAFORMA DE\nMANTENIMIENTO CRL", {
  x: 0.8,
  y: 1.6,
  w: 8.4,
  h: 1.6,
  fontFace: "Arial",
  fontSize: 36,
  bold: true,
  color: colors.accentCyan,
  align: "left"
});

// Subtitle
s1.addText("Sistema Inteligente de Control Operativo y Analítica en Tiempo Real", {
  x: 0.8,
  y: 3.3,
  w: 8.4,
  h: 0.8,
  fontFace: "Arial",
  fontSize: 15,
  color: colors.textSecondary,
  align: "left"
});

// Divider line (using a thin rectangle shape)
s1.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8,
  y: 4.15,
  w: 3.5,
  h: 0.04,
  fill: { color: colors.gold }
});

// Footer
s1.addText("Club Regatas Lima — Fundado en 1875", {
  x: 0.8,
  y: 4.4,
  w: 8.4,
  h: 0.5,
  fontFace: "Arial",
  fontSize: 12,
  bold: true,
  color: colors.gold,
  align: "left"
});

// Decorative Side Gradient / Glow Block
s1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 8.2,
  y: 0.8,
  w: 1.2,
  h: 4.0,
  fill: { color: colors.bgCard },
  line: { color: colors.accentBlue, width: 2 }
});
s1.addText("🔧\n📊\n⚡\n⭐", {
  x: 8.2,
  y: 1.1,
  w: 1.2,
  h: 3.4,
  fontFace: "Arial",
  fontSize: 28,
  align: "center",
  color: colors.accentCyan
});


// ==========================================
// SLIDE 2: EL PROPÓSITO Y DESAFÍO
// ==========================================
let s2 = pptx.addSlide();
s2.background = { fill: colors.bgSlate };

// Slide Title
s2.addText("PROPÓSITO Y DESAFÍO", {
  x: 0.8,
  y: 0.4,
  w: 8.4,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 20,
  bold: true,
  color: colors.accentCyan,
  align: "left"
});

// Subtitle description
s2.addText("Transformar la gestión operativa de mantenimiento mediante tres pilares fundamentales:", {
  x: 0.8,
  y: 0.9,
  w: 8.4,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 11,
  color: colors.textSecondary
});

// Column 1 Box
s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 1.4,
  w: 2.6,
  h: 3.5,
  fill: { color: colors.bgCard },
  line: { color: colors.accentBlue, width: 1.5 }
});
s2.addText("🗂️\n\nDigitalización Total", {
  x: 1.0,
  y: 1.6,
  w: 2.2,
  h: 0.8,
  fontFace: "Arial",
  fontSize: 15,
  bold: true,
  color: colors.accentCyan,
  align: "center"
});
s2.addText("• Eliminación total de bitácoras físicas.\n• Control centralizado en un solo lugar de solicitudes correctivas (OTM), órdenes internas (OTI) y tareas preventivas de rutina.\n• Mayor trazabilidad operativa.", {
  x: 0.95,
  y: 2.5,
  w: 2.3,
  h: 2.2,
  fontFace: "Arial",
  fontSize: 10,
  color: colors.textPrimary,
  align: "left"
});

// Column 2 Box
s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 3.7,
  y: 1.4,
  w: 2.6,
  h: 3.5,
  fill: { color: colors.bgCard },
  line: { color: colors.accentGreen, width: 1.5 }
});
s2.addText("⚡\n\nControl en Tiempo Real", {
  x: 3.9,
  y: 1.6,
  w: 2.2,
  h: 0.8,
  fontFace: "Arial",
  fontSize: 15,
  bold: true,
  color: colors.accentGreen,
  align: "center"
});
s2.addText("• Conexión instantánea de técnicos en campo a través de la base de datos Supabase.\n• Actualización analítica reactiva inmediata ante cualquier reporte de cierre o avance.\n• Transparencia de estados.", {
  x: 3.85,
  y: 2.5,
  w: 2.3,
  h: 2.2,
  fontFace: "Arial",
  fontSize: 10,
  color: colors.textPrimary,
  align: "left"
});

// Column 3 Box
s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.6,
  y: 1.4,
  w: 2.6,
  h: 3.5,
  fill: { color: colors.bgCard },
  line: { color: colors.accentAmber, width: 1.5 }
});
s2.addText("📈\n\nAnalítica de Gestión", {
  x: 6.8,
  y: 1.6,
  w: 2.2,
  h: 0.8,
  fontFace: "Arial",
  fontSize: 15,
  bold: true,
  color: colors.accentAmber,
  align: "center"
});
s2.addText("• Métricas de eficiencia y plazos de atención controlados.\n• Registro CSAT de calificación y satisfacción de solicitantes.\n• Conversión de horas-hombre a días de trabajo real para planificación eficiente.", {
  x: 6.75,
  y: 2.5,
  w: 2.3,
  h: 2.2,
  fontFace: "Arial",
  fontSize: 10,
  color: colors.textPrimary,
  align: "left"
});


// ==========================================
// SLIDE 3: LOGROS E IMPLEMENTACIÓN ACTUAL
// ==========================================
let s3 = pptx.addSlide();
s3.background = { fill: colors.bgSlate };

// Slide Title
s3.addText("LOGROS E IMPLEMENTACIÓN ACTUAL", {
  x: 0.8,
  y: 0.4,
  w: 8.4,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 20,
  bold: true,
  color: colors.accentCyan,
  align: "left"
});

// Card 1
s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 1.2,
  w: 4.1,
  h: 3.8,
  fill: { color: colors.bgCard },
  line: { color: colors.accentBlue, width: 1.5 }
});
s3.addText("📊 Dashboard Ejecutivo e Interactivo", {
  x: 1.0,
  y: 1.4,
  w: 3.7,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 14,
  bold: true,
  color: colors.accentCyan
});
s3.addText("• Lógica 100% reactiva integrada en la plataforma principal.\n• Gráficos jerárquicos de técnicos en árbol con ramas conectoras y emojis.\n• Drill-down interactivo detallado para analizar el backlog (pendiente/programado) o desglose de horas por especialidad.\n• Tablero digitalizador de observaciones en 'Por revisar' con buscador y filtros en tiempo real.\n• Colores persistentes por técnico para máxima recordación visual.", {
  x: 1.0,
  y: 1.9,
  w: 3.7,
  h: 2.9,
  fontFace: "Arial",
  fontSize: 10,
  color: colors.textPrimary
});

// Card 2
s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 5.1,
  y: 1.2,
  w: 4.1,
  h: 3.8,
  fill: { color: colors.bgCard },
  line: { color: colors.accentGreen, width: 1.5 }
});
s3.addText("📱 Movilidad, SLA y Reportes", {
  x: 5.3,
  y: 1.4,
  w: 3.7,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 14,
  bold: true,
  color: colors.accentGreen
});
s3.addText("• Portal del Técnico optimizado para móviles (Visualización de tareas, checklists de rutinas y firma de conformidad en pantalla).\n• Pestaña analítica de Eficiencia / SLA con cálculo de respuesta promedio e índice de cumplimiento en 2 días.\n• Generador de reportes PDF corporativos de 3 páginas listos para impresión.\n• Importación dinámica de archivos Excel históricos.", {
  x: 5.3,
  y: 1.9,
  w: 3.7,
  h: 2.9,
  fontFace: "Arial",
  fontSize: 10,
  color: colors.textPrimary
});


// ==========================================
// SLIDE 4: VISIÓN A FUTURO (ROADMAP)
// ==========================================
let s4 = pptx.addSlide();
s4.background = { fill: colors.bgDark };

// Slide Title
s4.addText("VISIÓN A FUTURO (ROADMAP)", {
  x: 0.8,
  y: 0.4,
  w: 8.4,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 20,
  bold: true,
  color: colors.accentCyan,
  align: "left"
});

// Subtitle description
s4.addText("El camino hacia un mantenimiento predictivo y altamente automatizado:", {
  x: 0.8,
  y: 0.9,
  w: 8.4,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 11,
  color: colors.textSecondary
});

// Horizon 1 Card
s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 1.3,
  w: 8.4,
  h: 1.1,
  fill: { color: colors.bgCard },
  line: { color: colors.accentAmber, width: 1.5 }
});
s4.addText("🟡 Corto Plazo (1-2 meses): Notificaciones y Logística", {
  x: 1.0,
  y: 1.4,
  w: 8.0,
  h: 0.3,
  fontFace: "Arial",
  fontSize: 12,
  bold: true,
  color: colors.accentAmber
});
s4.addText("• Alertas y asignaciones en tiempo real vía WhatsApp / Push a técnicos.\n• Integración de catálogo básico de suministros (repuestos) para el control de OTs en espera (RQ).", {
  x: 1.0,
  y: 1.7,
  w: 8.0,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textPrimary
});

// Horizon 2 Card
s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 2.5,
  w: 8.4,
  h: 1.1,
  fill: { color: colors.bgCard },
  line: { color: colors.accentGreen, width: 1.5 }
});
s4.addText("🟢 Mediano Plazo (3-6 meses): Modo Offline y Portal Expandido", {
  x: 1.0,
  y: 2.6,
  w: 8.0,
  h: 0.3,
  fontFace: "Arial",
  fontSize: 12,
  bold: true,
  color: colors.accentGreen
});
s4.addText("• Modo sin conexión (Offline Sync) para el llenado de checklists en sótanos o zonas sin cobertura móvil.\n• Portal de usuario solicitante mejorado con seguimiento en vivo estilo delivery/mapa.", {
  x: 1.0,
  y: 2.9,
  w: 8.0,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textPrimary
});

// Horizon 3 Card
s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 3.7,
  w: 8.4,
  h: 1.1,
  fill: { color: colors.bgCard },
  line: { color: colors.accentPurple, width: 1.5 }
});
s4.addText("🟣 Largo Plazo (6-12 meses): Mantenimiento Predictivo e Inteligente", {
  x: 1.0,
  y: 3.8,
  w: 8.0,
  h: 0.3,
  fontFace: "Arial",
  fontSize: 12,
  bold: true,
  color: colors.accentPurple
});
s4.addText("• Algoritmos de Inteligencia Artificial para predecir fallas recurrentes basadas en el historial del club.\n• Ruteo y balance dinámico automático de carga de trabajo basado en geolocalización de tareas.", {
  x: 1.0,
  y: 4.1,
  w: 8.0,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textPrimary
});


// ==========================================
// SLIDE 5: CONCLUSIONES Y CIERRE
// ==========================================
let s5 = pptx.addSlide();
s5.background = { fill: colors.bgDark };

// Big Accent Block on Left
s5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8,
  y: 1.0,
  w: 4.0,
  h: 3.8,
  fill: { color: colors.bgCard },
  line: { color: colors.gold, width: 2 }
});

s5.addText("INDICADORES CLAVE", {
  x: 1.0,
  y: 1.2,
  w: 3.6,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 15,
  bold: true,
  color: colors.gold,
  align: "center"
});

// Large Stat 1
s5.addText("100%", {
  x: 1.0,
  y: 1.6,
  w: 3.6,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 32,
  bold: true,
  color: colors.accentCyan,
  align: "center"
});
s5.addText("Proceso Digitalizado e Integrado", {
  x: 1.0,
  y: 2.1,
  w: 3.6,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textSecondary,
  align: "center"
});

// Large Stat 2
s5.addText("SLA <= 2d", {
  x: 1.0,
  y: 2.6,
  w: 3.6,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 28,
  bold: true,
  color: colors.accentGreen,
  align: "center"
});
s5.addText("Control de Eficiencia de Atención", {
  x: 1.0,
  y: 3.1,
  w: 3.6,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textSecondary,
  align: "center"
});

// Large Stat 3
s5.addText("CSAT 4.5/5", {
  x: 1.0,
  y: 3.6,
  w: 3.6,
  h: 0.6,
  fontFace: "Arial",
  fontSize: 28,
  bold: true,
  color: colors.accentAmber,
  align: "center"
});
s5.addText("Índice Promedio de Satisfacción", {
  x: 1.0,
  y: 4.1,
  w: 3.6,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textSecondary,
  align: "center"
});

// Right Column: Conclusion & Thank You
s5.addText("CONCLUSIÓN GENERAL", {
  x: 5.1,
  y: 1.0,
  w: 4.1,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 16,
  bold: true,
  color: colors.accentCyan
});

s5.addText("Esta plataforma no representa simplemente un canal digital de registros, sino una verdadera central de inteligencia operativa diseñada a la medida de las necesidades reales de gestión del Club Regatas Lima.", {
  x: 5.1,
  y: 1.5,
  w: 4.1,
  h: 1.5,
  fontFace: "Arial",
  fontSize: 12.5,
  color: colors.textPrimary,
  align: "left"
});

s5.addText("¡Muchas Gracias!", {
  x: 5.1,
  y: 3.2,
  w: 4.1,
  h: 0.8,
  fontFace: "Arial",
  fontSize: 26,
  bold: true,
  color: colors.gold,
  align: "left"
});

s5.addText("Presentación elaborada por el equipo de desarrollo", {
  x: 5.1,
  y: 4.2,
  w: 4.1,
  h: 0.4,
  fontFace: "Arial",
  fontSize: 9.5,
  color: colors.textSecondary
});

// Save presentation file
const outputPath = "public/Presentacion_CRL_Mantenimiento.pptx";
pptx.writeFile({ fileName: outputPath })
  .then(fileName => {
    console.log(`PowerPoint presentation generated successfully at: ${fileName}`);
  })
  .catch(err => {
    console.error("Error generating PowerPoint:", err);
  });
