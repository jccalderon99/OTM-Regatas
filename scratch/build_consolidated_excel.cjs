const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Helper to convert column index to Excel letter (1 -> A, 27 -> AA, etc.)
function getColumnLetter(col) {
  let letter = '';
  while (col > 0) {
    let temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = Math.floor((col - temp) - 1) / 26;
  }
  return letter;
}

// Helper to parse the EPP checklist from "Resumen de Inspección" column
function parseResumen(resumenText) {
  const result = {};
  if (!resumenText) return result;
  const regex = /\[([^:]+):\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(resumenText)) !== null) {
    const epp = match[1].trim();
    const status = match[2].trim();
    result[epp] = status;
  }
  return result;
}

async function main() {
  const inputFile = 'epps_data.xlsx';
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File ${inputFile} does not exist.`);
    process.exit(1);
  }

  console.log(`Loading workbook ${inputFile}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputFile);

  const sourceSheetName = 'Registro_EPPs';
  const sourceSheet = workbook.getWorksheet(sourceSheetName);
  
  if (!sourceSheet) {
    console.error(`Error: Sheet "${sourceSheetName}" not found in workbook.`);
    process.exit(1);
  }

  // 1. Identify columns dynamically
  const headers = [];
  const headerRow = sourceSheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value ? cell.value.toString().trim() : '';
  });

  console.log('Detected headers:', headers);

  let colNombreIdx = -1;
  let colEspecialidadIdx = -1;
  let colCambiosIdx = -1;
  let colResumenIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    const h = headers[i].toLowerCase();
    if (h.includes('nombre')) {
      colNombreIdx = i;
    } else if (h.includes('especialidad')) {
      colEspecialidadIdx = i;
    } else if (h.includes('cambio') || h.includes('solicitados') || h.includes('necesito nuevo')) {
      colCambiosIdx = i;
    } else if (h.includes('resumen') || h.includes('buen estado')) {
      colResumenIdx = i;
    }
  }

  if (colNombreIdx === -1 || colEspecialidadIdx === -1 || colCambiosIdx === -1 || colResumenIdx === -1) {
    console.error('Error: Could not identify required columns in spreadsheet headers.');
    process.exit(1);
  }

  // 2. Collect unique EPPs and process rows
  const uniqueEpps = new Set();
  const rawPeopleData = [];

  sourceSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const nombre = row.getCell(colNombreIdx + 1).value ? row.getCell(colNombreIdx + 1).value.toString().trim() : '';
    const especialidad = row.getCell(colEspecialidadIdx + 1).value ? row.getCell(colEspecialidadIdx + 1).value.toString().trim() : '';
    const cambiosText = row.getCell(colCambiosIdx + 1).value ? row.getCell(colCambiosIdx + 1).value.toString().trim() : '';
    const resumenText = row.getCell(colResumenIdx + 1).value ? row.getCell(colResumenIdx + 1).value.toString().trim() : '';

    if (!nombre || !especialidad) return;

    const parsedEpps = parseResumen(resumenText);
    Object.keys(parsedEpps).forEach(epp => uniqueEpps.add(epp));

    rawPeopleData.push({
      nombre,
      especialidad,
      cambiosText,
      parsedEpps
    });
  });

  // Sort EPPs alphabetically for columns
  const sortedEppCols = Array.from(uniqueEpps).sort();
  console.log(`Found ${sortedEppCols.length} unique EPPs to form columns.`);

  // Sort people by Specialty, then by Name
  rawPeopleData.sort((a, b) => {
    const specCompare = a.especialidad.localeCompare(b.especialidad, 'es');
    if (specCompare !== 0) return specCompare;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  // Common styling constants
  const themeNavy = '1A2B4A';
  const themeGold = 'C9A84C';
  const themeLightBg = 'F4F6F9';
  const themeHighlightBg = 'FFF9E6';
  
  const borderThin = {
    top: { style: 'thin', color: { argb: 'D1D5DB' } },
    left: { style: 'thin', color: { argb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
    right: { style: 'thin', color: { argb: 'D1D5DB' } }
  };

  const borderDoubleBottom = {
    top: { style: 'thin', color: { argb: 'D1D5DB' } },
    left: { style: 'thin', color: { argb: 'D1D5DB' } },
    bottom: { style: 'double', color: { argb: themeGold } },
    right: { style: 'thin', color: { argb: 'D1D5DB' } }
  };

  // =========================================================================
  // HOJA 1: CONSOLIDADO DE COMPRAS (RESUMEN GENERAL)
  // =========================================================================
  console.log('Generating Consolidado_Compras sheet...');
  let destSheet = workbook.getWorksheet('Consolidado_Compras');
  if (destSheet) workbook.removeWorksheet('Consolidado_Compras');
  destSheet = workbook.addWorksheet('Consolidado_Compras', { views: [{ showGridLines: true }] });

  // Consolidar compras
  const consolidadoGeneral = {};
  const consolidadoEspecialidad = {};

  rawPeopleData.forEach(p => {
    const cambiosText = p.cambiosText;
    if (!cambiosText || cambiosText.toLowerCase() === 'ninguno') return;

    const epps = cambiosText.split(',');
    for (let eppItem of epps) {
      eppItem = eppItem.trim();
      if (!eppItem || eppItem.toLowerCase() === 'ninguno') continue;

      // Consolidado General
      if (!consolidadoGeneral[eppItem]) {
        consolidadoGeneral[eppItem] = { total: 0, especialidades: new Set(), colaboradores: new Set() };
      }
      consolidadoGeneral[eppItem].total++;
      consolidadoGeneral[eppItem].especialidades.add(p.especialidad);
      consolidadoGeneral[eppItem].colaboradores.add(p.nombre);

      // Consolidado por Especialidad
      if (!consolidadoEspecialidad[p.especialidad]) {
        consolidadoEspecialidad[p.especialidad] = {};
      }
      if (!consolidadoEspecialidad[p.especialidad][eppItem]) {
        consolidadoEspecialidad[p.especialidad][eppItem] = { total: 0, colaboradores: new Set() };
      }
      consolidadoEspecialidad[p.especialidad][eppItem].total++;
      consolidadoEspecialidad[p.especialidad][eppItem].colaboradores.add(p.nombre);
    }
  });

  let currentLine = 1;
  destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
  let cell = destSheet.getCell(`A${currentLine}`);
  cell.value = 'CONSOLIDADO GENERAL DE COMPRA DE EPPs';
  cell.font = { name: 'Outfit', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  destSheet.getRow(currentLine).height = 45;
  currentLine++;

  destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
  cell = destSheet.getCell(`A${currentLine}`);
  const fechaActualStr = new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
  cell.value = `Departamento de Mantenimiento | Generado el: ${fechaActualStr}`;
  cell.font = { name: 'Inter', size: 10, color: { argb: themeGold } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  destSheet.getRow(currentLine).height = 25;
  
  currentLine += 3; // Space

  // Tabla 1: Totales generales
  destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
  cell = destSheet.getCell(`A${currentLine}`);
  cell.value = '1. RESUMEN DE COMPRA GENERAL (TOTALES POR EPP)';
  cell.font = { name: 'Outfit', size: 12, bold: true, color: { argb: themeNavy } };
  currentLine++;

  const t1Headers = ['EPP (Artículo / Item)', 'Cantidad Requerida', 'Especialidades Solicitantes', 'Colaboradores que lo requieren'];
  let row = destSheet.getRow(currentLine);
  row.values = t1Headers;
  row.height = 30;
  for (let c = 1; c <= 4; c++) {
    const cl = row.getCell(c);
    cl.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
    cl.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cl.border = borderThin;
  }
  currentLine++;

  const t1Data = [];
  for (const k in consolidadoGeneral) {
    t1Data.push({
      epp: k,
      cantidad: consolidadoGeneral[k].total,
      especialidades: Array.from(consolidadoGeneral[k].especialidades).join(', '),
      colaboradores: Array.from(consolidadoGeneral[k].colaboradores).join(', ')
    });
  }
  t1Data.sort((a, b) => b.cantidad - a.cantidad);

  const t1StartRow = currentLine;
  if (t1Data.length === 0) {
    destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
    cell = destSheet.getCell(`A${currentLine}`);
    cell.value = 'No hay requerimientos de cambio activos.';
    cell.font = { name: 'Inter', italic: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
    currentLine++;
  } else {
    t1Data.forEach((d, idx) => {
      const r = destSheet.getRow(currentLine);
      r.getCell(1).value = d.epp;
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(2).value = d.cantidad;
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).font = { bold: true };
      r.getCell(3).value = d.especialidades;
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(4).value = d.colaboradores;
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      const fill = idx % 2 === 1 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: themeLightBg } } : null;
      for (let c = 1; c <= 4; c++) {
        const cl = r.getCell(c);
        cl.font = cl.font || { name: 'Inter', size: 10 };
        cl.font.name = 'Inter';
        cl.font.size = 10;
        if (fill) cl.fill = fill;
        cl.border = borderThin;
      }
      r.height = 24;
      currentLine++;
    });

    const totalRow = destSheet.getRow(currentLine);
    totalRow.getCell(1).value = 'TOTAL GENERAL A ADQUIRIR';
    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    totalRow.getCell(2).value = { formula: `=SUM(B${t1StartRow}:B${currentLine - 1})` };
    totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(2).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    totalRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeHighlightBg } };

    for (let c = 1; c <= 4; c++) {
      totalRow.getCell(c).border = borderDoubleBottom;
    }
    totalRow.height = 28;
    currentLine++;
  }

  currentLine += 4;

  // Tabla 2: Detalle por especialidad
  destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
  cell = destSheet.getCell(`A${currentLine}`);
  cell.value = '2. DETALLE DE REQUERIMIENTOS AGRUPADOS POR ESPECIALIDAD';
  cell.font = { name: 'Outfit', size: 12, bold: true, color: { argb: themeNavy } };
  currentLine++;

  const headerRow2 = destSheet.getRow(currentLine);
  headerRow2.values = ['Especialidad', 'EPP Requerido (Artículo)', 'Cantidad Requerida', 'Colaboradores Solicitantes'];
  headerRow2.height = 30;
  for (let c = 1; c <= 4; c++) {
    const cl = headerRow2.getCell(c);
    cl.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
    cl.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cl.border = borderThin;
  }
  currentLine++;

  const t2StartRow = currentLine;
  const specialtiesList = Object.keys(consolidadoEspecialidad).sort();

  if (specialtiesList.length === 0) {
    destSheet.mergeCells(`A${currentLine}:D${currentLine}`);
    cell = destSheet.getCell(`A${currentLine}`);
    cell.value = 'No hay requerimientos activos por especialidad.';
    cell.font = { name: 'Inter', italic: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
    currentLine++;
  } else {
    specialtiesList.forEach((spec, specIdx) => {
      const specEpps = consolidadoEspecialidad[spec];
      const eppsKeys = Object.keys(specEpps).sort();
      const specStartRow = currentLine;

      eppsKeys.forEach((eppName) => {
        const colabs = Array.from(specEpps[eppName].colaboradores).join(', ');
        const qty = specEpps[eppName].total;

        const r = destSheet.getRow(currentLine);
        r.getCell(1).value = spec;
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        r.getCell(1).font = { name: 'Inter', size: 10, bold: true };
        r.getCell(2).value = eppName;
        r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        r.getCell(3).value = qty;
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(3).font = { name: 'Inter', size: 10, bold: true };
        r.getCell(4).value = colabs;
        r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const specFill = specIdx % 2 === 1 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: themeLightBg } } : null;
        for (let c = 1; c <= 4; c++) {
          const cl = r.getCell(c);
          cl.font = cl.font || { name: 'Inter', size: 10 };
          cl.font.name = 'Inter';
          cl.font.size = 10;
          if (specFill) cl.fill = specFill;
          cl.border = borderThin;
        }
        r.height = 24;
        currentLine++;
      });

      if (eppsKeys.length > 1) {
        destSheet.mergeCells(`A${specStartRow}:A${currentLine - 1}`);
      }
    });

    const totalRow2 = destSheet.getRow(currentLine);
    totalRow2.getCell(1).value = 'TOTAL GENERAL DETALLADO';
    totalRow2.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow2.getCell(1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    totalRow2.getCell(3).value = { formula: `=SUM(C${t2StartRow}:C${currentLine - 1})` };
    totalRow2.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow2.getCell(3).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    totalRow2.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeHighlightBg } };

    for (let c = 1; c <= 4; c++) {
      totalRow2.getCell(c).border = borderDoubleBottom;
    }
    totalRow2.height = 28;
    currentLine++;
  }

  destSheet.getColumn(1).width = 32;
  destSheet.getColumn(2).width = 36;
  destSheet.getColumn(3).width = 22;
  destSheet.getColumn(4).width = 45;


  // =========================================================================
  // HOJA 2: MATRIZ DE ESTADO EPP (SEMAFORO)
  // =========================================================================
  console.log('Generating Matriz_Estado_EPPs sheet...');
  let matrixSheet = workbook.getWorksheet('Matriz_Estado_EPPs');
  if (matrixSheet) workbook.removeWorksheet('Matriz_Estado_EPPs');
  matrixSheet = workbook.addWorksheet('Matriz_Estado_EPPs', { views: [{ showGridLines: true }] });

  let matrixLine = 1;
  const numColumns = sortedEppCols.length + 2; // Specialty, Name, and EPPs
  const lastColLetter = getColumnLetter(numColumns);

  // Title Banner
  matrixSheet.mergeCells(`A${matrixLine}:${lastColLetter}${matrixLine}`);
  cell = matrixSheet.getCell(`A${matrixLine}`);
  cell.value = 'MATRIZ DE CONTROL Y ESTADO DE EPPs POR COLABORADOR';
  cell.font = { name: 'Outfit', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  matrixSheet.getRow(matrixLine).height = 45;
  matrixLine++;

  // Subtitle Banner
  matrixSheet.mergeCells(`A${matrixLine}:${lastColLetter}${matrixLine}`);
  cell = matrixSheet.getCell(`A${matrixLine}`);
  cell.value = `Departamento de Mantenimiento | Estado Actualizado | Generado el: ${fechaActualStr}`;
  cell.font = { name: 'Inter', size: 10, color: { argb: themeGold } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  matrixSheet.getRow(matrixLine).height = 25;
  
  matrixLine += 3; // Space

  // Table header
  matrixSheet.mergeCells(`A${matrixLine}:${lastColLetter}${matrixLine}`);
  cell = matrixSheet.getCell(`A${matrixLine}`);
  cell.value = '1. MATRIZ DE EPP (VERDE: OPERATIVO | ROJO: REQUIERE CAMBIO | GRIS: NO APLICA / NO USA)';
  cell.font = { name: 'Outfit', size: 12, bold: true, color: { argb: themeNavy } };
  matrixLine++;

  // Headers
  const matrixHeaders = ['Especialidad', 'Nombre Completo', ...sortedEppCols];
  const mHeaderRow = matrixSheet.getRow(matrixLine);
  mHeaderRow.values = matrixHeaders;
  mHeaderRow.height = 140; // High row for vertical rotated headers

  // Style headers
  for (let c = 1; c <= numColumns; c++) {
    const cl = mHeaderRow.getCell(c);
    cl.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
    cl.border = borderThin;

    if (c > 2) {
      // Rotate EPP column headers vertically
      cl.alignment = { textRotation: 90, vertical: 'middle', horizontal: 'center', wrapText: true };
    } else {
      cl.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }
  matrixLine++;

  const mStartRow = matrixLine;

  // Fill people rows
  rawPeopleData.forEach((p, idx) => {
    const r = matrixSheet.getRow(matrixLine);
    r.getCell(1).value = p.especialidad;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(1).font = { name: 'Inter', size: 10, bold: true };
    
    r.getCell(2).value = p.nombre;
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).font = { name: 'Inter', size: 10 };

    sortedEppCols.forEach((epp, colIdx) => {
      const cellCol = colIdx + 3;
      const statusText = p.parsedEpps[epp];
      const cl = r.getCell(cellCol);
      cl.alignment = { horizontal: 'center', vertical: 'middle' };

      if (statusText) {
        const st = statusText.toLowerCase();
        if (st.includes('tiene') || st.includes('tengo') || st.includes('operativo')) {
          // OK - Green text with checkmark
          cl.value = '✓';
          cl.font = { name: 'Inter', size: 11, bold: true, color: { argb: '059669' } };
          cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; // White background
        } else if (st.includes('cambio') || st.includes('nuevo')) {
          // Warning - Red fill with white text
          cl.value = 'Requiere';
          cl.font = { name: 'Inter', size: 9, bold: true, color: { argb: '991B1B' } };
          cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        } else {
          // Not used - Grey fill
          cl.value = '-';
          cl.font = { name: 'Inter', size: 10, color: { argb: '9CA3AF' } };
          cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
        }
      } else {
        // Doesn't apply to this specialty - Grey fill
        cl.value = '-';
        cl.font = { name: 'Inter', size: 10, color: { argb: '9CA3AF' } };
        cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
      }
      cl.border = borderThin;
    });

    // Apply thin borders and formatting to the first 2 columns too
    r.getCell(1).border = borderThin;
    r.getCell(2).border = borderThin;
    
    // Zebra background on Name and Specialty column to look cleaner
    const fillZebra = idx % 2 === 1 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: themeLightBg } } : null;
    if (fillZebra) {
      // only apply zebra on name if not custom styled
      r.getCell(2).fill = fillZebra;
    }

    r.height = 24;
    matrixLine++;
  });

  const mEndRow = matrixLine - 1;

  // Merge specialty cells in matrix Column A
  let mergeStart = mStartRow;
  for (let rNum = mStartRow + 1; rNum <= mEndRow + 1; rNum++) {
    const prevVal = matrixSheet.getCell(`A${rNum - 1}`).value;
    const curVal = matrixSheet.getCell(`A${rNum}`).value;
    
    if (curVal !== prevVal || rNum === mEndRow + 1) {
      if (rNum - 1 > mergeStart) {
        matrixSheet.mergeCells(`A${mergeStart}:A${rNum - 1}`);
      }
      mergeStart = rNum;
    }
  }

  // Row: Total Operativos
  const opsRow = matrixSheet.getRow(matrixLine);
  opsRow.getCell(1).value = 'TOTAL OPERATIVOS (✓)';
  matrixSheet.mergeCells(`A${matrixLine}:B${matrixLine}`);
  opsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  opsRow.getCell(1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
  opsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } };
  opsRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } };
  opsRow.getCell(1).border = borderThin;
  opsRow.getCell(2).border = borderThin;

  for (let c = 3; c <= numColumns; c++) {
    const colLetter = getColumnLetter(c);
    const cell = opsRow.getCell(c);
    cell.value = { formula: `=COUNTIF(${colLetter}${mStartRow}:${colLetter}${mEndRow}, "✓")` };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: '047857' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } };
    cell.border = borderThin;
  }
  opsRow.height = 26;
  matrixLine++;

  // Row: Total Requiere Cambio
  const reqRow = matrixSheet.getRow(matrixLine);
  reqRow.getCell(1).value = 'TOTAL COMPRAS (Requiere)';
  matrixSheet.mergeCells(`A${matrixLine}:B${matrixLine}`);
  reqRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  reqRow.getCell(1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
  reqRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
  reqRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
  reqRow.getCell(1).border = borderDoubleBottom;
  reqRow.getCell(2).border = borderDoubleBottom;

  for (let c = 3; c <= numColumns; c++) {
    const colLetter = getColumnLetter(c);
    const cell = reqRow.getCell(c);
    cell.value = { formula: `=COUNTIF(${colLetter}${mStartRow}:${colLetter}${mEndRow}, "Requiere")` };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'B91C1C' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
    cell.border = borderDoubleBottom;
  }
  reqRow.height = 28;
  matrixLine++;

  matrixLine += 5; // Large Space

  // ==========================================
  // SECCIÓN ABAJO: RESUMEN DE CANTIDADES TOTALES
  // ==========================================
  matrixSheet.mergeCells(`A${matrixLine}:D${matrixLine}`);
  cell = matrixSheet.getCell(`A${matrixLine}`);
  cell.value = '2. DETALLE RESUMIDO DE EPPs SOLICITADOS PARA COMPRA';
  cell.font = { name: 'Outfit', size: 12, bold: true, color: { argb: themeNavy } };
  matrixLine++;

  // Summary headers
  const summaryHeaders = ['EPP (Artículo / Item)', 'Cantidad Requerida', 'Especialidades', 'Colaboradores Solicitantes'];
  const sHeaderRow = matrixSheet.getRow(matrixLine);
  sHeaderRow.values = summaryHeaders;
  sHeaderRow.height = 30;

  for (let c = 1; c <= 4; c++) {
    const cl = sHeaderRow.getCell(c);
    cl.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeNavy } };
    cl.alignment = { horizontal: 'center', vertical: 'middle' };
    cl.border = borderThin;
  }
  matrixLine++;

  const sStartRow = matrixLine;

  if (t1Data.length === 0) {
    matrixSheet.mergeCells(`A${matrixLine}:D${matrixLine}`);
    cell = matrixSheet.getCell(`A${matrixLine}`);
    cell.value = 'No hay compras requeridas.';
    cell.font = { name: 'Inter', italic: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
    matrixLine++;
  } else {
    t1Data.forEach((d, idx) => {
      const r = matrixSheet.getRow(matrixLine);
      r.getCell(1).value = d.epp;
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      r.getCell(2).value = d.cantidad;
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).font = { bold: true };
      
      r.getCell(3).value = d.especialidades;
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      r.getCell(4).value = d.colaboradores;
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      const fill = idx % 2 === 1 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: themeLightBg } } : null;
      for (let c = 1; c <= 4; c++) {
        const cl = r.getCell(c);
        cl.font = cl.font || { name: 'Inter', size: 10 };
        cl.font.name = 'Inter';
        cl.font.size = 10;
        if (fill) cl.fill = fill;
        cl.border = borderThin;
      }
      r.height = 24;
      matrixLine++;
    });

    // Total Row
    const sTotalRow = matrixSheet.getRow(matrixLine);
    sTotalRow.getCell(1).value = 'TOTAL GENERAL DE ADQUISICIÓN';
    sTotalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    sTotalRow.getCell(1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    
    sTotalRow.getCell(2).value = { formula: `=SUM(B${sStartRow}:B${matrixLine - 1})` };
    sTotalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    sTotalRow.getCell(2).font = { name: 'Outfit', size: 10, bold: true, color: { argb: themeNavy } };
    sTotalRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeHighlightBg } };

    for (let c = 1; c <= 4; c++) {
      sTotalRow.getCell(c).border = borderDoubleBottom;
    }
    sTotalRow.height = 28;
    matrixLine++;
  }

  // Adjust Matrix Sheet column widths
  matrixSheet.getColumn(1).width = 22; // Especialidad
  matrixSheet.getColumn(2).width = 28; // Nombre completo
  for (let c = 3; c <= numColumns; c++) {
    matrixSheet.getColumn(c).width = 6.5; // Narrow EPP columns
  }

  console.log('Saving consolidated workbook...');
  await workbook.xlsx.writeFile(inputFile);
  console.log('Workbook saved successfully.');
}

main().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
