const fs = require('fs');

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle comma inside quotes if any, or simple split if no quotes
    const values = [];
    let inQuotes = false;
    let curVal = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(curVal.trim().replace(/^"|"$/g, ''));
        curVal = '';
      } else {
        curVal += ch;
      }
    }
    values.push(curVal.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

console.log('--- Inspecting rainfall in india 1901-2015.csv ---');
const histContent = fs.readFileSync('rainfall in india 1901-2015.csv', 'utf8');
const histData = parseCSV(histContent);
console.log('Total rows:', histData.rows.length);
console.log('Headers:', histData.headers);

// Check NA counts per column
const histNAs = {};
histData.headers.forEach(h => histNAs[h] = 0);
histData.rows.forEach(r => {
  histData.headers.forEach(h => {
    if (r[h] === 'NA' || r[h] === '' || isNaN(parseFloat(r[h])) && h !== 'SUBDIVISION' && h !== 'YEAR') {
      histNAs[h]++;
    }
  });
});
console.log('Historical dataset missing values:', histNAs);

const subdivisions = [...new Set(histData.rows.map(r => r.SUBDIVISION))];
console.log('Subdivisions count:', subdivisions.length);
console.log('Subdivisions:', subdivisions);

const years = [...new Set(histData.rows.map(r => parseInt(r.YEAR)))].sort((a,b)=>a-b);
console.log('Year range:', years[0], 'to', years[years.length - 1]);

console.log('\n--- Inspecting district_wise_rainfall_normal.csv ---');
const distContent = fs.readFileSync('district_wise_rainfall_normal.csv', 'utf8');
const distData = parseCSV(distContent);
console.log('Total rows:', distData.rows.length);
console.log('Headers:', distData.headers);

const distNAs = {};
distData.headers.forEach(h => distNAs[h] = 0);
distData.rows.forEach(r => {
  distData.headers.forEach(h => {
    if (r[h] === 'NA' || r[h] === '' || isNaN(parseFloat(r[h])) && h !== 'STATE_UT_NAME' && h !== 'DISTRICT') {
      distNAs[h]++;
    }
  });
});
console.log('District dataset missing values:', distNAs);

const states = [...new Set(distData.rows.map(r => r.STATE_UT_NAME))];
console.log('States/UTs count:', states.length);
console.log('States/UTs:', states);
