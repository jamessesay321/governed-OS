'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import type {
  SchedulingSummary,
  AcuityAppointment,
  RevenueByType,
  ClientFrequency,
} from '@/lib/integrations/acuity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  orgId: string;
  role: string;
  acuityConfigured: boolean;
};

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(datetime: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(datetime));
}

function formatRelativeDate(datetime: string): string {
  const now = new Date();
  const date = new Date(datetime);
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return formatDate(datetime);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SchedulingClient({ orgId, role, acuityConfigured }: Props) {
  const [state, setState] = useState<LoadingState>(acuityConfigured ? 'idle' : 'idle');
  const [data, setData] = useState<SchedulingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/integrations/acuity');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const summary: SchedulingSummary = await res.json();
      setData(summary);
      setState('loaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduling data');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (acuityConfigured) {
      fetchData();
    }
  }, [acuityConfigured, fetchData]);

  // ---------------------------------------------------------------------------
  // Not configured state
  // ---------------------------------------------------------------------------

  if (!acuityConfigured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Connect Acuity Scheduling to view appointments, revenue, and utilisation.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Acuity Scheduling</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Link your Acuity Scheduling account to track appointments, measure booking revenue,
              and monitor utilisation across your calendars.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Connect Acuity
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Add your Acuity User ID and API Key in Settings to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (state === 'loading' || state === 'idle') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-muted-foreground mt-1">Loading scheduling data from Acuity...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-8 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Acuity Scheduling integration
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 font-medium mb-2">Failed to load scheduling data</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loaded state
  // ---------------------------------------------------------------------------

  if (!data) return null;

  const utilisationPct = Math.round(data.utilisation.rate * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
        <p className="text-muted-foreground mt-1">
          Acuity Scheduling overview &mdash; appointments, revenue, and utilisation.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          label="Upcoming Appointments"
          value={String(data.upcoming.length)}
          subtitle="Next 30 days"
        />
        <KPICard
          label="Revenue This Week"
          value={formatCurrency(data.revenue.thisWeek)}
          subtitle="Booking revenue"
        />
        <KPICard
          label="Revenue This Month"
          value={formatCurrency(data.revenue.thisMonth)}
          subtitle="Booking revenue"
        />
        <KPICard
          label="Utilisation Rate"
          value={`${utilisationPct}%`}
          subtitle={`${data.utilisation.bookedSlots} booked / ${data.utilisation.bookedSlots + data.utilisation.availableSlots} total slots`}
          variant={utilisationPct >= 70 ? 'positive' : utilisationPct >= 40 ? 'neutral' : 'negative'}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                Next {data.upcoming.length} appointments in the coming 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-3">
                  {data.upcoming.slice(0, 10).map((appt) => (
                    <AppointmentRow key={appt.id} appointment={appt} />
                  ))}
                  {data.upcoming.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{data.upcoming.length - 10} more appointments
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Type */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Type</CardTitle>
              <CardDescription>Breakdown by appointment type</CardDescription>
            </CardHeader>
            <CardContent>
              {data.revenue.byType.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No revenue data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {data.revenue.byType.map((rt) => (
                    <RevenueTypeRow key={rt.appointmentTypeId} data={rt} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendars */}
          <Card>
            <CardHeader>
              <CardTitle>Calendars</CardTitle>
              <CardDescription>{data.calendars.length} active calendar(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {data.calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No calendars found
                </p>
              ) : (
                <div className="space-y-2">
                  {data.calendars.map((cal) => (
                    <div
                      key={cal.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {cal.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cal.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {cal.email || cal.timezone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Booking Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <CardDescription>Most frequent bookers</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No client data yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.topClients.slice(0, 10).map((client) => (
                  <ClientRow key={client.email} client={client} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar View Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Weekly schedule overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Calendar view coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Visual weekly and monthly calendar with drag-and-drop rescheduling.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  subtitle,
  variant = 'neutral',
}: {
  label: string;
  value: string;
  subtitle: string;
  variant?: 'positive' | 'neutral' | 'negative';
}) {
  const variantClasses = {
    positive: 'text-emerald-600',
    neutral: 'text-foreground',
    negative: 'text-red-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${variantClasses[variant]}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AppointmentRow({ appointment }: { appointment: AcuityAppointment }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
          {appointment.firstName?.charAt(0)}
          {appointment.lastName?.charAt(0)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {appointment.firstName} {appointment.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{appointment.type}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium">{formatRelativeDate(appointment.datetime)}</p>
        <p className="text-xs text-muted-foreground">
          {appointment.time} &middot; {appointment.duration}min
        </p>
      </div>
      {parseFloat(appointment.price) > 0 && (
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-sm font-semibold text-emerald-600">
            {formatCurrency(parseFloat(appointment.price))}
          </p>
        </div>
      )}
    </div>
  );
}

function RevenueTypeRow({ data }: { data: RevenueByType }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{data.appointmentTypeName}</p>
        <p className="text-xs text-muted-foreground">{data.count} bookings</p>
      </div>
      <p className="text-sm font-semibold">{formatCurrency(data.totalRevenue)}</p>
    </div>
  );
}

function ClientRow({ client }: { client: ClientFrequency }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
        {client.name
          .split(' ')
          .map((w) => w.charAt(0))
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{client.name}</p>
        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold">{client.bookingCount} bookings</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(client.totalSpent)} spent</p>
      </div>
    </div>
  );
}
