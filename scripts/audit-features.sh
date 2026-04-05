#!/bin/bash
# Feature Registry Audit Script
# Verifies that built features still have their key files in the codebase
# Run: bash scripts/audit-features.sh

set -e
cd "$(dirname "$0")/.."

echo "=== FEATURE REGISTRY AUDIT ==="
echo "Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

PASS=0
FAIL=0
WARN=0

check_file() {
  local id="$1"
  local name="$2"
  local path="$3"

  if [ -e "$path" ]; then
    PASS=$((PASS + 1))
  else
    echo "FAIL: $id ($name) — missing: $path"
    FAIL=$((FAIL + 1))
  fi
}

check_dir() {
  local id="$1"
  local name="$2"
  local path="$3"

  if [ -d "$path" ]; then
    PASS=$((PASS + 1))
  else
    echo "FAIL: $id ($name) — missing dir: $path"
    FAIL=$((FAIL + 1))
  fi
}

# Core infrastructure
check_dir "F-001" "Auth" "src/app/(auth)"
check_dir "F-002" "Xero OAuth" "src/app/api/xero"
check_file "F-003" "Dashboard layout" "src/app/(dashboard)/layout.tsx"
check_dir "F-004" "Onboarding" "src/app/(onboarding)"
check_file "F-005" "KPI engine" "src/lib/kpi/engine.ts"
check_dir "F-006" "Scenario engine" "src/app/api/scenarios"
check_dir "F-009" "Board pack" "src/app/api/reports"
check_dir "F-010" "Knowledge vault" "src/app/(dashboard)/vault"
check_dir "F-011" "Audit logging" "src/lib/audit"

# UX Features
check_file "F-031" "Currency formatting" "src/lib/formatting/currency.ts"
check_file "F-032" "Global period hook" "src/lib/hooks/use-global-period.ts"
check_file "F-032b" "Global period selector" "src/components/layout/global-period-selector.tsx"
check_file "F-032c" "Global period provider" "src/components/providers/global-period-provider.tsx"
check_file "F-035" "Drill-down sheet" "src/components/shared/drill-down-sheet.tsx"
check_dir "F-041" "Executive summary" "src/app/(dashboard)/dashboard/executive-summary"
check_dir "F-042" "Review queue" "src/app/(dashboard)/dashboard/review-queue"

# Narrative endpoints
check_dir "F-052a" "Narrative: income statement" "src/app/api/narrative/income-statement"
check_dir "F-052b" "Narrative: balance sheet" "src/app/api/narrative/balance-sheet"
check_dir "F-052c" "Narrative: cash flow" "src/app/api/narrative/cash-flow"
check_dir "F-052d" "Narrative: variance" "src/app/api/narrative/variance"
check_dir "F-052e" "Narrative: revenue" "src/app/api/narrative/revenue"
check_dir "F-052f" "Narrative: profitability" "src/app/api/narrative/profitability"
check_dir "F-052g" "Narrative: financial health" "src/app/api/narrative/financial-health"

# Components
check_file "F-053" "Narrative summary" "src/components/dashboard/narrative-summary.tsx"
check_file "F-054" "Daily briefing" "src/components/dashboard/daily-briefing.tsx"
check_file "F-055" "Smart chart tooltip" "src/components/charts/smart-chart-tooltip.tsx"
check_dir "F-054b" "Briefing API" "src/app/api/briefing"

# KPI pages
check_dir "F-057" "KPI targets" "src/app/(dashboard)/kpi/targets"
check_dir "F-058" "Custom KPIs" "src/app/(dashboard)/kpi/custom"

# Token tracking
check_file "F-059" "Token budget" "src/lib/ai/token-budget.ts"
check_dir "F-060" "Usage dashboard" "src/app/(dashboard)/settings/usage"
check_dir "F-060b" "Usage API" "src/app/api/usage"

# Product Intelligence
check_file "F-061" "Line item parser" "src/lib/intelligence/line-item-parser.ts"
check_file "F-062" "Industry KPIs" "src/lib/intelligence/industry-kpis.ts"
check_dir "F-063" "Product metrics API" "src/app/api/intelligence/product-metrics"
check_file "F-063b" "Product intelligence UI" "src/components/dashboard/product-intelligence.tsx"

# Widget system
check_dir "F-051" "Widget selector" "src/app/(dashboard)/dashboard/widgets"

echo ""
echo "=== RESULTS ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "ACTION REQUIRED: $FAIL features have missing files. Check feature-registry.md and mark as broken."
  exit 1
else
  echo "All verified features still have their key files in place."
  exit 0
fi
