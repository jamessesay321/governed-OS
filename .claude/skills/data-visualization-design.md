# Data Visualization Design Skill

## Purpose
Permanent design system for how Advisory OS translates financial data into visual output. Every chart, card, table, icon, and infographic must pass through these rules before rendering. This skill ensures visual consistency, perceptual accuracy, and non-finance-user accessibility across the entire platform.

## When to Trigger
- Building or modifying ANY chart, graph, or visualization
- Designing KPI cards, dashboard widgets, or data tables
- Adding icons, infographics, or visual indicators to any page
- Reviewing existing pages for visual quality
- Any page that feels "too text-heavy" or "not presentable"

## Core Design Philosophy

**Hybrid approach: Tufte + Few + Knaflic foundation, with Ware perception layer and McCandless visual craft.**

Advisory OS is a financial platform for founders (not quants). Every visualization must:
1. **Earn its pixels** (Tufte) — remove anything that doesn't encode data
2. **Answer one question** (Knaflic) — every section has a clear "so what?"
3. **Fit on one screen** (Few) — no scrolling for core metrics
4. **Leverage perception** (Ware) — use position, not area/color, for quantitative values
5. **Look worth paying for** (McCandless) — aesthetic quality builds trust and credibility

---

## The Seven Principles

### 1. Data-Ink Ratio (Tufte)
Every visual element must encode data or aid comprehension. Remove:
- Decorative borders and backgrounds
- 3D effects (NEVER)
- Gradient fills on charts
- Heavy gridlines (use light dotted if needed)
- Chart borders/boxes

**Keep:** Sparklines, direct labels, trend arrows, threshold bands, annotations.

### 2. One Accent Color Rule (Knaflic)
- All data renders in **muted grey/slate tones** by default
- **ONE saturated accent color** highlights what needs attention
- Grey-out comparison/historical data; accent the current period or exception
- This creates instant visual hierarchy without cognitive load

### 3. Bullet Graphs Over Gauges (Few)
For any KPI-vs-target display, use **bullet graphs** (horizontal bar with target marker and qualitative range bands), never circular gauges/dials. Bullet graphs encode:
- Actual value (bar length)
- Target (vertical marker line)
- Qualitative ranges (background shading: poor / satisfactory / good)
- All in a compact horizontal strip

### 4. Position Encoding Primary (Ware)
- **Spatial position along a common axis** is the most accurate perceptual channel
- Bar charts and line charts ALWAYS for monetary values
- Never use area, bubble size, or color intensity as the primary encoding for amounts
- Reserve color for categorical distinction (max 5-6 hues) or alert status

### 5. Proportional Ink (Wilke)
- Bar charts MUST start at zero — truncated axes are deceptive, especially for financial data
- The area of any shaded region must be proportional to the data value
- Sequential color scales must be perceptually monotonic (light → dark)
- Diverging scales for variance: centered on zero, red ← 0 → green

### 6. Redundant Coding (Ware + Wilke)
Never rely on color alone. Every visual encoding must have a backup:
- Color + icon (e.g. red + warning triangle)
- Color + label (e.g. green bar + "£12,400 over target")
- Color + position (e.g. bar extending beyond threshold line)
- This ensures accessibility for color-blind users

### 7. Context Always (Few)
An isolated number is meaningless. Every metric MUST show at least one comparator:
- vs. budget/target
- vs. prior period
- vs. same period last year
- Trend direction (sparkline or arrow)

---

## Chart Type Decision Matrix

| Use Case | Chart Type | Why |
|---|---|---|
| KPI with target | Bullet graph | Few: most efficient KPI encoding |
| Trend in KPI card | Sparkline | Tufte: word-sized, data-intense |
| P&L bridge | Waterfall chart | Industry standard, narrative flow |
| Budget vs. Actual | Grouped bar chart | Position encoding, easy comparison |
| Revenue/cost over time | Line chart | Best for trend detection |
| Expense ranking | Horizontal bar chart | Knaflic: ranked lists read L→R |
| Multi-dept comparison | Small multiples | Tufte: same frame, easy scan |
| Financial heatmap | Sequential color heatmap | Wilke: monotonic light→dark |
| Variance table | Table + conditional color + sparklines | Few + Tufte combined |
| Cash flow composition | Stacked bar (max 5 categories) | Wilke: limited categories only |
| Part-of-whole (2-3 items) | Stacked horizontal bar or donut | Only if 2-3 segments max |

### NEVER Use
- Pie charts with >3 segments (angle perception is poor — Tufte, Few, Ware, Wilke all agree)
- Circular gauges/dials (replaced by bullet graphs)
- 3D charts of any kind
- Rainbow/spectral color scales
- Secondary y-axes (confusing — Knaflic)
- Area charts for comparing multiple series (overlap obscures data)

---

## Color System

### Palette Rules
- **Base:** Neutral grey/slate for all non-focus data, backgrounds, gridlines
- **Primary:** One brand color (blue-600) for primary metrics and interactive elements
- **Positive variance:** Desaturated green (green-600, not bright/neon)
- **Negative variance:** Desaturated red (red-600, not bright/neon)
- **Warning/watch:** Amber-500, used sparingly
- **Saturated red/green:** Reserved ONLY for critical alerts (red-500/green-500)
- **Maximum 5-6 distinct hues** in any single view
- **Consistent meaning:** Same color = same meaning across entire platform

### Variance Color Logic
```
Revenue/Income:  positive = green (more is good)
Costs/Expenses:  positive = red (more is bad) — INVERTED
Margins:         positive = green (higher is good)
Cash:            positive = green (more is good)
```
Always explain color meaning in a legend on first use per page.

---

## Typography in Visualizations

- **Chart titles:** Descriptive insight, not topic. "Revenue grew 12% in March" not "Revenue Chart"
- **Axis labels:** Always include units (£, %, months). Never assume the user knows the unit.
- **Direct labels:** Label data points directly on the chart. Eliminate legends where possible.
- **Annotations:** Call out anomalies, events, or key changes directly on the visualization
- **Number formatting:** Use org base currency (from Xero config), thousands separator, no unnecessary decimals
  - `£60,000` not `60000` or `£60,000.00`
  - `42.3%` not `0.423` or `42.3000%`
  - Negative: `(£5,200)` or `−£5,200` with red color + icon

---

## Dashboard Layout Principles

### Information Hierarchy (top → bottom)
1. **AI narrative summary** — plain-English "what happened" (2-3 sentences max)
2. **KPI cards row** — 4-6 bullet graphs or metric cards with sparklines
3. **Primary visualization** — waterfall, trend chart, or comparison
4. **Detail table** — expandable rows, conditional formatting, drill-down on click
5. **Secondary insights** — variance panel, alerts, AI commentary

### Density Rules (Few)
- Core metrics visible without scrolling on 1440px viewport
- Use compact sparklines (60×20px) and bullet graphs for density
- Group related metrics spatially (proximity = relationship)
- White space is structure, not waste — use it to separate logical groups

### Responsive Behavior
- Desktop (1440px+): Full dashboard, 3-4 column grid
- Tablet (768-1439px): 2-column grid, stack secondary below primary
- Mobile (< 768px): Single column, KPI cards first, charts simplified

---

## Interactive Patterns

### Hover/Tooltip Standard
Every data point on hover shows:
1. **Value** (formatted with currency/%)
2. **Variance** vs comparison period (formatted + color-coded)
3. **% of total** where relevant
4. **AI explanation** (live-generated, ~200 tokens via Haiku)
5. **"Drill down" affordance** — subtle arrow/link indicating clickability

### Drill-Down Standard
Click any number/bar/point → slide-out panel showing:
- Level 1: Account breakdown (which accounts make up this total)
- Level 2: Monthly breakdown per account
- Level 3: Individual Xero transactions
- Each level has back navigation and breadcrumb trail

### Challenge/Question Button
- One per page (in page header), not per number
- Opens slide-out "Challenge Panel" listing key figures
- User taps figure → types question/note → tags recipient (Accountant/Developer)
- All challenges roll up to a "Review Queue" page
- Badge on button shows open challenge count

---

## Infographic Style Guide

### When to Use Infographic Elements
- Section headers and summary cards (icons representing category)
- Empty states (illustrative + actionable CTA)
- Widget template selection UI (visual preview cards)
- Daily briefing / Key Actions page (section icons, priority badges)
- Onboarding flows (progress visualization)

### Style Rules
- Icons: Lucide icon set (already in project via shadcn), consistent 20px size
- Illustrations: Minimal, flat, 2-color (brand + grey), not cartoonish
- Data + illustration combined: mini chart inside a styled card with icon + label
- NEVER purely decorative — every visual element must reinforce the data message

---

## Page-Specific Application

### Executive Summary (formerly Financial Summary)
- Lead with AI narrative (3-4 sentences, founder-friendly language)
- Visual P&L waterfall (revenue → costs → profit flow)
- 4-5 KPI bullet graphs with traffic-light status
- Correct financial terminology with tooltip explanations on hover
- Comparison: vs last month + vs same month last year

### KPI Alerts Page
- Each alert rule: icon + metric name + sparkline + threshold gauge + status badge
- Color-coded severity: info (blue), warning (amber), critical (red)
- Triggered alerts: mini explanation card with AI reason
- Visual threshold indicator showing current value position

### Dashboard Widgets
- Template selection: visual preview cards (not a dropdown list)
- Each template shows a miniature preview of the layout
- Categories as horizontal pill tabs, not a sidebar
- Enabled widgets show with full color; disabled show greyed with "Add" button

### Graph Studio
- AI selects chart type based on data + question (no manual chart type picker)
- All charts follow this skill's color system and typography rules
- Annotations auto-generated from business context
- Comparison overlays toggled via clean pill buttons (Actual / Budget / Prior Year)

---

## Anti-Patterns (Never Do)

1. Text-heavy pages without visual breaks — every 3-4 data points need a visual element
2. Raw numbers without formatting — always use formatCurrency() / formatPercent()
3. Charts without titles or axis labels
4. Multiple bright colors competing for attention (grey base + one accent)
5. Legends when direct labeling works
6. Scrolling to see core metrics (density > decoration)
7. Inconsistent color meaning across pages
8. Decorative elements that don't encode data
9. Tooltips that just repeat the axis label (add variance + context + AI insight)
10. Empty states that just say "No data" (explain why + offer action)

---

## Reference Sources

| Author | Book | Core Contribution to This Skill |
|---|---|---|
| Edward Tufte | The Visual Display of Quantitative Information | Data-ink ratio, sparklines, small multiples, chartjunk elimination |
| Cole Nussbaumer Knaflic | Storytelling with Data | One accent color, preattentive attributes, narrative structure, direct labeling |
| Stephen Few | Information Dashboard Design | Bullet graphs, single-screen density, 13 dashboard mistakes, highlight exceptions |
| Colin Ware | Information Visualization: Perception for Design | Preattentive processing, position encoding, max 7 hues, change blindness |
| Claus Wilke | Fundamentals of Data Visualization | Proportional ink, monotonic color scales, chart-type-to-data-type matching |
| David McCandless | Information is Beautiful | Four elements (data + story + goal + form), visual craft builds trust |
| James Cheshire | Atlas of the Invisible | Annotation quality, editorial craft, layered complexity |

## Competitive Benchmark
- **Fathom:** Traffic-light KPIs, 50+ metrics, clean card layout
- **DataRails:** Interactive drill-down, variance threshold suppression, AI agents
- **Runway:** Modern aesthetic, plain-English, ambient intelligence
- **Mosaic:** Pre-built SaaS templates, metric builder, polished executive view
- **Few's bullet graph:** The gold standard for KPI-vs-target (replaces all gauges)
