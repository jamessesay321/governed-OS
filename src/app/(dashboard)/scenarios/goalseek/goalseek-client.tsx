'use client';

import { useState, useMemo } from 'react';
import { formatCurrencyCompact } from '@/lib/formatting/currency';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalseekTemplate {
  id: string;
  question: string;
  category: Category;
  targetLabel: string;
  targetDefault: number;
  targetUnit: string;
  variableLabel: string;
  variableMin: number;
  variableMax: number;
  variableDefault: number;
  variableUnit: string;
  currentValues: { label: string; value: number; unit: string }[];
  resultFn: (target: number, variable: number) => string;
}

type Category = 'profitability' | 'cash-flow' | 'growth' | 'people' | 'marketing' | 'debt';

interface GoalseekClientProps {
  orgId: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'profitability', label: 'Profitability', icon: '📊' },
  { value: 'cash-flow', label: 'Cash Flow', icon: '💷' },
  { value: 'growth', label: 'Growth', icon: '📈' },
  { value: 'people', label: 'People', icon: '👥' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'debt', label: 'Debt', icon: '🏦' },
];

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

const TEMPLATES: GoalseekTemplate[] = [
  // Profitability
  {
    id: 'prof-1',
    question: 'What revenue for 20% net margin?',
    category: 'profitability',
    targetLabel: 'Target Net Margin',
    targetDefault: 20,
    targetUnit: '%',
    variableLabel: 'Monthly Revenue',
    variableMin: 50000,
    variableMax: 500000,
    variableDefault: 180000,
    variableUnit: '£',
    currentValues: [
      { label: 'Current Revenue', value: 150000, unit: '£' },
      { label: 'Total Costs', value: 135000, unit: '£' },
      { label: 'Current Net Margin', value: 10, unit: '%' },
    ],
    resultFn: (target, variable) =>
      `To achieve a ${target}% net margin, you need monthly revenue of £${variable.toLocaleString()}`,
  },
  {
    id: 'prof-2',
    question: 'How much to cut costs to break even?',
    category: 'profitability',
    targetLabel: 'Target Profit',
    targetDefault: 0,
    targetUnit: '£',
    variableLabel: 'Monthly Cost Reduction',
    variableMin: 0,
    variableMax: 50000,
    variableDefault: 15000,
    variableUnit: '£',
    currentValues: [
      { label: 'Current Revenue', value: 120000, unit: '£' },
      { label: 'Current Total Costs', value: 135000, unit: '£' },
      { label: 'Current Loss', value: -15000, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To break even (£${target.toLocaleString()} profit), you need to cut £${variable.toLocaleString()}/month in costs`,
  },
  {
    id: 'prof-3',
    question: 'What gross margin covers all overheads?',
    category: 'profitability',
    targetLabel: 'Overhead Coverage',
    targetDefault: 100,
    targetUnit: '%',
    variableLabel: 'Gross Margin',
    variableMin: 20,
    variableMax: 80,
    variableDefault: 55,
    variableUnit: '%',
    currentValues: [
      { label: 'Monthly Overheads', value: 65000, unit: '£' },
      { label: 'Current Gross Margin', value: 42, unit: '%' },
      { label: 'Revenue', value: 150000, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To cover ${target}% of overheads, you need a gross margin of ${variable}%`,
  },
  // Cash Flow
  {
    id: 'cf-1',
    question: 'How many AR days reduction for 3 months runway?',
    category: 'cash-flow',
    targetLabel: 'Cash Runway',
    targetDefault: 3,
    targetUnit: 'months',
    variableLabel: 'AR Days',
    variableMin: 7,
    variableMax: 90,
    variableDefault: 30,
    variableUnit: 'days',
    currentValues: [
      { label: 'Current AR Days', value: 62, unit: 'days' },
      { label: 'Monthly Burn', value: 45000, unit: '£' },
      { label: 'Cash Balance', value: 85000, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To achieve ${target} months runway, reduce AR days to ${variable} days (from 62)`,
  },
  {
    id: 'cf-2',
    question: 'What monthly revenue covers fixed costs?',
    category: 'cash-flow',
    targetLabel: 'Fixed Cost Coverage',
    targetDefault: 100,
    targetUnit: '%',
    variableLabel: 'Monthly Revenue',
    variableMin: 20000,
    variableMax: 200000,
    variableDefault: 95000,
    variableUnit: '£',
    currentValues: [
      { label: 'Monthly Fixed Costs', value: 82000, unit: '£' },
      { label: 'Current Revenue', value: 75000, unit: '£' },
      { label: 'Coverage Gap', value: -7000, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To cover ${target}% of fixed costs, you need £${variable.toLocaleString()}/month in revenue`,
  },
  {
    id: 'cf-3',
    question: 'When do I run out of cash at current burn?',
    category: 'cash-flow',
    targetLabel: 'Cash Floor',
    targetDefault: 0,
    targetUnit: '£',
    variableLabel: 'Months Until Cash Runs Out',
    variableMin: 1,
    variableMax: 24,
    variableDefault: 6,
    variableUnit: 'months',
    currentValues: [
      { label: 'Cash Balance', value: 210000, unit: '£' },
      { label: 'Monthly Burn Rate', value: 35000, unit: '£' },
      { label: 'Monthly Revenue', value: 22000, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `At current burn rate, cash reaches £${target.toLocaleString()} in approximately ${variable} months`,
  },
  // Growth
  {
    id: 'gr-1',
    question: 'How many new clients to double revenue?',
    category: 'growth',
    targetLabel: 'Revenue Target',
    targetDefault: 300000,
    targetUnit: '£',
    variableLabel: 'New Clients Needed',
    variableMin: 1,
    variableMax: 100,
    variableDefault: 25,
    variableUnit: 'clients',
    currentValues: [
      { label: 'Current Revenue', value: 150000, unit: '£' },
      { label: 'Current Clients', value: 24, unit: '' },
      { label: 'Avg Revenue/Client', value: 6250, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To reach £${target.toLocaleString()} revenue, you need ${variable} new clients at current avg revenue per client`,
  },
  {
    id: 'gr-2',
    question: 'What price increase hits £5M revenue?',
    category: 'growth',
    targetLabel: 'Annual Revenue Target',
    targetDefault: 5000000,
    targetUnit: '£',
    variableLabel: 'Price Increase',
    variableMin: 0,
    variableMax: 50,
    variableDefault: 18,
    variableUnit: '%',
    currentValues: [
      { label: 'Current Annual Revenue', value: 3600000, unit: '£' },
      { label: 'Average Deal Size', value: 15000, unit: '£' },
      { label: 'Active Clients', value: 240, unit: '' },
    ],
    resultFn: (target, variable) =>
      `To hit ${formatCurrencyCompact(target)} revenue, increase prices by ${variable}% (assuming no client churn)`,
  },
  {
    id: 'gr-3',
    question: 'What conversion rate hits MRR target?',
    category: 'growth',
    targetLabel: 'MRR Target',
    targetDefault: 100000,
    targetUnit: '£',
    variableLabel: 'Conversion Rate',
    variableMin: 1,
    variableMax: 30,
    variableDefault: 8,
    variableUnit: '%',
    currentValues: [
      { label: 'Current MRR', value: 62000, unit: '£' },
      { label: 'Monthly Leads', value: 500, unit: '' },
      { label: 'Current Conversion', value: 4.2, unit: '%' },
    ],
    resultFn: (target, variable) =>
      `To achieve £${target.toLocaleString()} MRR, you need a ${variable}% conversion rate on current lead volume`,
  },
  // People
  {
    id: 'ppl-1',
    question: 'How many hires at current margins?',
    category: 'people',
    targetLabel: 'Minimum Margin',
    targetDefault: 15,
    targetUnit: '%',
    variableLabel: 'New Hires',
    variableMin: 0,
    variableMax: 20,
    variableDefault: 4,
    variableUnit: 'people',
    currentValues: [
      { label: 'Current Headcount', value: 18, unit: '' },
      { label: 'Revenue', value: 200000, unit: '£/mo' },
      { label: 'Current Margin', value: 22, unit: '%' },
    ],
    resultFn: (target, variable) =>
      `While maintaining a ${target}% margin, you can hire up to ${variable} new people at current revenue`,
  },
  {
    id: 'ppl-2',
    question: 'What revenue per employee justifies 5 new hires?',
    category: 'people',
    targetLabel: 'New Hires',
    targetDefault: 5,
    targetUnit: 'people',
    variableLabel: 'Revenue per Employee',
    variableMin: 5000,
    variableMax: 30000,
    variableDefault: 12500,
    variableUnit: '£',
    currentValues: [
      { label: 'Current Headcount', value: 18, unit: '' },
      { label: 'Revenue per Employee', value: 11100, unit: '£' },
      { label: 'Total Revenue', value: 200000, unit: '£/mo' },
    ],
    resultFn: (target, variable) =>
      `To justify ${target} new hires, revenue per employee needs to reach £${variable.toLocaleString()}`,
  },
  {
    id: 'ppl-3',
    question: 'What salary budget keeps staff costs under 40%?',
    category: 'people',
    targetLabel: 'Staff Cost Ratio',
    targetDefault: 40,
    targetUnit: '%',
    variableLabel: 'Total Monthly Salary Budget',
    variableMin: 30000,
    variableMax: 150000,
    variableDefault: 80000,
    variableUnit: '£',
    currentValues: [
      { label: 'Current Salary Budget', value: 92000, unit: '£/mo' },
      { label: 'Revenue', value: 200000, unit: '£/mo' },
      { label: 'Current Staff Cost %', value: 46, unit: '%' },
    ],
    resultFn: (target, variable) =>
      `To keep staff costs under ${target}%, your total salary budget should be max £${variable.toLocaleString()}/month`,
  },
  // Marketing
  {
    id: 'mkt-1',
    question: 'What CAC for 3x LTV:CAC?',
    category: 'marketing',
    targetLabel: 'LTV:CAC Ratio',
    targetDefault: 3,
    targetUnit: 'x',
    variableLabel: 'Target CAC',
    variableMin: 100,
    variableMax: 5000,
    variableDefault: 1500,
    variableUnit: '£',
    currentValues: [
      { label: 'Customer LTV', value: 4500, unit: '£' },
      { label: 'Current CAC', value: 2100, unit: '£' },
      { label: 'Current LTV:CAC', value: 2.1, unit: 'x' },
    ],
    resultFn: (target, variable) =>
      `For a ${target}x LTV:CAC ratio, your CAC needs to be £${variable.toLocaleString()} or less`,
  },
  {
    id: 'mkt-2',
    question: 'How much ad spend for 100 leads/month?',
    category: 'marketing',
    targetLabel: 'Monthly Leads Target',
    targetDefault: 100,
    targetUnit: 'leads',
    variableLabel: 'Monthly Ad Spend',
    variableMin: 1000,
    variableMax: 50000,
    variableDefault: 12000,
    variableUnit: '£',
    currentValues: [
      { label: 'Current Monthly Leads', value: 45, unit: '' },
      { label: 'Current Ad Spend', value: 5500, unit: '£/mo' },
      { label: 'Cost per Lead', value: 122, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To generate ${target} leads/month, you need approximately £${variable.toLocaleString()} in monthly ad spend`,
  },
  {
    id: 'mkt-3',
    question: 'What conversion rate makes channel profitable?',
    category: 'marketing',
    targetLabel: 'Channel Profit',
    targetDefault: 0,
    targetUnit: '£',
    variableLabel: 'Conversion Rate',
    variableMin: 0.5,
    variableMax: 15,
    variableDefault: 5,
    variableUnit: '%',
    currentValues: [
      { label: 'Monthly Visitors', value: 8000, unit: '' },
      { label: 'Channel Spend', value: 4500, unit: '£/mo' },
      { label: 'Current Conversion', value: 1.8, unit: '%' },
    ],
    resultFn: (target, variable) =>
      `To make this channel profitable (>£${target.toLocaleString()}), you need a ${variable}% conversion rate`,
  },
  // Debt
  {
    id: 'debt-1',
    question: 'What monthly payment clears debt in 12 months?',
    category: 'debt',
    targetLabel: 'Payoff Timeline',
    targetDefault: 12,
    targetUnit: 'months',
    variableLabel: 'Monthly Payment',
    variableMin: 1000,
    variableMax: 30000,
    variableDefault: 9200,
    variableUnit: '£',
    currentValues: [
      { label: 'Outstanding Debt', value: 105000, unit: '£' },
      { label: 'Interest Rate', value: 6.5, unit: '%' },
      { label: 'Current Payment', value: 3500, unit: '£/mo' },
    ],
    resultFn: (target, variable) =>
      `To clear debt in ${target} months, you need monthly payments of £${variable.toLocaleString()}`,
  },
  {
    id: 'debt-2',
    question: 'What revenue growth covers loan repayments?',
    category: 'debt',
    targetLabel: 'Debt Service Coverage',
    targetDefault: 1.25,
    targetUnit: 'x',
    variableLabel: 'Revenue Growth Rate',
    variableMin: 0,
    variableMax: 30,
    variableDefault: 12,
    variableUnit: '%',
    currentValues: [
      { label: 'Annual Loan Repayment', value: 48000, unit: '£' },
      { label: 'Current Net Income', value: 42000, unit: '£/yr' },
      { label: 'Current DSCR', value: 0.88, unit: 'x' },
    ],
    resultFn: (target, variable) =>
      `To achieve ${target}x debt service coverage, revenue needs to grow by ${variable}%`,
  },
  {
    id: 'debt-3',
    question: 'At what rate does refinancing save money?',
    category: 'debt',
    targetLabel: 'Annual Savings Target',
    targetDefault: 5000,
    targetUnit: '£',
    variableLabel: 'New Interest Rate',
    variableMin: 2,
    variableMax: 10,
    variableDefault: 4.5,
    variableUnit: '%',
    currentValues: [
      { label: 'Outstanding Debt', value: 105000, unit: '£' },
      { label: 'Current Rate', value: 6.5, unit: '%' },
      { label: 'Current Annual Interest', value: 6825, unit: '£' },
    ],
    resultFn: (target, variable) =>
      `To save £${target.toLocaleString()}/year, refinance at ${variable}% or lower (from 6.5%)`,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalseekClient({ orgId, role }: GoalseekClientProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('profitability');
  const [selectedTemplate, setSelectedTemplate] = useState<GoalseekTemplate | null>(null);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [variableValue, setVariableValue] = useState<number>(0);
  const [customQuestion, setCustomQuestion] = useState('');
  const [savedToPlaybook, setSavedToPlaybook] = useState(false);

  const categoryTemplates = useMemo(
    () => TEMPLATES.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  function handleSelectTemplate(template: GoalseekTemplate) {
    setSelectedTemplate(template);
    setTargetValue(template.targetDefault);
    setVariableValue(template.variableDefault);
    setSavedToPlaybook(false);
  }

  function handleBack() {
    setSelectedTemplate(null);
    setSavedToPlaybook(false);
  }

  function handleSaveToPlaybook() {
    setSavedToPlaybook(true);
    // In production this would POST to the playbook API
  }

  const sliderPercent = selectedTemplate
    ? ((variableValue - selectedTemplate.variableMin) /
        (selectedTemplate.variableMax - selectedTemplate.variableMin)) *
      100
    : 0;

  // ---- Template detail view ------------------------------------------------
  if (selectedTemplate) {
    const result = selectedTemplate.resultFn(targetValue, variableValue);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            &larr; Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goalseek</h1>
            <p className="text-muted-foreground text-sm">
              What needs to change to hit your target?
            </p>
          </div>
        </div>

        {/* Custom question */}
        <Card>
          <CardContent className="pt-0">
            <Input
              placeholder="Or ask your own question... e.g. What price increase covers a 10% cost rise?"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedTemplate.question}</CardTitle>
            <CardDescription>
              Adjust the target and variable to model different outcomes.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Current values */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Current Values</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedTemplate.currentValues.map((cv) => (
                  <div
                    key={cv.label}
                    className="rounded-lg border bg-muted/40 px-4 py-3"
                  >
                    <p className="text-xs text-muted-foreground">{cv.label}</p>
                    <p className="text-lg font-semibold">
                      {cv.unit === '£' || cv.unit === '£/mo' || cv.unit === '£/yr'
                        ? `£${cv.value.toLocaleString()}`
                        : cv.unit === '%'
                          ? `${cv.value}%`
                          : cv.unit === 'x'
                            ? `${cv.value}x`
                            : cv.value.toLocaleString()}
                      {cv.unit === '£/mo' && (
                        <span className="text-xs text-muted-foreground font-normal"> /mo</span>
                      )}
                      {cv.unit === '£/yr' && (
                        <span className="text-xs text-muted-foreground font-normal"> /yr</span>
                      )}
                      {cv.unit === 'days' && (
                        <span className="text-xs text-muted-foreground font-normal"> days</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Target input */}
            <div className="space-y-2">
              <Label htmlFor="target-value">{selectedTemplate.targetLabel}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="target-value"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedTemplate.targetUnit}
                </span>
              </div>
            </div>

            {/* Variable slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="variable-slider">{selectedTemplate.variableLabel}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="variable-input"
                    type="number"
                    value={variableValue}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVariableValue(
                        Math.min(selectedTemplate.variableMax, Math.max(selectedTemplate.variableMin, v))
                      );
                    }}
                    className="w-[120px] text-right"
                  />
                  <span className="text-sm text-muted-foreground w-12">
                    {selectedTemplate.variableUnit}
                  </span>
                </div>
              </div>

              {/* Range slider */}
              <div className="relative pt-1">
                <input
                  id="variable-slider"
                  type="range"
                  min={selectedTemplate.variableMin}
                  max={selectedTemplate.variableMax}
                  step={
                    selectedTemplate.variableMax - selectedTemplate.variableMin > 100
                      ? Math.round((selectedTemplate.variableMax - selectedTemplate.variableMin) / 100)
                      : 0.5
                  }
                  value={variableValue}
                  onChange={(e) => setVariableValue(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    {selectedTemplate.variableUnit === '£'
                      ? `£${selectedTemplate.variableMin.toLocaleString()}`
                      : `${selectedTemplate.variableMin}${selectedTemplate.variableUnit}`}
                  </span>
                  <span>
                    {selectedTemplate.variableUnit === '£'
                      ? `£${selectedTemplate.variableMax.toLocaleString()}`
                      : `${selectedTemplate.variableMax}${selectedTemplate.variableUnit}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  =
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">Result</h3>
                  <p className="text-sm leading-relaxed">{result}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSaveToPlaybook} disabled={savedToPlaybook}>
                {savedToPlaybook ? 'Saved to Playbook' : 'Save to Playbook'}
              </Button>
              <Button variant="outline" onClick={handleBack}>
                Try Another
              </Button>
              {savedToPlaybook && (
                <Badge variant="secondary">Added to your action items</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Template gallery view -----------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goalseek</h1>
        <p className="text-muted-foreground text-sm">
          What needs to change to hit your target?
        </p>
      </div>

      {/* Custom question */}
      <Card>
        <CardContent className="pt-0">
          <Input
            placeholder="Or ask your own question... e.g. What price increase covers a 10% cost rise?"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as Category)}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {categoryTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left"
                >
                  <Card
                    className={cn(
                      'h-full cursor-pointer transition-all hover:shadow-md hover:border-primary/40',
                      'hover:-translate-y-0.5'
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold leading-snug">
                        {template.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Target: {template.targetLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Adjust: {template.variableLabel}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
