const XLSX = require('xlsx');

const filePath = 'epps_data.xlsx';
const wb = XLSX.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

const sheetName = 'Registro_EPPs';
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.log(`Sheet "${sheetName}" not found!`);
  process.exit(1);
}

const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows in Registro_EPPs:', data.length);
if (data.length > 0) {
  console.log('Headers:', Object.keys(data[0]));
  console.log('First row data:', JSON.stringify(data[0], null, 2));
  console.log('Second row data:', data[1] ? JSON.stringify(data[1], null, 2) : 'None');
} else {
  console.log('Sheet is empty or no JSON data could be extracted.');
}
