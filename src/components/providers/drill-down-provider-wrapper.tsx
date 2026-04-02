'use client';

import type { ReactNode } from 'react';
import { DrillDownProvider } from '@/components/shared/drill-down-sheet';

/**
 * Thin client-component wrapper so the server-side dashboard layout
 * can inject the DrillDownProvider without becoming a client component itself.
 */
export function DrillDownProviderWrapper({
  orgId,
  children,
}: {
  orgId: string;
  children: ReactNode;
}) {
  return <DrillDownProvider orgId={orgId}>{children}</DrillDownProvider>;
}
