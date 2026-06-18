const ExcelJS = require('exceljs');
const fs = require('fs');

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('epps_data.xlsx');
  const sourceSheet = workbook.getWorksheet('Registro_EPPs');

  const uniqueEpps = new Set();
  const uniqueStatuses = new Set();

  let colResumenIdx = -1;
  const headerRow = sourceSheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value ? cell.value.toString().trim().toLowerCase() : '';
    if (val.includes('resumen de') || val.includes('buen estado')) {
      colResumenIdx = colNumber - 1;
    }
  });

  if (colResumenIdx === -1) {
    console.error('Resumen de Inspección column not found');
    process.exit(1);
  }

  sourceSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const resumen = row.getCell(colResumenIdx + 1).value ? row.getCell(colResumenIdx + 1).value.toString().trim() : '';
    
    // Parse [EPP Name: Status]
    const regex = /\[([^:]+):\s*([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(resumen)) !== null) {
      uniqueEpps.add(match[1].trim());
      uniqueStatuses.add(match[2].trim());
    }
  });

  console.log('Unique EPPs found in data:', Array.from(uniqueEpps));
  console.log('Unique statuses found in data:', Array.from(uniqueStatuses));
}

main().catch(console.error);
