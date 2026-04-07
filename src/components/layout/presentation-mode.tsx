'use client';

import { useState, useCallback, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Presentation Mode toggle button.
 *
 * When active, adds the `presentation-mode` class to `document.body`.
 * The companion CSS file (globals-presentation.css) hides the sidebar
 * and top header so dashboards can be projected full-screen.
 *
 * Place this component inside the page header area.
 */
export function PresentationModeToggle() {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('presentation-mode');
      } else {
        document.body.classList.remove('presentation-mode');
      }
      return next;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('presentation-mode');
    };
  }, []);

  // Listen for Escape key to exit
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActive(false);
        document.body.classList.remove('presentation-mode');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return (
    <>
      {/* Enter button — sits in header */}
      <button
        onClick={toggle}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-2 text-sm transition-colors',
          'hover:bg-muted text-muted-foreground hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'bg-muted text-foreground',
        )}
        title={active ? 'Exit presentation mode' : 'Enter presentation mode'}
        aria-label={
          active ? 'Exit presentation mode' : 'Enter presentation mode'
        }
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* Floating exit button — only visible in presentation mode */}
      {active && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            onClick={toggle}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all',
              'bg-zinc-900 text-white hover:bg-zinc-800',
              'dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Minimize2 className="h-4 w-4" />
            Exit Presentation
          </button>
        </div>
      )}
    </>
  );
}
