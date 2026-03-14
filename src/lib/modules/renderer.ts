import type { ModuleDefinition, ModuleCategory } from '@/types/playbook';

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
    financial: {
      label: 'Financial',
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    operations: {
      label: 'Operations',
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    growth: {
      label: 'Growth',
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    governance: {
      label: 'Governance',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
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
