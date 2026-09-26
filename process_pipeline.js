const fs = require('fs');
const path = require('path');

// Robust CSV parser
function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
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

console.log('Loading datasets...');
const histContent = fs.readFileSync('rainfall in india 1901-2015.csv', 'utf8');
const distContent = fs.readFileSync('district_wise_rainfall_normal.csv', 'utf8');

const hist = parseCSV(histContent);
const dist = parseCSV(distContent);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// 1. CLEAN HISTORICAL DATASET
console.log('Cleaning historical dataset...');
// Group rows by subdivision
const subRows = {};
hist.rows.forEach(r => {
  const sub = r.SUBDIVISION;
  if (!subRows[sub]) subRows[sub] = [];
  subRows[sub].push(r);
});

// Compute monthly mean for each subdivision
const subMonthlyMeans = {};
for (const sub in subRows) {
  subMonthlyMeans[sub] = {};
  MONTHS.forEach(m => {
    let sum = 0, count = 0;
    subRows[sub].forEach(r => {
      const val = parseFloat(r[m]);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    subMonthlyMeans[sub][m] = count > 0 ? (sum / count) : 0;
  });
}

// Clean and impute
const cleanedHistRows = [];
let imputedCount = 0;

for (const sub in subRows) {
  // Sort rows by year ascending
  subRows[sub].sort((a, b) => parseInt(a.YEAR) - parseInt(b.YEAR));
  
  subRows[sub].forEach(r => {
    const cleaned = {
      SUBDIVISION: r.SUBDIVISION,
      YEAR: parseInt(r.YEAR)
    };
    
    MONTHS.forEach(m => {
      let val = parseFloat(r[m]);
      if (isNaN(val)) {
        val = Number(subMonthlyMeans[r.SUBDIVISION][m].toFixed(2));
        imputedCount++;
      }
      cleaned[m] = Number(val.toFixed(2));
    });
    
    // Seasonal recalculations
    cleaned['Jan-Feb'] = Number((cleaned.JAN + cleaned.FEB).toFixed(2));
    cleaned['Mar-May'] = Number((cleaned.MAR + cleaned.APR + cleaned.MAY).toFixed(2));
    cleaned['Jun-Sep'] = Number((cleaned.JUN + cleaned.JUL + cleaned.AUG + cleaned.SEP).toFixed(2));
    cleaned['Oct-Dec'] = Number((cleaned.OCT + cleaned.NOV + cleaned.DEC).toFixed(2));
    cleaned['ANNUAL'] = Number((cleaned['Jan-Feb'] + cleaned['Mar-May'] + cleaned['Jun-Sep'] + cleaned['Oct-Dec']).toFixed(2));
    
    cleanedHistRows.push(cleaned);
  });
}
console.log(`Cleaned ${cleanedHistRows.length} historical records (Imputed ${imputedCount} missing monthly data points).`);

// Write cleaned CSV
const cleanedHeaders = ['SUBDIVISION', 'YEAR', ...MONTHS, 'ANNUAL', 'Jan-Feb', 'Mar-May', 'Jun-Sep', 'Oct-Dec'];
const cleanedHistCSV = [
  cleanedHeaders.join(','),
  ...cleanedHistRows.map(r => cleanedHeaders.map(h => r[h]).join(','))
].join('\n');
fs.writeFileSync('cleaned_rainfall_in_india_1901_2015.csv', cleanedHistCSV);
console.log('Saved cleaned_rainfall_in_india_1901_2015.csv');

// 2. CLEAN DISTRICT NORMALS DATASET
console.log('Processing district normals...');
const cleanedDistRows = dist.rows.map(r => {
  const row = {
    STATE_UT_NAME: r.STATE_UT_NAME.trim(),
    DISTRICT: r.DISTRICT.trim()
  };
  MONTHS.forEach(m => row[m] = parseFloat(r[m]) || 0);
  row['Jan-Feb'] = parseFloat(r['Jan-Feb']) || (row.JAN + row.FEB);
  row['Mar-May'] = parseFloat(r['Mar-May']) || (row.MAR + row.APR + row.MAY);
  row['Jun-Sep'] = parseFloat(r['Jun-Sep']) || (row.JUN + row.JUL + row.AUG + row.SEP);
  row['Oct-Dec'] = parseFloat(r['Oct-Dec']) || (row.OCT + row.NOV + row.DEC);
  row['ANNUAL'] = parseFloat(r['ANNUAL']) || (row['Jan-Feb'] + row['Mar-May'] + row['Jun-Sep'] + row['Oct-Dec']);
  return row;
});

const distHeaders = ['STATE_UT_NAME', 'DISTRICT', ...MONTHS, 'ANNUAL', 'Jan-Feb', 'Mar-May', 'Jun-Sep', 'Oct-Dec'];
const cleanedDistCSV = [
  distHeaders.join(','),
  ...cleanedDistRows.map(r => distHeaders.map(h => r[h]).join(','))
].join('\n');
fs.writeFileSync('cleaned_district_wise_rainfall_normal.csv', cleanedDistCSV);
console.log('Saved cleaned_district_wise_rainfall_normal.csv');

// 3. AGGREGATE BY STATE (From District Normals)
const stateMap = {};
cleanedDistRows.forEach(r => {
  const st = r.STATE_UT_NAME;
  if (!stateMap[st]) {
    stateMap[st] = {
      state: st,
      districts: [],
      annuals: [],
      winter: [],
      preMonsoon: [],
      monsoon: [],
      postMonsoon: []
    };
  }
  stateMap[st].districts.push({ name: r.DISTRICT, annual: r.ANNUAL });
  stateMap[st].annuals.push(r.ANNUAL);
  stateMap[st].winter.push(r['Jan-Feb']);
  stateMap[st].preMonsoon.push(r['Mar-May']);
  stateMap[st].monsoon.push(r['Jun-Sep']);
  stateMap[st].postMonsoon.push(r['Oct-Dec']);
});

const stateStats = [];
for (const st in stateMap) {
  const item = stateMap[st];
  const count = item.annuals.length;
  const avgAnnual = Number((item.annuals.reduce((a,b)=>a+b, 0) / count).toFixed(2));
  const avgWinter = Number((item.winter.reduce((a,b)=>a+b, 0) / count).toFixed(2));
  const avgPreMonsoon = Number((item.preMonsoon.reduce((a,b)=>a+b, 0) / count).toFixed(2));
  const avgMonsoon = Number((item.monsoon.reduce((a,b)=>a+b, 0) / count).toFixed(2));
  const avgPostMonsoon = Number((item.postMonsoon.reduce((a,b)=>a+b, 0) / count).toFixed(2));
  const monsoonPct = Number(((avgMonsoon / avgAnnual) * 100).toFixed(1));
  
  // Sort districts
  item.districts.sort((a,b) => a.annual - b.annual);
  const driestDist = item.districts[0];
  const wettestDist = item.districts[item.districts.length - 1];
  
  stateStats.push({
    state: st,
    districtCount: count,
    avgAnnual,
    avgWinter,
    avgPreMonsoon,
    avgMonsoon,
    avgPostMonsoon,
    monsoonPct,
    driestDistrict: `${driestDist.name} (${driestDist.annual} mm)`,
    wettestDistrict: `${wettestDist.name} (${wettestDist.annual} mm)`
  });
}
stateStats.sort((a,b) => b.avgAnnual - a.avgAnnual);

// 4. SUBDIVISION HISTORICAL ANALYSIS & PREDICTION
const subMap = {};
cleanedHistRows.forEach(r => {
  if (!subMap[r.SUBDIVISION]) subMap[r.SUBDIVISION] = [];
  subMap[r.SUBDIVISION].push(r);
});

const subStats = [];
const subTimeSeries = {};

for (const sub in subMap) {
  const rows = subMap[sub];
  const n = rows.length;
  
  const annuals = rows.map(r => r.ANNUAL);
  const years = rows.map(r => r.YEAR);
  
  // Averages & stats
  const avgAnnual = Number((annuals.reduce((a,b)=>a+b,0) / n).toFixed(2));
  const avgWinter = Number((rows.map(r=>r['Jan-Feb']).reduce((a,b)=>a+b,0) / n).toFixed(2));
  const avgPreMonsoon = Number((rows.map(r=>r['Mar-May']).reduce((a,b)=>a+b,0) / n).toFixed(2));
  const avgMonsoon = Number((rows.map(r=>r['Jun-Sep']).reduce((a,b)=>a+b,0) / n).toFixed(2));
  const avgPostMonsoon = Number((rows.map(r=>r['Oct-Dec']).reduce((a,b)=>a+b,0) / n).toFixed(2));
  const monsoonPct = Number(((avgMonsoon / avgAnnual) * 100).toFixed(1));
  
  // Min & Max
  let minVal = Infinity, minYear = null;
  let maxVal = -Infinity, maxYear = null;
  rows.forEach(r => {
    if (r.ANNUAL < minVal) { minVal = r.ANNUAL; minYear = r.YEAR; }
    if (r.ANNUAL > maxVal) { maxVal = r.ANNUAL; maxYear = r.YEAR; }
  });
  
  // Standard deviation & CV
  const variance = annuals.reduce((acc, val) => acc + Math.pow(val - avgAnnual, 2), 0) / n;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));
  const cvPct = Number(((stdDev / avgAnnual) * 100).toFixed(1)); // Coefficient of Variation
  
  // Linear Regression: Year (x) vs Annual (y)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const x = years[i];
    const y = annuals[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Pearson r and R2
  const numerator = (n * sumXY - sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const rCoeff = denominator !== 0 ? numerator / denominator : 0;
  const rSquared = Number(Math.pow(rCoeff, 2).toFixed(4));
  const slopeVal = Number(slope.toFixed(3)); // mm per year
  const totalTrendChange = Number((slope * (years[n-1] - years[0])).toFixed(1));
  
  // Trend classification
  let trendClass = 'Stable';
  if (slopeVal > 0.5) trendClass = 'Increasing';
  else if (slopeVal < -0.5) trendClass = 'Decreasing';
  
  // Moving averages calculation for series
  const ma5Series = [];
  const ma10Series = [];
  const trendSeries = [];
  
  for (let i = 0; i < n; i++) {
    trendSeries.push(Number((slope * years[i] + intercept).toFixed(2)));
    
    // 5-yr MA
    if (i >= 4) {
      const slice5 = annuals.slice(i - 4, i + 1);
      ma5Series.push(Number((slice5.reduce((a,b)=>a+b,0) / 5).toFixed(2)));
    } else {
      ma5Series.push(null);
    }
    
    // 10-yr MA
    if (i >= 9) {
      const slice10 = annuals.slice(i - 9, i + 1);
      ma10Series.push(Number((slice10.reduce((a,b)=>a+b,0) / 10).toFixed(2)));
    } else {
      ma10Series.push(null);
    }
  }
  
  // PREDICTIONS FOR NEXT YEAR (2016)
  const nextYear = 2016;
  const predLinear = Number((slope * nextYear + intercept).toFixed(2));
  
  // 5-year MA prediction (average of last 5 years: 2011 to 2015)
  const last5Years = annuals.slice(n - 5);
  const predMA5 = Number((last5Years.reduce((a,b)=>a+b,0) / 5).toFixed(2));
  
  // 10-year MA prediction (average of last 10 years: 2006 to 2015)
  const last10Years = annuals.slice(n - 10);
  const predMA10 = Number((last10Years.reduce((a,b)=>a+b,0) / 10).toFixed(2));
  
  // Backtest RMSE comparison across historical series
  let sseLinear = 0;
  for (let i = 0; i < n; i++) {
    sseLinear += Math.pow(annuals[i] - (slope * years[i] + intercept), 2);
  }
  const rmseLinear = Number(Math.sqrt(sseLinear / n).toFixed(2));
  
  let sseMA5 = 0, countMA5 = 0;
  for (let i = 5; i < n; i++) {
    // 1-step ahead prediction using previous 5 years
    const prev5 = annuals.slice(i - 5, i);
    const forecast = prev5.reduce((a,b)=>a+b,0) / 5;
    sseMA5 += Math.pow(annuals[i] - forecast, 2);
    countMA5++;
  }
  const rmseMA5 = Number(Math.sqrt(sseMA5 / countMA5).toFixed(2));
  
  let sseMA10 = 0, countMA10 = 0;
  for (let i = 10; i < n; i++) {
    // 1-step ahead prediction using previous 10 years
    const prev10 = annuals.slice(i - 10, i);
    const forecast = prev10.reduce((a,b)=>a+b,0) / 10;
    sseMA10 += Math.pow(annuals[i] - forecast, 2);
    countMA10++;
  }
  const rmseMA10 = Number(Math.sqrt(sseMA10 / countMA10).toFixed(2));
  
  // Best model recommendation
  let bestModel = 'Linear Regression';
  let bestRMSE = rmseLinear;
  if (rmseMA5 < bestRMSE) { bestModel = '5-Yr Moving Average'; bestRMSE = rmseMA5; }
  if (rmseMA10 < bestRMSE) { bestModel = '10-Yr Moving Average'; bestRMSE = rmseMA10; }
  
  subStats.push({
    subdivision: sub,
    recordCount: n,
    startYear: years[0],
    endYear: years[n-1],
    avgAnnual,
    avgWinter,
    avgPreMonsoon,
    avgMonsoon,
    avgPostMonsoon,
    monsoonPct,
    minVal,
    minYear,
    maxVal,
    maxYear,
    stdDev,
    cvPct,
    slope: slopeVal,
    intercept: Number(intercept.toFixed(2)),
    rSquared,
    totalTrendChange,
    trendClass,
    predLinear,
    predMA5,
    predMA10,
    linearDeparturePct: Number((((predLinear - avgAnnual) / avgAnnual) * 100).toFixed(2)),
    ma5DeparturePct: Number((((predMA5 - avgAnnual) / avgAnnual) * 100).toFixed(2)),
    ma10DeparturePct: Number((((predMA10 - avgAnnual) / avgAnnual) * 100).toFixed(2)),
    rmseLinear,
    rmseMA5,
    rmseMA10,
    bestModel
  });
  
  subTimeSeries[sub] = {
    years,
    annual: annuals,
    winter: rows.map(r => r['Jan-Feb']),
    preMonsoon: rows.map(r => r['Mar-May']),
    monsoon: rows.map(r => r['Jun-Sep']),
    postMonsoon: rows.map(r => r['Oct-Dec']),
    trendline: trendSeries,
    ma5: ma5Series,
    ma10: ma10Series
  };
}

// Sort subdivisions by average annual rainfall descending
subStats.sort((a,b) => b.avgAnnual - a.avgAnnual);

// Wettest & Driest
const wettestSub = subStats[0];
const driestSub = subStats[subStats.length - 1];

const wettestState = stateStats[0];
const driestState = stateStats[stateStats.length - 1];

// National aggregates
const nationalAvgAnnual = Number((subStats.reduce((a,b)=>a+b.avgAnnual, 0) / subStats.length).toFixed(2));
const nationalAvgMonsoonPct = Number((subStats.reduce((a,b)=>a+b.monsoonPct, 0) / subStats.length).toFixed(1));

// Sort by Monsoon Dependency
const sortedByMonsoon = [...subStats].sort((a,b) => b.monsoonPct - a.monsoonPct);
const highestMonsoonDep = sortedByMonsoon[0];
const lowestMonsoonDep = sortedByMonsoon[sortedByMonsoon.length - 1];

// Trend summary counts
const trendCounts = {
  Increasing: subStats.filter(s => s.trendClass === 'Increasing').length,
  Decreasing: subStats.filter(s => s.trendClass === 'Decreasing').length,
  Stable: subStats.filter(s => s.trendClass === 'Stable').length
};

const finalData = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalSubdivisions: subStats.length,
    totalStates: stateStats.length,
    totalDistricts: cleanedDistRows.length,
    yearsCovered: "1901-2015",
    forecastYear: 2016
  },
  kpis: {
    nationalAvgAnnual,
    nationalAvgMonsoonPct,
    wettestSubdivision: { name: wettestSub.subdivision, value: wettestSub.avgAnnual },
    driestSubdivision: { name: driestSub.subdivision, value: driestSub.avgAnnual },
    wettestState: { name: wettestState.state, value: wettestState.avgAnnual },
    driestState: { name: driestState.state, value: driestState.avgAnnual },
    highestMonsoonDependency: { name: highestMonsoonDep.subdivision, pct: highestMonsoonDep.monsoonPct },
    lowestMonsoonDependency: { name: lowestMonsoonDep.subdivision, pct: lowestMonsoonDep.monsoonPct },
    trendCounts
  },
  subdivisions: subStats,
  states: stateStats,
  timeSeries: subTimeSeries
};

fs.writeFileSync('data_processed.json', JSON.stringify(finalData, null, 2));

// Also generate a JS bundle file that can be loaded with <script src="data.js">
// This bypasses file:// CORS restrictions completely!
const jsBundle = `window.RAINFALL_DATA = ${JSON.stringify(finalData)};`;
fs.writeFileSync('data.js', jsBundle);

console.log('--- Summary Findings ---');
console.log('National Average Annual Rainfall:', nationalAvgAnnual, 'mm');
console.log(`Wettest Subdivision: ${wettestSub.subdivision} (${wettestSub.avgAnnual} mm)`);
console.log(`Driest Subdivision: ${driestSub.subdivision} (${driestSub.avgAnnual} mm)`);
console.log(`Highest Monsoon Dependency: ${highestMonsoonDep.subdivision} (${highestMonsoonDep.monsoonPct}%)`);
console.log(`Lowest Monsoon Dependency: ${lowestMonsoonDep.subdivision} (${lowestMonsoonDep.monsoonPct}% - Note: Post-monsoon contributes ${lowestMonsoonDep.avgPostMonsoon} mm)`);
console.log('Trends distribution:', trendCounts);
console.log('Processing complete! Output saved to data_processed.json and data.js');
