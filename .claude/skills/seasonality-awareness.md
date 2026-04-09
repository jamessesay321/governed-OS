# Skill: Seasonality Awareness

## Purpose
Most businesses have seasonal revenue patterns. The platform MUST understand these patterns because:
- A 300% month-over-month revenue spike in September is NORMAL for bridal, not an anomaly
- A 50% drop in August is NORMAL for professional services, not a crisis
- Cash flow forecasts that assume flat revenue will be dangerously wrong
- Benchmarking "this month vs last month" is misleading if one is peak and one is trough

The sense-check system currently flags seasonal variations as anomalies. This is wrong.

## When to Apply
- BEFORE flagging any revenue spike/dip as anomalous
- WHEN computing MoM growth (must compare same month prior year, not sequential)
- WHEN building cash flow forecasts (must model seasonal patterns)
- WHEN setting monthly budget targets (not 1/12 of annual for seasonal businesses)
- WHEN displaying trend lines (12-month view minimum to see full cycle)

## Seasonality Detection Framework

### Step 1: Determine if Business is Seasonal
From interview data (`seasonality_description`):
- "We have busy and quiet months" → seasonal
- "Revenue is fairly consistent" → non-seasonal
- "Our revenue depends on..." → check the dependency

From Xero data (auto-detect):
```
For each month in 12-month history:
  monthly_revenue[month] = sum of revenue

coefficient_of_variation = std_dev(monthly_revenue) / mean(monthly_revenue)

IF coefficient_of_variation > 0.3 → SEASONAL
IF coefficient_of_variation > 0.5 → HIGHLY SEASONAL
```

### Step 2: Identify Peak and Trough Months
```
For each calendar month (Jan-Dec), average revenue across available years
Sort by average: top 3 = peak months, bottom 3 = trough months
Seasonal amplitude = (peak average - trough average) / annual average
```

### Step 3: Store Seasonal Profile
For each org, maintain a seasonal index:
```
seasonal_index[month] = month_average / overall_monthly_average
```
- Index > 1.0 = above-average month
- Index < 1.0 = below-average month
- Example (bridal): Jan=1.4, Feb=0.8, Mar=0.9, Apr=1.3, May=1.2, Jun=0.7, Jul=0.6, Aug=0.5, Sep=1.5, Oct=1.0, Nov=0.9, Dec=0.7

## Common Seasonal Patterns by Industry

### Fashion/Luxury Bridal
- Peaks: January (new year brides), April-May (trunk shows), September (autumn brides)
- Troughs: June-August (summer lull), December (holiday season)
- Revenue swings: 200-500% MoM are NORMAL
- Cash flow: deposits received months before delivery → timing mismatch

### Retail/E-commerce
- Peaks: November (Black Friday), December (Christmas)
- Secondary: January (sales), back-to-school season
- Troughs: February, summer months
- Cash flow: stock purchased in advance → working capital pressure before peak

### Professional Services
- Peaks: Q1 (new budgets), Q4 (year-end projects)
- Troughs: August (holidays), December (wind down)
- Revenue relatively stable but utilisation varies

### SaaS
- Generally non-seasonal
- Mild Q4 enterprise push
- January renewals can spike

### Construction
- Peaks: Spring through Autumn (weather-dependent)
- Troughs: Winter months
- Long payment cycles (60-90 days)

### Hospitality
- Peaks: Summer, Christmas/New Year
- Troughs: January-February
- Fixed costs don't reduce in quiet months

## What Changes When Seasonality is Detected

### Sense-Check Thresholds
- **Current (wrong):** Revenue spike >100% MoM flagged as warning
- **Correct:** Adjust threshold by seasonal index:
  ```
  adjusted_threshold = base_threshold × seasonal_amplitude
  ```
  For a bridal business: 100% base × 3.0 amplitude = 300% threshold before flagging

### Month-over-Month Comparisons
- **Current (misleading):** Compare Jan to Dec
- **Correct:** Compare Jan this year to Jan last year (YoY same-month)
- Always show: "Jan 2025 vs Jan 2024" not "Jan 2025 vs Dec 2024"

### Budget Allocation
- **Current (wrong):** Annual budget / 12 = monthly target
- **Correct:** Annual budget × seasonal_index[month] = monthly target
- A bridal business expecting £1.2M annual should budget ~£150K for September (index 1.5) and ~£60K for August (index 0.5)

### Cash Flow Forecasts
- **Must model seasonal patterns** — flat-line forecasting is dangerous
- Monthly projected revenue = annual target × seasonal_index[month]
- Cash collection may lag revenue by DSO days
- Fixed costs stay constant regardless of revenue season

### Anomaly Detection
- Only flag as anomalous if deviation exceeds seasonal-adjusted threshold
- "Revenue dropped 50% from September to October" → check if that matches historical seasonal pattern
- "Revenue dropped 50% year-over-year for October" → THAT is potentially anomalous

## Implementation
```typescript
// After computing MoM growth, adjust for seasonality
const seasonalProfile = await getSeasonalProfile(orgId);
if (seasonalProfile.isHighlySeasonal) {
  // Compare YoY instead of MoM
  const yoyGrowth = computeYoYGrowth(currentPeriod, priorYearPeriod);
  // Adjust anomaly thresholds
  const adjustedThreshold = BASE_THRESHOLD * seasonalProfile.amplitude;
}
```

## Anti-Patterns
1. **Flagging seasonal peaks as anomalies** — destroys trust
2. **MoM comparisons for seasonal businesses** — always misleading
3. **Flat monthly budgets** — sets business up to "miss" trough months
4. **12-month average as "normal"** — no month is "normal" for seasonal businesses
5. **Ignoring cash flow timing** — deposits received ≠ revenue earned ≠ cash available
