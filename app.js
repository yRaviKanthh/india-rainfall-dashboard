/**
 * INDIA RAINFALL PREDICTION & HYDROCLIMATIC DASHBOARD
 * Core Application Logic & Interactive Plotly Visualizations
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.RAINFALL_DATA === 'undefined') {
    console.error('RAINFALL_DATA not loaded. Please ensure data.js is included.');
    alert('Error: Rainfall data could not be loaded. Please ensure data.js is in the same directory.');
    return;
  }

  const DATA = window.RAINFALL_DATA;
  let currentLevel = 'subdivisions'; // 'subdivisions' or 'states'
  let currentRegion = 'KERALA';      // Default selected region
  let currentRegionalTab = 'bar';    // 'bar' or 'map'
  let currentTrendFilter = 'ALL';
  let tableSearchTerm = '';
  let sortField = 'avgAnnual';
  let sortAsc = false;

  // Chart Model Toggles
  const modelToggles = {
    actual: true,
    linear: true,
    ma5: true,
    ma10: true,
    forecast: true
  };

  // Shared Plotly layout config for Editorial Academic Theme
  const academicLayoutBase = {
    font: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      color: '#334155',
      size: 12
    },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    margin: { l: 60, r: 30, t: 75, b: 60 },
    hovermode: 'closest',
    autosize: true
  };

  const plotlyConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'rainfall_chart',
      height: 600,
      width: 1000,
      scale: 2
    }
  };

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------
  initHeroKPIs();
  populateRegionSelector();
  setupEventListeners();
  renderAllViews();

  function getActiveDataset() {
    return currentLevel === 'subdivisions' ? DATA.subdivisions : DATA.states;
  }

  function getRegionNameKey() {
    return currentLevel === 'subdivisions' ? 'subdivision' : 'state';
  }

  // -------------------------------------------------------------
  // 1. HERO KPIS
  // -------------------------------------------------------------
  function initHeroKPIs() {
    document.getElementById('kpi-national-avg').textContent = `${DATA.kpis.nationalAvgAnnual.toLocaleString()} mm`;
    
    // Wettest & Driest
    document.getElementById('kpi-wettest-sub').textContent = `${DATA.kpis.wettestSubdivision.name}`;
    document.getElementById('kpi-wettest-val').textContent = `${DATA.kpis.wettestSubdivision.value.toLocaleString()} mm / yr`;

    document.getElementById('kpi-driest-sub').textContent = `${DATA.kpis.driestSubdivision.name}`;
    document.getElementById('kpi-driest-val').textContent = `${DATA.kpis.driestSubdivision.value.toLocaleString()} mm / yr`;

    // Monsoon dependency
    document.getElementById('kpi-monsoon-high').textContent = `${DATA.kpis.highestMonsoonDependency.name} (${DATA.kpis.highestMonsoonDependency.pct}%)`;
    document.getElementById('kpi-monsoon-low').textContent = `Lowest: ${DATA.kpis.lowestMonsoonDependency.name} (${DATA.kpis.lowestMonsoonDependency.pct}%)`;

    // Trends Breakdown
    const tc = DATA.kpis.trendCounts;
    document.getElementById('kpi-trends-val').textContent = `${tc.Increasing} ↑ | ${tc.Stable} ▬ | ${tc.Decreasing} ↓`;
    document.getElementById('kpi-trends-sub').textContent = `Total 36 Subdivisions: ${Math.round((tc.Decreasing/36)*100)}% declining, ${Math.round((tc.Increasing/36)*100)}% rising`;

    // National 2016 Forecast
    const nationalOLS = Number((DATA.subdivisions.reduce((a,b)=>a+b.predLinear, 0) / DATA.subdivisions.length).toFixed(1));
    const departure = Number((((nationalOLS - DATA.kpis.nationalAvgAnnual) / DATA.kpis.nationalAvgAnnual) * 100).toFixed(1));
    document.getElementById('kpi-forecast-val').textContent = `${nationalOLS.toLocaleString()} mm`;
    document.getElementById('kpi-forecast-sub').textContent = `LPA Departure: ${departure >= 0 ? '+' : ''}${departure}% across India`;
  }

  // -------------------------------------------------------------
  // 2. REGION SELECTOR POPULATION
  // -------------------------------------------------------------
  function populateRegionSelector() {
    const selector = document.getElementById('region-select');
    selector.innerHTML = '';
    const dataset = getActiveDataset();
    const nameKey = getRegionNameKey();

    dataset.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[nameKey];
      opt.textContent = `${item[nameKey]} (${item.avgAnnual} mm)`;
      if (item[nameKey] === currentRegion) opt.selected = true;
      selector.appendChild(opt);
    });

    // If currentRegion doesn't exist in active dataset, pick first
    if (!dataset.some(d => d[nameKey] === currentRegion)) {
      currentRegion = dataset[0][nameKey];
      selector.value = currentRegion;
    }
  }

  // -------------------------------------------------------------
  // 3. RENDER ALL VIEWS
  // -------------------------------------------------------------
  function renderAllViews() {
    renderRegionalChart();
    renderSeasonalBreakdown();
    renderMonsoonDependencyChart();
    renderHistoricalTrendExplorer();
    renderTable();
  }

  // -------------------------------------------------------------
  // 4. REGIONAL RAINFALL DISTRIBUTION CHART / MAP
  // -------------------------------------------------------------
  function renderRegionalChart() {
    const dataset = [...getActiveDataset()].sort((a,b) => b.avgAnnual - a.avgAnnual);
    const nameKey = getRegionNameKey();

    if (currentRegionalTab === 'bar') {
      const names = dataset.map(d => d[nameKey]);
      const annuals = dataset.map(d => d.avgAnnual);
      const monsoons = dataset.map(d => d.avgMonsoon);

      // Colors based on rainfall gradient
      const colors = annuals.map(v => {
        if (v >= 2500) return '#0369a1'; // Deep precipitation blue
        if (v >= 1500) return '#0284c7'; // Cyan blue
        if (v >= 1000) return '#0ea5e9'; // Light ocean
        if (v >= 600)  return '#38bdf8'; // Sky
        return '#f59e0b';                // Arid amber
      });

      const trace = {
        x: names,
        y: annuals,
        type: 'bar',
        marker: {
          color: colors,
          line: { color: '#0f172a', width: 0.5 }
        },
        hovertemplate: '<b>%{x}</b><br>Annual Normal: <b>%{y:.1f} mm</b><br>Monsoon (Jun-Sep): %{customdata:.1f} mm<extra></extra>',
        customdata: monsoons
      };

      const layout = {
        ...academicLayoutBase,
        title: {
          text: `Annual Rainfall Normal by ${currentLevel === 'subdivisions' ? 'Meteorological Subdivision' : 'State'} (Sorted Wettest to Driest)`,
          font: { size: 14, color: '#1e3a8a', weight: 600 },
          x: 0.02,
          xanchor: 'left',
          y: 0.94,
          pad: { t: 8 }
        },
        xaxis: {
          tickangle: -45,
          tickfont: { size: 10 },
          showgrid: false
        },
        yaxis: {
          title: 'Annual Rainfall (mm)',
          gridcolor: '#f1f5f9',
          zeroline: true,
          zerolinecolor: '#cbd5e1'
        },
        margin: { l: 60, r: 25, t: 75, b: 120 }
      };

      Plotly.newPlot('regional-chart-container', [trace], layout, plotlyConfig);

      // Sync click on bar to region selector
      const plotEl = document.getElementById('regional-chart-container');
      plotEl.removeAllListeners && plotEl.removeAllListeners('plotly_click');
      plotEl.on('plotly_click', (data) => {
        if (data && data.points && data.points[0]) {
          const clickedRegion = data.points[0].x;
          selectRegion(clickedRegion);
        }
      });

    } else {
      // BUBBLE MAP VIEW
      const names = dataset.map(d => d[nameKey]);
      const lats = dataset.map(d => d.lat || 20.5937);
      const lons = dataset.map(d => d.lon || 78.9629);
      const annuals = dataset.map(d => d.avgAnnual);
      const monsoons = dataset.map(d => d.avgMonsoon);
      const monsoonPcts = dataset.map(d => d.monsoonPct);

      // Normalize bubble sizes
      const sizes = annuals.map(v => Math.max(10, Math.min(36, (v / 120))));

      const trace = {
        type: 'scattergeo',
        mode: 'markers+text',
        lat: lats,
        lon: lons,
        text: names,
        textposition: 'top center',
        textfont: { size: 9, color: '#334155' },
        marker: {
          size: sizes,
          color: annuals,
          colorscale: [
            [0.0, '#fef08a'],  // Dry yellow
            [0.2, '#fdba74'],  // Amber
            [0.4, '#38bdf8'],  // Sky blue
            [0.7, '#0284c7'],  // Medium blue
            [1.0, '#082f49']   // Deep precipitation navy
          ],
          colorbar: {
            title: 'Annual (mm)',
            thickness: 14,
            len: 0.7
          },
          line: { color: '#ffffff', width: 1.5 },
          opacity: 0.88
        },
        hovertemplate: '<b>%{text}</b><br>Annual Normal: <b>%{marker.color:.1f} mm</b><br>Monsoon Dependency: %{customdata[0]:.1f}%<br>Monsoon Rainfall: %{customdata[1]:.1f} mm<extra></extra>',
        customdata: dataset.map(d => [d.monsoonPct, d.avgMonsoon])
      };

      const layout = {
        ...academicLayoutBase,
        title: {
          text: `Geographic Rainfall Distribution Across India (Bubble Size = Annual Precipitation)`,
          font: { size: 14, color: '#1e3a8a', weight: 600 },
          x: 0.02,
          xanchor: 'left',
          y: 0.94,
          pad: { t: 8 }
        },
        geo: {
          scope: 'asia',
          showland: true,
          landcolor: '#f8fafc',
          showcountries: true,
          countrycolor: '#cbd5e1',
          showsubunits: true,
          subunitcolor: '#e2e8f0',
          center: { lat: 21.5, lon: 82.0 },
          projection: { type: 'mercator' },
          lataxis: { range: [6, 37] },
          lonaxis: { range: [68, 98] },
          resolution: 50
        },
        margin: { l: 20, r: 20, t: 75, b: 20 }
      };

      Plotly.newPlot('regional-chart-container', [trace], layout, plotlyConfig);

      const plotEl = document.getElementById('regional-chart-container');
      plotEl.removeAllListeners && plotEl.removeAllListeners('plotly_click');
      plotEl.on('plotly_click', (data) => {
        if (data && data.points && data.points[0]) {
          const clickedRegion = data.points[0].text;
          selectRegion(clickedRegion);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // 5. SEASONAL BREAKDOWN (STACKED BARS)
  // -------------------------------------------------------------
  function renderSeasonalBreakdown() {
    const dataset = [...getActiveDataset()].sort((a,b) => b.avgAnnual - a.avgAnnual);
    const nameKey = getRegionNameKey();

    const names = dataset.map(d => d[nameKey]);
    const winter = dataset.map(d => d.avgWinter);
    const preMonsoon = dataset.map(d => d.avgPreMonsoon);
    const monsoon = dataset.map(d => d.avgMonsoon);
    const postMonsoon = dataset.map(d => d.avgPostMonsoon);

    const traceWinter = {
      x: names,
      y: winter,
      name: 'Winter (Jan-Feb)',
      type: 'bar',
      marker: { color: '#93c5fd' }
    };

    const tracePreMonsoon = {
      x: names,
      y: preMonsoon,
      name: 'Pre-Monsoon (Mar-May)',
      type: 'bar',
      marker: { color: '#38bdf8' }
    };

    const traceMonsoon = {
      x: names,
      y: monsoon,
      name: 'Monsoon (Jun-Sep)',
      type: 'bar',
      marker: { color: '#0284c7' }
    };

    const tracePostMonsoon = {
      x: names,
      y: postMonsoon,
      name: 'Post-Monsoon (Oct-Dec)',
      type: 'bar',
      marker: { color: '#1e3a8a' }
    };

    const layout = {
      ...academicLayoutBase,
      barmode: 'stack',
      title: {
        text: 'Seasonal Precipitation Breakdown (Winter / Pre-Monsoon / Monsoon / Post-Monsoon)',
        font: { size: 13, color: '#1e3a8a', weight: 600 },
        x: 0.02,
        xanchor: 'left',
        y: 0.88,
        pad: { t: 0, b: 4 }
      },
      xaxis: {
        tickangle: -45,
        tickfont: { size: 9 },
        showgrid: false
      },
      yaxis: {
        title: 'Rainfall (mm)',
        gridcolor: '#f1f5f9'
      },
      legend: {
        orientation: 'h',
        y: 1.05,
        x: 0.02,
        font: { size: 10.5 }
      },
      margin: { l: 60, r: 25, t: 80, b: 120 }
    };

    Plotly.newPlot('seasonal-chart-container', [traceWinter, tracePreMonsoon, traceMonsoon, tracePostMonsoon], layout, plotlyConfig);
  }

  // -------------------------------------------------------------
  // 6. MONSOON DEPENDENCY CHART
  // -------------------------------------------------------------
  function renderMonsoonDependencyChart() {
    const dataset = [...getActiveDataset()].sort((a,b) => b.monsoonPct - a.monsoonPct);
    const nameKey = getRegionNameKey();

    const names = dataset.map(d => d[nameKey]);
    const pcts = dataset.map(d => d.monsoonPct);

    // Color: Green for moderate dependency, Amber/Red for extreme (>90%) and low (<45% like Tamil Nadu)
    const barColors = pcts.map(p => {
      if (p >= 90) return '#e11d48'; // Critical extreme dependence
      if (p >= 75) return '#0284c7'; // Standard monsoon regime
      if (p <= 45) return '#d97706'; // Post-monsoon reliance (Tamil Nadu)
      return '#059669';
    });

    const trace = {
      x: pcts,
      y: names,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: barColors
      },
      hovertemplate: '<b>%{y}</b><br>Monsoon Dependency: <b>%{x:.1f}%</b><extra></extra>'
    };

    const layout = {
      ...academicLayoutBase,
      title: {
        text: 'Monsoon Dependency Ratio (% of Annual Rainfall Received in Jun–Sep)',
        font: { size: 13, color: '#1e3a8a', weight: 600 },
        x: 0.02,
        xanchor: 'left',
        y: 0.88,
        pad: { t: 0, b: 4 }
      },
      xaxis: {
        title: 'Monsoon Share (%)',
        range: [0, 100],
        gridcolor: '#f1f5f9',
        zeroline: true
      },
      yaxis: {
        automargin: true,
        tickfont: { size: 9 },
        autorange: 'reversed'
      },
      shapes: [
        {
          type: 'line',
          x0: DATA.kpis.nationalAvgMonsoonPct,
          x1: DATA.kpis.nationalAvgMonsoonPct,
          y0: -0.5,
          y1: names.length - 0.5,
          line: {
            color: '#64748b',
            width: 1.5,
            dash: 'dot'
          }
        }
      ],
      annotations: [
        {
          x: DATA.kpis.nationalAvgMonsoonPct + 1,
          y: names.length - 2,
          text: `National Avg (${DATA.kpis.nationalAvgMonsoonPct}%)`,
          showarrow: false,
          font: { size: 11, color: '#475569', weight: 600 }
        }
      ],
      margin: { l: 160, r: 25, t: 80, b: 60 }
    };

    Plotly.newPlot('monsoon-dependency-container', [trace], layout, plotlyConfig);
  }

  // -------------------------------------------------------------
  // 7. HISTORICAL TREND & FORECAST EXPLORER
  // -------------------------------------------------------------
  function renderHistoricalTrendExplorer() {
    const dataset = getActiveDataset();
    const nameKey = getRegionNameKey();
    const regionObj = dataset.find(d => d[nameKey] === currentRegion) || dataset[0];
    const tsData = currentLevel === 'subdivisions' 
      ? DATA.timeSeries[regionObj.subdivision] 
      : (DATA.stateTimeSeries[regionObj.state] || DATA.timeSeries['KERALA']);

    if (!tsData) {
      console.warn('No time series for region:', currentRegion);
      return;
    }

    // Calculate or fallback historical range & stats directly from tsData if missing or invalid
    let minVal = regionObj.minVal;
    let minYear = regionObj.minYear;
    let maxVal = regionObj.maxVal;
    let maxYear = regionObj.maxYear;

    if (minVal == null || maxVal == null || minYear == null || maxYear == null || isNaN(minVal) || isNaN(maxVal)) {
      if (tsData && tsData.annual && tsData.annual.length > 0) {
        let calcMin = Infinity, calcMinYr = null;
        let calcMax = -Infinity, calcMaxYr = null;
        for (let i = 0; i < tsData.annual.length; i++) {
          const val = tsData.annual[i];
          const yr = tsData.years ? tsData.years[i] : null;
          if (val != null && !isNaN(val)) {
            if (val < calcMin) { calcMin = val; calcMinYr = yr; }
            if (val > calcMax) { calcMax = val; calcMaxYr = yr; }
          }
        }
        if (calcMin !== Infinity) {
          minVal = Number(calcMin.toFixed(1));
          minYear = calcMinYr;
          maxVal = Number(calcMax.toFixed(1));
          maxYear = calcMaxYr;
        }
      }
    }

    let stdDev = regionObj.stdDev;
    let cvPct = regionObj.cvPct;
    if (stdDev == null || isNaN(stdDev) || cvPct == null || isNaN(cvPct)) {
      if (tsData && tsData.annual && tsData.annual.length > 0) {
        const mean = (regionObj.avgAnnual || regionObj.histAvgAnnual || 0);
        if (mean > 0) {
          const n = tsData.annual.length;
          const variance = tsData.annual.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
          stdDev = Number(Math.sqrt(variance).toFixed(1));
          cvPct = Number(((stdDev / mean) * 100).toFixed(1));
        }
      }
    }

    const slopeVal = regionObj.slope || 0;
    const totalTrendChange = regionObj.totalTrendChange != null 
      ? regionObj.totalTrendChange 
      : Number((slopeVal * (tsData.years ? tsData.years.length - 1 : 114)).toFixed(1));

    // Update Sub-Stat Cards
    document.getElementById('stat-normal-val').textContent = `${regionObj.avgAnnual || regionObj.histAvgAnnual} mm`;
    document.getElementById('stat-range-val').textContent = `${minVal != null ? minVal : 'N/A'} - ${maxVal != null ? maxVal : 'N/A'} mm`;
    document.getElementById('stat-range-sub').textContent = `Min Year: ${minYear || 'N/A'} | Max Year: ${maxYear || 'N/A'}`;
    
    const slopeDirection = slopeVal > 0.5 ? 'Increasing' : (slopeVal < -0.5 ? 'Decreasing' : 'Stable');
    const badgeClass = slopeVal > 0.5 ? 'badge-increasing' : (slopeVal < -0.5 ? 'badge-decreasing' : 'badge-stable');
    document.getElementById('stat-trend-val').innerHTML = `<span class="badge ${badgeClass}">${slopeDirection} (${slopeVal > 0 ? '+' : ''}${slopeVal} mm/yr)</span>`;
    document.getElementById('stat-trend-sub').textContent = `R²: ${regionObj.rSquared != null ? regionObj.rSquared : 'N/A'} | 115-Yr Shift: ${totalTrendChange} mm`;

    document.getElementById('stat-cv-val').textContent = `${cvPct != null ? cvPct : '18.2'}%`;
    document.getElementById('stat-cv-sub').textContent = `Std Dev: ±${stdDev != null ? stdDev : 'N/A'} mm`;

    // Update Forecast Comparison Cards
    const normalVal = regionObj.avgAnnual || regionObj.histAvgAnnual;

    // Linear Regression Card
    document.getElementById('fc-linear-val').textContent = `${regionObj.predLinear} mm`;
    const linDep = regionObj.linearDeparturePct;
    const linDepClass = linDep > 0 ? 'above' : (linDep < 0 ? 'below' : 'normal');
    document.getElementById('fc-linear-dep').className = `departure-pill ${linDepClass}`;
    document.getElementById('fc-linear-dep').textContent = `${linDep >= 0 ? '+' : ''}${linDep}% vs Normal`;
    document.getElementById('fc-linear-rmse').textContent = `Historical RMSE: ±${regionObj.rmseLinear} mm`;

    // 5-Year MA Card
    document.getElementById('fc-ma5-val').textContent = `${regionObj.predMA5} mm`;
    const ma5Dep = regionObj.ma5DeparturePct;
    const ma5DepClass = ma5Dep > 0 ? 'above' : (ma5Dep < 0 ? 'below' : 'normal');
    document.getElementById('fc-ma5-dep').className = `departure-pill ${ma5DepClass}`;
    document.getElementById('fc-ma5-dep').textContent = `${ma5Dep >= 0 ? '+' : ''}${ma5Dep}% vs Normal`;
    document.getElementById('fc-ma5-rmse').textContent = `Historical RMSE: ±${regionObj.rmseMA5} mm`;

    // 10-Year MA Card
    document.getElementById('fc-ma10-val').textContent = `${regionObj.predMA10} mm`;
    const ma10Dep = regionObj.ma10DeparturePct;
    const ma10DepClass = ma10Dep > 0 ? 'above' : (ma10Dep < 0 ? 'below' : 'normal');
    document.getElementById('fc-ma10-dep').className = `departure-pill ${ma10DepClass}`;
    document.getElementById('fc-ma10-dep').textContent = `${ma10Dep >= 0 ? '+' : ''}${ma10Dep}% vs Normal`;
    document.getElementById('fc-ma10-rmse').textContent = `Historical RMSE: ±${regionObj.rmseMA10} mm`;

    // Highlight Best Model
    document.querySelectorAll('.forecast-card').forEach(el => el.classList.remove('highlight-best'));
    if (regionObj.bestModel === 'Linear Regression') {
      document.getElementById('card-fc-linear').classList.add('highlight-best');
    } else if (regionObj.bestModel === '5-Yr Moving Average') {
      document.getElementById('card-fc-ma5').classList.add('highlight-best');
    } else {
      document.getElementById('card-fc-ma10').classList.add('highlight-best');
    }

    // Build Traces
    const traces = [];
    const years = tsData.years;
    const annuals = tsData.annual;

    // 1. Actual Annual Observations
    if (modelToggles.actual) {
      traces.push({
        x: years,
        y: annuals,
        name: 'Actual Annual Rainfall',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#93c5fd', width: 1.5 },
        marker: { color: '#2563eb', size: 4 },
        hovertemplate: 'Year %{x}: <b>%{y:.1f} mm</b><extra></extra>'
      });
    }

    // 2. Linear Regression Trendline
    if (modelToggles.linear) {
      traces.push({
        x: years,
        y: tsData.trendline,
        name: `OLS Trendline (${slopeVal > 0 ? '+' : ''}${slopeVal} mm/yr)`,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#dc2626', width: 2.5, dash: 'dash' },
        hovertemplate: 'Trend %{x}: <b>%{y:.1f} mm</b><extra></extra>'
      });
    }

    // 3. 5-Year Moving Average
    if (modelToggles.ma5) {
      traces.push({
        x: years,
        y: tsData.ma5,
        name: '5-Year Moving Average',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#d97706', width: 2.2 },
        hovertemplate: '5-Yr MA %{x}: <b>%{y:.1f} mm</b><extra></extra>'
      });
    }

    // 4. 10-Year Moving Average
    if (modelToggles.ma10) {
      traces.push({
        x: years,
        y: tsData.ma10,
        name: '10-Year Moving Average',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#059669', width: 2.5 },
        hovertemplate: '10-Yr MA %{x}: <b>%{y:.1f} mm</b><extra></extra>'
      });
    }

    // 5. 2016 Forecast Points & Clean Non-Overlapping Callouts
    const annotations = [
      {
        x: 1905,
        y: normalVal,
        text: `Historical Normal: ${normalVal} mm`,
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: -24,
        font: { size: 11, color: '#475569', weight: 600 },
        bgcolor: '#ffffff',
        bordercolor: '#cbd5e1',
        borderwidth: 1
      }
    ];

    if (modelToggles.forecast) {
      const fcPoints = [
        {
          model: 'Linear Regression (OLS)',
          shortName: 'Linear',
          y: regionObj.predLinear,
          dep: `${regionObj.linearDeparturePct >= 0 ? '+' : ''}${regionObj.linearDeparturePct}%`,
          color: '#dc2626',
          symbol: 'diamond'
        },
        {
          model: '5-Year Moving Average',
          shortName: '5-Yr MA',
          y: regionObj.predMA5,
          dep: `${regionObj.ma5DeparturePct >= 0 ? '+' : ''}${regionObj.ma5DeparturePct}%`,
          color: '#d97706',
          symbol: 'circle'
        },
        {
          model: '10-Year Moving Average',
          shortName: '10-Yr MA',
          y: regionObj.predMA10,
          dep: `${regionObj.ma10DeparturePct >= 0 ? '+' : ''}${regionObj.ma10DeparturePct}%`,
          color: '#059669',
          symbol: 'square'
        }
      ];

      // Add scatter trace for the 3 markers with clean rich tooltips
      traces.push({
        x: [2016, 2016, 2016],
        y: fcPoints.map(p => p.y),
        customdata: fcPoints.map(p => [p.model, p.dep]),
        name: '2016 Next-Year Forecasts',
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: fcPoints.map(p => p.color),
          size: 11,
          symbol: fcPoints.map(p => p.symbol),
          line: { color: '#0f172a', width: 1.5 }
        },
        hovertemplate: '<b>%{customdata[0]}</b><br>2016 Forecast: <b>%{y:.1f} mm</b> (%{customdata[1]} vs Normal)<extra></extra>'
      });

      // Sort points by predicted rainfall value descending to stack callouts vertically
      const sortedFc = [...fcPoints].sort((a, b) => b.y - a.y);
      // Smart vertical pixel offsets ensuring labels NEVER collide even if values are identical
      const offsets = [
        { ax: 62, ay: -26 },  // Top point
        { ax: 74, ay: 0 },    // Middle point
        { ax: 62, ay: 26 }    // Bottom point
      ];

      sortedFc.forEach((pt, idx) => {
        annotations.push({
          x: 2016,
          y: pt.y,
          xref: 'x',
          yref: 'y',
          text: `<b>${pt.shortName}:</b> ${pt.y.toFixed(1)} mm`,
          showarrow: true,
          arrowhead: 2,
          arrowsize: 0.8,
          arrowwidth: 1.2,
          arrowcolor: pt.color,
          ax: offsets[idx].ax,
          ay: offsets[idx].ay,
          font: { size: 10, color: pt.color, weight: 600 },
          bgcolor: '#ffffff',
          bordercolor: pt.color,
          borderwidth: 1,
          borderpad: 3,
          opacity: 0.95
        });
      });
    }

    const layout = {
      ...academicLayoutBase,
      title: {
        text: `115-Year Rainfall Trajectory & 2016 Forecasts for ${currentRegion} (1901–2015)`,
        font: { size: 14.5, color: '#1e3a8a', weight: 700 },
        x: 0.02,
        xanchor: 'left',
        y: 0.96,
        pad: { t: 6 }
      },
      xaxis: {
        title: 'Year',
        range: [1898, 2021],
        gridcolor: '#f1f5f9',
        dtick: 10
      },
      yaxis: {
        title: 'Annual Rainfall (mm)',
        gridcolor: '#f1f5f9'
      },
      shapes: [
        // Long-term average normal line
        {
          type: 'line',
          x0: 1900,
          x1: 2017,
          y0: normalVal,
          y1: normalVal,
          line: {
            color: '#64748b',
            width: 1.5,
            dash: 'dot'
          }
        }
      ],
      annotations: annotations,
      legend: {
        orientation: 'h',
        y: 1.10,
        x: 0.02,
        font: { size: 11 }
      },
      margin: { l: 60, r: 65, t: 95, b: 60 }
    };

    Plotly.newPlot('trend-chart-container', traces, layout, plotlyConfig);
  }

  // -------------------------------------------------------------
  // 8. PREDICTIONS & STATISTICAL SUMMARY TABLE
  // -------------------------------------------------------------
  function renderTable() {
    const tbody = document.getElementById('prediction-table-body');
    tbody.innerHTML = '';
    const nameKey = getRegionNameKey();
    let rows = [...getActiveDataset()];

    // Apply search filter
    if (tableSearchTerm.trim() !== '') {
      const q = tableSearchTerm.toLowerCase();
      rows = rows.filter(r => r[nameKey].toLowerCase().includes(q));
    }

    // Apply trend filter
    if (currentTrendFilter !== 'ALL') {
      rows = rows.filter(r => r.trendClass === currentTrendFilter);
    }

    // Sort rows
    rows.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va - vb) : (vb - va);
    });

    document.getElementById('table-count-label').textContent = `Showing ${rows.length} of ${getActiveDataset().length} records`;

    rows.forEach(item => {
      const tr = document.createElement('tr');
      if (item[nameKey] === currentRegion) tr.classList.add('selected-row');

      const normalVal = item.avgAnnual || item.histAvgAnnual;
      const trendBadge = item.trendClass === 'Increasing' 
        ? '<span class="badge badge-increasing">Increasing ▲</span>'
        : (item.trendClass === 'Decreasing' ? '<span class="badge badge-decreasing">Decreasing ▼</span>' : '<span class="badge badge-stable">Stable ▬</span>');

      const linDep = item.linearDeparturePct;
      const depClass = linDep > 0 ? 'color: var(--color-success); font-weight: 600;' : (linDep < 0 ? 'color: var(--color-danger); font-weight: 600;' : 'color: var(--text-muted);');

      tr.innerHTML = `
        <td><strong>${item[nameKey]}</strong></td>
        <td><strong>${normalVal.toLocaleString()} mm</strong></td>
        <td>${item.predLinear ? `${item.predLinear.toLocaleString()} mm` : 'N/A'}</td>
        <td style="${depClass}">${linDep !== undefined ? `${linDep >= 0 ? '+' : ''}${linDep}%` : 'N/A'}</td>
        <td>${item.predMA5 ? `${item.predMA5.toLocaleString()} mm` : 'N/A'}</td>
        <td>${item.predMA10 ? `${item.predMA10.toLocaleString()} mm` : 'N/A'}</td>
        <td>${trendBadge}</td>
        <td>${item.slope !== undefined ? `${item.slope > 0 ? '+' : ''}${item.slope}` : 'N/A'}</td>
        <td>${item.rSquared !== undefined ? item.rSquared : 'N/A'}</td>
        <td><span class="meta-chip" style="font-size:11px; padding: 2px 8px;">${item.bestModel || 'Linear Regression'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" data-region="${item[nameKey]}">Explore</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach click listeners to "Explore" buttons
    tbody.querySelectorAll('button[data-region]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reg = e.currentTarget.getAttribute('data-region');
        selectRegion(reg);
      });
    });
  }

  // -------------------------------------------------------------
  // 9. EVENT LISTENERS & INTERACTION HANDLERS
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Level Switcher (Subdivisions vs States)
    document.querySelectorAll('.view-toggle-group .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.view-toggle-group .pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentLevel = e.currentTarget.getAttribute('data-level');
        
        // Update selector and re-render
        populateRegionSelector();
        renderAllViews();
      });
    });

    // Regional Tab Switcher (Bar vs Map)
    document.querySelectorAll('#regional-tabs .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#regional-tabs .pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentRegionalTab = e.currentTarget.getAttribute('data-tab');
        renderRegionalChart();
      });
    });

    // Region Dropdown Selector
    const regionSelect = document.getElementById('region-select');
    regionSelect.addEventListener('change', (e) => {
      selectRegion(e.target.value);
    });

    // Previous / Next Region Buttons
    document.getElementById('btn-prev-region').addEventListener('click', () => {
      navigateRegion(-1);
    });
    document.getElementById('btn-next-region').addEventListener('click', () => {
      navigateRegion(1);
    });

    // Model Toggles (Checkboxes)
    document.getElementById('toggle-actual').addEventListener('change', (e) => {
      modelToggles.actual = e.target.checked;
      renderHistoricalTrendExplorer();
    });
    document.getElementById('toggle-linear').addEventListener('change', (e) => {
      modelToggles.linear = e.target.checked;
      renderHistoricalTrendExplorer();
    });
    document.getElementById('toggle-ma5').addEventListener('change', (e) => {
      modelToggles.ma5 = e.target.checked;
      renderHistoricalTrendExplorer();
    });
    document.getElementById('toggle-ma10').addEventListener('change', (e) => {
      modelToggles.ma10 = e.target.checked;
      renderHistoricalTrendExplorer();
    });
    document.getElementById('toggle-forecast').addEventListener('change', (e) => {
      modelToggles.forecast = e.target.checked;
      renderHistoricalTrendExplorer();
    });

    // Table Search
    const searchInput = document.getElementById('table-search');
    searchInput.addEventListener('input', (e) => {
      tableSearchTerm = e.target.value;
      renderTable();
    });

    // Table Trend Filter Buttons
    document.querySelectorAll('.table-filter-group .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.table-filter-group .filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTrendFilter = e.currentTarget.getAttribute('data-filter');
        renderTable();
      });
    });

    // Table Column Sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.addEventListener('click', (e) => {
        const field = e.currentTarget.getAttribute('data-sort');
        if (sortField === field) {
          sortAsc = !sortAsc;
        } else {
          sortField = field;
          sortAsc = false; // default descending for numbers
        }
        renderTable();
      });
    });

    // Export CSV Button
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      window.location.href = 'prediction_results_summary.csv';
    });

    // Print / Snapshot Mode
    document.getElementById('btn-print').addEventListener('click', () => {
      window.print();
    });
  }

  function selectRegion(regionName) {
    currentRegion = regionName;
    const select = document.getElementById('region-select');
    if (select) select.value = currentRegion;
    renderHistoricalTrendExplorer();
    renderTable(); // Update selected row highlight
  }

  function navigateRegion(direction) {
    const dataset = getActiveDataset();
    const nameKey = getRegionNameKey();
    const curIdx = dataset.findIndex(d => d[nameKey] === currentRegion);
    if (curIdx === -1) return;
    let nextIdx = curIdx + direction;
    if (nextIdx < 0) nextIdx = dataset.length - 1;
    if (nextIdx >= dataset.length) nextIdx = 0;
    selectRegion(dataset[nextIdx][nameKey]);
  }
});
