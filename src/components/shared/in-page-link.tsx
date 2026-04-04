'use client';

/**
 * InPageLink — cross-page reference component
 *
 * Two modes:
 * 1. Anchor link (scrolls to a section on the same page)
 * 2. Page link (navigates to another page, optionally with hash)
 *
 * Usage:
 *   <InPageLink href="/financials/balance-sheet" label="Balance Sheet" />
 *   <InPageLink anchor="operating-activities" label="Operating Activities" />
 *   <InPageLink href="/financials/income-statement#revenue" label="Revenue" />
 *
 * SectionAnchor — invisible anchor point for in-page sections:
 *   <SectionAnchor id="operating-activities" />
 */

import Link from 'next/link';
import { ArrowRight, Hash } from 'lucide-react';

interface InPageLinkProps {
  /** Navigate to another page */
  href?: string;
  /** Scroll to an anchor on the current page */
  anchor?: string;
  /** Display text */
  label: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional className */
  className?: string;
}

export function InPageLink({
  href,
  anchor,
  label,
  subtitle,
  size = 'sm',
  className,
}: InPageLinkProps) {
  const baseClasses = `
    inline-flex items-center gap-1 rounded-md transition-colors
    text-blue-600 hover:text-blue-800 hover:underline underline-offset-2
    ${size === 'sm' ? 'text-xs' : 'text-sm'}
    ${className ?? ''}
  `.trim();

  if (anchor) {
    return (
      <a
        href={`#${anchor}`}
        className={baseClasses}
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById(anchor);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL hash without scroll
            history.pushState(null, '', `#${anchor}`);
          }
        }}
      >
        <Hash className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {label}
        {subtitle && <span className="text-muted-foreground ml-1">({subtitle})</span>}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {label}
        {subtitle && <span className="text-muted-foreground ml-1">({subtitle})</span>}
        <ArrowRight className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </Link>
    );
  }

  return <span className={baseClasses}>{label}</span>;
}

/**
 * SectionAnchor — invisible anchor target for in-page navigation.
 * Place before a section heading to enable smooth scroll targeting.
 *
 * Usage: <SectionAnchor id="operating-activities" />
 */
export function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-24" />;
}

/**
 * CrossRef — inline reference to another page, styled as a subtle link.
 * For use within paragraphs and descriptions.
 *
 * Usage: See the <CrossRef href="/variance" label="Variance Analysis" /> for details.
 */
export function CrossRef({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors ${className ?? ''}`}
    >
      {label}
    </Link>
  );
}
