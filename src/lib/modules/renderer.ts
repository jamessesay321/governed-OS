import type { ModuleCategory } from '@/types/playbook';

// === Module Rendering Helpers ===

/**
 * Get the display icon SVG path for a module icon name.
 */
export function getModuleIconPath(icon: string): string {
  const icons: Record<string, string> = {
    HeartPulse:
      'M19.5 12.572l-7.5 7.428-7.5-7.428m15 0A3 3 0 0016.5 7.5c-1.07 0-2.04.45-2.73 1.17L12 10.5l-1.77-1.83A3.75 3.75 0 007.5 7.5a3 3 0 00-3 5.072',
    TrendingUp:
      'M2 17l5.5-5.5 4 4L22 5M22 5h-5M22 5v5',
    Target:
      'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z',
    Calculator:
      'M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 4v4h12V6H6zm0 6v2h4v-2H6zm6 0v2h4v-2h-4zm-6 4v2h4v-2H6zm6 0v2h4v-2h-4z',
    Receipt:
      'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    Layers:
      'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    Users:
      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm14 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    ClipboardList:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    GitBranch:
      'M6 3v12M18 9a3 3 0 100 6 3 3 0 000-6zm0 6c0 2-2 3-6 3s-6 0-6-3',
    Landmark:
      'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3',
    Shield:
      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    Scale:
      'M12 3v18m-9-9l3-6h12l3 6M6 12a3 3 0 01-3 3h6a3 3 0 01-3-3zm12 0a3 3 0 01-3 3h6a3 3 0 01-3-3z',
    Rocket:
      'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3m3 3a22 22 0 005-11 22 22 0 00-11 5l3 3 3 3zm-3-3l-4 4m7-1v3.87a.2.2 0 01-.34.14L8 18M5 16l-1.66 1.66a.2.2 0 00.14.34H7',
    Briefcase:
      'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
    ShoppingCart:
      'M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6m4 16a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z',
    BarChart:
      'M12 20V10M18 20V4M6 20v-4',
  };
  return icons[icon] ?? '';
}

/**
 * Get category display configuration.
 */
export function getCategoryConfig(category: ModuleCategory): {
  label: string;
  color: string;
  bgColor: string;
} {
  const configs: Record<ModuleCategory, { label: string; color: string; bgColor: string }> = {
    'financial-analysis': {
      label: 'Financial Analysis',
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    'forecasting-planning': {
      label: 'Forecasting & Planning',
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    'compliance-governance': {
      label: 'Compliance & Governance',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    'growth-strategy': {
      label: 'Growth & Strategy',
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    'industry-packs': {
      label: 'Industry Packs',
      color: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    },
  };
  return configs[category];
}

/**
 * Format a module slug for use in URLs.
 */
export function moduleSlugToPath(slug: string): string {
  return `/modules/${slug}`;
}
