'use client';

import { useEffect, useState } from 'react';

/**
 * A subtle sparkle/confetti celebration effect.
 * CSS-only, no external dependencies.
 * Usage: <Celebration trigger={shouldCelebrate} />
 */
export function Celebration({ trigger }: { trigger: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-celebration-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1.5 + Math.random() * 1.5}s`,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              backgroundColor: [
                '#f59e0b', // amber
                '#8b5cf6', // purple
                '#10b981', // emerald
                '#3b82f6', // blue
                '#ec4899', // pink
                '#f97316', // orange
              ][Math.floor(Math.random() * 6)],
              opacity: 0.8,
            }}
          />
        </div>
      ))}
    </div>
  );
}
