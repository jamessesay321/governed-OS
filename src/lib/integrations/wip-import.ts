/**
 * WIP (Work In Progress) Report Types & Parser
 *
 * The WIP report is an Excel file used by Alonuko to track per-client COGS
 * (Cost of Goods Sold) data. The file has monthly sheets (Jan, Feb, Mar, Apr)
 * each containing:
 *
 * - Section A: "Clients orders in progress" — rows with order code OR client name,
 *   customer ID, status (In progress/Cancelled), Total COGS
 * - Daily fabric usage tracking by seamstress
 * - Inventory pricing (raw materials with unit prices)
 * - Recipes (fabric usage per order type)
 *
 * This module defines the types that match the real data structure and provides
 * a parser function signature for when the file upload feature is built.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single client/order entry from the WIP report's Section A */
export interface WIPClientEntry {
  /** Order code (e.g. "BR26-01") or client name if no code is assigned */
  identifier: string;
  /** Customer/client ID from the WIP system, if present */
  customerId: string | null;
  /** Order status as recorded in the WIP report */
  status: 'in_progress' | 'cancelled' | 'completed';
  /** Total COGS (Cost of Goods Sold) for this client/order in the period */
  totalCogs: number;
  /** Which month sheet this entry came from (e.g. "Jan", "Feb") */
  month: string;
}

/** Summary of fabric usage by seamstress (daily tracking from WIP report) */
export interface WIPFabricUsage {
  /** Seamstress name */
  seamstress: string;
  /** Date of the usage record */
  date: string;
  /** Which order/client the fabric was used for */
  orderIdentifier: string;
  /** Fabric type / material name */
  fabricName: string;
  /** Quantity used (metres, yards, or units as recorded) */
  quantity: number;
  /** Unit of measurement */
  unit: string;
}

/** Raw material / inventory line from the WIP pricing section */
export interface WIPInventoryItem {
  /** Material / fabric name */
  materialName: string;
  /** Unit price as recorded */
  unitPrice: number;
  /** Currency (typically GBP) */
  currency: string;
  /** Unit of measurement (per metre, per yard, per unit) */
  unit: string;
}

/** Recipe: fabric usage specification per order/dress type */
export interface WIPRecipe {
  /** Order type or dress style (e.g. "Bespoke A-Line", "Made to Order") */
  orderType: string;
  /** List of materials and their required quantities */
  materials: Array<{
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  /** Total estimated COGS for this recipe */
  estimatedCogs: number | null;
}

/** Parsed WIP report for a single month */
export interface WIPReport {
  /** Which month this report covers (e.g. "Jan", "Feb", "Mar", "Apr") */
  month: string;
  /** All client/order entries from Section A */
  clientEntries: WIPClientEntry[];
  /** Total COGS across all active orders */
  totalCOGS: number;
  /** Count of active (in progress) orders */
  activeOrders: number;
  /** Count of cancelled orders */
  cancelledOrders: number;
}

/** Full WIP workbook containing all monthly sheets */
export interface WIPWorkbook {
  /** Array of monthly reports */
  months: WIPReport[];
  /** Inventory pricing data (typically on a separate sheet or section) */
  inventory: WIPInventoryItem[];
  /** Recipe definitions */
  recipes: WIPRecipe[];
}

// ---------------------------------------------------------------------------
// Status Mapping
// ---------------------------------------------------------------------------

const WIP_STATUS_MAP: Record<string, WIPClientEntry['status']> = {
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  active: 'in_progress',
  ongoing: 'in_progress',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  completed: 'completed',
  done: 'completed',
  delivered: 'completed',
};

/**
 * Map a raw status string from the WIP report to a normalised status.
 */
export function normaliseWIPStatus(raw: string): WIPClientEntry['status'] {
  const normalised = raw.toLowerCase().trim();
  return WIP_STATUS_MAP[normalised] ?? 'in_progress';
}

// ---------------------------------------------------------------------------
// Parser (placeholder — requires file upload endpoint)
// ---------------------------------------------------------------------------

/**
 * Parse a WIP report sheet into a structured WIPReport.
 *
 * TODO: Implement when the Excel file upload feature is built.
 * This will use a library like `xlsx` or `exceljs` to parse the uploaded file.
 * The implementation should:
 *
 * 1. Identify the month from the sheet name/tab
 * 2. Locate Section A ("Clients orders in progress") by scanning for the header row
 * 3. Parse each row: extract identifier (order code or client name), customer ID,
 *    status, and total COGS
 * 4. Handle merged cells and variable row counts
 * 5. Calculate totals (activeOrders, cancelledOrders, totalCOGS)
 *
 * Expected sheet layout for Section A:
 * | Order Code / Client | Customer ID | Status       | Total COGS |
 * |---------------------|-------------|--------------|------------|
 * | BR26-01             | C001        | In progress  | 1,250.00   |
 * | Jane Smith          | C002        | Cancelled    | 800.00     |
 *
 * @param data - Array of row objects from the parsed Excel sheet
 * @returns Parsed WIP report with client entries and summary
 */
export function parseWIPSheet(
  data: Record<string, unknown>[]
): WIPReport {
  // TODO: Implement when file upload endpoint is built.
  // For now, return a stub with metadata from the data rows.

  const clientEntries: WIPClientEntry[] = [];
  let month = 'Unknown';

  for (const row of data) {
    // Try to detect month from common column names
    if (!month || month === 'Unknown') {
      const monthVal = row['Month'] ?? row['month'] ?? row['Period'] ?? row['period'];
      if (typeof monthVal === 'string' && monthVal.trim()) {
        month = monthVal.trim();
      }
    }

    // Try to extract client entries from rows that have an identifier
    const identifier =
      (row['Order Code'] as string) ??
      (row['order_code'] as string) ??
      (row['Client'] as string) ??
      (row['client'] as string) ??
      (row['Client Name'] as string) ??
      (row['Name'] as string);

    if (!identifier || typeof identifier !== 'string') continue;

    const statusRaw =
      (row['Status'] as string) ??
      (row['status'] as string) ??
      'in_progress';

    const cogsRaw =
      (row['Total COGS'] as number) ??
      (row['total_cogs'] as number) ??
      (row['COGS'] as number) ??
      0;

    const customerIdRaw =
      (row['Customer ID'] as string) ??
      (row['customer_id'] as string) ??
      null;

    clientEntries.push({
      identifier: identifier.trim(),
      customerId: typeof customerIdRaw === 'string' ? customerIdRaw.trim() : null,
      status: typeof statusRaw === 'string' ? normaliseWIPStatus(statusRaw) : 'in_progress',
      totalCogs: typeof cogsRaw === 'number' ? cogsRaw : parseFloat(String(cogsRaw).replace(/[^0-9.\-]/g, '')) || 0,
      month,
    });
  }

  const activeOrders = clientEntries.filter((e) => e.status === 'in_progress').length;
  const cancelledOrders = clientEntries.filter((e) => e.status === 'cancelled').length;
  const totalCOGS = clientEntries
    .filter((e) => e.status === 'in_progress')
    .reduce((sum, e) => sum + e.totalCogs, 0);

  return {
    month,
    clientEntries,
    totalCOGS,
    activeOrders,
    cancelledOrders,
  };
}

/**
 * Parse a full WIP workbook with multiple monthly sheets.
 *
 * TODO: Implement when file upload endpoint is built.
 * This should iterate over all sheets in the workbook and call parseWIPSheet
 * for each monthly sheet, plus extract inventory and recipe data from their
 * respective sections.
 *
 * @param sheets - Map of sheet name → array of row objects
 * @returns Full WIPWorkbook with all months, inventory, and recipes
 */
export function parseWIPWorkbook(
  sheets: Record<string, Record<string, unknown>[]>
): WIPWorkbook {
  // TODO: Implement when file upload endpoint is built.
  const months: WIPReport[] = [];

  for (const [sheetName, data] of Object.entries(sheets)) {
    // Skip non-month sheets (e.g. "Inventory", "Recipes", "Summary")
    const monthPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
    if (monthPattern.test(sheetName)) {
      const report = parseWIPSheet(data);
      if (report.month === 'Unknown') {
        report.month = sheetName;
      }
      months.push(report);
    }
  }

  return {
    months,
    inventory: [], // TODO: Parse from "Inventory" sheet
    recipes: [],   // TODO: Parse from "Recipes" sheet
  };
}
