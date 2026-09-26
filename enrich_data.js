const fs = require('fs');

// Approximate geographic centroids for the 36 IMD Subdivisions
const SUBDIVISION_COORDINATES = {
  'ANDAMAN & NICOBAR ISLANDS': { lat: 11.7401, lon: 92.6586 },
  'ARUNACHAL PRADESH': { lat: 28.2180, lon: 94.7278 },
  'ASSAM & MEGHALAYA': { lat: 26.2006, lon: 92.9376 },
  'NAGA MANI MIZO TRIPURA': { lat: 24.6637, lon: 93.9063 },
  'SUB HIMALAYAN WEST BENGAL & SIKKIM': { lat: 26.7271, lon: 88.3953 },
  'GANGETIC WEST BENGAL': { lat: 22.9868, lon: 87.8550 },
  'ORISSA': { lat: 20.9517, lon: 85.0985 },
  'JHARKHAND': { lat: 23.6102, lon: 85.2799 },
  'BIHAR': { lat: 25.0961, lon: 85.3131 },
  'EAST UTTAR PRADESH': { lat: 26.5000, lon: 82.5000 },
  'WEST UTTAR PRADESH': { lat: 28.0000, lon: 78.5000 },
  'UTTARAKHAND': { lat: 30.0668, lon: 79.0193 },
  'HARYANA DELHI & CHANDIGARH': { lat: 29.0588, lon: 76.0856 },
  'PUNJAB': { lat: 31.1471, lon: 75.3412 },
  'HIMACHAL PRADESH': { lat: 31.1048, lon: 77.1734 },
  'JAMMU & KASHMIR': { lat: 33.7782, lon: 76.5762 },
  'WEST RAJASTHAN': { lat: 26.5000, lon: 71.5000 },
  'EAST RAJASTHAN': { lat: 26.0000, lon: 75.8000 },
  'WEST MADHYA PRADESH': { lat: 23.0000, lon: 76.5000 },
  'EAST MADHYA PRADESH': { lat: 23.5000, lon: 81.0000 },
  'GUJARAT REGION': { lat: 22.2587, lon: 72.8500 },
  'SAURASHTRA & KUTCH': { lat: 22.3039, lon: 70.8022 },
  'KONKAN & GOA': { lat: 16.0000, lon: 73.8000 },
  'MADHYA MAHARASHTRA': { lat: 18.5204, lon: 74.5000 },
  'MATATHWADA': { lat: 19.5000, lon: 76.5000 },
  'VIDARBHA': { lat: 21.0000, lon: 79.0000 },
  'CHHATTISGARH': { lat: 21.2787, lon: 81.8661 },
  'COASTAL ANDHRA PRADESH': { lat: 16.5000, lon: 81.5000 },
  'TELANGANA': { lat: 18.1124, lon: 79.0193 },
  'RAYALSEEMA': { lat: 14.5000, lon: 78.5000 },
  'TAMIL NADU': { lat: 11.1271, lon: 78.6569 },
  'COASTAL KARNATAKA': { lat: 14.0000, lon: 74.5000 },
  'NORTH INTERIOR KARNATAKA': { lat: 16.0000, lon: 75.5000 },
  'SOUTH INTERIOR KARNATAKA': { lat: 13.0000, lon: 76.5000 },
  'KERALA': { lat: 10.8505, lon: 76.2711 },
  'LAKSHADWEEP': { lat: 10.5667, lon: 72.6417 }
};

// State coordinates
const STATE_COORDINATES = {
  'ANDAMAN And NICOBAR ISLANDS': { lat: 11.7401, lon: 92.6586 },
  'ARUNACHAL PRADESH': { lat: 28.2180, lon: 94.7278 },
  'ASSAM': { lat: 26.2006, lon: 92.9376 },
  'MEGHALAYA': { lat: 25.4670, lon: 91.3662 },
  'MANIPUR': { lat: 24.6637, lon: 93.9063 },
  'MIZORAM': { lat: 23.1645, lon: 92.9376 },
  'NAGALAND': { lat: 26.1584, lon: 94.5624 },
  'TRIPURA': { lat: 23.9408, lon: 91.9882 },
  'WEST BENGAL': { lat: 22.9868, lon: 87.8550 },
  'SIKKIM': { lat: 27.5330, lon: 88.5122 },
  'ORISSA': { lat: 20.9517, lon: 85.0985 },
  'JHARKHAND': { lat: 23.6102, lon: 85.2799 },
  'BIHAR': { lat: 25.0961, lon: 85.3131 },
  'UTTAR PRADESH': { lat: 26.8467, lon: 80.9462 },
  'UTTARANCHAL': { lat: 30.0668, lon: 79.0193 },
  'HARYANA': { lat: 29.0588, lon: 76.0856 },
  'CHANDIGARH': { lat: 30.7333, lon: 76.7794 },
  'DELHI': { lat: 28.7041, lon: 77.1025 },
  'PUNJAB': { lat: 31.1471, lon: 75.3412 },
  'HIMACHAL': { lat: 31.1048, lon: 77.1734 },
  'JAMMU AND KASHMIR': { lat: 33.7782, lon: 76.5762 },
  'RAJASTHAN': { lat: 27.0238, lon: 74.2179 },
  'MADHYA PRADESH': { lat: 22.9734, lon: 78.6569 },
  'GUJARAT': { lat: 22.2587, lon: 71.1924 },
  'DADAR NAGAR HAVELI': { lat: 20.1809, lon: 73.0169 },
  'DAMAN AND DUI': { lat: 20.4283, lon: 72.8397 },
  'MAHARASHTRA': { lat: 19.7515, lon: 75.7139 },
  'GOA': { lat: 15.2993, lon: 74.1240 },
  'CHATISGARH': { lat: 21.2787, lon: 81.8661 },
  'ANDHRA PRADESH': { lat: 15.9129, lon: 79.7400 },
  'TAMIL NADU': { lat: 11.1271, lon: 78.6569 },
  'PONDICHERRY': { lat: 11.9416, lon: 79.8083 },
  'KARNATAKA': { lat: 15.3173, lon: 75.7139 },
  'KERALA': { lat: 10.8505, lon: 76.2711 },
  'LAKSHADWEEP': { lat: 10.5667, lon: 72.6417 }
};

const data = JSON.parse(fs.readFileSync('data_processed.json', 'utf8'));

// Attach coordinates
data.subdivisions.forEach(s => {
  const coord = SUBDIVISION_COORDINATES[s.subdivision] || { lat: 20.5937, lon: 78.9629 };
  s.lat = coord.lat;
  s.lon = coord.lon;
});

data.states.forEach(s => {
  const coord = STATE_COORDINATES[s.state] || { lat: 20.5937, lon: 78.9629 };
  s.lat = coord.lat;
  s.lon = coord.lon;
});

// Also create state-level time series and predictions by aggregating component subdivisions
const SUB_TO_STATE_MAP = {
  'ANDAMAN & NICOBAR ISLANDS': 'ANDAMAN And NICOBAR ISLANDS',
  'ARUNACHAL PRADESH': 'ARUNACHAL PRADESH',
  'ASSAM & MEGHALAYA': 'ASSAM', // also MEGHALAYA
  'NAGA MANI MIZO TRIPURA': 'MANIPUR',
  'SUB HIMALAYAN WEST BENGAL & SIKKIM': 'WEST BENGAL',
  'GANGETIC WEST BENGAL': 'WEST BENGAL',
  'ORISSA': 'ORISSA',
  'JHARKHAND': 'JHARKHAND',
  'BIHAR': 'BIHAR',
  'EAST UTTAR PRADESH': 'UTTAR PRADESH',
  'WEST UTTAR PRADESH': 'UTTAR PRADESH',
  'UTTARAKHAND': 'UTTARANCHAL',
  'HARYANA DELHI & CHANDIGARH': 'HARYANA',
  'PUNJAB': 'PUNJAB',
  'HIMACHAL PRADESH': 'HIMACHAL',
  'JAMMU & KASHMIR': 'JAMMU AND KASHMIR',
  'WEST RAJASTHAN': 'RAJASTHAN',
  'EAST RAJASTHAN': 'RAJASTHAN',
  'WEST MADHYA PRADESH': 'MADHYA PRADESH',
  'EAST MADHYA PRADESH': 'MADHYA PRADESH',
  'GUJARAT REGION': 'GUJARAT',
  'SAURASHTRA & KUTCH': 'GUJARAT',
  'KONKAN & GOA': 'GOA',
  'MADHYA MAHARASHTRA': 'MAHARASHTRA',
  'MATATHWADA': 'MAHARASHTRA',
  'VIDARBHA': 'MAHARASHTRA',
  'CHHATTISGARH': 'CHATISGARH',
  'COASTAL ANDHRA PRADESH': 'ANDHRA PRADESH',
  'TELANGANA': 'TELANGANA',
  'RAYALSEEMA': 'ANDHRA PRADESH',
  'TAMIL NADU': 'TAMIL NADU',
  'COASTAL KARNATAKA': 'KARNATAKA',
  'NORTH INTERIOR KARNATAKA': 'KARNATAKA',
  'SOUTH INTERIOR KARNATAKA': 'KARNATAKA',
  'KERALA': 'KERALA',
  'LAKSHADWEEP': 'LAKSHADWEEP'
};

// Build state historical time series by averaging their component subdivisions
const stateSubdivisions = {};
for (const sub in SUB_TO_STATE_MAP) {
  const st = SUB_TO_STATE_MAP[sub];
  if (!stateSubdivisions[st]) stateSubdivisions[st] = [];
  stateSubdivisions[st].push(sub);
}

// Add MEGHALAYA mapped from ASSAM & MEGHALAYA
stateSubdivisions['MEGHALAYA'] = ['ASSAM & MEGHALAYA'];
stateSubdivisions['SIKKIM'] = ['SUB HIMALAYAN WEST BENGAL & SIKKIM'];
stateSubdivisions['DELHI'] = ['HARYANA DELHI & CHANDIGARH'];
stateSubdivisions['CHANDIGARH'] = ['HARYANA DELHI & CHANDIGARH'];
stateSubdivisions['TRIPURA'] = ['NAGA MANI MIZO TRIPURA'];
stateSubdivisions['NAGALAND'] = ['NAGA MANI MIZO TRIPURA'];
stateSubdivisions['MIZORAM'] = ['NAGA MANI MIZO TRIPURA'];
stateSubdivisions['DADAR NAGAR HAVELI'] = ['GUJARAT REGION'];
stateSubdivisions['DAMAN AND DUI'] = ['GUJARAT REGION'];
stateSubdivisions['PONDICHERRY'] = ['TAMIL NADU'];

const stateTimeSeries = {};
const statePredictions = [];

data.states.forEach(stItem => {
  const st = stItem.state;
  const subs = stateSubdivisions[st] || [];
  if (subs.length > 0) {
    const years = data.timeSeries[subs[0]].years;
    const n = years.length;
    const annuals = [];
    const winters = [];
    const preMons = [];
    const mons = [];
    const postMons = [];
    
    for (let i = 0; i < n; i++) {
      let sumAnn = 0, sumWin = 0, sumPre = 0, sumMon = 0, sumPost = 0, cnt = 0;
      subs.forEach(s => {
        if (data.timeSeries[s] && data.timeSeries[s].annual[i] !== undefined) {
          sumAnn += data.timeSeries[s].annual[i];
          sumWin += data.timeSeries[s].winter[i];
          sumPre += data.timeSeries[s].preMonsoon[i];
          sumMon += data.timeSeries[s].monsoon[i];
          sumPost += data.timeSeries[s].postMonsoon[i];
          cnt++;
        }
      });
      annuals.push(Number((sumAnn / cnt).toFixed(2)));
      winters.push(Number((sumWin / cnt).toFixed(2)));
      preMons.push(Number((sumPre / cnt).toFixed(2)));
      mons.push(Number((sumMon / cnt).toFixed(2)));
      postMons.push(Number((sumPost / cnt).toFixed(2)));
    }
    
    // Stats and models
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const x = years[i];
      const y = annuals[i];
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const numerator = (n * sumXY - sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const rCoeff = denominator !== 0 ? numerator / denominator : 0;
    const rSquared = Number(Math.pow(rCoeff, 2).toFixed(4));
    const slopeVal = Number(slope.toFixed(3));
    
    let trendClass = 'Stable';
    if (slopeVal > 0.5) trendClass = 'Increasing';
    else if (slopeVal < -0.5) trendClass = 'Decreasing';
    
    const ma5Series = [];
    const ma10Series = [];
    const trendSeries = [];
    for (let i = 0; i < n; i++) {
      trendSeries.push(Number((slope * years[i] + intercept).toFixed(2)));
      if (i >= 4) {
        const sl5 = annuals.slice(i-4, i+1);
        ma5Series.push(Number((sl5.reduce((a,b)=>a+b,0)/5).toFixed(2)));
      } else ma5Series.push(null);
      if (i >= 9) {
        const sl10 = annuals.slice(i-9, i+1);
        ma10Series.push(Number((sl10.reduce((a,b)=>a+b,0)/10).toFixed(2)));
      } else ma10Series.push(null);
    }
    
    const nextYear = 2016;
    const predLinear = Number((slope * nextYear + intercept).toFixed(2));
    const predMA5 = Number((annuals.slice(n-5).reduce((a,b)=>a+b,0)/5).toFixed(2));
    const predMA10 = Number((annuals.slice(n-10).reduce((a,b)=>a+b,0)/10).toFixed(2));
    const avgAnn = Number((annuals.reduce((a,b)=>a+b,0)/n).toFixed(2));
    
    // RMSE
    let sseLin = 0;
    for (let i = 0; i < n; i++) sseLin += Math.pow(annuals[i] - (slope * years[i] + intercept), 2);
    const rmseLinear = Number(Math.sqrt(sseLin / n).toFixed(2));
    
    let sse5 = 0, cnt5 = 0;
    for (let i = 5; i < n; i++) {
      const pred = annuals.slice(i-5, i).reduce((a,b)=>a+b,0) / 5;
      sse5 += Math.pow(annuals[i] - pred, 2);
      cnt5++;
    }
    const rmseMA5 = Number(Math.sqrt(sse5 / cnt5).toFixed(2));
    
    let sse10 = 0, cnt10 = 0;
    for (let i = 10; i < n; i++) {
      const pred = annuals.slice(i-10, i).reduce((a,b)=>a+b,0) / 10;
      sse10 += Math.pow(annuals[i] - pred, 2);
      cnt10++;
    }
    const rmseMA10 = Number(Math.sqrt(sse10 / cnt10).toFixed(2));
    
    let bestModel = 'Linear Regression';
    let bestRMSE = rmseLinear;
    if (rmseMA5 < bestRMSE) { bestModel = '5-Yr Moving Average'; bestRMSE = rmseMA5; }
    if (rmseMA10 < bestRMSE) { bestModel = '10-Yr Moving Average'; bestRMSE = rmseMA10; }
    
    stItem.historicalYears = years;
    stItem.histAvgAnnual = avgAnn;
    stItem.slope = slopeVal;
    stItem.intercept = Number(intercept.toFixed(2));
    stItem.rSquared = rSquared;
    stItem.trendClass = trendClass;
    stItem.predLinear = predLinear;
    stItem.predMA5 = predMA5;
    stItem.predMA10 = predMA10;
    stItem.linearDeparturePct = Number((((predLinear - avgAnn)/avgAnn)*100).toFixed(2));
    stItem.ma5DeparturePct = Number((((predMA5 - avgAnn)/avgAnn)*100).toFixed(2));
    stItem.ma10DeparturePct = Number((((predMA10 - avgAnn)/avgAnn)*100).toFixed(2));
    stItem.rmseLinear = rmseLinear;
    stItem.rmseMA5 = rmseMA5;
    stItem.rmseMA10 = rmseMA10;
    stItem.bestModel = bestModel;
    
    stateTimeSeries[st] = {
      years,
      annual: annuals,
      winter: winters,
      preMonsoon: preMons,
      monsoon: mons,
      postMonsoon: postMons,
      trendline: trendSeries,
      ma5: ma5Series,
      ma10: ma10Series
    };
  }
});

data.stateTimeSeries = stateTimeSeries;

fs.writeFileSync('data_processed.json', JSON.stringify(data, null, 2));
fs.writeFileSync('data.js', `window.RAINFALL_DATA = ${JSON.stringify(data)};`);

console.log('Enriched data_processed.json and data.js with coordinates and state-level historical models!');
