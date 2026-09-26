const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data_processed.json', 'utf8'));

const headers = [
  'Region_Type',
  'Region_Name',
  'Historical_Avg_Annual_mm',
  'Linear_Regression_Pred_2016_mm',
  'Linear_Departure_Pct',
  'Moving_Avg_5Yr_Pred_2016_mm',
  'MA5_Departure_Pct',
  'Moving_Avg_10Yr_Pred_2016_mm',
  'MA10_Departure_Pct',
  'Trend_Classification',
  'Slope_mm_per_year',
  'R_Squared',
  'RMSE_Linear_mm',
  'RMSE_MA5_mm',
  'RMSE_MA10_mm',
  'Recommended_Best_Model',
  'Winter_JanFeb_mm',
  'PreMonsoon_MarMay_mm',
  'Monsoon_JunSep_mm',
  'PostMonsoon_OctDec_mm',
  'Monsoon_Dependency_Pct'
];

const rows = [headers.join(',')];

data.subdivisions.forEach(s => {
  rows.push([
    'Subdivision',
    `"${s.subdivision}"`,
    s.avgAnnual,
    s.predLinear,
    s.linearDeparturePct,
    s.predMA5,
    s.ma5DeparturePct,
    s.predMA10,
    s.ma10DeparturePct,
    s.trendClass,
    s.slope,
    s.rSquared,
    s.rmseLinear,
    s.rmseMA5,
    s.rmseMA10,
    `"${s.bestModel}"`,
    s.avgWinter,
    s.avgPreMonsoon,
    s.avgMonsoon,
    s.avgPostMonsoon,
    s.monsoonPct
  ].join(','));
});

data.states.forEach(s => {
  rows.push([
    'State',
    `"${s.state}"`,
    s.avgAnnual,
    s.predLinear || '',
    s.linearDeparturePct || '',
    s.predMA5 || '',
    s.ma5DeparturePct || '',
    s.predMA10 || '',
    s.ma10DeparturePct || '',
    s.trendClass || '',
    s.slope || '',
    s.rSquared || '',
    s.rmseLinear || '',
    s.rmseMA5 || '',
    s.rmseMA10 || '',
    `"${s.bestModel || ''}"`,
    s.avgWinter,
    s.avgPreMonsoon,
    s.avgMonsoon,
    s.avgPostMonsoon,
    s.monsoonPct
  ].join(','));
});

fs.writeFileSync('prediction_results_summary.csv', rows.join('\n'));
console.log('Saved prediction_results_summary.csv with', rows.length - 1, 'records.');
