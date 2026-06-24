const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = "C:\\Users\\jccalderon\\OneDrive - Universidad Tecnologica del Peru\\Documentos\\DATA_OTM\\Almacén\\Articulos - almacén.xlsx";

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get data as JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length > 0) {
    const headers = data[0];
    console.log("Headers:", headers);
    console.log("First 3 data rows:");
    for (let i = 1; i < Math.min(data.length, 4); i++) {
        console.log(data[i]);
    }
    
    // Save a clean JSON version
    const cleanData = XLSX.utils.sheet_to_json(worksheet);
    fs.writeFileSync('src/lib/mockInventoryData.json', JSON.stringify(cleanData, null, 2));
    console.log(`Saved ${cleanData.length} records to src/lib/mockInventoryData.json`);
  } else {
    console.log("Empty sheet");
  }
} catch (e) {
  console.error("Error:", e.message);
}
