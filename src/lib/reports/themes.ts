/**
 * Report Theme Presets
 * Sprint 8: 7 colour themes for board pack PDF generation.
 * From Kevin Steel / Inflectiv Intelligence pattern.
 * White-label ready from day one.
 */

export type ReportTheme = {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryText: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    positive: string;
    negative: string;
    neutral: string;
    tableHeader: string;
    tableHeaderText: string;
    tableBorder: string;
    coverBg: string;
    coverText: string;
    sectionNumberBg: string;
    sectionNumberText: string;
    commentaryBg: string;
    commentaryBorder: string;
  };
};

export const REPORT_THEMES: ReportTheme[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional deep blue — the board room standard',
    colors: {
      primary: '#1a1a2e',
      primaryText: '#ffffff',
      secondary: '#3182ce',
      accent: '#2b6cb0',
      background: '#ffffff',
      surface: '#f7fafc',
      text: '#1a1a2e',
      textMuted: '#718096',
      border: '#e2e8f0',
      positive: '#38a169',
      negative: '#e53e3e',
      neutral: '#718096',
      tableHeader: '#1a1a2e',
      tableHeaderText: '#ffffff',
      tableBorder: '#edf2f7',
      coverBg: '#1a1a2e',
      coverText: '#ffffff',
      sectionNumberBg: '#1a1a2e',
      sectionNumberText: '#ffffff',
      commentaryBg: '#f7fafc',
      commentaryBorder: '#3182ce',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Rich green tones — trust and growth',
    colors: {
      primary: '#1a3a2a',
      primaryText: '#ffffff',
      secondary: '#38a169',
      accent: '#2f855a',
      background: '#ffffff',
      surface: '#f0fff4',
      text: '#1a3a2a',
      textMuted: '#68856e',
      border: '#c6f6d5',
      positive: '#38a169',
      negative: '#e53e3e',
      neutral: '#718096',
      tableHeader: '#1a3a2a',
      tableHeaderText: '#ffffff',
      tableBorder: '#e8f5e9',
      coverBg: '#1a3a2a',
      coverText: '#ffffff',
      sectionNumberBg: '#2f855a',
      sectionNumberText: '#ffffff',
      commentaryBg: '#f0fff4',
      commentaryBorder: '#38a169',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark sophistication — modern and premium',
    colors: {
      primary: '#0f0f23',
      primaryText: '#e2e8f0',
      secondary: '#6366f1',
      accent: '#818cf8',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f0f23',
      textMuted: '#64748b',
      border: '#e2e8f0',
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#64748b',
      tableHeader: '#0f0f23',
      tableHeaderText: '#e2e8f0',
      tableBorder: '#f1f5f9',
      coverBg: '#0f0f23',
      coverText: '#e2e8f0',
      sectionNumberBg: '#6366f1',
      sectionNumberText: '#ffffff',
      commentaryBg: '#f8fafc',
      commentaryBorder: '#6366f1',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber and terracotta — approachable and confident',
    colors: {
      primary: '#7c2d12',
      primaryText: '#ffffff',
      secondary: '#ea580c',
      accent: '#c2410c',
      background: '#ffffff',
      surface: '#fff7ed',
      text: '#431407',
      textMuted: '#9a3412',
      border: '#fed7aa',
      positive: '#16a34a',
      negative: '#dc2626',
      neutral: '#78716c',
      tableHeader: '#7c2d12',
      tableHeaderText: '#ffffff',
      tableBorder: '#fef3c7',
      coverBg: '#7c2d12',
      coverText: '#ffffff',
      sectionNumberBg: '#ea580c',
      sectionNumberText: '#ffffff',
      commentaryBg: '#fff7ed',
      commentaryBorder: '#ea580c',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Teal and cyan — fresh and analytical',
    colors: {
      primary: '#134e4a',
      primaryText: '#ffffff',
      secondary: '#0d9488',
      accent: '#0f766e',
      background: '#ffffff',
      surface: '#f0fdfa',
      text: '#134e4a',
      textMuted: '#5eaaa0',
      border: '#99f6e4',
      positive: '#22c55e',
      negative: '#ef4444',
      neutral: '#64748b',
      tableHeader: '#134e4a',
      tableHeaderText: '#ffffff',
      tableBorder: '#e6fffa',
      coverBg: '#134e4a',
      coverText: '#ffffff',
      sectionNumberBg: '#0d9488',
      sectionNumberText: '#ffffff',
      commentaryBg: '#f0fdfa',
      commentaryBorder: '#0d9488',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral grey — understated and versatile',
    colors: {
      primary: '#1e293b',
      primaryText: '#f1f5f9',
      secondary: '#475569',
      accent: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
      positive: '#22c55e',
      negative: '#ef4444',
      neutral: '#94a3b8',
      tableHeader: '#1e293b',
      tableHeaderText: '#f1f5f9',
      tableBorder: '#f1f5f9',
      coverBg: '#1e293b',
      coverText: '#f1f5f9',
      sectionNumberBg: '#475569',
      sectionNumberText: '#ffffff',
      commentaryBg: '#f8fafc',
      commentaryBorder: '#475569',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean black and white — maximum readability',
    colors: {
      primary: '#000000',
      primaryText: '#ffffff',
      secondary: '#374151',
      accent: '#4b5563',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#111111',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      positive: '#059669',
      negative: '#dc2626',
      neutral: '#6b7280',
      tableHeader: '#111111',
      tableHeaderText: '#ffffff',
      tableBorder: '#f3f4f6',
      coverBg: '#ffffff',
      coverText: '#111111',
      sectionNumberBg: '#111111',
      sectionNumberText: '#ffffff',
      commentaryBg: '#fafafa',
      commentaryBorder: '#111111',
    },
  },
];

/**
 * Get a theme by ID.
 */
export function getThemeById(id: string): ReportTheme {
  return REPORT_THEMES.find((t) => t.id === id) ?? REPORT_THEMES[0];
}

/**
 * Get all available themes.
 */
export function getAllThemes(): ReportTheme[] {
  return REPORT_THEMES;
}

/**
 * Generate CSS variables string for a theme.
 * Injects into the PDF print stylesheet.
 */
export function generateThemeCSS(theme: ReportTheme): string {
  const c = theme.colors;
  return `
  body { color: ${c.text}; background: ${c.background}; }
  .cover-page { background: ${c.coverBg}; color: ${c.coverText}; }
  .cover-logo { background: ${c.primary}; color: ${c.primaryText}; }
  .cover-org { color: ${c.coverText}; }
  .cover-title { color: ${c.coverText === '#ffffff' ? '#e2e8f0' : c.text}; border-color: ${c.coverText === '#ffffff' ? 'rgba(255,255,255,0.3)' : c.primary}; }
  .cover-meta { color: ${c.coverText === '#ffffff' ? '#a0aec0' : c.textMuted}; }
  .confidential { color: ${c.negative}; }
  .toc h2 { color: ${c.primary}; border-color: ${c.primary}; }
  .section-header { border-color: ${c.primary}; }
  .section-number { background: ${c.sectionNumberBg}; color: ${c.sectionNumberText}; }
  .section-title { color: ${c.primary}; }
  .commentary { background: ${c.commentaryBg}; border-left-color: ${c.commentaryBorder}; }
  .commentary p { color: ${c.text}; }
  .kpi-card { border-color: ${c.border}; }
  .kpi-label { color: ${c.textMuted}; }
  .kpi-value { color: ${c.primary}; }
  .trend-up { color: ${c.positive}; }
  .trend-down { color: ${c.negative}; }
  .trend-flat { color: ${c.neutral}; }
  .kpi-benchmark { color: ${c.textMuted}; }
  .data-table th { background: ${c.tableHeader}; color: ${c.tableHeaderText}; }
  .data-table td { border-color: ${c.tableBorder}; }
  .section-row td { background: ${c.surface}; }
  .summary-row td { border-top-color: ${c.primary}; }
  .summary-row.highlight td { background: ${c.surface}; }
  .scenario-card { border-color: ${c.border}; }
  .scenario-name { color: ${c.primary}; }
  .scenario-status { background: ${c.surface}; }
  .intel-item { border-color: ${c.border}; }
  .badge-positive { background: ${c.positive}20; color: ${c.positive}; }
  .badge-negative { background: ${c.negative}20; color: ${c.negative}; }
  .badge-neutral { background: ${c.surface}; color: ${c.textMuted}; }
  .intel-narrative { color: ${c.textMuted}; }
  .report-footer { color: ${c.textMuted}; border-color: ${c.tableBorder}; }
  .empty { color: ${c.textMuted}; }
  .generic-data { background: ${c.surface}; }
  .toc-list li { border-color: ${c.tableBorder}; }
  .toc-dots { border-color: ${c.border}; }`;
}
