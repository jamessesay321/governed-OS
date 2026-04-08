'use client';

/**
 * Universal Export Button
 *
 * Drop-in component for any analytical page. Supports CSV and Excel export
 * with formatted headers, currency columns, and auto-fit widths.
 *
 * Usage:
 *   <ExportButton
 *     data={rows}
 *     filename="revenue-analysis"
 *     title="Revenue Analysis"
 *   />
 */

import { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────

export interface ExportColumn {
  /** Header label displayed in the export */
  header: string;
  /** Key in the data object */
  key: string;
  /** Format hint for Excel */
  format?: 'currency' | 'percentage' | 'number' | 'text' | 'date';
  /** Column width (characters) — auto-calculated if omitted */
  width?: number;
}

export interface ExportButtonProps {
  /** Row data to export */
  data: Record<string, unknown>[];
  /** Column definitions — if omitted, auto-infers from data keys */
  columns?: ExportColumn[];
  /** Filename without extension */
  filename: string;
  /** Title shown in Excel sheet header (optional) */
  title?: string;
  /** Subtitle / date range shown under title in Excel */
  subtitle?: string;
  /** Compact variant (icon only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ─── CSV Export ─────────────────────────────────────────────────────

function exportCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): void {
  if (data.length === 0) return;

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  downloadBlob(blob, `${filename}.csv`);
}

// ─── Excel Export ───────────────────────────────────────────────────

async function exportExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
  subtitle?: string,
): Promise<void> {
  // Dynamic import to keep bundle small
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grove';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title ?? 'Export', {
    views: [{ state: 'frozen', ySplit: title ? 3 : 1 }],
  });

  let rowOffset = 0;

  // Title row
  if (title) {
    const titleRow = sheet.addRow([title]);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    titleRow.height = 24;
    sheet.mergeCells(1, 1, 1, columns.length);
    rowOffset++;
  }

  // Subtitle row
  if (subtitle) {
    const subRow = sheet.addRow([subtitle]);
    subRow.font = { size: 10, color: { argb: 'FF6B7280' }, italic: true };
    sheet.mergeCells(rowOffset + 1, 1, rowOffset + 1, columns.length);
    rowOffset++;
  }

  // Spacer
  if (title || subtitle) {
    sheet.addRow([]);
    rowOffset++;
  }

  // Header row
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }, // emerald-600
  };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (col.format === 'currency' || col.format === 'number' || col.format === 'percentage') {
        const num = Number(val);
        return isNaN(num) ? val : num;
      }
      return val;
    });
    const dataRow = sheet.addRow(values);
    dataRow.alignment = { vertical: 'middle' };
  }

  // Apply column formats and widths
  columns.forEach((col, i) => {
    const excelCol = sheet.getColumn(i + 1);

    // Auto-width: max of header length or longest data value
    const maxDataLen = data.reduce((max, row) => {
      const val = String(row[col.key] ?? '');
      return Math.max(max, val.length);
    }, col.header.length);
    excelCol.width = col.width ?? Math.min(Math.max(maxDataLen + 4, 10), 40);

    // Number format
    if (col.format === 'currency') {
      excelCol.numFmt = '£#,##0.00';
    } else if (col.format === 'percentage') {
      excelCol.numFmt = '0.0%';
    } else if (col.format === 'number') {
      excelCol.numFmt = '#,##0';
    }

    // Right-align numbers
    if (col.format === 'currency' || col.format === 'number' || col.format === 'percentage') {
      excelCol.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  // Alternate row shading
  const dataStartRow = rowOffset + 2; // +1 for header, +1 for 1-indexed
  for (let i = 0; i < data.length; i++) {
    if (i % 2 === 0) continue;
    const row = sheet.getRow(dataStartRow + i);
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' }, // gray-50
    };
  }

  // Auto-filter on header row
  sheet.autoFilter = {
    from: { row: rowOffset + 1, column: 1 },
    to: { row: rowOffset + 1, column: columns.length },
  };

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

// ─── Download Helper ────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Auto-infer columns from data ──────────────────────────────────

function inferColumns(data: Record<string, unknown>[]): ExportColumn[] {
  if (data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map((key) => {
    // Guess format from key name
    let format: ExportColumn['format'] = 'text';
    if (/amount|revenue|cost|profit|balance|spend|debt|cash|price|total|value/i.test(key)) {
      format = 'currency';
    } else if (/margin|percent|pct|rate|ratio/i.test(key)) {
      format = 'percentage';
    } else if (/count|quantity|num|number|months/i.test(key)) {
      format = 'number';
    } else if (/date|period|month|year/i.test(key)) {
      format = 'date';
    }

    return {
      header: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      key,
      format,
    };
  });
}

// ─── Component ──────────────────────────────────────────────────────

export function ExportButton({
  data,
  columns,
  filename,
  title,
  subtitle,
  compact = false,
  className,
  disabled = false,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolvedColumns = columns ?? inferColumns(data);

  const handleCSV = useCallback(() => {
    exportCSV(data, resolvedColumns, filename);
    setOpen(false);
  }, [data, resolvedColumns, filename]);

  const handleExcel = useCallback(async () => {
    setLoading(true);
    try {
      await exportExcel(data, resolvedColumns, filename, title, subtitle);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [data, resolvedColumns, filename, title, subtitle]);

  const isEmpty = data.length === 0;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || isEmpty}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border bg-background p-2 text-muted-foreground',
            'hover:bg-muted/50 hover:text-foreground transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          title="Export data"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </button>
        {open && <ExportDropdown onCSV={handleCSV} onExcel={handleExcel} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || isEmpty}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium',
          'text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </button>
      {open && <ExportDropdown onCSV={handleCSV} onExcel={handleExcel} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ─── Dropdown ───────────────────────────────────────────────────────

function ExportDropdown({
  onCSV,
  onExcel,
  onClose,
}: {
  onCSV: () => void;
  onExcel: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border bg-card shadow-lg py-1 min-w-[160px]">
        <button
          onClick={onCSV}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          Export as CSV
        </button>
        <button
          onClick={onExcel}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Export as Excel
        </button>
      </div>
    </>
  );
}
