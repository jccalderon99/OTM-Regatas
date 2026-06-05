/**
 * =========================================================================
 * CONSOLIDADO DE COMPRAS DE EPPs - DEPARTAMENTO MANTENIMIENTO
 * Club de Regatas Lima - Sede Chorrillos
 * =========================================================================
 * Desarrollado con Estilo Premium Navy & Oro
 * =========================================================================
 */

/**
 * Agrega el menú personalizado al abrir el archivo de Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🛡️ Control EPP')
    .addItem('📊 Generar Consolidado de Compras', 'generarConsolidadoCompras')
    .addToUi();
}

/**
 * Función principal para consolidar los requerimientos de compra de EPPs
 */
function generarConsolidadoCompras() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheetName = "Registro_EPPs";
  var sourceSheet = ss.getSheetByName(sourceSheetName);
  
  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert(
      'Error', 
      'No se encontró la pestaña "' + sourceSheetName + '". Asegúrate de que los técnicos hayan enviado al menos una respuesta a través del formulario.', 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // 1. Obtener todos los datos
  var lastRow = sourceSheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert(
      'Información', 
      'La pestaña "' + sourceSheetName + '" no contiene registros de respuestas.', 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  var headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  
  // Identificar índices de columnas (0-based) de forma dinámica
  var colNombreIdx = -1;
  var colEspecialidadIdx = -1;
  var colCambiosIdx = -1;
  
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim().toLowerCase();
    if (h.indexOf("nombre") > -1) {
      colNombreIdx = i;
    } else if (h.indexOf("especialidad") > -1) {
      colEspecialidadIdx = i;
    } else if (h.indexOf("cambio") > -1 || h.indexOf("solicitados") > -1 || h.indexOf("necesito nuevo") > -1) {
      colCambiosIdx = i;
    }
  }
  
  // Validaciones
  if (colNombreIdx === -1 || colEspecialidadIdx === -1 || colCambiosIdx === -1) {
    SpreadsheetApp.getUi().alert(
      'Error de Estructura', 
      'No se pudieron identificar las columnas requeridas (Nombre Completo, Especialidad, Requerimientos de Cambio). Por favor, verifica las cabeceras de la hoja "' + sourceSheetName + '".', 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  var dataRange = sourceSheet.getRange(2, 1, lastRow - 1, sourceSheet.getLastColumn());
  var rows = dataRange.getValues();
  
  // 2. Procesar y agrupar la información
  var consolidadoGeneral = {}; // EPP -> { total: 0, especialidades: {}, colaboradores: {} }
  var consolidadoEspecialidad = {}; // Especialidad -> EPP -> { total: 0, colaboradores: {} }
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var nombre = row[colNombreIdx] ? row[colNombreIdx].toString().trim() : "";
    var especialidad = row[colEspecialidadIdx] ? row[colEspecialidadIdx].toString().trim() : "";
    var cambiosText = row[colCambiosIdx] ? row[colCambiosIdx].toString().trim() : "";
    
    if (!nombre || !especialidad || !cambiosText || cambiosText.toLowerCase() === "ninguno") {
      continue;
    }
    
    // Separar EPPs solicitados por coma
    var epps = cambiosText.split(",");
    for (var e = 0; e < epps.length; e++) {
      var eppItem = epps[e].trim();
      if (!eppItem || eppItem.toLowerCase() === "ninguno") continue;
      
      // Consolidado General
      if (!consolidadoGeneral[eppItem]) {
        consolidadoGeneral[eppItem] = { total: 0, especialidades: {}, colaboradores: {} };
      }
      consolidadoGeneral[eppItem].total++;
      consolidadoGeneral[eppItem].especialidades[especialidad] = true;
      consolidadoGeneral[eppItem].colaboradores[nombre] = true;
      
      // Consolidado por Especialidad
      if (!consolidadoEspecialidad[especialidad]) {
        consolidadoEspecialidad[especialidad] = {};
      }
      if (!consolidadoEspecialidad[especialidad][eppItem]) {
        consolidadoEspecialidad[especialidad][eppItem] = { total: 0, colaboradores: {} };
      }
      consolidadoEspecialidad[especialidad][eppItem].total++;
      consolidadoEspecialidad[especialidad][eppItem].colaboradores[nombre] = true;
    }
  }
  
  // 3. Crear o limpiar la pestaña de Destino "Consolidado_Compras"
  var destSheetName = "Consolidado_Compras";
  var destSheet = ss.getSheetByName(destSheetName);
  if (destSheet) {
    destSheet.clear();
    destSheet.getRange(1, 1, destSheet.getMaxRows(), destSheet.getMaxColumns()).setBackground(null).setFontColor(null).setFontWeight(null).setBorder(false, false, false, false, false, false);
  } else {
    destSheet = ss.insertSheet(destSheetName);
  }
  
  // Asegurar que las cuadrículas estén activas para un look limpio
  destSheet.setGridlines(true);
  
  // Fila de inicio para escribir
  var currentLine = 1;
  
  // ==========================================
  // SECCIÓN 1: CABECERA DEL DOCUMENTO
  // ==========================================
  destSheet.getRange(currentLine, 1, 1, 4).merge();
  var mainTitleRange = destSheet.getRange(currentLine, 1);
  mainTitleRange.setValue("CONSOLIDADO GENERAL DE COMPRA DE EPPs");
  mainTitleRange.setFontFamily("Outfit");
  mainTitleRange.setFontSize(16);
  mainTitleRange.setFontWeight("bold");
  mainTitleRange.setFontColor("#FFFFFF");
  mainTitleRange.setBackground("#1A2B4A"); // Navy oscuro
  mainTitleRange.setHorizontalAlignment("center");
  mainTitleRange.setVerticalAlignment("middle");
  destSheet.setRowHeight(currentLine, 45);
  
  currentLine++;
  
  // Subtítulo
  destSheet.getRange(currentLine, 1, 1, 4).merge();
  var subTitleRange = destSheet.getRange(currentLine, 1);
  var fechaActual = Utilities.formatDate(new Date(), "GMT-5", "dd/MM/yyyy HH:mm");
  subTitleRange.setValue("Departamento de Mantenimiento | Generado el: " + fechaActual);
  subTitleRange.setFontFamily("Inter");
  subTitleRange.setFontSize(10);
  subTitleRange.setFontColor("#C9A84C"); // Oro Accent
  subTitleRange.setBackground("#1A2B4A");
  subTitleRange.setHorizontalAlignment("center");
  subTitleRange.setVerticalAlignment("middle");
  destSheet.setRowHeight(currentLine, 25);
  
  currentLine += 3; // Espacio
  
  // ==========================================
  // TABLA 1: TOTAL DE EPPs A COMPRAR
  // ==========================================
  destSheet.getRange(currentLine, 1, 1, 4).merge();
  var table1Title = destSheet.getRange(currentLine, 1);
  table1Title.setValue("1. RESUMEN DE COMPRA GENERAL (TOTALES POR EPP)");
  table1Title.setFontFamily("Outfit");
  table1Title.setFontSize(12);
  table1Title.setFontWeight("bold");
  table1Title.setFontColor("#1A2B4A");
  
  currentLine++;
  
  // Cabecera Tabla 1
  var t1Headers = ["EPP (Artículo / Item)", "Cantidad Requerida", "Especialidades Solicitantes", "Colaboradores que lo requieren"];
  var t1HeaderRange = destSheet.getRange(currentLine, 1, 1, 4);
  t1HeaderRange.setValues([t1Headers]);
  t1HeaderRange.setBackground("#1A2B4A");
  t1HeaderRange.setFontColor("#FFFFFF");
  t1HeaderRange.setFontWeight("bold");
  t1HeaderRange.setFontFamily("Outfit");
  t1HeaderRange.setFontSize(10);
  t1HeaderRange.setHorizontalAlignment("center");
  t1HeaderRange.setVerticalAlignment("middle");
  destSheet.setRowHeight(currentLine, 30);
  
  currentLine++;
  
  // Preparar datos Tabla 1 (ordenados de mayor a menor cantidad requerida)
  var t1Data = [];
  for (var key in consolidadoGeneral) {
    var specList = Object.keys(consolidadoGeneral[key].especialidades).join(", ");
    var colabList = Object.keys(consolidadoGeneral[key].colaboradores).join(", ");
    t1Data.push({
      epp: key,
      cantidad: consolidadoGeneral[key].total,
      especialidades: specList,
      colaboradores: colabList
    });
  }
  
  t1Data.sort(function(a, b) {
    return b.cantidad - a.cantidad;
  });
  
  var t1StartRow = currentLine;
  
  if (t1Data.length === 0) {
    destSheet.getRange(currentLine, 1, 1, 4).merge().setValue("No hay requerimientos de cambio activos.").setHorizontalAlignment("center").setFontStyle("italic");
    currentLine++;
  } else {
    for (var j = 0; j < t1Data.length; j++) {
      var rData = t1Data[j];
      destSheet.getRange(currentLine, 1).setValue(rData.epp).setHorizontalAlignment("left");
      destSheet.getRange(currentLine, 2).setValue(rData.cantidad).setHorizontalAlignment("center").setFontWeight("bold");
      destSheet.getRange(currentLine, 3).setValue(rData.especialidades).setHorizontalAlignment("left");
      destSheet.getRange(currentLine, 4).setValue(rData.colaboradores).setHorizontalAlignment("left");
      
      // Filas alternadas (Zebra stripes)
      if (j % 2 === 1) {
        destSheet.getRange(currentLine, 1, 1, 4).setBackground("#F4F6F9");
      }
      
      destSheet.setRowHeight(currentLine, 22);
      currentLine++;
    }
    
    // Fila de Total Tabla 1
    destSheet.getRange(currentLine, 1).setValue("TOTAL GENERAL A ADQUIRIR").setFontWeight("bold").setHorizontalAlignment("right");
    destSheet.getRange(currentLine, 2).setFormula("=SUM(B" + t1StartRow + ":B" + (currentLine - 1) + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#FFF9E6");
    destSheet.getRange(currentLine, 1, 1, 4).setBorder(true, null, true, null, null, null, "#C9A84C", SpreadsheetApp.BorderStyle.DOUBLE);
    destSheet.getRange(currentLine, 1, 1, 4).setFontColor("#1A2B4A").setFontWeight("bold");
    destSheet.setRowHeight(currentLine, 26);
    
    // Bordes Tabla 1
    var t1FullRange = destSheet.getRange(t1StartRow - 1, 1, (currentLine - t1StartRow) + 2, 4);
    t1FullRange.setBorder(true, true, true, true, true, true, "#E5E7EB", SpreadsheetApp.BorderStyle.SOLID);
    t1FullRange.setWrap(true);
    t1FullRange.setFontSize(10);
    t1FullRange.setFontFamily("Inter");
  }
  
  currentLine += 4; // Espacio
  
  // ==========================================
  // TABLA 2: DETALLE POR ESPECIALIDAD
  // ==========================================
  destSheet.getRange(currentLine, 1, 1, 4).merge();
  var table2Title = destSheet.getRange(currentLine, 1);
  table2Title.setValue("2. DETALLE DE REQUERIMIENTOS AGRUPADOS POR ESPECIALIDAD");
  table2Title.setFontFamily("Outfit");
  table2Title.setFontSize(12);
  table2Title.setFontWeight("bold");
  table2Title.setFontColor("#1A2B4A");
  
  currentLine++;
  
  // Cabecera Tabla 2
  var t2Headers = ["Especialidad", "EPP Requerido (Artículo)", "Cantidad Requerida", "Colaboradores Solicitantes"];
  var t2HeaderRange = destSheet.getRange(currentLine, 1, 1, 4);
  t2HeaderRange.setValues([t2Headers]);
  t2HeaderRange.setBackground("#1A2B4A");
  t2HeaderRange.setFontColor("#FFFFFF");
  t2HeaderRange.setFontWeight("bold");
  t2HeaderRange.setFontFamily("Outfit");
  t2HeaderRange.setFontSize(10);
  t2HeaderRange.setHorizontalAlignment("center");
  t2HeaderRange.setVerticalAlignment("middle");
  destSheet.setRowHeight(currentLine, 30);
  
  currentLine++;
  
  var t2StartRow = currentLine;
  var specialtiesList = Object.keys(consolidadoEspecialidad).sort();
  
  if (specialtiesList.length === 0) {
    destSheet.getRange(currentLine, 1, 1, 4).merge().setValue("No hay requerimientos activos por especialidad.").setHorizontalAlignment("center").setFontStyle("italic");
    currentLine++;
  } else {
    var zebraIndex = 0;
    for (var s = 0; s < specialtiesList.length; s++) {
      var spec = specialtiesList[s];
      var specEpps = consolidadoEspecialidad[spec];
      var eppsKeys = Object.keys(specEpps).sort();
      
      // Primera fila de la especialidad para combinar celdas después si se desea, o simplemente repetirla
      var specStartRow = currentLine;
      
      for (var k = 0; k < eppsKeys.length; k++) {
        var eppName = eppsKeys[k];
        var colabs = Object.keys(specEpps[eppName].colaboradores).join(", ");
        var qty = specEpps[eppName].total;
        
        destSheet.getRange(currentLine, 1).setValue(spec).setHorizontalAlignment("center").setFontWeight("bold");
        destSheet.getRange(currentLine, 2).setValue(eppName).setHorizontalAlignment("left");
        destSheet.getRange(currentLine, 3).setValue(qty).setHorizontalAlignment("center").setFontWeight("bold");
        destSheet.getRange(currentLine, 4).setValue(colabs).setHorizontalAlignment("left");
        
        // Colores alternados por especialidad para agrupar visualmente mejor
        if (s % 2 === 1) {
          destSheet.getRange(currentLine, 1, 1, 4).setBackground("#F4F6F9");
        }
        
        destSheet.setRowHeight(currentLine, 22);
        currentLine++;
      }
      
      // Combinar celdas de Especialidad para un reporte impecable
      if (eppsKeys.length > 1) {
        destSheet.getRange(specStartRow, 1, eppsKeys.length, 1).merge().setVerticalAlignment("middle");
      }
    }
    
    // Fila de Total Tabla 2
    destSheet.getRange(currentLine, 1).setValue("TOTAL GENERAL DETALLADO").setFontWeight("bold").setHorizontalAlignment("right");
    destSheet.getRange(currentLine, 2).setValue(""); // Vacío
    destSheet.getRange(currentLine, 3).setFormula("=SUM(C" + t2StartRow + ":C" + (currentLine - 1) + ")").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#FFF9E6");
    destSheet.getRange(currentLine, 4).setValue(""); // Vacío
    destSheet.getRange(currentLine, 1, 1, 4).setBorder(true, null, true, null, null, null, "#C9A84C", SpreadsheetApp.BorderStyle.DOUBLE);
    destSheet.getRange(currentLine, 1, 1, 4).setFontColor("#1A2B4A").setFontWeight("bold");
    destSheet.setRowHeight(currentLine, 26);
    
    // Bordes Tabla 2
    var t2FullRange = destSheet.getRange(t2StartRow - 1, 1, (currentLine - t2StartRow) + 2, 4);
    t2FullRange.setBorder(true, true, true, true, true, true, "#E5E7EB", SpreadsheetApp.BorderStyle.SOLID);
    t2FullRange.setWrap(true);
    t2FullRange.setFontSize(10);
    t2FullRange.setFontFamily("Inter");
  }
  
  // 4. Configurar anchos de columnas finales e ideales
  destSheet.setColumnWidth(1, 220); // EPP o Especialidad
  destSheet.setColumnWidth(2, 280); // Artículo o Cantidad
  destSheet.setColumnWidth(3, 150); // Especialidades o Cantidad
  destSheet.setColumnWidth(4, 350); // Colaboradores
  
  // Alerta de éxito para el usuario
  SpreadsheetApp.getUi().alert(
    'Consolidado Generado', 
    'Se ha generado exitosamente el Consolidado de Compras en la pestaña "' + destSheetName + '". El reporte incluye los totales de compra generales y el detalle agrupado por especialidad técnica.', 
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
