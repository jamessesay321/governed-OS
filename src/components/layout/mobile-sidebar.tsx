'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button - visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center rounded-md h-11 w-11 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay + Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop with fade-in */}
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          />
          {/* Sidebar panel with smooth slide-in */}
          <div className="relative h-full w-72 max-w-[85vw] animate-in slide-in-from-left duration-300 ease-out shadow-2xl">
            <Sidebar
              className="h-full"
              onClose={() => setOpen(false)}
            />
            {/* Close button with proper touch target */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-2 flex items-center justify-center h-10 w-10 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
