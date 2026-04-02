# Feature Benchmark Audit: Graph / Chart Builder
## Advisory OS — Section 4 of 15 | THE CATALYST
**Date:** 2026-04-01 | **Status:** Complete | **Auditor:** Claude Code

> **This section triggered the entire audit.** The graph builder was identified as being worse than what a user can achieve by talking to Claude Finance with their data uploaded. This audit must be brutally honest about what to BUILD, what to WRAP, and what to SKIP.

---

## Feature Inventory

| # | Feature | Type | Current State |
|---|---------|------|---------------|
| 1 | Bar Chart (Revenue/Cash Flow) | Visualization | Working |
| 2 | Line Chart (Trends/Forecasts) | Visualization | Working |
| 3 | Waterfall Chart (P&L Flow) | Visualization | Working |
| 4 | Sparklines (KPI Cards) | Visualization | Working |
| 5 | Margin Trend Chart | Visualization | Working |
| 6 | Chart Type Selection | User action | Missing |
| 7 | Data Series Configuration | User action | Missing |
| 8 | Axis Customisation | User action | Missing |
| 9 | Colour/Theme Customisation | User action | Missing |
| 10 | Annotations / Labels | Data display | Missing |
| 11 | Interactive Tooltips | User action | Working |
| 12 | Drill-Down on Chart Elements | Navigation | Missing |
| 13 | Export Chart as Image | User action | Missing |
| 14 | Comparison Overlays | Data display | Missing |
| 15 | Forecast Projection on Charts | Visualization | Partial |
| 16 | AI-Suggested Visualizations | AI output | Missing |
| 17 | Chart Templates / Library | User action | Missing |
| 18 | Responsive Chart Sizing | UI | Working |

---

## The Claude Finance Test

### The Question
"If a user uploads their Xero P&L to Claude and says 'show me my revenue trend with a forecast', what do they get?"

### Claude Finance Produces:
1. **An interactive React artifact** with a Recharts line chart showing:
   - Historical revenue data points (all periods)
   - Forecast line (dotted) extending 3-6 months based on trend analysis
   - Confidence band (shaded area) around the forecast
   - Tooltip on hover showing exact values
   - Legend distinguishing actual vs forecast
   - Responsive sizing

2. **Narrative context** alongside the chart:
   - "Revenue has grown 8% over the last 6 months with a seasonal dip in August"
   - "Forecast suggests £165k/month by December based on current trajectory"
   - "Confidence: the trend is consistent but depends on maintaining the client pipeline you mentioned"

3. **Instant customisation** via conversation:
   - "Make it a bar chart instead" → new chart in 5 seconds
   - "Add cost of sales as a second line" → done
   - "Show this as a % of revenue target" → done
   - "Change colours to my brand" → done
   - "Add an annotation where we hired the new sales rep" → done

### Advisory OS Graph Builder Produces:
1. **Pre-built Recharts components** (`forecast-chart.tsx`, `cash-flow-chart.tsx`, `margin-trend-chart.tsx`)
   - Fixed chart types per component
   - Fixed data series (hardcoded to specific fields)
   - Basic tooltips
   - Responsive sizing
   - No customisation UI
   - No user-driven configuration
   - No annotations
   - No comparison overlays

### Verdict: Claude Finance Wins
**Claude Finance is clearly better for ad-hoc visualisation.** The ability to iterate via conversation ("make it a bar chart", "add annotations", "overlay the budget") produces a more personalised, more useful chart in less time than any pre-built chart component.

**However, Advisory OS has three advantages Claude Finance cannot replicate:**
1. **Persistence** — Charts that automatically update when data syncs. Claude's charts are point-in-time artifacts.
2. **Governance** — Charts with audit trail, role-based visibility, and approval workflows.  Charts embedded in board packs that are version-controlled and signed off.
3. **Context Accumulation** — Charts that get smarter over time because Advisory OS knows the business (semantic mappings, interview data, historical patterns). Claude Finance starts fresh each conversation.

**The strategic conclusion: Don't build a chart builder. Build governed chart SLOTS that are populated by AI-generated visualizations.**

---

## Benchmark Tables

### 1. Bar Chart (Revenue/Cash Flow)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Recharts BarChart showing Cash In, Cash Out, Net Cash Flow, Closing Cash by period. Also used for revenue breakdowns. |
| **What it's trying to achieve** | "How much came in and went out each month?" |
| **Who needs it** | All |
| **Best in class** | **Runway** — Bar charts are interactive: click any bar → drill to underlying transactions. Bars are segmented by dimension (department, product). Toggle between stacked and grouped views. Hover shows absolute value + % of total + variance from plan. The mechanism: every bar is a filterable data point, not just a visual element. |
| **How they achieved it** | Custom chart renderer with click handlers on each bar segment. Data model includes dimension metadata per data point. Stacked/grouped toggle re-renders with animation. |
| **Runner up** | **DataRails** — Widget-based bar charts with configurable colour palette, time period aggregation toggle, and one-click drill-down. |
| **Current Advisory OS state** | **Working** — `cash-flow-chart.tsx` renders a basic BarChart with 4 series. Period labels on x-axis. Y-axis in thousands. Missing: click-to-drill, dimension segmentation, stacked/grouped toggle. |
| **AI opportunity** | **Very High** — Instead of a static bar chart, use Claude to generate the optimal visualization based on the data and question. "Show me cash flow" → AI decides bar chart is best and configures it with the right series, colours, and annotations. |
| **Non-finance user test** | **4/5** — Bar charts are universally understood. Need clear labels and colour legend. |
| **Claude Finance alternative** | **Better for ad-hoc.** Claude generates customisable bar charts via artifacts. Advisory OS is better for persistent, auto-updating dashboards. |
| **Leverage existing tools?** | Google Sheets bar charts are honestly excellent for ad-hoc exploration. |
| **Token efficiency** | Zero tokens for static chart. ~800 tokens if AI-configured. |
| **Build recommendation** | **WRAP** — Keep Recharts for rendering. Use Claude to configure chart parameters (series, colours, annotations) based on data + context. Store configuration, re-render on data refresh. |
| **Priority** | **P1** — Current implementation works for demo. Enhancement is P1. |
| **Defensibility** | Medium — The chart is commodity. The AI configuration + governed persistence is the value. |

---

### 2. Line Chart (Trends/Forecasts)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Multi-line trend chart showing Revenue, Cost of Sales, Operating Expenses, Net Profit over time |
| **What it's trying to achieve** | "Show me the trajectory of my business" |
| **Who needs it** | All |
| **Best in class** | **Runway** — Line charts with actual (solid) vs forecast (dotted) distinction. Budget shown as a shaded region behind the actual line. Assumption change → forecast line updates in real-time with smooth animation. Confidence band shown as progressively wider shaded area. The mechanism: separate rendering paths for historical (solid from actuals) and forecast (dotted from model) with visual continuity. |
| **How they achieved it** | Dual data series per metric: `actual[]` and `forecast[]`. Rendering rules: actual = solid line, forecast = dashed line, budget = shaded area. D3-based renderer with transition animations. |
| **Runner up** | **Fathom** — Trend charts with toggleable overlays: actual + budget + forecast + prior year. Up to 4 lines simultaneously. |
| **Current Advisory OS state** | **Working** — `forecast-chart.tsx` renders multi-line chart for scenarios. Missing: actual vs forecast visual distinction, budget overlay, confidence bands, real-time forecast updates. |
| **AI opportunity** | **Very High** — AI can select which metrics to show based on what's interesting: "Revenue and net profit are trending differently — showing both so you can see the margin squeeze." |
| **Non-finance user test** | **3/5** — Multiple lines can be confusing. AI-curated charts showing only what matters = 5/5. |
| **Claude Finance alternative** | **Equivalent.** Claude generates great line charts with forecast projections via artifacts. Advantage is conversational iteration ("add the budget line"). |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~500 tokens for AI chart curation |
| **Build recommendation** | **WRAP** — Recharts rendering + AI decides which metrics to show and how. Actual/forecast visual distinction is a must-build. |
| **Priority** | **P1** |
| **Defensibility** | Medium — AI-curated metric selection based on company context is differentiating. |

---

### 3. Waterfall Chart (P&L Flow)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Revenue → minus costs → subtotals → net profit waterfall |
| **What it's trying to achieve** | "Where does my money go?" — the visual P&L |
| **Who needs it** | All — the most intuitive financial visualization for non-finance users |
| **Best in class** | **DataRails** — Interactive waterfall: hover for value + % of revenue, click for drill-down. Green/red/blue colour coding (positive/negative/subtotal). Animated transitions when switching periods. |
| **How they achieved it** | Custom waterfall renderer calculating running totals. Each bar positioned relative to previous cumulative. Click handlers for drill-down. |
| **Runner up** | **Fathom** — Waterfall in report builder. Print-quality rendering for board packs. |
| **Current Advisory OS state** | **Working** — `waterfall-chart.tsx` exists. Basic rendering. Missing: interactivity, drill-down, semantic category labels, annotations. |
| **AI opportunity** | High — AI annotates: "The biggest change from last month is the £8k increase in subcontractor costs." |
| **Non-finance user test** | **5/5** — THE most accessible financial chart. Everyone understands "money in minus costs equals what's left." |
| **Claude Finance alternative** | Claude generates waterfall charts but they're static. Advisory OS's interactive drill-down waterfall is better. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~300 tokens for annotations |
| **Build recommendation** | **BUILD** — Enhance with DataRails-style interactivity. This is the hero chart. Keep it as a dedicated component, not a "chart builder" output. |
| **Priority** | **P0** — Demo centrepiece |
| **Defensibility** | Medium — The chart is common. Drill-down to governed transactions is the moat. |

---

### 4-5. Sparklines & Margin Trend Chart

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Small inline trend lines (sparklines on KPI cards) and dedicated margin trend chart |
| **Current Advisory OS state** | **Working** — Both implemented. Sparklines colour-coded by benchmark status. |
| **Build recommendation** | **BUILD** — Already complete. Minor polish only. |
| **Priority** | **P1** — Working |

---

### 6. Chart Type Selection

| Dimension | Assessment |
|-----------|------------|
| **What it does** | UI to choose between bar, line, pie, waterfall, area chart types for a given dataset |
| **What it's trying to achieve** | "Show me this data as a pie chart instead of a bar chart" |
| **Who needs it** | Power users, advisors building reports |
| **Best in class** | **Fathom** — 90+ chart types available in the report builder. Drag a chart element → select type from gallery → configure data source and formatting. Preview updates live. The mechanism: chart type gallery with thumbnails showing what each looks like with sample data. Select → configure → save. |
| **How they achieved it** | Chart component library with a shared data interface. Any chart can render the same data. Gallery shows all compatible chart types for the selected data (e.g., can't do a waterfall from a single data point). |
| **Runner up** | **Mosaic** — Canvas reports allow chart type switching per widget. |
| **Current Advisory OS state** | **Missing** — Chart types are hardcoded per component. No user choice. |
| **AI opportunity** | **Very High — THIS IS THE KEY INSIGHT.** Instead of building a chart type selector, let AI choose the best chart type for the data and question. "Show me revenue breakdown" → AI chooses pie chart. "Show me revenue over time" → AI chooses line chart. "Show me the P&L structure" → AI chooses waterfall. The user never has to learn chart types. |
| **Non-finance user test** | **1/5** (chart picker) / **5/5** (AI auto-selection) — A plumber doesn't know the difference between a bar chart and a column chart. They know "show me how revenue changed" and AI picks the right visual. |
| **Claude Finance alternative** | **Claude does this natively.** "Show me revenue" → Claude picks the best chart type automatically. This is exactly what Advisory OS should replicate. |
| **Leverage existing tools?** | Google Sheets has chart type selection but it's manual. |
| **Token efficiency** | ~200 tokens for AI chart type selection |
| **Build recommendation** | **SKIP** the chart type picker UI. **WRAP** AI auto-selection instead. Let Claude pick the optimal chart type based on data shape and user intent. |
| **Priority** | **P2** — AI auto-selection reduces need for manual picker |
| **Defensibility** | High if AI-driven (contextual intelligence). Low if manual picker (commodity). |

---

### 7. Data Series Configuration

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Choose which data series (metrics/accounts) to show on a chart |
| **What it's trying to achieve** | "I want to see Revenue AND Gross Profit on the same chart" |
| **Who needs it** | Power users |
| **Best in class** | **DataRails** — Drag-and-drop data fields onto chart axes. X-axis defaults to time. Y-axis accepts multiple series. Second Y-axis for different scales (e.g., revenue in £ + margin in %). |
| **How they achieved it** | Chart config object: `{xAxis: 'period', yLeft: ['revenue', 'costs'], yRight: ['margin_pct']}`. Drag-and-drop onto axis slots. |
| **Runner up** | **Runway** — Series auto-suggested based on the metric being viewed. Related metrics appear as toggleable overlays. |
| **Current Advisory OS state** | **Missing** — Each chart component has hardcoded series. |
| **AI opportunity** | **Very High** — "Compare my revenue and staff costs over time" → AI configures the chart with both series, appropriate scale, and dual Y-axis if needed. |
| **Non-finance user test** | **1/5** (drag-and-drop config) / **4/5** (NL request) — No non-technical user wants to configure chart axes. |
| **Claude Finance alternative** | **Claude wins.** "Add cost of sales to that chart" → done. Conversational series configuration is faster and more accessible than any drag-and-drop UI. |
| **Leverage existing tools?** | Google Sheets handles multi-series charts well |
| **Token efficiency** | ~300 tokens for NL chart configuration |
| **Build recommendation** | **SKIP** the configuration UI. **WRAP** NL chart requests via Claude API. |
| **Priority** | **P3** |
| **Defensibility** | Low — commodity feature |

---

### 8-9. Axis Customisation & Colour/Theme

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Manual axis labels, scales, number formatting, colour palette selection |
| **What it's trying to achieve** | "Make this chart look professional for my board pack" |
| **Who needs it** | Advisor building board packs only |
| **Best in class** | **DataRails** — Per-widget colour palette override, number format control, axis label customisation. **Fathom** — Brand colours applied globally from settings. |
| **Current Advisory OS state** | **Missing** |
| **AI opportunity** | Medium — AI applies brand colours from settings. User says "use my brand colours" → done. |
| **Non-finance user test** | **1/5** — Nobody except designers cares about axis customisation. |
| **Claude Finance alternative** | "Make it blue and green" → Claude updates colours instantly. Conversational wins. |
| **Build recommendation** | **SKIP** — Use sensible defaults. Apply brand colours from org settings globally. Manual customisation is Phase 2 for board pack polish. |
| **Priority** | **P3** |
| **Defensibility** | Low |

---

### 10. Annotations / Labels

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Add text annotations to specific points on a chart (e.g., "New hire started" on the month staff costs jumped) |
| **What it's trying to achieve** | "Remember WHY this number changed" — institutional memory on charts |
| **Who needs it** | Advisor, business owner |
| **Best in class** | **Runway** — Annotations tied to plans: creating a "Q3 Marketing Push" plan automatically adds an annotation on the chart timeline. Annotations are structured data (linked to assumption changes), not just free text. |
| **How they achieved it** | Events/plans table with date field. Chart renderer queries events in the displayed date range and renders vertical lines with labels. |
| **Runner up** | **Fathom** — Manual annotations in report builder. Free text positioned on chart. |
| **Current Advisory OS state** | **Missing** — No annotation system. |
| **AI opportunity** | **Very High** — AI auto-annotates significant events: "Staff costs jumped 15% in March" → AI adds annotation "New hire started" (from scenario change log or interview context). This is annotation WITHOUT user effort. |
| **Non-finance user test** | **5/5** — Annotations are the bridge between "numbers changed" and "I remember why." Critical for non-finance users who don't read P&L statements. |
| **Claude Finance alternative** | Claude can add annotations to charts in artifacts when asked. But AI-automated annotations from business context is unique to Advisory OS. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~400 tokens per chart for AI annotation detection |
| **Build recommendation** | **WRAP** — AI detects significant data changes, cross-references with known events (scenario changes, interview context), auto-generates annotations. This is a killer feature. |
| **Priority** | **P1** — Impressive in demos, differentiating |
| **Defensibility** | **Very High** — Automated annotations from governed business context = compounding moat. More data = better annotations. No competitor can replicate without the same data depth. |

---

### 11. Interactive Tooltips

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Hover over a data point to see exact value, context |
| **Current Advisory OS state** | **Working** — Recharts provides standard tooltips. |
| **Build recommendation** | **BUILD** — Enhance tooltips with: value, variance from prior period, % of total. Low effort. |
| **Priority** | **P1** |

---

### 12. Drill-Down on Chart Elements

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Click a bar/point/segment on any chart → drill to underlying data |
| **What it's trying to achieve** | "What's behind this data point?" |
| **Who needs it** | All |
| **Best in class** | **DataRails** — Click any chart element → same slide-over drill-down panel used by KPIs and tables. Consistent drill-down UX across every interaction. |
| **How they achieved it** | Every chart data point carries metadata: `{period, accounts[], dimension_filters}`. Click handler opens drill panel with this context. |
| **Current Advisory OS state** | **Missing** — Charts are display-only. No click handlers. |
| **AI opportunity** | High — AI explains the clicked data point in context. |
| **Non-finance user test** | **4/5** — "Click anything to learn more" is intuitive. |
| **Claude Finance alternative** | Claude handles follow-up questions about data points conversationally. But clicking is faster. |
| **Build recommendation** | **BUILD** — Add click handlers to chart data points. Reuse the same drill-down panel from Dashboard audit (shared component). |
| **Priority** | **P1** — Impressive but not blocking demo |
| **Defensibility** | Medium — the drill-down to governed transactions adds value |

---

### 13. Export Chart as Image

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Download a chart as PNG/SVG for use in presentations |
| **Current Advisory OS state** | **Missing** |
| **Build recommendation** | **LEVERAGE** — Recharts supports `toDataURL()` for PNG export. ~10 lines of code. Or use Board Pack PDF which renders charts. |
| **Priority** | **P3** |
| **Defensibility** | Low |

---

### 14. Comparison Overlays

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Overlay budget, forecast, or prior year data on the same chart as actuals |
| **What it's trying to achieve** | "Show me actual vs plan on one chart" |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Toggle buttons to overlay: Actual, Budget, Forecast, Prior Year. Up to 4 lines simultaneously. Each uses consistent styling: actual = solid, budget = dashed, forecast = dotted, prior year = grey. Legend updates dynamically. |
| **How they achieved it** | Each overlay is a separate data series fetched lazily on toggle. Chart component accepts an array of series with styling hints. |
| **Runner up** | **Runway** — Side-by-side scenario comparison where each scenario is a column. Changed cells highlighted in amber with delta shown. |
| **Current Advisory OS state** | **Missing** — Charts show single data series. No overlay mechanism. |
| **AI opportunity** | Medium — AI selects the most useful comparison: "I'm showing you actuals vs budget because you're 12% off plan this quarter." |
| **Non-finance user test** | **4/5** — "Actual vs plan" is universally understood when visually distinguished. |
| **Claude Finance alternative** | Claude generates multi-series charts easily. Advisory OS needs this as a persistent feature. |
| **Token efficiency** | Zero tokens for the overlay. ~200 tokens for AI comparison selection. |
| **Build recommendation** | **BUILD** — Add overlay toggles (actual/budget/forecast/prior year) to line and bar charts. Reuse Fathom's styling convention. |
| **Priority** | **P1** — Very impressive in demos |
| **Defensibility** | Low — standard pattern |

---

### 15. Forecast Projection on Charts

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Extend chart data into the future with forecast lines |
| **Current Advisory OS state** | **Partial** — Scenario charts show forecast data. Missing: actual-to-forecast visual transition, confidence bands. |
| **Best in class** | **Runway** — Seamless actual → forecast line with dotted transition point. Confidence band widens over time. Assumption slider adjusts forecast in real-time. |
| **Build recommendation** | **BUILD** — Add dotted-line forecast extension with confidence band. Already have the data from scenario engine. |
| **Priority** | **P1** |
| **Defensibility** | Medium — forecast quality depends on model accuracy (from scenario engine). |

---

### 16. AI-Suggested Visualizations

| Dimension | Assessment |
|-----------|------------|
| **What it does** | AI recommends which charts to show based on data patterns and user context |
| **What it's trying to achieve** | "Don't make me decide what to look at — show me what matters" |
| **Who needs it** | All — especially non-finance users who don't know what chart to ask for |
| **Best in class** | **Runway Copilot (Ambient Intelligence)** — AI anticipates what the user needs to see based on recent data changes, upcoming deadlines, and role. "I noticed your cash position is trending down — here's a cash flow forecast chart." The mechanism: post-sync analysis identifies the 3-5 most notable data changes → generates appropriate visualizations → surfaces them proactively. |
| **How they achieved it** | Event-driven: data sync triggers analysis pipeline → notable changes ranked by business impact → chart configurations generated → pushed to user's dashboard/notifications. |
| **Runner up** | **DataRails Insights** — Configurable automated summaries with charts auto-selected to illustrate key points. |
| **Current Advisory OS state** | **Missing** — Charts are manually navigated to. No proactive suggestion system. |
| **AI opportunity** | **This IS the AI opportunity for charts.** Instead of building a chart builder, build an "AI chart curator" that selects and configures the right charts based on data + context. |
| **Non-finance user test** | **5/5** — "The system shows me what I need to see" requires zero financial knowledge. |
| **Claude Finance alternative** | Claude suggests visualizations when asked. Advisory OS does it proactively on data sync. |
| **Token efficiency** | ~1000 tokens per "what's notable" analysis × per sync × cacheable |
| **Build recommendation** | **WRAP** — This is the strategic chart feature. AI analyses data changes post-sync → generates chart configs → renders on dashboard. This replaces the need for a chart builder entirely. |
| **Priority** | **P1** — Strategic differentiator |
| **Defensibility** | **Very High** — AI chart curation based on company context, semantic categories, and business patterns = deep moat. |

---

### 17. Chart Templates / Library

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Pre-built chart templates for common views (Revenue Trend, Expense Breakdown, Cash Position, etc.) |
| **Current Advisory OS state** | **Missing** — Charts are coded per-component. |
| **Best in class** | **Fathom** — Report builder with 90+ chart templates. Drag → configure → done. |
| **Build recommendation** | **SKIP** — AI-suggested visualizations and purpose-built charts (waterfall, cash flow, trend) cover the need. Don't build a template library. |
| **Priority** | **P3** |
| **Defensibility** | Low |

---

### 18. Responsive Chart Sizing

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Charts resize correctly on different screen sizes |
| **Current Advisory OS state** | **Working** — Recharts `ResponsiveContainer` handles this. |
| **Build recommendation** | **BUILD** — Already working. |
| **Priority** | **P1** — Already complete |

---

## Summary Lists

### BUILD LIST (Purpose-built, not a generic chart builder)

| Feature | Approach | Informed by | Priority |
|---------|----------|-------------|----------|
| Interactive Waterfall Chart | DataRails-style click-to-drill, semantic labels, AI annotations | DataRails | P0 |
| Actual vs Forecast Visual Distinction | Solid line → dotted line transition with confidence band | Runway | P1 |
| Comparison Overlays | Toggle actual/budget/forecast/prior year on line/bar charts | Fathom | P1 |
| Chart Drill-Down | Click any data point → shared drill panel (reuse from Dashboard) | DataRails | P1 |
| Enhanced Tooltips | Value + variance + % of total on hover | DataRails | P1 |

### WRAP LIST (Claude API generates, governed UI renders)

| Feature | Shell needed | AI work | Token cost |
|---------|-------------|---------|------------|
| AI Chart Annotations | Annotation overlay renderer | Detect events, generate annotations from context | ~400 tokens × Haiku |
| AI Chart Curation | Dashboard chart slots | Analyse data changes, select optimal chart configs | ~1000 tokens × Sonnet |
| AI Chart Type Selection | Recharts config adapter | Given data + question, choose best chart type | ~200 tokens × Haiku |

### LEVERAGE LIST

| Feature | Alternative | Action |
|---------|------------|--------|
| Chart Image Export | Recharts `toDataURL()` or Board Pack PDF | ~10 lines of code |
| Ad-Hoc Chart Creation | Google Sheets | Export data to Sheets for free-form charting |
| Complex Custom Charts | Claude Finance artifact | Users who want fully custom charts can use Claude directly |

### SKIP LIST (Don't build a chart builder)

| Feature | Reason | Revisit |
|---------|--------|---------|
| Chart Type Selector UI | AI auto-selects. Non-finance users don't know chart types. | Never — AI replaces this |
| Data Series Drag-and-Drop | NL configuration via Claude is more accessible | Never |
| Axis Customisation UI | Sensible defaults + brand colours from settings | Phase 2 for board pack polish |
| Colour Picker | Global brand colours from settings | Phase 2 |
| Chart Template Library | Purpose-built charts + AI curation covers the need | Phase 2 if demand emerges |
| Custom Chart Builder Page | **THIS IS THE KEY DECISION: DO NOT BUILD A CHART BUILDER** | Never for MVP |

### THE STRATEGIC DECISION

**Don't build a chart builder. Build governed chart SLOTS.**

The insight from this audit: a generic chart builder will always lose to Claude Finance because conversational customisation is more powerful and more accessible than any GUI. Advisory OS should:

1. **Build 5 hero charts** — Waterfall (P&L flow), Cash Flow Bar, Revenue Trend Line, KPI Sparklines, Margin Trend. These are purpose-built, interactive, and drillable.

2. **Build AI chart curation** — Post-sync, AI analyses what changed and selects/configures charts to show on dashboard. User never picks chart types.

3. **Build governed chart persistence** — Charts auto-update on sync, are embeddable in board packs, have audit trails, respect role-based visibility.

4. **Let Claude Finance handle the rest** — For ad-hoc "show me X" requests, Advisory OS's AI chat (when built) should generate chart artifacts just like Claude Finance does. But these live in a governed context with persistent data.

### ARCHITECTURE NOTES

1. **Shared Chart Config Type** — All charts should accept a common `ChartConfig` type: `{type, series[], xAxis, yAxis, annotations[], overlays[], drillTarget}`. AI generates this config, Recharts renders it.

2. **Chart Slot Component** — `<ChartSlot config={aiGeneratedConfig} onDrill={openPanel} />` — renders any chart type from a config object. Used on dashboard, in board packs, in detail pages.

3. **Post-Sync Chart Analysis Pipeline** — After Xero sync: (1) Calculate KPIs/P&L (2) Detect notable changes (3) Select 3-5 chart configs that best illustrate the changes (4) Cache configs (5) Dashboard renders from cache.

4. **Token Strategy** — Chart annotation: ~400 tokens × Haiku (cheap, fast). Chart curation: ~1000 tokens × Sonnet (needs reasoning). Total monthly per org for charts: ~£0.15.

5. **The Moat** — Claude Finance generates better ad-hoc charts. But Advisory OS charts are: persistent (update on sync), governed (audit trail, role-based), contextual (annotated from company knowledge), and cumulative (historical chart configs show how the business narrative evolved). This is the difference between a conversation and an institution.
