// =========================================================================
// FORMULARIO DE EPPs - DEPARTAMENTO MANTENIMIENTO
// Club de Regatas Lima - Sede Chorrillos
// =========================================================================
// Código del Servidor (Código.gs) - Versión de Resumen Estructurado
// =========================================================================

// Reemplaza esto con el ID largo de tu Google Sheet (si no está enlazado directamente)
const SHEET_ID = ""; 

/**
 * Función principal para renderizar la página web del formulario
 */
function doGet(e) {
  // Carga el archivo 'index.html' del proyecto
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("Control de EPP - Regatas Lima")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
}

/**
 * Guarda el registro de la inspección en la pestaña "Registro_EPPs"
 * @param {Object} data - Datos del formulario enviados desde el cliente
 */
function guardarRespuesta(data) {
  try {
    var ss;
    var sheetId = SHEET_ID;
    
    // Si SHEET_ID está vacío, intenta conectarse a la hoja de cálculo enlazada activa
    if (!sheetId || sheetId === "YOUR_SHEET_ID_HERE" || sheetId.trim() === "") {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } else {
      ss = SpreadsheetApp.openById(sheetId);
    }
    
    if (!ss) {
      return { 
        success: false, 
        message: "No se pudo conectar a Google Sheets. Asegúrate de configurar correctamente el SHEET_ID en el archivo de Apps Script o de ejecutar el script enlazado a una hoja." 
      };
    }
    
    var sheetName = "Registro_EPPs";
    var sheet = ss.getSheetByName(sheetName);
    
    // Crear la hoja de respuestas con formato si no existe
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Marca de Tiempo", 
        "Nombre Completo", 
        "Especialidad", 
        "EPPs en Buen Estado (Operativos)", 
        "EPPs Solicitados (Necesito Nuevo)", 
        "Otros / Observaciones"
      ]);
      
      // Aplicar formato Navy & Oro a la cabecera
      var headerRange = sheet.getRange("A1:F1");
      headerRange.setBackground("#1A2B4A");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      headerRange.setFontSize(11);
      
      // Congelar la fila de cabecera
      sheet.setFrozenRows(1);
      
      // Ajustar alto de cabecera
      sheet.setRowHeight(1, 35);
    }
    
    // Configurar anchos de columna fijos ideales para lectura premium
    sheet.setColumnWidth(1, 150); // Marca de tiempo
    sheet.setColumnWidth(2, 200); // Nombre completo
    sheet.setColumnWidth(3, 130); // Especialidad
    sheet.setColumnWidth(4, 350); // EPPs en buen estado (Operativos)
    sheet.setColumnWidth(5, 300); // EPPs solicitados (Necesito nuevo)
    sheet.setColumnWidth(6, 250); // Otros / Observaciones
    
    // Insertar la fila de datos estructurados
    var fecha = new Date();
    sheet.appendRow([
      fecha,
      data.nombre,
      data.especialidad,
      data.operativos,
      data.necesita,
      data.otros
    ]);
    
    // Obtener la última fila ingresada para darle formato automático
    var lastRow = sheet.getLastRow();
    var dataRange = sheet.getRange(lastRow, 1, 1, 6);
    
    // Aplicar ajuste de texto automático (Wrap text) y alineación media
    dataRange.setWrap(true);
    dataRange.setVerticalAlignment("middle");
    dataRange.setFontSize(10);
    
    // Alinear al centro columnas específicas (Fecha, Especialidad)
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 3).setHorizontalAlignment("center");
    
    // Si la celda de EPPs solicitados no dice "Ninguno", ponerle un sutil color de alerta (amarillo claro)
    var cambiosCell = sheet.getRange(lastRow, 5);
    if (data.necesita !== "Ninguno") {
      cambiosCell.setBackground("#FFF3CD"); // Amarillo de advertencia suave
      cambiosCell.setFontColor("#92400E");
      cambiosCell.setFontWeight("bold");
    }
    
    return { success: true, message: "Registro guardado exitosamente." };
  } catch (error) {
    return { success: false, message: "Error en el servidor: " + error.toString() };
  }
}
