import { getUserProfile } from '@/lib/auth/get-user-profile';
import { StrategyClient } from './strategy-client';

export const metadata = {
  title: 'Strategic Plan 2026 | Grove',
  description: 'Track progress across strategic workstreams and milestones',
};

// ── Types ──

export type MilestoneStatus = 'completed' | 'in-progress' | 'upcoming' | 'overdue';

export interface Milestone {
  id: string;
  date: string;            // ISO date string (YYYY-MM-DD) or descriptive (e.g. "Q2 2026")
  sortDate: string;        // ISO date for sorting/comparison
  description: string;
  status: MilestoneStatus;
  revenueTarget?: number;  // £ amount
  budgetCost?: number;     // £ amount
  notes?: string;
}

export interface Workstream {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
  milestones: Milestone[];
}

// ── Auto-status logic ──

const TODAY = new Date('2026-04-15');

function autoStatus(
  sortDate: string,
  manualStatus?: MilestoneStatus,
): MilestoneStatus {
  if (manualStatus === 'completed') return 'completed';

  const d = new Date(sortDate);

  // If the milestone date has passed and it's not marked complete, it's overdue
  if (d < TODAY) return 'overdue';

  // If the milestone is within the current month, it's in-progress
  if (
    d.getFullYear() === TODAY.getFullYear() &&
    d.getMonth() === TODAY.getMonth()
  ) {
    return 'in-progress';
  }

  return 'upcoming';
}

// ── Milestone Data ──

const WORKSTREAMS: Workstream[] = [
  {
    id: 'cost-restructuring',
    name: 'Workstream 1: Cost Restructuring',
    shortName: 'Cost Restructuring',
    description:
      'Reduce fixed cost base through headcount restructuring, overhead reduction, and debt refinancing. Target: £160K+ annual savings.',
    color: 'green',
    milestones: [
      {
        id: 'cr-1',
        date: 'Apr 2026',
        sortDate: '2026-04-01',
        description: 'Begin redundancy consultation (3 seamstresses)',
        status: autoStatus('2026-04-01'),
      },
      {
        id: 'cr-2',
        date: 'May 2026',
        sortDate: '2026-05-01',
        description: 'Redundancy notices served',
        status: autoStatus('2026-05-01'),
      },
      {
        id: 'cr-3',
        date: 'Jun 2026',
        sortDate: '2026-06-01',
        description: 'Redundancies effective — £110K/yr saving begins',
        status: autoStatus('2026-06-01'),
        budgetCost: 110000,
        notes: 'Annual saving from headcount reduction',
      },
      {
        id: 'cr-4',
        date: 'Jun–Dec 2026',
        sortDate: '2026-06-01',
        description: 'Overhead reduction review (target: £50K additional savings)',
        status: autoStatus('2026-06-01'),
        budgetCost: 50000,
        notes: 'Additional annual savings target',
      },
      {
        id: 'cr-5',
        date: 'Ongoing',
        sortDate: '2026-12-31',
        description: 'Debt refinancing — reduce interest from £257K/yr',
        status: 'in-progress',
        budgetCost: 257000,
        notes: 'Current annual interest cost to be reduced',
      },
    ],
  },
  {
    id: 'bridal-activation',
    name: 'Workstream 2: Bridal Activation (Trunk Shows)',
    shortName: 'Bridal Activation',
    description:
      'Scale trunk show revenue through US city rotation. Google Ads running at £500-800/mo in Houston, New Jersey, Atlanta.',
    color: 'blue',
    milestones: [
      {
        id: 'ba-1',
        date: 'Jan 2026',
        sortDate: '2026-01-15',
        description: 'Houston trunk show #1',
        status: 'completed',
        revenueTarget: 40000,
      },
      {
        id: 'ba-2',
        date: 'Feb 2026',
        sortDate: '2026-02-15',
        description: 'New York trunk show #1',
        status: 'completed',
        revenueTarget: 40000,
      },
      {
        id: 'ba-3',
        date: 'Mar 2026',
        sortDate: '2026-03-15',
        description: 'Atlanta trunk show #1',
        status: autoStatus('2026-03-15'),
        revenueTarget: 40000,
      },
      {
        id: 'ba-4',
        date: 'May 2026',
        sortDate: '2026-05-15',
        description: 'Houston trunk show #2',
        status: autoStatus('2026-05-15'),
        revenueTarget: 40000,
      },
      {
        id: 'ba-5',
        date: 'Jun 2026',
        sortDate: '2026-06-15',
        description: 'New York trunk show #2',
        status: autoStatus('2026-06-15'),
        revenueTarget: 70000,
      },
      {
        id: 'ba-6',
        date: 'Jul 2026',
        sortDate: '2026-07-15',
        description: 'London trunk show',
        status: autoStatus('2026-07-15'),
        revenueTarget: 70000,
      },
      {
        id: 'ba-7',
        date: 'Aug 2026',
        sortDate: '2026-08-15',
        description: 'Atlanta trunk show #2',
        status: autoStatus('2026-08-15'),
        revenueTarget: 100000,
      },
      {
        id: 'ba-8',
        date: 'Sep 2026',
        sortDate: '2026-09-15',
        description: 'Houston #3 + NYC #3',
        status: autoStatus('2026-09-15'),
        revenueTarget: 200000,
        notes: '£100K each',
      },
      {
        id: 'ba-9',
        date: 'Oct 2026',
        sortDate: '2026-10-15',
        description: 'Houston #4',
        status: autoStatus('2026-10-15'),
        revenueTarget: 130000,
      },
      {
        id: 'ba-10',
        date: 'Nov 2026',
        sortDate: '2026-11-15',
        description: 'Atlanta #3',
        status: autoStatus('2026-11-15'),
        revenueTarget: 130000,
      },
      {
        id: 'ba-11',
        date: 'Dec 2026',
        sortDate: '2026-12-15',
        description: 'NYC #4',
        status: autoStatus('2026-12-15'),
        revenueTarget: 130000,
      },
    ],
  },
  {
    id: 'new-products',
    name: 'Workstream 3: New Product Categories',
    shortName: 'New Products',
    description:
      'Launch 3 new collections (Civil Ceremony, All-Black, Mainline Bridal) to diversify revenue. Total new category target: £108K-£184K.',
    color: 'purple',
    milestones: [
      {
        id: 'np-1',
        date: 'May 2026',
        sortDate: '2026-05-01',
        description: 'China fabric sourcing trip',
        status: autoStatus('2026-05-01'),
        budgetCost: 3000,
      },
      {
        id: 'np-2',
        date: 'Mid-Jun 2026',
        sortDate: '2026-06-15',
        description: 'Civil Ceremony collection launch (£1,500-£3,000 range)',
        status: autoStatus('2026-06-15'),
        revenueTarget: 48000,
        notes: 'Target: £36K-£60K revenue',
      },
      {
        id: 'np-3',
        date: 'Jun 2026',
        sortDate: '2026-06-01',
        description: 'Campaign shoot for Civil Ceremony',
        status: autoStatus('2026-06-01'),
        budgetCost: 12500,
        notes: 'Budget: £10-15K',
      },
      {
        id: 'np-4',
        date: 'Mid-Aug 2026',
        sortDate: '2026-08-15',
        description: 'All-Black collection launch (£800-£2,000 range)',
        status: autoStatus('2026-08-15'),
        revenueTarget: 48000,
        notes: 'Target: £36K-£60K revenue',
      },
      {
        id: 'np-5',
        date: 'Aug 2026',
        sortDate: '2026-08-01',
        description: 'Campaign shoot for All-Black collection',
        status: autoStatus('2026-08-01'),
        budgetCost: 10000,
        notes: 'Budget: £8-12K',
      },
      {
        id: 'np-6',
        date: 'Mid-Oct 2026',
        sortDate: '2026-10-15',
        description: 'Mainline Bridal collection launch (premium)',
        status: autoStatus('2026-10-15'),
        revenueTarget: 50000,
        notes: 'Target: £36K-£64K revenue',
      },
    ],
  },
  {
    id: 'us-wholesale',
    name: 'Workstream 4: US Wholesale',
    shortName: 'US Wholesale',
    description:
      'Build US wholesale distribution channel. Target: 5-10 wholesale accounts by end 2026, Kleinfeld pathway in 2027.',
    color: 'orange',
    milestones: [
      {
        id: 'uw-1',
        date: 'Q2 2026',
        sortDate: '2026-04-01',
        description: 'Approach Houston boutiques (Lovely Bride, Designer Loft)',
        status: autoStatus('2026-04-01'),
      },
      {
        id: 'uw-2',
        date: 'Q3 2026',
        sortDate: '2026-07-01',
        description: 'NYC boutique partnerships',
        status: autoStatus('2026-07-01'),
      },
      {
        id: 'uw-3',
        date: 'Q4 2026',
        sortDate: '2026-10-01',
        description: 'Establish wholesale terms and pricing',
        status: autoStatus('2026-10-01'),
      },
      {
        id: 'uw-4',
        date: '2027',
        sortDate: '2027-01-01',
        description: 'Kleinfeld pathway',
        status: autoStatus('2027-01-01'),
      },
      {
        id: 'uw-5',
        date: 'End 2026',
        sortDate: '2026-12-31',
        description: 'Target: 5-10 wholesale accounts',
        status: autoStatus('2026-12-31'),
      },
    ],
  },
];

// ── Page ──

export default async function StrategyPage() {
  await getUserProfile(); // auth guard

  return <StrategyClient workstreams={WORKSTREAMS} today={TODAY.toISOString()} />;
}
