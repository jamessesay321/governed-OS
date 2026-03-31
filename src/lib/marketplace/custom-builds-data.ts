// === Custom Builds Marketplace Data ===

export interface CustomBuildProject {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedCost: number; // pence
  estimatedTimeline: string;
  features: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  recommended: boolean;
  reasoning?: string;
}

export interface CustomBuildExample {
  id: string;
  title: string;
  industry: string;
  description: string;
  deliverables: string[];
}

// === Custom Build Project Templates (demo mode only) ===

const CUSTOM_BUILDS: CustomBuildProject[] = [
  {
    id: 'cb-bridal-booking',
    title: 'Bridal Appointment Booking System',
    description:
      'A bespoke online booking system integrated with your existing website. Clients can browse available appointment types (consultation, fitting, final collection), select time slots, and receive automated confirmations and reminders.',
    category: 'Client Experience',
    estimatedCost: 450000,
    estimatedTimeline: '4-6 weeks',
    features: [
      'Online appointment scheduling with calendar sync',
      'Automated email and SMS reminders',
      'Client intake questionnaire',
      'Staff availability management',
      'Deposit collection via Stripe',
      'Integration with existing website',
    ],
    complexity: 'moderate',
    recommended: true,
    reasoning:
      'Based on your current appointment volume (14/week) and growth trajectory, automating bookings could save 6-8 hours of admin time weekly and reduce no-shows by up to 40%.',
  },
  {
    id: 'cb-client-portal',
    title: 'Bespoke Client Portal',
    description:
      'A private portal where bridal clients can track the progress of their gown, view design sketches, approve fabric choices, and communicate with your team — all in one place.',
    category: 'Client Experience',
    estimatedCost: 750000,
    estimatedTimeline: '8-10 weeks',
    features: [
      'Gown progress timeline with photo updates',
      'Fabric and design approval workflow',
      'Secure messaging with the design team',
      'Fitting schedule and countdown',
      'Invoice and payment tracking',
      'Mobile-responsive design',
    ],
    complexity: 'complex',
    recommended: true,
    reasoning:
      'A client portal positions your business as a premium, tech-forward brand. It reduces back-and-forth emails by an estimated 60% and creates a memorable client experience that drives referrals.',
  },
  {
    id: 'cb-stockist-dashboard',
    title: 'Wholesale Stockist Dashboard',
    description:
      'A dashboard for wholesale stockist partners to place orders, view available inventory, track delivery status, and access marketing assets — supporting your US expansion strategy.',
    category: 'Operations',
    estimatedCost: 600000,
    estimatedTimeline: '6-8 weeks',
    features: [
      'Stockist self-service ordering',
      'Real-time inventory visibility',
      'Order tracking and delivery updates',
      'Marketing asset library (images, descriptions)',
      'Sales reporting per stockist',
      'Multi-currency support (GBP/USD)',
    ],
    complexity: 'complex',
    recommended: false,
    reasoning:
      'Best suited for Phase 2 of US expansion once you have 3+ active stockist partners. The ROI increases significantly with each additional wholesale relationship.',
  },
];

// === Cross-Industry Examples ===

const CROSS_INDUSTRY_EXAMPLES: CustomBuildExample[] = [
  {
    id: 'cbe-restaurant',
    title: 'Multi-Location Inventory Tracker',
    industry: 'Hospitality',
    description:
      'Built for a restaurant group with 4 locations. Real-time ingredient tracking, automated supplier reordering, and waste reduction analytics integrated with their POS system.',
    deliverables: [
      'Real-time inventory dashboard across locations',
      'Automated low-stock alerts and reorder triggers',
      'Waste tracking and reduction reports',
      'POS integration (Square)',
      'Supplier management portal',
    ],
  },
  {
    id: 'cbe-property',
    title: 'Tenant Management Platform',
    industry: 'Property Management',
    description:
      'Custom platform for a property management firm handling 120 units. Tenant communications, maintenance requests, rent collection tracking, and compliance document management.',
    deliverables: [
      'Tenant self-service portal',
      'Maintenance request workflow',
      'Rent collection dashboard with automated reminders',
      'Compliance document vault (gas safety, EPC)',
      'Financial reporting per property',
    ],
  },
  {
    id: 'cbe-agency',
    title: 'Client Reporting Automation',
    industry: 'Marketing Agency',
    description:
      'Automated reporting system for a digital marketing agency. Pulls data from Google Analytics, Meta Ads, and LinkedIn, generates branded PDF reports, and distributes to clients on schedule.',
    deliverables: [
      'Multi-source data aggregation',
      'Branded report template builder',
      'Automated monthly report generation',
      'Client portal for report access',
      'Performance alert notifications',
    ],
  },
  {
    id: 'cbe-fitness',
    title: 'Member Progress Tracker',
    industry: 'Fitness & Wellness',
    description:
      'Built for a boutique fitness studio chain. Members track workouts, view progress charts, book classes, and receive personalised programme recommendations based on their goals.',
    deliverables: [
      'Member mobile app (iOS + Android)',
      'Workout logging and progress charts',
      'Class booking with waitlist management',
      'Personalised programme recommendations',
      'Trainer dashboard for client management',
    ],
  },
];

// === Public API ===

/**
 * Get all custom build project templates.
 */
export function getCustomBuilds(): CustomBuildProject[] {
  return CUSTOM_BUILDS;
}

/**
 * Get a single custom build by ID.
 */
export function getCustomBuildById(id: string): CustomBuildProject | undefined {
  return CUSTOM_BUILDS.find((b) => b.id === id);
}

/**
 * Get recommended custom builds (filtered and sorted by relevance).
 */
export function getRecommendedBuilds(): CustomBuildProject[] {
  return CUSTOM_BUILDS.filter((b) => b.recommended);
}

/**
 * Get cross-industry example builds.
 */
export function getCrossIndustryExamples(): CustomBuildExample[] {
  return CROSS_INDUSTRY_EXAMPLES;
}
