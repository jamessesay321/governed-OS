// === Consultant Marketplace Data ===

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  estimatedCost: number; // pence
  deliverables: string[];
}

export interface ConsultantProfile {
  id: string;
  name: string;
  title: string;
  specialisation: string;
  avatar: string; // initials for avatar fallback
  bio: string;
  hourlyRate: number; // pence
  projectTemplates: ProjectTemplate[];
  rating: number; // 4.0-5.0
  completedProjects: number;
  availability: 'available' | 'limited' | 'busy';
  tags: string[];
}

// === Consultant Profiles ===

const CONSULTANTS: ConsultantProfile[] = [
  {
    id: 'consultant-sarah-chen',
    name: 'Sarah Chen',
    title: 'Fractional CMO',
    specialisation: 'Brand Strategy & Digital Marketing',
    avatar: 'SC',
    bio: 'Former Head of Marketing at Harrods and Net-a-Porter. Specialises in luxury brand positioning, digital-first go-to-market strategies, and building in-house marketing capabilities for creative businesses scaling from £500K to £5M.',
    hourlyRate: 15000,
    projectTemplates: [
      {
        id: 'pt-sc-01',
        title: 'Brand Positioning & GTM Strategy',
        description:
          'Full brand audit, competitive positioning map, and 12-month go-to-market plan tailored to your growth stage and target market.',
        estimatedHours: 40,
        estimatedCost: 600000,
        deliverables: [
          'Brand audit report',
          'Competitive positioning map',
          '12-month GTM roadmap',
          'Channel strategy with budget allocation',
          'KPI framework and measurement plan',
        ],
      },
      {
        id: 'pt-sc-02',
        title: 'US Market Entry Marketing Plan',
        description:
          'Research-backed marketing plan for entering the US market, including channel selection, influencer strategy, and localised messaging.',
        estimatedHours: 30,
        estimatedCost: 450000,
        deliverables: [
          'US market research summary',
          'Channel-by-channel entry plan',
          'Influencer and PR target list',
          'Localised brand messaging guide',
          'Launch campaign brief',
        ],
      },
    ],
    rating: 4.9,
    completedProjects: 34,
    availability: 'available',
    tags: [
      'Brand Strategy',
      'Digital Marketing',
      'Luxury',
      'Go-to-Market',
      'US Expansion',
    ],
  },
  {
    id: 'consultant-david-okafor',
    name: 'David Okafor',
    title: 'Sales Consultant',
    specialisation: 'B2B Sales & Partnership Development',
    avatar: 'DO',
    bio: 'Built and scaled sales teams at three fashion-tech startups. Expert in wholesale partnerships, stockist acquisition, and building repeatable B2B sales processes for luxury and premium brands.',
    hourlyRate: 17500,
    projectTemplates: [
      {
        id: 'pt-do-01',
        title: 'Wholesale Channel Development',
        description:
          'End-to-end wholesale strategy covering stockist identification, outreach, pitch materials, and negotiation frameworks for luxury retail partners.',
        estimatedHours: 35,
        estimatedCost: 612500,
        deliverables: [
          'Target stockist list (50+ prospects)',
          'Wholesale pitch deck',
          'Pricing and margin framework',
          'Outreach sequence templates',
          'Partnership agreement checklist',
        ],
      },
      {
        id: 'pt-do-02',
        title: 'Sales Process & CRM Setup',
        description:
          'Design and implement a structured sales process from enquiry to close, with CRM configuration and team training.',
        estimatedHours: 25,
        estimatedCost: 437500,
        deliverables: [
          'Sales process documentation',
          'CRM pipeline configuration',
          'Email templates and scripts',
          'Sales team training session (2 hours)',
          'Monthly reporting dashboard setup',
        ],
      },
    ],
    rating: 4.7,
    completedProjects: 22,
    availability: 'limited',
    tags: [
      'B2B Sales',
      'Wholesale',
      'Partnerships',
      'CRM',
      'Fashion',
    ],
  },
  {
    id: 'consultant-rachel-whitmore',
    name: 'Rachel Whitmore',
    title: 'Fractional CFO',
    specialisation: 'Financial Strategy & Fundraising',
    avatar: 'RW',
    bio: 'Chartered accountant (ICAEW) with 15 years in SME finance. Former CFO at two VC-backed businesses. Specialises in financial modelling, fundraising preparation, and building finance functions that scale.',
    hourlyRate: 20000,
    projectTemplates: [
      {
        id: 'pt-rw-01',
        title: 'Fundraising Readiness Package',
        description:
          'Complete fundraising preparation including financial model, investor deck financials, due diligence pack, and pitch coaching.',
        estimatedHours: 50,
        estimatedCost: 1000000,
        deliverables: [
          '3-year financial model (base, upside, downside)',
          'Investor deck financial slides',
          'Due diligence data room setup',
          'Unit economics analysis',
          'Pitch coaching session (2 hours)',
        ],
      },
      {
        id: 'pt-rw-02',
        title: 'Finance Function Build-Out',
        description:
          'Design and implement a scalable finance function including reporting cadence, cash management processes, and board reporting templates.',
        estimatedHours: 35,
        estimatedCost: 700000,
        deliverables: [
          'Finance function blueprint',
          'Monthly reporting pack template',
          'Cash management policy',
          'Board report template',
          'Finance team hiring brief (if needed)',
        ],
      },
    ],
    rating: 4.8,
    completedProjects: 41,
    availability: 'available',
    tags: [
      'CFO',
      'Financial Modelling',
      'Fundraising',
      'Board Reporting',
      'Scaling',
    ],
  },
];

// === Public API ===

/**
 * Get all consultant profiles.
 */
export function getConsultants(): ConsultantProfile[] {
  return CONSULTANTS;
}

/**
 * Get a single consultant by ID.
 */
export function getConsultantById(id: string): ConsultantProfile | undefined {
  return CONSULTANTS.find((c) => c.id === id);
}

/**
 * Get recommended consultants (available or limited availability, sorted by rating).
 */
export function getRecommendedConsultants(): ConsultantProfile[] {
  return CONSULTANTS.filter((c) => c.availability !== 'busy').sort(
    (a, b) => b.rating - a.rating
  );
}
