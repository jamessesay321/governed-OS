/**
 * Acuity Scheduling — Deterministic Computation Layer
 * ----------------------------------------------------
 * Pure functions that take Acuity appointment data as input and return
 * pre-computed scheduling metrics for a luxury bridal fashion house.
 *
 * DETERMINISTIC — no AI, no side effects, no database calls.
 * Follows the same pattern as shopify-metrics.ts and monday-metrics.ts.
 *
 * Domain context (Alonuko):
 * - Acuity manages bridal consultations (£50–£1200), fittings, and
 *   collection appointments.
 * - 39 appointment types including "Bespoke In-person Consultation"
 *   (£1200, 90min) and "Alonuko Refresh Consultation" (£50, 60min).
 * - A single bride may book multiple appointments across the journey:
 *   initial consultation → fittings → collection.
 */

import type {
  AcuityAppointment,
  AcuityAppointmentType,
} from './acuity';

// Re-export so consumers can import everything from one place
export type { AcuityAppointment, AcuityAppointmentType };

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

export interface BookingSummary {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  bookingsByType: {
    typeId: number;
    typeName: string;
    count: number;
    revenue: number;
  }[];
  /** Sum of price across all non-cancelled bookings */
  totalRevenuePotential: number;
}

export interface ConsultationsByMonth {
  /** YYYY-MM */
  month: string;
  count: number;
  revenue: number;
}

export interface ConsultationMetrics {
  totalConsultations: number;
  consultationRevenue: number;
  avgConsultationValue: number;
  /** Fraction of consultations that have been paid (paidStatus === 'yes') */
  consultationConversionRate: number;
  consultationsByMonth: ConsultationsByMonth[];
}

export interface UtilisationMetrics {
  /** Total booked hours for the current calendar month */
  bookedHoursThisMonth: number;
  /** Estimated available hours based on working days remaining */
  availableHoursEstimate: number;
  /** bookedHoursThisMonth / (bookedHoursThisMonth + availableHoursEstimate) */
  utilisationRate: number;
  /** Days of the week (0=Sun..6=Sat) with most bookings */
  peakDays: { day: string; count: number }[];
  /** Days of the week with fewest bookings */
  quietDays: { day: string; count: number }[];
}

export interface ClientFlow {
  newClientsThisMonth: number;
  repeatClients: number;
  avgAppointmentsPerClient: number;
  /** Breakdown of client first-touch source (calendar name as proxy) */
  clientsBySource: { source: string; count: number }[];
  /** Top clients by number of appointments */
  topClients: {
    name: string;
    email: string;
    appointmentCount: number;
    totalSpent: number;
    lastAppointment: string;
  }[];
}

// ---------------------------------------------------------------------------
// Aggregate bundle
// ---------------------------------------------------------------------------

export interface AcuityMetricsSummary {
  bookingSummary: BookingSummary;
  consultationMetrics: ConsultationMetrics;
  utilisation: UtilisationMetrics;
  clientFlow: ClientFlow;
  computedAt: string;
  appointmentCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parsePrice(price: string): number {
  const cleaned = price.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseDuration(duration: string): number {
  return parseInt(duration, 10) || 0;
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Determine whether an appointment type name looks like a consultation.
 * Bridal consultations are the primary revenue-generating appointment class.
 */
function isConsultationType(typeName: string): boolean {
  const t = typeName.toLowerCase();
  return (
    t.includes('consultation') ||
    t.includes('consult') ||
    t.includes('bridal experience') ||
    t.includes('bespoke') ||
    t.includes('styling session') ||
    t.includes('discovery')
  );
}

// ---------------------------------------------------------------------------
// 1. computeBookingSummary
// ---------------------------------------------------------------------------

/**
 * High-level booking summary across all appointment data.
 * Pure function — no side effects.
 */
export function computeBookingSummary(
  appointments: AcuityAppointment[],
  types: AcuityAppointmentType[],
  now: Date = new Date()
): BookingSummary {
  const typeMap = new Map<number, AcuityAppointmentType>();
  for (const t of types) {
    typeMap.set(t.id, t);
  }

  const cancelledBookings = appointments.filter((a) => a.canceled).length;
  const nonCancelled = appointments.filter((a) => !a.canceled);

  const upcomingBookings = nonCancelled.filter(
    (a) => new Date(a.datetime) >= now
  ).length;
  const completedBookings = nonCancelled.filter(
    (a) => new Date(a.datetime) < now
  ).length;

  // Revenue potential = sum of price for all non-cancelled appointments
  const totalRevenuePotential = round2(
    nonCancelled.reduce((sum, a) => sum + parsePrice(a.price), 0)
  );

  // Bookings grouped by appointment type
  const byTypeMap = new Map<
    number,
    { typeId: number; typeName: string; count: number; revenue: number }
  >();

  for (const appt of nonCancelled) {
    const existing = byTypeMap.get(appt.appointmentTypeID);
    const price = parsePrice(appt.price);

    if (existing) {
      existing.count += 1;
      existing.revenue += price;
    } else {
      const typeName =
        typeMap.get(appt.appointmentTypeID)?.name ?? appt.type;
      byTypeMap.set(appt.appointmentTypeID, {
        typeId: appt.appointmentTypeID,
        typeName,
        count: 1,
        revenue: price,
      });
    }
  }

  const bookingsByType = Array.from(byTypeMap.values())
    .map((entry) => ({
      ...entry,
      revenue: round2(entry.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalBookings: appointments.length,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    bookingsByType,
    totalRevenuePotential,
  };
}

// ---------------------------------------------------------------------------
// 2. computeConsultationMetrics
// ---------------------------------------------------------------------------

/**
 * Metrics focused on consultation-type appointments — the primary
 * revenue driver for a bridal fashion house.
 * Pure function — no side effects.
 */
export function computeConsultationMetrics(
  appointments: AcuityAppointment[],
  types: AcuityAppointmentType[]
): ConsultationMetrics {
  const typeMap = new Map<number, AcuityAppointmentType>();
  for (const t of types) {
    typeMap.set(t.id, t);
  }

  // Identify consultation appointments
  const consultations = appointments.filter((a) => {
    if (a.canceled) return false;
    const typeName = typeMap.get(a.appointmentTypeID)?.name ?? a.type;
    return isConsultationType(typeName);
  });

  const totalConsultations = consultations.length;

  const consultationRevenue = round2(
    consultations.reduce((sum, a) => sum + parsePrice(a.price), 0)
  );

  const avgConsultationValue =
    totalConsultations > 0
      ? round2(consultationRevenue / totalConsultations)
      : 0;

  // Conversion rate: paid consultations / total consultations
  const paidConsultations = consultations.filter(
    (a) => a.paidStatus === 'yes'
  ).length;

  const consultationConversionRate =
    totalConsultations > 0
      ? round2(paidConsultations / totalConsultations)
      : 0;

  // Consultations by month
  const monthMap = new Map<string, { count: number; revenue: number }>();
  for (const appt of consultations) {
    const month = toMonthKey(appt.datetime);
    const existing = monthMap.get(month) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += parsePrice(appt.price);
    monthMap.set(month, existing);
  }

  const consultationsByMonth: ConsultationsByMonth[] = Array.from(
    monthMap.entries()
  )
    .map(([month, data]) => ({
      month,
      count: data.count,
      revenue: round2(data.revenue),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalConsultations,
    consultationRevenue,
    avgConsultationValue,
    consultationConversionRate,
    consultationsByMonth,
  };
}

// ---------------------------------------------------------------------------
// 3. computeUtilisation
// ---------------------------------------------------------------------------

/**
 * Compute utilisation metrics for the current calendar month.
 *
 * availableHoursEstimate is derived from working days in the month
 * (Mon–Sat, 8 working hours/day) — a reasonable default for a bridal
 * atelier. Callers can override the hoursPerDay and workDays params
 * for custom schedules.
 *
 * Pure function — no side effects.
 */
export function computeUtilisation(
  appointments: AcuityAppointment[],
  _types: AcuityAppointmentType[],
  now: Date = new Date(),
  hoursPerDay: number = 8,
  workDays: number[] = [1, 2, 3, 4, 5, 6] // Mon–Sat
): UtilisationMetrics {
  const currentMonth = toMonthKey(now.toISOString());

  // Filter to current month, non-cancelled
  const thisMonthAppts = appointments.filter((a) => {
    if (a.canceled) return false;
    return toMonthKey(a.datetime) === currentMonth;
  });

  // Total booked hours this month
  const bookedMinutes = thisMonthAppts.reduce(
    (sum, a) => sum + parseDuration(a.duration),
    0
  );
  const bookedHoursThisMonth = round2(bookedMinutes / 60);

  // Estimate available hours: count working days in the current month
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let workingDaysInMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (workDays.includes(dayOfWeek)) {
      workingDaysInMonth += 1;
    }
  }

  const totalCapacityHours = workingDaysInMonth * hoursPerDay;
  const availableHoursEstimate = round2(
    Math.max(0, totalCapacityHours - bookedHoursThisMonth)
  );

  const utilisationRate =
    totalCapacityHours > 0
      ? round2(bookedHoursThisMonth / totalCapacityHours)
      : 0;

  // Peak and quiet days — count bookings by day of week across all data
  const dayCountMap = new Map<number, number>();
  for (let i = 0; i < 7; i++) {
    dayCountMap.set(i, 0);
  }

  const nonCancelled = appointments.filter((a) => !a.canceled);
  for (const appt of nonCancelled) {
    const dayOfWeek = new Date(appt.datetime).getDay();
    dayCountMap.set(dayOfWeek, (dayCountMap.get(dayOfWeek) ?? 0) + 1);
  }

  const dayCounts = Array.from(dayCountMap.entries())
    .map(([day, count]) => ({ day: DAY_NAMES[day], count }))
    .sort((a, b) => b.count - a.count);

  // Top 3 peak days, bottom 3 quiet days
  const peakDays = dayCounts.slice(0, 3);
  const quietDays = dayCounts.slice(-3).reverse();

  return {
    bookedHoursThisMonth,
    availableHoursEstimate,
    utilisationRate,
    peakDays,
    quietDays,
  };
}

// ---------------------------------------------------------------------------
// 4. computeClientFlow
// ---------------------------------------------------------------------------

/**
 * Client acquisition and retention metrics derived from appointment data.
 * Uses email as the unique client identifier (lowercased).
 * Pure function — no side effects.
 */
export function computeClientFlow(
  appointments: AcuityAppointment[],
  now: Date = new Date()
): ClientFlow {
  const currentMonth = toMonthKey(now.toISOString());
  const nonCancelled = appointments.filter((a) => !a.canceled);

  // Build client map keyed by email
  const clientMap = new Map<
    string,
    {
      name: string;
      email: string;
      appointmentCount: number;
      totalSpent: number;
      lastAppointment: string;
      firstSeen: string;
      calendar: string;
    }
  >();

  for (const appt of nonCancelled) {
    const email = appt.email.toLowerCase().trim();
    if (!email) continue;

    const existing = clientMap.get(email);
    const price = parsePrice(appt.price);

    if (existing) {
      existing.appointmentCount += 1;
      existing.totalSpent += price;
      if (appt.datetime > existing.lastAppointment) {
        existing.lastAppointment = appt.datetime;
      }
      if (appt.datetime < existing.firstSeen) {
        existing.firstSeen = appt.datetime;
      }
    } else {
      clientMap.set(email, {
        name: `${appt.firstName} ${appt.lastName}`.trim(),
        email,
        appointmentCount: 1,
        totalSpent: price,
        lastAppointment: appt.datetime,
        firstSeen: appt.datetime,
        calendar: appt.calendar,
      });
    }
  }

  // New clients this month: first appointment falls in the current month
  const newClientsThisMonth = Array.from(clientMap.values()).filter(
    (c) => toMonthKey(c.firstSeen) === currentMonth
  ).length;

  // Repeat clients: more than one appointment
  const repeatClients = Array.from(clientMap.values()).filter(
    (c) => c.appointmentCount > 1
  ).length;

  // Average appointments per client
  const totalClients = clientMap.size;
  const avgAppointmentsPerClient =
    totalClients > 0
      ? round2(nonCancelled.length / totalClients)
      : 0;

  // Clients by source — use calendar name as a proxy for booking source
  const sourceMap = new Map<string, number>();
  for (const client of clientMap.values()) {
    const source = client.calendar || 'Unknown';
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }
  const clientsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Top clients by appointment count (top 20)
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 20)
    .map(({ name, email, appointmentCount, totalSpent, lastAppointment }) => ({
      name,
      email,
      appointmentCount,
      totalSpent: round2(totalSpent),
      lastAppointment,
    }));

  return {
    newClientsThisMonth,
    repeatClients,
    avgAppointmentsPerClient,
    clientsBySource,
    topClients,
  };
}

// ---------------------------------------------------------------------------
// Convenience: compute all metrics at once
// ---------------------------------------------------------------------------

/**
 * Run all four computation functions on appointment data.
 * Returns the full metrics bundle. Pure function — no side effects.
 */
export function computeAllMetrics(
  appointments: AcuityAppointment[],
  types: AcuityAppointmentType[],
  now: Date = new Date()
): AcuityMetricsSummary {
  return {
    bookingSummary: computeBookingSummary(appointments, types, now),
    consultationMetrics: computeConsultationMetrics(appointments, types),
    utilisation: computeUtilisation(appointments, types, now),
    clientFlow: computeClientFlow(appointments, now),
    computedAt: now.toISOString(),
    appointmentCount: appointments.length,
  };
}
