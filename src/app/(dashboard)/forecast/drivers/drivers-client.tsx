'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Users,
  Plane,
  Building,
  Megaphone,
  Plus,
  Minus,
  TrendingUp,
  Power,
  Calendar,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatCurrencyCompact,
  chartAxisFormatter,
  formatPercent,
} from '@/lib/formatting/currency';
import type {
  DriverTemplate,
  DriverInstance,
  DriverImpact,
} from '@/lib/forecast/drivers';
import {
  getBuiltInTemplates,
  calculateDriverImpact,
  aggregateDriverImpacts,
  generateMonthRange,
} from '@/lib/forecast/drivers';

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Plane,
  Building,
  Megaphone,
  TrendingUp,
};

function DriverIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || TrendingUp;
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DriversClientProps {
  orgId: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DriversClient({ orgId: _orgId, role }: DriversClientProps) {
  const templates = useMemo(() => getBuiltInTemplates(), []);

  const [instances, setInstances] = useState<DriverInstance[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formEndDate, setFormEndDate] = useState('');

  const isAdmin = role === 'admin' || role === 'owner';

  // ── Generate 12 months starting from today ──────────────────────
  const months = useMemo(
    () => generateMonthRange(new Date().toISOString().slice(0, 7), 12),
    [],
  );

  // ── Calculate impacts for all active instances ──────────────────
  const { impactsByInstance, aggregated } = useMemo(() => {
    const allImpacts: DriverImpact[][] = [];
    const byInstance: { instance: DriverInstance; template: DriverTemplate; impacts: DriverImpact[] }[] = [];

    for (const inst of instances) {
      const tmpl = templates.find((t) => t.id === inst.templateId);
      if (!tmpl) continue;

      const impacts = calculateDriverImpact(tmpl, inst, months);
      allImpacts.push(impacts);
      byInstance.push({ instance: inst, template: tmpl, impacts });
    }

    return {
      impactsByInstance: byInstance,
      aggregated: aggregateDriverImpacts(allImpacts),
    };
  }, [instances, templates, months]);

  // ── Chart data ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    let cumulative = 0;
    return aggregated.map((impact) => {
      cumulative += impact.netImpact;
      return {
        month: impact.month,
        cost: -impact.totalCost,
        revenue: impact.totalRevenue,
        net: impact.netImpact,
        cumulative,
      };
    });
  }, [aggregated]);

  // ── Table data ─────────────────────────────────────────────────
  const tableData = useMemo(() => {
    let cumulative = 0;

    // Categorise costs by driver type
    return aggregated.map((impact) => {
      const staffCost = impact.costBreakdown
        .filter((b) =>
          ['Salary', 'Employer NIC', 'Employer Pension', 'Workspace Overhead'].includes(b.label),
        )
        .reduce((s, b) => s + b.amount, 0);

      const eventCost = impact.costBreakdown
        .filter((b) =>
          ['Travel', 'Hotel & Accommodation', 'Freelancers', 'Shipping & Logistics', 'Food & Drink', 'Campaign Spend'].includes(b.label),
        )
        .reduce((s, b) => s + b.amount, 0);

      const overheadCost = impact.costBreakdown
        .filter((b) => ['Rent', 'Utilities', 'Insurance'].includes(b.label))
        .reduce((s, b) => s + b.amount, 0);

      cumulative += impact.netImpact;

      return {
        month: impact.month,
        staffCost,
        eventCost,
        overheadCost,
        totalRevenue: impact.totalRevenue,
        netImpact: impact.netImpact,
        cumulative,
      };
    });
  }, [aggregated]);

  // ── Scenario comparison ─────────────────────────────────────────
  const scenarioData = useMemo(() => {
    // Current scenario
    const currentTotal = aggregated.reduce(
      (acc, m) => ({
        cost: acc.cost + m.totalCost,
        revenue: acc.revenue + m.totalRevenue,
        net: acc.net + m.netImpact,
      }),
      { cost: 0, revenue: 0, net: 0 },
    );

    // +1 Seamstress scenario
    const seamstressTemplate = templates.find((t) => t.id === 'tmpl_seamstress');
    const extraSeamstress: DriverInstance = {
      id: 'scenario_seamstress',
      templateId: 'tmpl_seamstress',
      templateName: 'Seamstress',
      name: 'Extra Seamstress',
      quantity: 1,
      startDate: new Date().toISOString().slice(0, 10),
      overrides: {},
      active: true,
    };

    const seamstressImpacts = seamstressTemplate
      ? calculateDriverImpact(seamstressTemplate, extraSeamstress, months)
      : [];
    const seamstressAdded = seamstressImpacts.reduce(
      (acc, m) => ({
        cost: acc.cost + m.totalCost,
        revenue: acc.revenue + m.totalRevenue,
        net: acc.net + m.netImpact,
      }),
      { cost: 0, revenue: 0, net: 0 },
    );

    // +2 Trunk Shows scenario
    const trunkTemplate = templates.find((t) => t.id === 'tmpl_trunk_show');
    const extraTrunk: DriverInstance = {
      id: 'scenario_trunk',
      templateId: 'tmpl_trunk_show',
      templateName: 'Trunk Show Event',
      name: 'Extra Trunk Shows',
      quantity: 2,
      startDate: new Date().toISOString().slice(0, 10),
      overrides: {},
      active: true,
    };

    const trunkImpacts = trunkTemplate
      ? calculateDriverImpact(trunkTemplate, extraTrunk, months)
      : [];
    const trunkAdded = trunkImpacts.reduce(
      (acc, m) => ({
        cost: acc.cost + m.totalCost,
        revenue: acc.revenue + m.totalRevenue,
        net: acc.net + m.netImpact,
      }),
      { cost: 0, revenue: 0, net: 0 },
    );

    // Calculate ROI for each scenario addition
    const seamstressROI = seamstressAdded.cost > 0
      ? ((seamstressAdded.revenue - seamstressAdded.cost) / seamstressAdded.cost) * 100
      : 0;
    const trunkROI = trunkAdded.cost > 0
      ? ((trunkAdded.revenue - trunkAdded.cost) / trunkAdded.cost) * 100
      : 0;

    return {
      current: currentTotal,
      plusSeamstress: {
        cost: currentTotal.cost + seamstressAdded.cost,
        revenue: currentTotal.revenue + seamstressAdded.revenue,
        net: currentTotal.net + seamstressAdded.net,
        addedNet: seamstressAdded.net,
        roi: seamstressROI,
      },
      plusTrunkShows: {
        cost: currentTotal.cost + trunkAdded.cost,
        revenue: currentTotal.revenue + trunkAdded.revenue,
        net: currentTotal.net + trunkAdded.net,
        addedNet: trunkAdded.net,
        roi: trunkROI,
      },
      bestROI: seamstressROI >= trunkROI ? 'Seamstress' : 'Trunk Shows',
    };
  }, [aggregated, templates, months]);

  // ── Add driver handler ─────────────────────────────────────────
  const handleAddDriver = useCallback(() => {
    if (!selectedTemplateId) return;
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;

    const newInstance: DriverInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      templateId: selectedTemplateId,
      templateName: tmpl.name,
      name: formName || `${tmpl.name} #${instances.filter((i) => i.templateId === selectedTemplateId).length + 1}`,
      quantity: formQuantity,
      startDate: formStartDate,
      endDate: formEndDate || undefined,
      overrides: {},
      active: true,
    };

    setInstances((prev) => [...prev, newInstance]);
    setAddDialogOpen(false);
    resetForm();
  }, [selectedTemplateId, formName, formQuantity, formStartDate, formEndDate, templates, instances]);

  const resetForm = () => {
    setSelectedTemplateId(null);
    setFormName('');
    setFormQuantity(1);
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
  };

  const toggleInstanceActive = (id: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === id ? { ...inst, active: !inst.active } : inst,
      ),
    );
  };

  const removeInstance = (id: string) => {
    setInstances((prev) => prev.filter((inst) => inst.id !== id));
  };

  // ── Per-instance monthly totals ────────────────────────────────
  const getInstanceMonthlyTotals = (
    impacts: DriverImpact[],
  ): { monthlyCost: number; monthlyRevenue: number; monthlyNet: number } => {
    const activeMonths = impacts.filter((i) => i.totalCost > 0 || i.totalRevenue > 0);
    if (activeMonths.length === 0) return { monthlyCost: 0, monthlyRevenue: 0, monthlyNet: 0 };

    const totalCost = activeMonths.reduce((s, i) => s + i.totalCost, 0);
    const totalRevenue = activeMonths.reduce((s, i) => s + i.totalRevenue, 0);

    return {
      monthlyCost: totalCost / activeMonths.length,
      monthlyRevenue: totalRevenue / activeMonths.length,
      monthlyNet: (totalRevenue - totalCost) / activeMonths.length,
    };
  };

  // ── Format month label ─────────────────────────────────────────
  const formatMonthLabel = (month: string): string => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };

  const yAxisFormatter = chartAxisFormatter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast Drivers</h1>
          <p className="text-muted-foreground">
            Define cost and revenue drivers that cascade through your forecast.
            Add staff, events, assets, or campaigns to model their financial impact.
          </p>
        </div>
      </div>

      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="drivers">Active Drivers</TabsTrigger>
          <TabsTrigger value="forecast">12-Month Impact</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Comparison</TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/*  TAB 1: Active Drivers + Add Driver                            */}
        {/* ============================================================== */}
        <TabsContent value="drivers" className="space-y-6">
          {/* Section 1: Active Driver Instances */}
          {instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">No drivers configured yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first driver to see how staff, events, and assets impact your forecast.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {impactsByInstance.map(({ instance, template, impacts }) => {
                const totals = getInstanceMonthlyTotals(impacts);
                return (
                  <Card
                    key={instance.id}
                    className={cn(
                      'transition-opacity',
                      !instance.active && 'opacity-50',
                    )}
                  >
                    <CardContent className="pt-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <DriverIcon
                              name={template.icon}
                              className="h-4 w-4 text-primary"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {instance.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {template.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {instance.quantity > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              x{instance.quantity}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleInstanceActive(instance.id)}
                            disabled={!isAdmin}
                            title={instance.active ? 'Deactivate' : 'Activate'}
                          >
                            <Power className={cn(
                              'h-3.5 w-3.5',
                              instance.active ? 'text-green-600' : 'text-muted-foreground',
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeInstance(instance.id)}
                            disabled={!isAdmin}
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Financial summary */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Cost/mo</p>
                          <p className="text-sm font-medium text-destructive tabular-nums">
                            {formatCurrency(totals.monthlyCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rev/mo</p>
                          <p className="text-sm font-medium text-green-600 tabular-nums">
                            {formatCurrency(totals.monthlyRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net/mo</p>
                          <p className={cn(
                            'text-sm font-medium tabular-nums',
                            totals.monthlyNet >= 0 ? 'text-green-600' : 'text-destructive',
                          )}>
                            {formatCurrency(totals.monthlyNet)}
                          </p>
                        </div>
                      </div>

                      {/* Date range */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(instance.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {instance.endDate
                            ? ` \u2192 ${new Date(instance.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : ' \u2192 Ongoing'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Section 2: Add Driver */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Add Driver</h3>
                {isAdmin && instances.length > 0 && (
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Driver
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Configure Driver</DialogTitle>
                        <DialogDescription>
                          Set the quantity, dates, and name for your new driver instance.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="driver-template">Template</Label>
                          <Select
                            value={selectedTemplateId || ''}
                            onValueChange={(val) => setSelectedTemplateId(val)}
                          >
                            <SelectTrigger id="driver-template">
                              <SelectValue placeholder="Select a driver template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((tmpl) => (
                                <SelectItem key={tmpl.id} value={tmpl.id}>
                                  {tmpl.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="driver-name">Name (optional)</Label>
                          <Input
                            id="driver-name"
                            placeholder="e.g. Seamstress #3"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="driver-qty">Quantity</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                id="driver-qty"
                                type="number"
                                min={1}
                                max={99}
                                value={formQuantity}
                                onChange={(e) => setFormQuantity(Math.max(1, Number(e.target.value)))}
                                className="text-center"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => setFormQuantity(formQuantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="driver-start">Start Date</Label>
                            <Input
                              id="driver-start"
                              type="date"
                              value={formStartDate}
                              onChange={(e) => setFormStartDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="driver-end">End Date</Label>
                            <Input
                              id="driver-end"
                              type="date"
                              value={formEndDate}
                              onChange={(e) => setFormEndDate(e.target.value)}
                              placeholder="Ongoing"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddDialogOpen(false);
                            resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddDriver}
                          disabled={!selectedTemplateId}
                        >
                          Add to Forecast
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Template picker grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {templates.map((tmpl) => {
                  const monthlyCost = tmpl.costComponents.reduce((sum, c) => {
                    if (c.frequency === 'monthly') return sum + c.annualAmount / 12;
                    if (c.frequency === 'one-off') return sum + c.annualAmount;
                    return sum;
                  }, 0);
                  const monthlyRevenue = tmpl.revenueComponents.reduce((sum, r) => {
                    if (r.frequency === 'monthly') return sum + r.unitOutput * r.revenuePerUnit;
                    return sum;
                  }, 0);

                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        if (!isAdmin) return;
                        setSelectedTemplateId(tmpl.id);
                        setAddDialogOpen(true);
                      }}
                      disabled={!isAdmin}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors',
                        'hover:bg-accent hover:border-primary/30',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <DriverIcon name={tmpl.icon} className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tmpl.description.slice(0, 60)}...
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-destructive">
                          -{formatCurrencyCompact(monthlyCost)}/mo
                        </span>
                        {monthlyRevenue > 0 && (
                          <span className="text-green-600">
                            +{formatCurrencyCompact(monthlyRevenue)}/mo
                          </span>
                        )}
                      </div>
                      {!tmpl.scalable && (
                        <Badge variant="outline" className="text-xs">
                          Single instance
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/*  TAB 2: 12-Month Impact Forecast                               */}
        {/* ============================================================== */}
        <TabsContent value="forecast" className="space-y-6">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-muted-foreground">
                  Add at least one driver to see the 12-month impact forecast.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">12-Month Total Cost</p>
                    <p className="text-xl font-bold text-destructive tabular-nums">
                      {formatCurrency(aggregated.reduce((s, m) => s + m.totalCost, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">12-Month Total Revenue</p>
                    <p className="text-xl font-bold text-green-600 tabular-nums">
                      {formatCurrency(aggregated.reduce((s, m) => s + m.totalRevenue, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">12-Month Net Impact</p>
                    <p className={cn(
                      'text-xl font-bold tabular-nums',
                      aggregated.reduce((s, m) => s + m.netImpact, 0) >= 0
                        ? 'text-green-600'
                        : 'text-destructive',
                    )}>
                      {formatCurrency(aggregated.reduce((s, m) => s + m.netImpact, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Active Drivers</p>
                    <p className="text-xl font-bold tabular-nums">
                      {instances.filter((i) => i.active).length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Stacked bar chart: Cost (below 0) vs Revenue (above 0) */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium mb-4">Monthly Cost vs Revenue</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} stackOffset="sign">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tickFormatter={formatMonthLabel}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickFormatter={yAxisFormatter}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(Math.abs(Number(value ?? 0))),
                            String(name) === 'cost' ? 'Cost' : 'Revenue',
                          ]}
                          labelFormatter={(label: unknown) => formatMonthLabel(String(label ?? ''))}
                        />
                        <Legend
                          formatter={(value: string) =>
                            value === 'cost' ? 'Cost' : 'Revenue'
                          }
                        />
                        <ReferenceLine y={0} stroke="#888" />
                        <Bar
                          dataKey="cost"
                          fill="#ef4444"
                          stackId="stack"
                          radius={[0, 0, 4, 4]}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="#22c55e"
                          stackId="stack"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cumulative net impact line */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium mb-4">Cumulative Net Impact</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tickFormatter={formatMonthLabel}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickFormatter={yAxisFormatter}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value) => [
                            formatCurrency(Number(value ?? 0)),
                            'Cumulative Net',
                          ]}
                          labelFormatter={(label: unknown) => formatMonthLabel(String(label ?? ''))}
                        />
                        <ReferenceLine y={0} stroke="#888" />
                        <Bar
                          dataKey="cumulative"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly breakdown table */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium mb-3">Monthly Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Staff Cost</TableHead>
                        <TableHead className="text-right">Event Cost</TableHead>
                        <TableHead className="text-right">Overhead</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Net Impact</TableHead>
                        <TableHead className="text-right">Cumulative</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">
                            {formatMonthLabel(row.month)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">
                            {row.staffCost > 0 ? formatCurrency(row.staffCost) : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">
                            {row.eventCost > 0 ? formatCurrency(row.eventCost) : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">
                            {row.overheadCost > 0 ? formatCurrency(row.overheadCost) : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-green-600">
                            {row.totalRevenue > 0 ? formatCurrency(row.totalRevenue) : '\u2014'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right tabular-nums font-medium',
                            row.netImpact >= 0 ? 'text-green-600' : 'text-destructive',
                          )}>
                            {formatCurrency(row.netImpact)}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right tabular-nums font-medium',
                            row.cumulative >= 0 ? 'text-green-600' : 'text-destructive',
                          )}>
                            {formatCurrency(row.cumulative)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(tableData.reduce((s, r) => s + r.staffCost, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(tableData.reduce((s, r) => s + r.eventCost, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(tableData.reduce((s, r) => s + r.overheadCost, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">
                          {formatCurrency(tableData.reduce((s, r) => s + r.totalRevenue, 0))}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right tabular-nums',
                          tableData.reduce((s, r) => s + r.netImpact, 0) >= 0
                            ? 'text-green-600'
                            : 'text-destructive',
                        )}>
                          {formatCurrency(tableData.reduce((s, r) => s + r.netImpact, 0))}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right tabular-nums',
                          (tableData[tableData.length - 1]?.cumulative ?? 0) >= 0
                            ? 'text-green-600'
                            : 'text-destructive',
                        )}>
                          {formatCurrency(tableData[tableData.length - 1]?.cumulative ?? 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/*  TAB 3: Scenario Comparison                                    */}
        {/* ============================================================== */}
        <TabsContent value="scenarios" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Drivers */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Drivers</p>
                    <p className="text-xs text-muted-foreground">
                      {instances.filter((i) => i.active).length} active
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Cost</span>
                    <span className="font-medium text-destructive tabular-nums">
                      {formatCurrency(scenarioData.current.cost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Revenue</span>
                    <span className="font-medium text-green-600 tabular-nums">
                      {formatCurrency(scenarioData.current.revenue)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="font-medium">Net Profit</span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      scenarioData.current.net >= 0 ? 'text-green-600' : 'text-destructive',
                    )}>
                      {formatCurrency(scenarioData.current.net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* +1 Seamstress */}
            <Card className={cn(
              'border-2',
              scenarioData.bestROI === 'Seamstress' ? 'border-green-500/50' : '',
            )}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">+ 1 Seamstress</p>
                      <p className="text-xs text-muted-foreground">Added to current</p>
                    </div>
                  </div>
                  {scenarioData.bestROI === 'Seamstress' && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Best ROI
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Cost</span>
                    <span className="font-medium text-destructive tabular-nums">
                      {formatCurrency(scenarioData.plusSeamstress.cost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Revenue</span>
                    <span className="font-medium text-green-600 tabular-nums">
                      {formatCurrency(scenarioData.plusSeamstress.revenue)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="font-medium">Net Profit</span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      scenarioData.plusSeamstress.net >= 0 ? 'text-green-600' : 'text-destructive',
                    )}>
                      {formatCurrency(scenarioData.plusSeamstress.net)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Added Net</span>
                    <span className={cn(
                      'font-medium tabular-nums',
                      scenarioData.plusSeamstress.addedNet >= 0 ? 'text-green-600' : 'text-destructive',
                    )}>
                      {scenarioData.plusSeamstress.addedNet >= 0 ? '+' : ''}
                      {formatCurrency(scenarioData.plusSeamstress.addedNet)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ROI</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(Math.round(scenarioData.plusSeamstress.roi))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* +2 Trunk Shows */}
            <Card className={cn(
              'border-2',
              scenarioData.bestROI === 'Trunk Shows' ? 'border-green-500/50' : '',
            )}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Plane className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">+ 2 Trunk Shows</p>
                      <p className="text-xs text-muted-foreground">Added to current</p>
                    </div>
                  </div>
                  {scenarioData.bestROI === 'Trunk Shows' && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Best ROI
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Cost</span>
                    <span className="font-medium text-destructive tabular-nums">
                      {formatCurrency(scenarioData.plusTrunkShows.cost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">12-Mo Revenue</span>
                    <span className="font-medium text-green-600 tabular-nums">
                      {formatCurrency(scenarioData.plusTrunkShows.revenue)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="font-medium">Net Profit</span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      scenarioData.plusTrunkShows.net >= 0 ? 'text-green-600' : 'text-destructive',
                    )}>
                      {formatCurrency(scenarioData.plusTrunkShows.net)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Added Net</span>
                    <span className={cn(
                      'font-medium tabular-nums',
                      scenarioData.plusTrunkShows.addedNet >= 0 ? 'text-green-600' : 'text-destructive',
                    )}>
                      {scenarioData.plusTrunkShows.addedNet >= 0 ? '+' : ''}
                      {formatCurrency(scenarioData.plusTrunkShows.addedNet)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ROI</span>
                    <span className="font-medium tabular-nums">
                      {formatPercent(Math.round(scenarioData.plusTrunkShows.roi))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ROI insight */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">ROI Insight</p>
                  <p className="text-muted-foreground mt-1">
                    {scenarioData.bestROI === 'Seamstress' ? (
                      <>
                        Adding a <strong>Seamstress</strong> delivers the highest ROI at{' '}
                        <strong>{formatPercent(Math.round(scenarioData.plusSeamstress.roi))}</strong> over 12 months,
                        generating {formatCurrency(scenarioData.plusSeamstress.addedNet)} in additional
                        net profit. Each seamstress produces ~40 dresses/year at {formatCurrency(6400)} average price,
                        far exceeding their fully loaded cost of ~{formatCurrency(33904)}/year.
                      </>
                    ) : (
                      <>
                        Adding <strong>2 Trunk Shows</strong> delivers the highest ROI at{' '}
                        <strong>{formatPercent(Math.round(scenarioData.plusTrunkShows.roi))}</strong> over 12 months,
                        generating {formatCurrency(scenarioData.plusTrunkShows.addedNet)} in additional
                        net profit. At ~{formatCurrency(11000)} cost per show, each generates approximately{' '}
                        {formatCurrency(61440)} in orders.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
