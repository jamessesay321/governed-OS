/**
 * Acuity Scheduling API Client
 *
 * Basic auth integration with Acuity Scheduling API v1.
 * Provides appointment, calendar, client, and availability data
 * for the Grove scheduling dashboard.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcuityAppointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  endTime: string;
  datetime: string;
  datetimeCreated: string;
  type: string;
  appointmentTypeID: number;
  calendarID: number;
  calendar: string;
  duration: string;
  price: string;
  paid: string;
  amountPaid: string;
  paidStatus: 'yes' | 'no' | 'partial';
  canceled: boolean;
  canClientCancel: boolean;
  canClientReschedule: boolean;
  location: string;
  notes: string;
  timezone: string;
  confirmationPage: string;
  formsText: string;
  forms: AcuityForm[];
  labels: AcuityLabel[] | null;
}

export interface AcuityAppointmentType {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: string;
  category: string;
  color: string;
  private: boolean;
  active: boolean;
  calendarIDs: number[];
  schedulingUrl: string;
}

export interface AcuityCalendar {
  id: number;
  name: string;
  email: string;
  replyTo: string;
  description: string;
  location: string;
  timezone: string;
  thumbnail: string;
  image: string;
}

export interface AcuityClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface AcuityAvailabilitySlot {
  time: string;
  datetime: string;
}

export interface AcuityForm {
  id: number;
  name: string;
  values: AcuityFormValue[];
}

export interface AcuityFormValue {
  id: number;
  fieldID: number;
  value: string;
  name: string;
}

export interface AcuityLabel {
  id: number;
  name: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Revenue summary types
// ---------------------------------------------------------------------------

export interface RevenueByType {
  appointmentTypeId: number;
  appointmentTypeName: string;
  count: number;
  totalRevenue: number;
}

export interface RevenueSummary {
  thisWeek: number;
  thisMonth: number;
  byType: RevenueByType[];
}

export interface UtilisationSummary {
  bookedSlots: number;
  availableSlots: number;
  rate: number; // 0–1
}

export interface ClientFrequency {
  email: string;
  name: string;
  bookingCount: number;
  totalSpent: number;
  lastBooking: string;
}

export interface SchedulingSummary {
  upcoming: AcuityAppointment[];
  revenue: RevenueSummary;
  utilisation: UtilisationSummary;
  topClients: ClientFrequency[];
  appointmentTypes: AcuityAppointmentType[];
  calendars: AcuityCalendar[];
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const ACUITY_BASE_URL = 'https://acuityscheduling.com/api/v1';

function getAuthHeader(): string {
  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Acuity credentials not configured. Set ACUITY_USER_ID and ACUITY_API_KEY.');
  }

  const encoded = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  return `Basic ${encoded}`;
}

async function acuityFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${ACUITY_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
    next: { revalidate: 60 }, // Cache for 60s
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Acuity API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function getAppointments(
  params?: {
    minDate?: string;
    maxDate?: string;
    calendarID?: number;
    appointmentTypeID?: number;
    canceled?: boolean;
    direction?: 'ASC' | 'DESC';
    max?: number;
  }
): Promise<AcuityAppointment[]> {
  const queryParams: Record<string, string> = {};
  if (params?.minDate) queryParams.minDate = params.minDate;
  if (params?.maxDate) queryParams.maxDate = params.maxDate;
  if (params?.calendarID) queryParams.calendarID = String(params.calendarID);
  if (params?.appointmentTypeID) queryParams.appointmentTypeID = String(params.appointmentTypeID);
  if (params?.canceled !== undefined) queryParams.canceled = String(params.canceled);
  if (params?.direction) queryParams.direction = params.direction;
  if (params?.max) queryParams.max = String(params.max);

  return acuityFetch<AcuityAppointment[]>('/appointments', queryParams);
}

export async function getAppointmentTypes(): Promise<AcuityAppointmentType[]> {
  return acuityFetch<AcuityAppointmentType[]>('/appointment-types');
}

export async function getCalendars(): Promise<AcuityCalendar[]> {
  return acuityFetch<AcuityCalendar[]>('/calendars');
}

export async function getAvailability(
  date: string,
  appointmentTypeId: number
): Promise<AcuityAvailabilitySlot[]> {
  return acuityFetch<AcuityAvailabilitySlot[]>('/availability/times', {
    date,
    appointmentTypeID: String(appointmentTypeId),
  });
}

export async function getClients(): Promise<AcuityClient[]> {
  return acuityFetch<AcuityClient[]>('/clients');
}

export async function getAppointmentsByClient(
  email: string
): Promise<AcuityAppointment[]> {
  return acuityFetch<AcuityAppointment[]>('/appointments', { email });
}

// ---------------------------------------------------------------------------
// Credentials check
// ---------------------------------------------------------------------------

export function isAcuityConfigured(): boolean {
  return !!(process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY);
}

// ---------------------------------------------------------------------------
// Revenue calculation
// ---------------------------------------------------------------------------

function parsePrice(price: string): number {
  const cleaned = price.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday as start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function calculateRevenue(
  appointments: AcuityAppointment[],
  types: AcuityAppointmentType[]
): RevenueSummary {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const typeMap = new Map<number, AcuityAppointmentType>();
  for (const t of types) {
    typeMap.set(t.id, t);
  }

  let thisWeek = 0;
  let thisMonth = 0;
  const byTypeMap = new Map<number, RevenueByType>();

  for (const appt of appointments) {
    if (appt.canceled) continue;

    const price = parsePrice(appt.price);
    const apptDate = new Date(appt.datetime);

    if (apptDate >= monthStart) {
      thisMonth += price;
    }
    if (apptDate >= weekStart) {
      thisWeek += price;
    }

    const existing = byTypeMap.get(appt.appointmentTypeID);
    if (existing) {
      existing.count += 1;
      existing.totalRevenue += price;
    } else {
      const typeName = typeMap.get(appt.appointmentTypeID)?.name ?? appt.type;
      byTypeMap.set(appt.appointmentTypeID, {
        appointmentTypeId: appt.appointmentTypeID,
        appointmentTypeName: typeName,
        count: 1,
        totalRevenue: price,
      });
    }
  }

  return {
    thisWeek: Math.round(thisWeek * 100) / 100,
    thisMonth: Math.round(thisMonth * 100) / 100,
    byType: Array.from(byTypeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
  };
}

// ---------------------------------------------------------------------------
// Utilisation calculation
// ---------------------------------------------------------------------------

export async function calculateUtilisation(
  appointments: AcuityAppointment[],
  types: AcuityAppointmentType[]
): Promise<UtilisationSummary> {
  // Calculate utilisation for the next 7 days
  const now = new Date();
  const bookedSlots = appointments.filter(a => {
    if (a.canceled) return false;
    const d = new Date(a.datetime);
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  // Estimate available slots: check availability for each active type over 7 days
  let totalAvailable = 0;
  const activeTypes = types.filter(t => t.active);

  // Sample 7 days of availability for the first active type to estimate capacity
  if (activeTypes.length > 0) {
    const sampleType = activeTypes[0];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      try {
        const slots = await getAvailability(dateStr, sampleType.id);
        totalAvailable += slots.length;
      } catch {
        // Skip days where availability check fails
      }
    }
    // Scale by number of active types (rough estimate)
    totalAvailable = totalAvailable * activeTypes.length;
  }

  // Total slots = booked + remaining available
  const totalSlots = bookedSlots + totalAvailable;
  const rate = totalSlots > 0 ? bookedSlots / totalSlots : 0;

  return {
    bookedSlots,
    availableSlots: totalAvailable,
    rate: Math.round(rate * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Client frequency
// ---------------------------------------------------------------------------

export function calculateClientFrequency(
  appointments: AcuityAppointment[]
): ClientFrequency[] {
  const clientMap = new Map<string, ClientFrequency>();

  for (const appt of appointments) {
    if (appt.canceled) continue;

    const email = appt.email.toLowerCase();
    const existing = clientMap.get(email);
    const price = parsePrice(appt.price);

    if (existing) {
      existing.bookingCount += 1;
      existing.totalSpent += price;
      if (appt.datetime > existing.lastBooking) {
        existing.lastBooking = appt.datetime;
      }
    } else {
      clientMap.set(email, {
        email,
        name: `${appt.firstName} ${appt.lastName}`.trim(),
        bookingCount: 1,
        totalSpent: price,
        lastBooking: appt.datetime,
      });
    }
  }

  return Array.from(clientMap.values())
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 20);
}
