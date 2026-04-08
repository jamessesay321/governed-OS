'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Plane,
  MapPin,
  CalendarDays,
  Users,
  TrendingUp,
  DollarSign,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  chartAxisFormatter,
  chartTooltipFormatter,
} from '@/lib/formatting/currency';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type {
  PlannedTrunkShow,
  TrunkShowStatus,
  CapacitySlot,
  MonthlyFinancialImpact,
} from '@/types/trunk-show-planner';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface PlannerClientProps {
  plans: PlannedTrunkShow[];
  historicalSpend: Array<{ month: string; spend: number }>;
  historicalSpendByMonth: Record<string, number>;
  actualConversionRate: number;
  averageDressPrice: number;
  orgName: string;
  totalEnquiries: number;
  confirmedOrders: number;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STATUS_CONFIG: Record<TrunkShowStatus, { color: string; bg: string; label: string }> = {
  confirmed: { color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40', label: 'Confirmed' },
  planned: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', label: 'Planned' },
  completed: { color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/40', label: 'Completed' },
  cancelled: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Cancelled' },
};

const STATUS_DOT_COLOR: Record<TrunkShowStatus, string> = {
  confirmed: 'bg-teal-500',
  planned: 'bg-amber-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sMonth = s.toLocaleDateString('en-GB', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-GB', { month: 'short' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();

  if (sMonth === eMonth) {
    return `${sDay}-${eDay} ${sMonth} ${year}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${year}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    US: '\u{1F1FA}\u{1F1F8}',
    UK: '\u{1F1EC}\u{1F1E7}',
    UAE: '\u{1F1E6}\u{1F1EA}',
  };
  return flags[country] ?? '\u{1F30D}';
}

/* ================================================================== */
/*  Sub-Components                                                     */
/* ================================================================== */

function StatusBadge({ status }: { status: TrunkShowStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', config.bg, config.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_COLOR[status])} />
      {config.label}
    </span>
  );
}

/* ================================================================== */
/*  Timeline Section                                                   */
/* ================================================================== */

function TimelineView({
  plans,
  onSelectShow,
}: {
  plans: PlannedTrunkShow[];
  onSelectShow: (plan: PlannedTrunkShow) => void;
}) {
  const [scrollYear, setScrollYear] = useState(2026);

  const yearPlans = useMemo(
    () => plans.filter((p) => new Date(p.startDate).getFullYear() === scrollYear),
    [plans, scrollYear],
  );

  const plansByMonth = useMemo(() => {
    const map: Record<number, PlannedTrunkShow[]> = {};
    for (const p of yearPlans) {
      const month = new Date(p.startDate).getMonth();
      if (!map[month]) map[month] = [];
      map[month].push(p);
    }
    return map;
  }, [yearPlans]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Trunk Show Timeline
            </CardTitle>
            <CardDescription>Visual roadmap of planned events across the year</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setScrollYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[3rem] text-center">{scrollYear}</span>
            <Button variant="outline" size="sm" onClick={() => setScrollYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {(['confirmed', 'planned', 'completed', 'cancelled'] as TrunkShowStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_DOT_COLOR[s])} />
              {STATUS_CONFIG[s].label}
            </div>
          ))}
        </div>

        {/* Month Grid */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-[800px]">
            {MONTHS.map((monthName, monthIdx) => {
              const monthPlans = plansByMonth[monthIdx] ?? [];
              const isCurrentMonth =
                new Date().getFullYear() === scrollYear && new Date().getMonth() === monthIdx;

              return (
                <div
                  key={monthIdx}
                  className={cn(
                    'flex-1 min-w-[60px] border rounded-lg p-2 transition-colors',
                    isCurrentMonth
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/20'
                      : 'border-border',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium text-center mb-2',
                    isCurrentMonth ? 'text-teal-700 dark:text-teal-400' : 'text-muted-foreground',
                  )}>
                    {monthName}
                  </div>
                  <div className="flex flex-col gap-1.5 min-h-[60px]">
                    {monthPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => onSelectShow(plan)}
                        className={cn(
                          'w-full rounded-md px-1.5 py-1 text-[10px] font-medium text-left transition-all hover:scale-105 hover:shadow-md cursor-pointer',
                          STATUS_CONFIG[plan.status].bg,
                          STATUS_CONFIG[plan.status].color,
                        )}
                        title={`${plan.city} — ${formatCurrency(plan.expectedRevenue)} expected revenue`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT_COLOR[plan.status])} />
                          <span className="truncate">{plan.city}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/*  Trunk Show Detail Cards                                            */
/* ================================================================== */

function TrunkShowCard({
  plan,
  onSelect,
}: {
  plan: PlannedTrunkShow;
  onSelect: (plan: PlannedTrunkShow) => void;
}) {
  const expectedBookings = Math.round(plan.expectedAppointments * plan.conversionRate);
  const roiPercent = plan.totalCost > 0 ? ((plan.roi / plan.totalCost) * 100) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(plan)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(plan.country)}</span>
            <div>
              <CardTitle className="text-base">{plan.city}</CardTitle>
              <CardDescription>{formatDateRange(plan.startDate, plan.endDate)}</CardDescription>
            </div>
          </div>
          <StatusBadge status={plan.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Team */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{plan.staffRequired + 1} staff</span>
          </div>
          {plan.freelancersRequired > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{plan.freelancersRequired} freelance</span>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hotel</span>
            <span className="font-medium">{formatCurrency(plan.hotelCostEstimate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Travel</span>
            <span className="font-medium">{formatCurrency(plan.travelCostEstimate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Freelancers</span>
            <span className="font-medium">{formatCurrency(plan.freelancerCostEstimate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">{formatCurrency(plan.shippingCostEstimate)}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Revenue */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Appointments</span>
            <span className="font-medium">{plan.expectedAppointments}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Bookings ({formatPercent(plan.conversionRate * 100)})
            </span>
            <span className="font-medium">{expectedBookings}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Dress Price</span>
            <span className="font-medium">{formatCurrency(plan.averageDressPrice)}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Totals */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm font-medium">
            <span>Total Cost</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(plan.totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Expected Revenue</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(plan.expectedRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>ROI</span>
            <span className={cn(
              plan.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {formatCurrency(plan.roi)} ({roiPercent > 0 ? '+' : ''}{Math.round(roiPercent)}%)
            </span>
          </div>
        </div>
      </CardContent>
      {plan.notes && (
        <CardFooter className="pt-0">
          <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
        </CardFooter>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  Financial Impact Summary                                           */
/* ================================================================== */

function FinancialImpactSection({
  plans,
  historicalSpend,
}: {
  plans: PlannedTrunkShow[];
  historicalSpend: Array<{ month: string; spend: number }>;
}) {
  const activePlans = plans.filter((p) => p.status !== 'cancelled');
  const totalCost = activePlans.reduce((s, p) => s + p.totalCost, 0);
  const totalRevenue = activePlans.reduce((s, p) => s + p.expectedRevenue, 0);
  const netRoi = totalRevenue - totalCost;
  const roiPercent = totalCost > 0 ? (netRoi / totalCost) * 100 : 0;

  // Monthly cash flow impact — outflows in trunk show months, inflows 1-2 months later
  const monthlyImpact = useMemo(() => {
    const impactMap: Record<string, MonthlyFinancialImpact> = {};

    for (const plan of activePlans) {
      const costMonth = getMonthKey(plan.startDate);
      const costLabel = getMonthLabel(plan.startDate);

      // Outflow in event month
      if (!impactMap[costMonth]) {
        impactMap[costMonth] = { month: costMonth, label: costLabel, outflow: 0, inflow: 0, net: 0 };
      }
      impactMap[costMonth].outflow += plan.totalCost;

      // Revenue arrives 1-2 months after (deposit + final payment)
      const startDate = new Date(plan.startDate);
      const depositMonth = new Date(startDate);
      depositMonth.setMonth(depositMonth.getMonth() + 1);
      const depositKey = `${depositMonth.getFullYear()}-${String(depositMonth.getMonth() + 1).padStart(2, '0')}`;
      const depositLabel = depositMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      if (!impactMap[depositKey]) {
        impactMap[depositKey] = { month: depositKey, label: depositLabel, outflow: 0, inflow: 0, net: 0 };
      }
      impactMap[depositKey].inflow += plan.expectedRevenue * 0.5; // 50% deposit

      const finalMonth = new Date(startDate);
      finalMonth.setMonth(finalMonth.getMonth() + 3);
      const finalKey = `${finalMonth.getFullYear()}-${String(finalMonth.getMonth() + 1).padStart(2, '0')}`;
      const finalLabel = finalMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      if (!impactMap[finalKey]) {
        impactMap[finalKey] = { month: finalKey, label: finalLabel, outflow: 0, inflow: 0, net: 0 };
      }
      impactMap[finalKey].inflow += plan.expectedRevenue * 0.5; // 50% final
    }

    // Compute net
    for (const entry of Object.values(impactMap)) {
      entry.net = entry.inflow - entry.outflow;
    }

    return Object.values(impactMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [activePlans]);

  const chartData = monthlyImpact.map((m) => ({
    month: m.label,
    Outflow: -Math.round(m.outflow),
    Inflow: Math.round(m.inflow),
    Net: Math.round(m.net),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Planned Shows</div>
            <div className="text-2xl font-bold mt-1">{activePlans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Cost</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {formatCurrencyCompact(totalCost)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expected Revenue</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrencyCompact(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net ROI</div>
            <div className={cn(
              'text-2xl font-bold mt-1',
              netRoi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {formatCurrencyCompact(netRoi)}
              <span className="text-sm font-normal ml-1">({roiPercent > 0 ? '+' : ''}{Math.round(roiPercent)}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Impact Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Cash Flow Impact by Month
          </CardTitle>
          <CardDescription>
            Outflows at event time, inflows as deposits and final payments arrive (50/50 split, +1/+3 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={chartAxisFormatter()} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <RechartsTooltip
                  formatter={(value: unknown) => formatCurrency(Math.abs(Number(value ?? 0)))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                />
                <Legend />
                <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No cash flow data to display
            </div>
          )}
        </CardContent>
      </Card>

      {/* With vs Without Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Scenario Comparison
          </CardTitle>
          <CardDescription>Impact of trunk show programme on business performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Without Trunk Shows
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue Impact</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Additional Cost</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>New Clients</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Market Presence</span>
                  <span className="font-medium text-muted-foreground">Studio only</span>
                </div>
              </div>
            </div>
            <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 space-y-3 bg-teal-50/30 dark:bg-teal-950/20">
              <div className="text-sm font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                With Trunk Shows
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue Impact</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Additional Cost</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>New Clients</span>
                  <span className="font-medium">
                    {activePlans.reduce((s, p) => s + Math.round(p.expectedAppointments * p.conversionRate), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Market Presence</span>
                  <span className="font-medium text-teal-700 dark:text-teal-400">
                    {activePlans.length} cities
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Capacity Calendar                                                  */
/* ================================================================== */

function CapacityCalendar({ plans }: { plans: PlannedTrunkShow[] }) {
  const year = 2026;
  const resources = ['Anu (Principal)', 'Seamstress 1', 'Seamstress 2', 'Freelancer Pool'];

  const capacityGrid = useMemo(() => {
    const grid: CapacitySlot[][] = resources.map((resource) =>
      MONTHS.map((_, monthIdx) => ({
        month: MONTHS[monthIdx],
        resource,
        status: 'available' as const,
      })),
    );

    for (const plan of plans) {
      if (plan.status === 'cancelled') continue;
      const d = new Date(plan.startDate);
      if (d.getFullYear() !== year) continue;
      const monthIdx = d.getMonth();

      // Anu always goes
      grid[0][monthIdx] = {
        ...grid[0][monthIdx],
        status: 'booked',
        trunkShowId: plan.id,
      };

      // Staff
      for (let i = 1; i <= Math.min(plan.staffRequired, 2); i++) {
        const current = grid[i][monthIdx];
        if (current.status === 'booked') {
          grid[i][monthIdx] = { ...current, status: 'conflict' };
        } else {
          grid[i][monthIdx] = { ...current, status: 'booked', trunkShowId: plan.id };
        }
      }

      // Freelancers
      if (plan.freelancersRequired > 0) {
        grid[3][monthIdx] = {
          ...grid[3][monthIdx],
          status: 'booked',
          trunkShowId: plan.id,
        };
      }
    }

    return grid;
  }, [plans]);

  const cellColors: Record<CapacitySlot['status'], string> = {
    available: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    booked: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    conflict: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  const cellLabels: Record<CapacitySlot['status'], string> = {
    available: 'Free',
    booked: 'Booked',
    conflict: 'Clash',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          Capacity Calendar {year}
        </CardTitle>
        <CardDescription>Resource allocation across trunk show events</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800" />
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" />
            <span className="text-muted-foreground">Conflict</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-[140px]">Resource</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-center py-2 font-medium text-muted-foreground w-[50px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capacityGrid.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="py-1.5 pr-4 font-medium text-foreground">{resources[rowIdx]}</td>
                  {row.map((slot, colIdx) => (
                    <td key={colIdx} className="py-1.5 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium min-w-[40px]',
                          cellColors[slot.status],
                        )}
                      >
                        {cellLabels[slot.status]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/*  Optimal Plan (AI-Generated)                                        */
/* ================================================================== */

function OptimalPlanSection({
  plans,
  actualConversionRate,
  averageDressPrice,
  totalEnquiries,
  confirmedOrders,
}: {
  plans: PlannedTrunkShow[];
  actualConversionRate: number;
  averageDressPrice: number;
  totalEnquiries: number;
  confirmedOrders: number;
}) {
  const activePlans = plans.filter((p) => p.status !== 'cancelled');
  const totalExpectedRevenue = activePlans.reduce((s, p) => s + p.expectedRevenue, 0);
  const totalCost = activePlans.reduce((s, p) => s + p.totalCost, 0);

  const assumptions = [
    {
      label: 'Average dress price (MTO)',
      value: formatCurrency(averageDressPrice),
      editable: true,
    },
    {
      label: 'Conversion rate',
      value: formatPercent(actualConversionRate * 100),
      editable: true,
    },
    {
      label: 'Deposit at booking',
      value: '50%',
      editable: true,
    },
    {
      label: 'Revenue recognition',
      value: '50% deposit, 50% at delivery (+3 months)',
      editable: false,
    },
    {
      label: 'Historical enquiries',
      value: `${totalEnquiries} total, ${confirmedOrders} converted`,
      editable: false,
    },
    {
      label: 'Staff per trunk show',
      value: 'Anu + 1-2 seamstresses + freelancers as needed',
      editable: false,
    },
  ];

  const recommendations = [
    {
      city: 'New York',
      month: 'April 2026',
      rationale: 'Highest historical booking rate. Bridal season peak. Confirmed flagship event.',
    },
    {
      city: 'London',
      month: 'September 2026',
      rationale: 'Home market — lowest travel cost, highest appointment capacity. London bridal week timing.',
    },
    {
      city: 'Los Angeles',
      month: 'June 2026',
      rationale: 'Growing west coast demand. Summer wedding season alignment.',
    },
    {
      city: 'Dubai',
      month: 'November 2026',
      rationale: 'Premium market with higher average order values. Winter wedding season in Gulf region.',
    },
    {
      city: 'Miami',
      month: 'February 2027',
      rationale: 'Destination wedding market. Low-cost entry point with strong demographics.',
    },
  ];

  return (
    <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/30 to-transparent dark:from-teal-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          Optimal Plan — AI Recommendation
        </CardTitle>
        <CardDescription>
          Based on enquiry data, historical trunk show performance, and team capacity, here is the
          recommended plan for the next 12 months
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommended cities */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Recommended Events</h4>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.city}
                className="flex items-start gap-3 rounded-lg border p-3 bg-card"
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{rec.city}</span>
                    <span className="text-xs text-muted-foreground block">{rec.month}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{rec.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border p-4 bg-card">
          <div>
            <div className="text-xs text-muted-foreground">Expected Total Revenue</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalExpectedRevenue)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Investment</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalCost)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Net Return</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalExpectedRevenue - totalCost)}
            </div>
          </div>
        </div>

        {/* Assumptions */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Key Assumptions</h4>
          <div className="space-y-2">
            {assumptions.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm rounded-lg border p-2.5 bg-card">
                <span className="text-muted-foreground">{a.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.value}</span>
                  {a.editable && (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      Editable
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/*  Create Trunk Show Modal                                            */
/* ================================================================== */

function CreateTrunkShowModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (plan: PlannedTrunkShow) => void;
}) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('UK');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffRequired, setStaffRequired] = useState(2);
  const [freelancersRequired, setFreelancersRequired] = useState(1);
  const [hotelCost, setHotelCost] = useState(3000);
  const [travelCost, setTravelCost] = useState(2000);
  const [freelancerCost, setFreelancerCost] = useState(2000);
  const [shippingCost, setShippingCost] = useState(1000);
  const [appointments, setAppointments] = useState(10);
  const [conversionRate, setConversionRate] = useState(0.8);
  const [dressPrice, setDressPrice] = useState(6400);
  const [notes, setNotes] = useState('');

  const totalCost = hotelCost + travelCost + freelancerCost + shippingCost;
  const expectedBookings = Math.round(appointments * conversionRate);
  const expectedRevenue = expectedBookings * dressPrice;
  const roi = expectedRevenue - totalCost;

  const handleSubmit = () => {
    if (!city || !startDate || !endDate) return;

    const plan: PlannedTrunkShow = {
      id: crypto.randomUUID(),
      city,
      country,
      startDate,
      endDate,
      staffRequired,
      freelancersRequired,
      hotelCostEstimate: hotelCost,
      travelCostEstimate: travelCost,
      freelancerCostEstimate: freelancerCost,
      shippingCostEstimate: shippingCost,
      expectedAppointments: appointments,
      conversionRate,
      averageDressPrice: dressPrice,
      expectedRevenue,
      totalCost,
      roi,
      status: 'planned',
      notes: notes || undefined,
    };

    onSubmit(plan);
    onClose();

    // Reset form
    setCity('');
    setCountry('UK');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-teal-600" />
            Plan New Trunk Show
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to plan a new trunk show event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="UK">United Kingdom</option>
                <option value="US">United States</option>
                <option value="UAE">UAE</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Staff */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Staff Required (excl. Anu)</label>
              <input
                type="number"
                min={0}
                value={staffRequired}
                onChange={(e) => setStaffRequired(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Freelancers Required</label>
              <input
                type="number"
                min={0}
                value={freelancersRequired}
                onChange={(e) => setFreelancersRequired(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Costs */}
          <div>
            <label className="block text-sm font-semibold mb-2">Cost Estimates</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Hotel</label>
                <input
                  type="number"
                  min={0}
                  value={hotelCost}
                  onChange={(e) => setHotelCost(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Travel</label>
                <input
                  type="number"
                  min={0}
                  value={travelCost}
                  onChange={(e) => setTravelCost(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Freelancers</label>
                <input
                  type="number"
                  min={0}
                  value={freelancerCost}
                  onChange={(e) => setFreelancerCost(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Shipping</label>
                <input
                  type="number"
                  min={0}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Revenue Expectations */}
          <div>
            <label className="block text-sm font-semibold mb-2">Revenue Expectations</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Expected Appointments</label>
                <input
                  type="number"
                  min={0}
                  value={appointments}
                  onChange={(e) => setAppointments(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Conversion Rate</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Avg Dress Price</label>
                <input
                  type="number"
                  min={0}
                  value={dressPrice}
                  onChange={(e) => setDressPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Optional notes about this trunk show..."
            />
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="text-sm font-semibold">Live Preview</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Cost</span>
                <div className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalCost)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Revenue</span>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(expectedRevenue)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">ROI</span>
                <div className={cn('font-semibold', roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {formatCurrency(roi)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!city || !startDate || !endDate}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Trunk Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Detail Modal                                                       */
/* ================================================================== */

function TrunkShowDetailModal({
  plan,
  onClose,
}: {
  plan: PlannedTrunkShow | null;
  onClose: () => void;
}) {
  if (!plan) return null;

  const expectedBookings = Math.round(plan.expectedAppointments * plan.conversionRate);
  const roiPercent = plan.totalCost > 0 ? ((plan.roi / plan.totalCost) * 100) : 0;

  return (
    <Dialog open={!!plan} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(plan.country)}</span>
            {plan.city} Trunk Show
          </DialogTitle>
          <DialogDescription>
            {formatDateRange(plan.startDate, plan.endDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.status} />
          </div>

          {/* Team */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-semibold">Team</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Staff (incl. Anu)</span>
                <span className="font-medium">{plan.staffRequired + 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freelancers</span>
                <span className="font-medium">{plan.freelancersRequired}</span>
              </div>
            </div>
          </div>

          {/* Costs */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-semibold">Cost Breakdown</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span>{formatCurrency(plan.hotelCostEstimate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Travel</span>
                <span>{formatCurrency(plan.travelCostEstimate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freelancers</span>
                <span>{formatCurrency(plan.freelancerCostEstimate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(plan.shippingCostEstimate)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Total Cost</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(plan.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-semibold">Revenue Projection</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Appointments</span>
                <span>{plan.expectedAppointments}</span>
              </div>
              <div className="flex items-center gap-1 justify-between">
                <span className="text-muted-foreground">Conversion Rate</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{formatPercent(plan.conversionRate * 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Bookings</span>
                <span className="font-medium">{expectedBookings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Dress Price</span>
                <span>{formatCurrency(plan.averageDressPrice)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Expected Revenue</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(plan.expectedRevenue)}</span>
              </div>
            </div>
          </div>

          {/* ROI */}
          <div className={cn(
            'rounded-lg p-3 text-center',
            plan.roi >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800',
          )}>
            <div className="text-xs text-muted-foreground mb-1">Return on Investment</div>
            <div className={cn(
              'text-xl font-bold',
              plan.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {formatCurrency(plan.roi)} ({roiPercent > 0 ? '+' : ''}{Math.round(roiPercent)}%)
            </div>
          </div>

          {plan.notes && (
            <div className="text-sm text-muted-foreground italic border-t pt-3">
              {plan.notes}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Main Planner Client                                                */
/* ================================================================== */

export function PlannerClient({
  plans: initialPlans,
  historicalSpend,
  historicalSpendByMonth,
  actualConversionRate,
  averageDressPrice,
  orgName,
  totalEnquiries,
  confirmedOrders,
}: PlannerClientProps) {
  const [plans, setPlans] = useState<PlannedTrunkShow[]>(initialPlans);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlannedTrunkShow | null>(null);

  const handleAddPlan = useCallback((plan: PlannedTrunkShow) => {
    setPlans((prev) => [...prev, plan]);
  }, []);

  const handleSelectShow = useCallback((plan: PlannedTrunkShow) => {
    setSelectedPlan(plan);
  }, []);

  const activePlans = useMemo(
    () => plans.filter((p) => p.status !== 'cancelled'),
    [plans],
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plane className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            Trunk Show Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan, track, and forecast your trunk show events and their financial impact
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Trunk Show
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">Event Cards</TabsTrigger>
          <TabsTrigger value="financials">Financial Impact</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="optimal">AI Recommendation</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <TimelineView plans={plans} onSelectShow={handleSelectShow} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {activePlans.slice(0, 5).map((plan) => (
              <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectShow(plan)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLOR[plan.status])} />
                    <span className="text-sm font-medium">{plan.city}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateRange(plan.startDate, plan.endDate)}</div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrencyCompact(plan.expectedRevenue)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Historical Spend Chart */}
          {historicalSpend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historical Trunk Show Spend</CardTitle>
                <CardDescription>Past 12 months of trunk show-related expenditure from Xero</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={historicalSpend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tickFormatter={chartAxisFormatter()} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <RechartsTooltip
                      formatter={(value: unknown) => formatCurrency(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                    <Bar dataKey="spend" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Spend" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Event Cards Tab ── */}
        <TabsContent value="cards" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <TrunkShowCard key={plan.id} plan={plan} onSelect={handleSelectShow} />
            ))}
          </div>
        </TabsContent>

        {/* ── Financial Impact Tab ── */}
        <TabsContent value="financials" className="mt-4">
          <FinancialImpactSection plans={plans} historicalSpend={historicalSpend} />
        </TabsContent>

        {/* ── Capacity Tab ── */}
        <TabsContent value="capacity" className="mt-4">
          <CapacityCalendar plans={plans} />
        </TabsContent>

        {/* ── AI Recommendation Tab ── */}
        <TabsContent value="optimal" className="mt-4">
          <OptimalPlanSection
            plans={plans}
            actualConversionRate={actualConversionRate}
            averageDressPrice={averageDressPrice}
            totalEnquiries={totalEnquiries}
            confirmedOrders={confirmedOrders}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateTrunkShowModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleAddPlan}
      />
      <TrunkShowDetailModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}
