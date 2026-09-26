# India Rainfall Analytics & Predictive Modeling Dashboard

An interactive dashboard analyzing 115 years (1901–2015) of India Meteorological Department (IMD) rainfall data, providing regional, seasonal, and predictive insights at the state/subdivision level.

## Features

- **Regional Analysis**: Compare annual rainfall normals across 36 IMD meteorological subdivisions and 35 states/UTs, with bar chart and geographic bubble map views.
- **Seasonal Breakdown**: Visualizes rainfall distribution across Winter (Jan–Feb), Pre-Monsoon (Mar–May), Monsoon (Jun–Sep), and Post-Monsoon (Oct–Dec) periods.
- **Monsoon Dependency Index**: Highlights how reliant each region is on Southwest Monsoon rainfall, from Gujarat (95.6%) to Jammu & Kashmir (lowest).
- **Historical Trend Explorer**: Interactive 1901–2015 timeline per region with OLS linear regression, 5-year and 10-year moving average overlays.
- **Next-Year Forecasting**: Predicts 2016 rainfall per region using three methods (Linear Regression, 5-yr MA, 10-yr MA), each with RMSE reported for model comparison.
- **Full Data Table**: Searchable, sortable, filterable table of all regions with historical normals, predictions, % departure from normal, and trend classification (Increasing/Stable/Decreasing).

## Data Sources

- `rainfall in india 1901-2015.csv` — subdivision-level monthly/annual rainfall, 1901–2015 (IMD)
- `district_wise_rainfall_normal.csv` — district-level monthly climatological normals (IMD)

## Methodology

- Missing values (0.14% of records) imputed using subdivision long-term monthly normals.
- Trends classified using OLS regression slope thresholds (|slope| ≥ 0.5 mm/year = Increasing/Decreasing, otherwise Stable).
- Forecast models backtested via one-step-ahead RMSE across the historical series.

## Tech Stack

- HTML5, JavaScript, Plotly.js for interactive charts
- Node.js (local dev server)
- Built with AI-assisted development (Google Antigravity) for rapid prototyping and data pipeline generation, based on the IMD datasets above.

## Live Demo

https://yravikanthh.github.io/india-rainfall-dashboard/
