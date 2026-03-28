'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Hash,
  Upload,
  Download,
  Sparkles,
  Plus,
  X,
  Send,
  ChevronRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: 'left' | 'center' | 'right'
  numberFormat?: 'number' | 'currency' | 'percent'
}

interface CellData {
  value: string
  formula?: string
  format?: CellFormat
}

type SheetData = Record<string, Record<string, CellData>>

interface SheetTab {
  id: string
  name: string
  data: SheetData
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const COLS = 26
const ROWS = 100

function colLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

function cellRef(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`
}

/** Parse a cell reference like "A1" into { col, row } (0-indexed). */
function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z])(\d+)$/i)
  if (!match) return null
  const col = match[1].toUpperCase().charCodeAt(0) - 65
  const row = parseInt(match[2], 10) - 1
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  return { col, row }
}

/** Parse a range like "A1:A10" into an array of { col, row }. */
function parseRange(range: string): { col: number; row: number }[] {
  const [startRef, endRef] = range.split(':')
  const start = parseCellRef(startRef)
  const end = parseCellRef(endRef)
  if (!start || !end) return []
  const cells: { col: number; row: number }[] = []
  for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
    for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
      cells.push({ col: c, row: r })
    }
  }
  return cells
}

function getCellValue(data: SheetData, col: number, row: number): number {
  const cell = data[row]?.[col.toString()]
  if (!cell) return 0
  const num = parseFloat(cell.value)
  return isNaN(num) ? 0 : num
}

/** Very simple formula evaluator supporting SUM, AVERAGE, and basic arithmetic. */
function evaluateFormula(formula: string, data: SheetData): string {
  const upper = formula.toUpperCase().trim()

  // =SUM(A1:A10)
  const sumMatch = upper.match(/^=SUM\(([A-Z]\d+:[A-Z]\d+)\)$/)
  if (sumMatch) {
    const cells = parseRange(sumMatch[1])
    const total = cells.reduce((sum, c) => sum + getCellValue(data, c.col, c.row), 0)
    return total.toString()
  }

  // =AVERAGE(A1:A10)
  const avgMatch = upper.match(/^=AVERAGE\(([A-Z]\d+:[A-Z]\d+)\)$/)
  if (avgMatch) {
    const cells = parseRange(avgMatch[1])
    if (cells.length === 0) return '0'
    const total = cells.reduce((sum, c) => sum + getCellValue(data, c.col, c.row), 0)
    return (total / cells.length).toString()
  }

  // Simple arithmetic: =A1+B1, =A1-B1, =A1*B1, =A1/B1
  const arithMatch = formula.match(/^=([A-Z]\d+)\s*([+\-*/])\s*([A-Z]\d+)$/i)
  if (arithMatch) {
    const left = parseCellRef(arithMatch[1])
    const right = parseCellRef(arithMatch[3])
    if (left && right) {
      const a = getCellValue(data, left.col, left.row)
      const b = getCellValue(data, right.col, right.row)
      switch (arithMatch[2]) {
        case '+': return (a + b).toString()
        case '-': return (a - b).toString()
        case '*': return (a * b).toString()
        case '/': return b !== 0 ? (a / b).toString() : '#DIV/0!'
      }
    }
  }

  return '#ERR'
}

function formatDisplayValue(value: string, format?: CellFormat): string {
  if (!format?.numberFormat) return value
  const num = parseFloat(value)
  if (isNaN(num)) return value
  switch (format.numberFormat) {
    case 'currency':
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'percent':
      return `${(num * 100).toFixed(1)}%`
    case 'number':
      return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
    default:
      return value
  }
}

/* ------------------------------------------------------------------ */
/*  Template pre-fills                                                 */
/* ------------------------------------------------------------------ */

function getTemplateData(templateId: string | null): SheetData | null {
  if (!templateId) return null
  const templates: Record<string, SheetData> = {
    'pnl': {
      0: { '0': { value: 'Category' }, '1': { value: 'Q1' }, '2': { value: 'Q2' }, '3': { value: 'Q3' }, '4': { value: 'Q4' } },
      1: { '0': { value: 'Revenue' }, '1': { value: '250000' }, '2': { value: '275000' }, '3': { value: '310000' }, '4': { value: '340000' } },
      2: { '0': { value: 'COGS' }, '1': { value: '100000' }, '2': { value: '110000' }, '3': { value: '124000' }, '4': { value: '136000' } },
      3: { '0': { value: 'Gross Profit' }, '1': { value: '150000' }, '2': { value: '165000' }, '3': { value: '186000' }, '4': { value: '204000' } },
      4: { '0': { value: 'Operating Expenses' }, '1': { value: '80000' }, '2': { value: '85000' }, '3': { value: '90000' }, '4': { value: '95000' } },
      5: { '0': { value: 'Net Income' }, '1': { value: '70000' }, '2': { value: '80000' }, '3': { value: '96000' }, '4': { value: '109000' } },
    },
    'cashflow': {
      0: { '0': { value: 'Item' }, '1': { value: 'Jan' }, '2': { value: 'Feb' }, '3': { value: 'Mar' } },
      1: { '0': { value: 'Cash Inflows' }, '1': { value: '50000' }, '2': { value: '55000' }, '3': { value: '60000' } },
      2: { '0': { value: 'Cash Outflows' }, '1': { value: '40000' }, '2': { value: '42000' }, '3': { value: '45000' } },
      3: { '0': { value: 'Net Cash Flow' }, '1': { value: '10000' }, '2': { value: '13000' }, '3': { value: '15000' } },
    },
    'budget': {
      0: { '0': { value: 'Line Item' }, '1': { value: 'Budget' }, '2': { value: 'Actual' }, '3': { value: 'Variance' } },
      1: { '0': { value: 'Salaries' }, '1': { value: '120000' }, '2': { value: '118500' }, '3': { value: '1500' } },
      2: { '0': { value: 'Marketing' }, '1': { value: '30000' }, '2': { value: '32000' }, '3': { value: '-2000' } },
      3: { '0': { value: 'Operations' }, '1': { value: '25000' }, '2': { value: '24000' }, '3': { value: '1000' } },
    },
    'financial-model': {
      0: { '0': { value: 'Metric' }, '1': { value: 'Year 1' }, '2': { value: 'Year 2' }, '3': { value: 'Year 3' } },
      1: { '0': { value: 'Revenue' }, '1': { value: '500000' }, '2': { value: '750000' }, '3': { value: '1125000' } },
      2: { '0': { value: 'Growth Rate' }, '1': { value: '0' }, '2': { value: '0.5' }, '3': { value: '0.5' } },
      3: { '0': { value: 'Gross Margin' }, '1': { value: '0.6' }, '2': { value: '0.62' }, '3': { value: '0.65' } },
    },
    'revenue': {
      0: { '0': { value: 'Product' }, '1': { value: 'Units' }, '2': { value: 'Price' }, '3': { value: 'Revenue' } },
      1: { '0': { value: 'Product A' }, '1': { value: '1000' }, '2': { value: '49.99' }, '3': { value: '49990' } },
      2: { '0': { value: 'Product B' }, '1': { value: '500' }, '2': { value: '99.99' }, '3': { value: '49995' } },
      3: { '0': { value: 'Product C' }, '1': { value: '200' }, '2': { value: '199.99' }, '3': { value: '39998' } },
    },
    'unit-economics': {
      0: { '0': { value: 'Metric' }, '1': { value: 'Value' } },
      1: { '0': { value: 'CAC' }, '1': { value: '150' } },
      2: { '0': { value: 'LTV' }, '1': { value: '1200' } },
      3: { '0': { value: 'LTV:CAC Ratio' }, '1': { value: '8' } },
      4: { '0': { value: 'Payback Period (months)' }, '1': { value: '4.5' } },
      5: { '0': { value: 'Monthly Churn' }, '1': { value: '0.03' } },
    },
  }
  return templates[templateId] || null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SpreadsheetWorkspacePage() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')

  // Sheets
  const [sheets, setSheets] = useState<SheetTab[]>(() => {
    const initialData = getTemplateData(templateId) || {}
    return [{ id: '1', name: 'Sheet 1', data: initialData }]
  })
  const [activeSheetId, setActiveSheetId] = useState('1')
  const activeSheet = sheets.find((s) => s.id === activeSheetId)!

  // Selection
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null)
  const [editingCell, setEditingCell] = useState<{ col: number; row: number } | null>(null)
  const [formulaBarValue, setFormulaBarValue] = useState('')

  // AI panel
  const [aiOpen, setAiOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [aiInput, setAiInput] = useState('')

  // Upload drag state
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Grid container ref for scrolling
  const gridRef = useRef<HTMLDivElement>(null)

  /* ---- Data helpers ---- */

  const updateSheetData = useCallback(
    (newData: SheetData) => {
      setSheets((prev) =>
        prev.map((s) => (s.id === activeSheetId ? { ...s, data: newData } : s))
      )
    },
    [activeSheetId]
  )

  const setCellData = useCallback(
    (col: number, row: number, value: string) => {
      const data = { ...activeSheet.data }
      if (!data[row]) data[row] = {}
      const existing = data[row][col.toString()] || { value: '' }

      if (value.startsWith('=')) {
        const computed = evaluateFormula(value, data)
        data[row] = {
          ...data[row],
          [col.toString()]: { ...existing, value: computed, formula: value },
        }
      } else {
        data[row] = {
          ...data[row],
          [col.toString()]: { ...existing, value, formula: undefined },
        }
      }
      updateSheetData(data)
    },
    [activeSheet.data, updateSheetData]
  )

  const getCellData = useCallback(
    (col: number, row: number): CellData => {
      return activeSheet.data[row]?.[col.toString()] || { value: '' }
    },
    [activeSheet.data]
  )

  const setCellFormat = useCallback(
    (key: keyof CellFormat, value: unknown) => {
      if (!selectedCell) return
      const { col, row } = selectedCell
      const data = { ...activeSheet.data }
      if (!data[row]) data[row] = {}
      const existing = data[row][col.toString()] || { value: '' }
      const format = { ...existing.format, [key]: value } as CellFormat
      data[row] = {
        ...data[row],
        [col.toString()]: { ...existing, format },
      }
      updateSheetData(data)
    },
    [selectedCell, activeSheet.data, updateSheetData]
  )

  /* ---- Selection ---- */

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      setSelectedCell({ col, row })
      setEditingCell(null)
      const cell = getCellData(col, row)
      setFormulaBarValue(cell.formula || cell.value)
    },
    [getCellData]
  )

  const handleCellDoubleClick = useCallback(
    (col: number, row: number) => {
      setEditingCell({ col, row })
      const cell = getCellData(col, row)
      setFormulaBarValue(cell.formula || cell.value)
    },
    [getCellData]
  )

  const handleCellBlur = useCallback(
    (col: number, row: number, value: string) => {
      setCellData(col, row, value)
      setEditingCell(null)
    },
    [setCellData]
  )

  const handleFormulaBarChange = useCallback(
    (value: string) => {
      setFormulaBarValue(value)
    },
    []
  )

  const handleFormulaBarSubmit = useCallback(() => {
    if (!selectedCell) return
    setCellData(selectedCell.col, selectedCell.row, formulaBarValue)
    setEditingCell(null)
  }, [selectedCell, formulaBarValue, setCellData])

  /* ---- Keyboard nav ---- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return
      const { col, row } = selectedCell

      if (e.key === 'Enter') {
        if (editingCell) {
          handleCellBlur(col, row, formulaBarValue)
          setSelectedCell({ col, row: Math.min(row + 1, ROWS - 1) })
          const nextCell = getCellData(col, Math.min(row + 1, ROWS - 1))
          setFormulaBarValue(nextCell.formula || nextCell.value)
        } else {
          setEditingCell({ col, row })
        }
        e.preventDefault()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        if (editingCell) handleCellBlur(col, row, formulaBarValue)
        const nextCol = e.shiftKey ? Math.max(col - 1, 0) : Math.min(col + 1, COLS - 1)
        setSelectedCell({ col: nextCol, row })
        const nextCell = getCellData(nextCol, row)
        setFormulaBarValue(nextCell.formula || nextCell.value)
        setEditingCell(null)
      } else if (e.key === 'Escape') {
        setEditingCell(null)
        const cell = getCellData(col, row)
        setFormulaBarValue(cell.formula || cell.value)
      } else if (!editingCell) {
        let nextCol = col
        let nextRow = row
        switch (e.key) {
          case 'ArrowUp': nextRow = Math.max(row - 1, 0); break
          case 'ArrowDown': nextRow = Math.min(row + 1, ROWS - 1); break
          case 'ArrowLeft': nextCol = Math.max(col - 1, 0); break
          case 'ArrowRight': nextCol = Math.min(col + 1, COLS - 1); break
          default: return
        }
        e.preventDefault()
        setSelectedCell({ col: nextCol, row: nextRow })
        const nextCell = getCellData(nextCol, nextRow)
        setFormulaBarValue(nextCell.formula || nextCell.value)
      }
    },
    [selectedCell, editingCell, formulaBarValue, handleCellBlur, getCellData]
  )

  /* ---- Sheet tabs ---- */

  const addSheet = useCallback(() => {
    const newId = (sheets.length + 1).toString()
    setSheets((prev) => [...prev, { id: newId, name: `Sheet ${newId}`, data: {} }])
    setActiveSheetId(newId)
  }, [sheets.length])

  /* ---- File upload (stub) ---- */

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    // In a real implementation, parse xlsx/csv here
  }, [])

  /* ---- Download (CSV) ---- */

  const downloadCSV = useCallback(() => {
    const data = activeSheet.data
    const rowKeys = Object.keys(data).map(Number).sort((a, b) => a - b)
    if (rowKeys.length === 0) return
    const maxCol = Math.max(
      ...rowKeys.map((r) =>
        Math.max(...Object.keys(data[r]).map(Number))
      )
    )
    const lines: string[] = []
    for (const r of rowKeys) {
      const cols: string[] = []
      for (let c = 0; c <= maxCol; c++) {
        const val = data[r]?.[c.toString()]?.value || ''
        cols.push(val.includes(',') ? `"${val}"` : val)
      }
      lines.push(cols.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeSheet.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeSheet])

  /* ---- AI Chat (simulated) ---- */

  const sendAiMessage = useCallback(() => {
    if (!aiInput.trim()) return
    const userMsg = aiInput.trim()
    setAiMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setAiInput('')
    // Simulate response
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I can see your spreadsheet data. Based on your question about "${userMsg}", I would recommend analyzing the trends in your data. You can use formulas like =SUM() and =AVERAGE() for quick calculations.`,
        },
      ])
    }, 800)
  }, [aiInput])

  /* ---- Selected cell info ---- */

  const selectedCellRef = selectedCell ? cellRef(selectedCell.col, selectedCell.row) : ''
  const selectedCellData = selectedCell ? getCellData(selectedCell.col, selectedCell.row) : null

  /* ---- Visible rows for performance ---- */

  const visibleRows = useMemo(() => Array.from({ length: ROWS }, (_, i) => i), [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* ---- Toolbar ---- */}
      <div className="flex items-center gap-1 border-b bg-white px-2 sm:px-3 py-1.5 overflow-x-auto">
        {/* Format buttons */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button
            variant={selectedCellData?.format?.bold ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('bold', !selectedCellData?.format?.bold)}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.italic ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('italic', !selectedCellData?.format?.italic)}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.underline ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('underline', !selectedCellData?.format?.underline)}
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button
            variant={selectedCellData?.format?.align === 'left' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('align', 'left')}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.align === 'center' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('align', 'center')}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.align === 'right' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('align', 'right')}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Number format */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button
            variant={selectedCellData?.format?.numberFormat === 'currency' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('numberFormat', selectedCellData?.format?.numberFormat === 'currency' ? undefined : 'currency')}
            title="Currency"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.numberFormat === 'percent' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('numberFormat', selectedCellData?.format?.numberFormat === 'percent' ? undefined : 'percent')}
            title="Percent"
          >
            <Percent className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={selectedCellData?.format?.numberFormat === 'number' ? 'secondary' : 'ghost'}
            size="icon-xs"
            onClick={() => setCellFormat('numberFormat', selectedCellData?.format?.numberFormat === 'number' ? undefined : 'number')}
            title="Number"
          >
            <Hash className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={() => {/* parse file */}}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5 text-xs"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </Button>

        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadCSV}
          className="gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>

        {/* AI Assist */}
        <Button
          variant={aiOpen ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setAiOpen(!aiOpen)}
          className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Assist</span>
        </Button>
      </div>

      {/* ---- Formula Bar ---- */}
      <div className="flex items-center border-b bg-gray-50 px-2 sm:px-3 py-1 w-full">
        <div className="flex h-6 w-12 sm:w-14 items-center justify-center rounded border bg-white text-[10px] sm:text-xs font-medium text-gray-700 shrink-0">
          {selectedCellRef || 'A1'}
        </div>
        <div className="mx-1 sm:mx-2 text-gray-300">|</div>
        <input
          type="text"
          value={formulaBarValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFormulaBarSubmit()
            }
          }}
          placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      {/* ---- Main area: Grid + AI panel ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Drag-and-drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-50/80 backdrop-blur-sm">
            <div className="rounded-xl border-2 border-dashed border-emerald-400 bg-white px-12 py-8 text-center shadow-lg">
              <Upload className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="text-lg font-semibold text-emerald-700">Drop your file here</p>
              <p className="text-sm text-gray-500">.xlsx or .csv files supported</p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div
          ref={gridRef}
          className="flex-1 overflow-auto"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <table className="w-max border-collapse">
            {/* Column headers */}
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 h-7 w-12 border-b border-r bg-gray-100 text-center text-[10px] font-medium text-gray-500" />
                {Array.from({ length: COLS }, (_, i) => (
                  <th
                    key={i}
                    className="h-7 w-24 min-w-[96px] border-b border-r bg-gray-100 text-center text-[10px] font-medium text-gray-500"
                  >
                    {colLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row} className={row % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  {/* Row number */}
                  <td className="sticky left-0 z-10 h-7 w-12 border-b border-r bg-gray-100 text-center text-[10px] font-medium text-gray-500 select-none">
                    {row + 1}
                  </td>
                  {/* Cells */}
                  {Array.from({ length: COLS }, (_, col) => {
                    const cell = getCellData(col, row)
                    const isSelected =
                      selectedCell?.col === col && selectedCell?.row === row
                    const isEditing =
                      editingCell?.col === col && editingCell?.row === row
                    const displayValue = formatDisplayValue(cell.value, cell.format)

                    return (
                      <td
                        key={col}
                        className={cn(
                          'relative h-7 min-w-[96px] border-b border-r text-xs',
                          isSelected && 'outline outline-2 outline-emerald-500 z-[5]',
                          !isSelected && 'border-gray-200'
                        )}
                        onClick={() => handleCellClick(col, row)}
                        onDoubleClick={() => handleCellDoubleClick(col, row)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="absolute inset-0 h-full w-full px-1.5 text-xs outline-none"
                            defaultValue={cell.formula || cell.value}
                            onBlur={(e) => handleCellBlur(col, row, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellBlur(col, row, (e.target as HTMLInputElement).value)
                                setSelectedCell({ col, row: Math.min(row + 1, ROWS - 1) })
                              }
                              if (e.key === 'Escape') {
                                setEditingCell(null)
                              }
                            }}
                          />
                        ) : (
                          <div
                            className={cn(
                              'h-full w-full truncate px-1.5 leading-7',
                              cell.format?.bold && 'font-bold',
                              cell.format?.italic && 'italic',
                              cell.format?.underline && 'underline',
                              cell.format?.align === 'center' && 'text-center',
                              cell.format?.align === 'right' && 'text-right',
                              (!cell.format?.align || cell.format?.align === 'left') && 'text-left'
                            )}
                          >
                            {displayValue}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Chat Panel */}
        {aiOpen && (
          <div className="flex w-80 flex-col border-l bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-900">AI Assistant</span>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setAiOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.length === 0 && (
                <div className="mt-8 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-emerald-200" />
                  <p className="text-sm font-medium text-gray-500">Ask AI about your data</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try: &quot;Summarize the revenue trend&quot; or &quot;What formulas should I use?&quot;
                  </p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'ml-6 bg-emerald-50 text-emerald-900'
                      : 'mr-6 bg-gray-100 text-gray-800'
                  )}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendAiMessage()
                  }}
                  placeholder="Ask about your data..."
                  className="flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
                <Button
                  size="icon-xs"
                  onClick={sendAiMessage}
                  className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Sheet Tabs ---- */}
      <div className="flex items-center gap-1 border-t bg-gray-50 px-3 py-1">
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => setActiveSheetId(sheet.id)}
            className={cn(
              'rounded-t-md border border-b-0 px-3 py-1 text-xs font-medium transition-colors',
              sheet.id === activeSheetId
                ? 'border-gray-300 bg-white text-gray-900'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            {sheet.name}
          </button>
        ))}
        <button
          onClick={addSheet}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          title="Add sheet"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400">{ROWS} rows x {COLS} columns</span>
      </div>
    </div>
  )
}
