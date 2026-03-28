/**
 * Spreadsheet Import Engine
 *
 * Upload Excel/CSV, parse, map columns, and ingest into the staging pipeline.
 * CSV parsing is fully implemented. XLSX parsing requires a library (noted with TODO).
 */

import { stageTransactions, type RawTransaction } from '@/lib/staging/pipeline';
import { callLLMCached } from '@/lib/ai/cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpreadsheetParseResult {
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'tsv';
  sheets: {
    name: string;
    headers: string[];
    rowCount: number;
    sampleRows: Record<string, string>[];
  }[];
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField:
    | 'date'
    | 'amount'
    | 'description'
    | 'reference'
    | 'category'
    | 'contact'
    | 'skip';
  transform?: 'none' | 'parse_date' | 'parse_currency' | 'trim';
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a spreadsheet file (CSV, TSV, or XLSX) into a structured format.
 * CSV and TSV are fully implemented. XLSX requires a library.
 */
export function parseSpreadsheet(
  buffer: Buffer,
  fileName: string
): SpreadsheetParseResult {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';

  if (ext === 'csv' || ext === 'tsv') {
    const delimiter = ext === 'tsv' ? '\t' : ',';
    return parseDelimited(buffer, fileName, ext as 'csv' | 'tsv', delimiter);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // TODO: Implement XLSX parsing with a library like 'xlsx' or 'exceljs'.
    // For now, return a placeholder that indicates the file type is recognized
    // but parsing is not yet available without a dependency.
    return {
      fileName,
      fileType: 'xlsx',
      sheets: [
        {
          name: 'Sheet1',
          headers: [],
          rowCount: 0,
          sampleRows: [],
        },
      ],
    };
  }

  throw new Error(`Unsupported file type: ${ext}. Accepted: csv, tsv, xlsx`);
}

/**
 * Parse a CSV or TSV file from a buffer.
 */
function parseDelimited(
  buffer: Buffer,
  fileName: string,
  fileType: 'csv' | 'tsv',
  delimiter: string
): SpreadsheetParseResult {
  const content = buffer.toString('utf-8').trim();
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    throw new Error('File is empty');
  }

  // Parse headers from the first row
  const headers = parseCSVLine(lines[0], delimiter);

  // Parse data rows
  const dataRows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    dataRows.push(row);
  }

  // Sample: first 5 rows
  const sampleRows = dataRows.slice(0, 5);

  return {
    fileName,
    fileType,
    sheets: [
      {
        name: 'Sheet1',
        headers,
        rowCount: dataRows.length,
        sampleRows,
      },
    ],
  };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

/**
 * Use AI to suggest column mappings based on header names.
 * Falls back to heuristic matching if AI is unavailable.
 */
export async function suggestColumnMappings(
  headers: string[],
  orgId: string
): Promise<ColumnMapping[]> {
  // Try AI-assisted mapping first
  try {
    const { response } = await callLLMCached({
      orgId,
      systemPrompt: `You are a data mapping assistant. Given spreadsheet column headers, suggest which standard financial field each column maps to.

Available target fields:
- date: Transaction date
- amount: Transaction amount / value
- description: Transaction description or memo
- reference: Invoice number, transaction ID, or reference code
- category: Account category or classification
- contact: Customer or supplier name
- skip: Column is not relevant for financial ingestion

Also suggest a transform if needed:
- none: No transformation
- parse_date: Parse various date formats
- parse_currency: Remove currency symbols and parse number
- trim: Trim whitespace

Respond with a JSON array of objects: [{"sourceColumn": "...", "targetField": "...", "transform": "..."}]
Only output the JSON array, nothing else.`,
      userMessage: `Column headers: ${JSON.stringify(headers)}`,
      cacheTTLMinutes: 1440, // Cache for 24 hours
    });

    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed as ColumnMapping[];
    }
  } catch (err) {
    console.warn('[SPREADSHEET] AI mapping failed, using heuristic:', err);
  }

  // Fallback: heuristic matching
  return headers.map((header) => {
    const h = header.toLowerCase().trim();
    let targetField: ColumnMapping['targetField'] = 'skip';
    let transform: ColumnMapping['transform'] = 'none';

    if (/date|time|when|day/.test(h)) {
      targetField = 'date';
      transform = 'parse_date';
    } else if (/amount|total|value|price|sum|balance|debit|credit/.test(h)) {
      targetField = 'amount';
      transform = 'parse_currency';
    } else if (/desc|memo|narration|detail|note/.test(h)) {
      targetField = 'description';
      transform = 'trim';
    } else if (/ref|invoice|id|number|code|txn/.test(h)) {
      targetField = 'reference';
      transform = 'trim';
    } else if (/cat|type|class|account|group/.test(h)) {
      targetField = 'category';
      transform = 'trim';
    } else if (/name|customer|client|supplier|vendor|contact|payee/.test(h)) {
      targetField = 'contact';
      transform = 'trim';
    }

    return { sourceColumn: header, targetField, transform };
  });
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

/**
 * Apply transforms to a raw value based on the mapping configuration.
 */
function applyTransform(value: string, transform: ColumnMapping['transform']): string | number {
  if (!value) return value;

  switch (transform) {
    case 'parse_date': {
      // Try common date formats
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      // Try DD/MM/YYYY
      const ddmmyyyy = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }
      return value;
    }
    case 'parse_currency': {
      // Remove currency symbols, commas, spaces
      const cleaned = value.replace(/[^0-9.\-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    case 'trim':
      return value.trim();
    default:
      return value;
  }
}

/**
 * Take parsed + mapped spreadsheet data and feed it into the staging pipeline.
 */
export async function ingestMappedData(
  orgId: string,
  data: Record<string, string>[],
  mappings: ColumnMapping[],
  source: string
): Promise<{ ingested: number }> {
  // Build a mapping lookup
  const fieldMap = new Map<string, ColumnMapping>();
  for (const mapping of mappings) {
    if (mapping.targetField !== 'skip') {
      fieldMap.set(mapping.targetField, mapping);
    }
  }

  const transactions: RawTransaction[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Extract mapped fields
    const dateMapping = fieldMap.get('date');
    const amountMapping = fieldMap.get('amount');
    const descMapping = fieldMap.get('description');
    const refMapping = fieldMap.get('reference');
    const contactMapping = fieldMap.get('contact');

    const date = dateMapping
      ? String(applyTransform(row[dateMapping.sourceColumn] ?? '', dateMapping.transform))
      : new Date().toISOString().split('T')[0];

    const amount = amountMapping
      ? Number(applyTransform(row[amountMapping.sourceColumn] ?? '0', amountMapping.transform))
      : 0;

    const description = descMapping
      ? String(applyTransform(row[descMapping.sourceColumn] ?? '', descMapping.transform))
      : undefined;

    const reference = refMapping
      ? String(applyTransform(row[refMapping.sourceColumn] ?? '', refMapping.transform))
      : undefined;

    const contactName = contactMapping
      ? String(applyTransform(row[contactMapping.sourceColumn] ?? '', contactMapping.transform))
      : undefined;

    // Skip rows without a valid amount
    if (amount === 0 && !amountMapping) continue;

    transactions.push({
      source_id: `${source}_row_${i}`,
      date,
      amount,
      description,
      reference,
      contact_name: contactName,
    });
  }

  if (transactions.length === 0) {
    return { ingested: 0 };
  }

  const staged = await stageTransactions(orgId, source, transactions);
  console.log(`[SPREADSHEET] Ingested ${staged} rows from ${source}`);
  return { ingested: staged };
}
