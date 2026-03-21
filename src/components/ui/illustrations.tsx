'use client';

/**
 * Simple inline SVG illustrations for empty, success, loading, and welcome states.
 * No external dependencies. Keep these lightweight and warm.
 */

export function EmptyStateIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-32 h-32 ${className}`} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Soft folder / empty box */}
      <rect x="24" y="44" width="80" height="56" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <path d="M24 52C24 47.5817 27.5817 44 32 44H52L58 36H96C100.418 36 104 39.5817 104 44V52H24Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      {/* Dashed lines suggesting empty content */}
      <rect x="40" y="62" width="48" height="4" rx="2" fill="#fcd34d" opacity="0.6" />
      <rect x="40" y="72" width="32" height="4" rx="2" fill="#fcd34d" opacity="0.4" />
      <rect x="40" y="82" width="40" height="4" rx="2" fill="#fcd34d" opacity="0.3" />
      {/* Sparkle accent */}
      <circle cx="100" cy="34" r="3" fill="#f59e0b" opacity="0.5" />
      <circle cx="108" cy="42" r="2" fill="#f59e0b" opacity="0.3" />
    </svg>
  );
}

export function SuccessIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-32 h-32 ${className}`} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circle background */}
      <circle cx="64" cy="64" r="40" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
      {/* Checkmark */}
      <path d="M48 64L58 74L80 52" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <circle cx="96" cy="28" r="4" fill="#f59e0b" opacity="0.7" />
      <circle cx="28" cy="40" r="3" fill="#8b5cf6" opacity="0.5" />
      <circle cx="104" cy="80" r="2.5" fill="#ec4899" opacity="0.5" />
      <circle cx="32" cy="92" r="2" fill="#3b82f6" opacity="0.4" />
      {/* Rays */}
      <line x1="64" y1="16" x2="64" y2="10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="98" y1="30" x2="104" y2="24" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="30" y1="30" x2="24" y2="24" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function LoadingIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-32 h-32 ${className}`} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="64" cy="64" r="36" stroke="#e5e7eb" strokeWidth="4" />
      {/* Animated arc */}
      <circle
        cx="64"
        cy="64"
        r="36"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="80 200"
        className="animate-spin origin-center"
        style={{ animationDuration: '1.5s' }}
      />
      {/* Inner dots */}
      <circle cx="52" cy="64" r="4" fill="#f59e0b" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="64" cy="64" r="4" fill="#f59e0b" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="76" cy="64" r="4" fill="#f59e0b" opacity="0.3">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
      </circle>
    </svg>
  );
}

export function WelcomeIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-40 h-32 ${className}`} viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Abstract warm shapes suggesting growth/journey */}
      {/* Rising bars */}
      <rect x="20" y="80" width="16" height="28" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <rect x="44" y="64" width="16" height="44" rx="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5" />
      <rect x="68" y="48" width="16" height="60" rx="4" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5" />
      <rect x="92" y="36" width="16" height="72" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      {/* Trend line */}
      <path d="M28 76L52 60L76 44L100 32" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow tip */}
      <path d="M96 28L104 32L96 36" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Sparkles */}
      <circle cx="120" cy="24" r="4" fill="#8b5cf6" opacity="0.6" />
      <circle cx="132" cy="36" r="2.5" fill="#ec4899" opacity="0.4" />
      <circle cx="140" cy="20" r="2" fill="#f59e0b" opacity="0.5" />
      {/* Star burst at peak */}
      <circle cx="112" cy="20" r="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M112 14V16M112 24V26M106 20H108M116 20H118M108 16L109.5 17.5M114.5 22.5L116 24M108 24L109.5 22.5M114.5 17.5L116 16" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
