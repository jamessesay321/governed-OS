// Debt Command Centre types

export type FacilityType =
  | 'term_loan'
  | 'unsecured_loan'
  | 'secured_loan'
  | 'mca'
  | 'credit_card'
  | 'overdraft'
  | 'government_loan'
  | 'director_loan'
  | 'creditor_plan'
  | 'personal_loan'
  | 'paye_plan'
  | 'vat_liability'
  | 'corp_tax'
  | 'other';

export type DebtCategory = 'lender' | 'creditor' | 'director_loan' | 'tax_statutory';

export type DebtClassification = 'good' | 'okay' | 'bad' | 'unclassified';

export type RepaymentFrequency =
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'when_paid'
  | 'none';

export type FacilityStatus = 'active' | 'paid_off' | 'refinanced' | 'defaulted' | 'frozen';

export interface DebtFacility {
  id: string;
  org_id: string;
  facility_name: string;
  lender: string;
  facility_type: FacilityType;
  category: DebtCategory;
  classification: DebtClassification;
  original_amount: number;
  current_balance: number;
  monthly_repayment: number;
  interest_rate: number;
  effective_apr: number | null;
  fixed_fee: number;
  start_date: string | null;
  maturity_date: string | null;
  next_payment_date: string | null;
  payment_day: number | null;
  repayment_frequency: RepaymentFrequency;
  sweep_percentage: number | null;
  sweep_source: string | null;
  status: FacilityStatus;
  refinance_eligible: boolean;
  refinance_priority: number | null;
  refinance_notes: string | null;
  secured: boolean;
  collateral_description: string | null;
  has_debenture: boolean;
  director_name: string | null;
  notes: string | null;
  statement_access: string | null;
  portal_url: string | null;
  last_statement_date: string | null;
  // New fields
  missing_info: string[] | null;
  action_required: string | null;
  credit_impacting: boolean;
  credit_impact_notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Joined data
  balance_history?: DebtBalanceHistory[];
  documents?: DebtDocument[];
}

export interface DebtBalanceHistory {
  id: string;
  org_id: string;
  facility_id: string;
  period: string;
  balance: number;
  is_projected: boolean;
  created_at: string;
}

export interface DebtDocument {
  id: string;
  org_id: string;
  facility_id: string;
  file_name: string;
  file_url: string;
  file_type: 'contract' | 'statement' | 'agreement' | 'correspondence' | 'other';
  ai_summary: string | null;
  ai_key_terms: Record<string, unknown> | null;
  uploaded_at: string;
  scanned_at: string | null;
}

export interface DebtRefinanceScenario {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  actions: RefinanceAction[];
  total_current_debt: number;
  total_post_refinance: number;
  monthly_saving: number;
  annual_saving: number;
  new_monthly_repayment: number;
  breakeven_months: number | null;
  ai_analysis: string | null;
  status: 'draft' | 'active' | 'applied' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface RefinanceAction {
  facility_id: string;
  facility_name: string;
  action: 'pay_off' | 'refinance' | 'consolidate' | 'keep';
  current_balance: number;
  current_monthly: number;
  new_amount?: number;
  new_rate?: number;
  new_term_months?: number;
  new_monthly?: number;
  justification?: string;
}

export interface VATQuarter {
  id: string;
  org_id: string;
  quarter_label: string;
  period_start: string;
  period_end: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  status: 'pending' | 'filed' | 'paid' | 'refund_received' | 'refund_pending' | 'overdue' | 'payment_plan';
  filed_date: string | null;
  payment_date: string | null;
  hmrc_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Balance sheet liability from Xero (passed from server)
export interface TaxLiabilityFromBS {
  account_name: string;
  account_code: string;
  account_id: string;
  balance: number;
  period: string;
  type: 'paye' | 'vat' | 'nic' | 'pension' | 'corp_tax' | 'other_tax';
}

// Summary stats for the dashboard header
export interface DebtSummary {
  total_outstanding: number;
  total_monthly_repayment: number;
  total_annual_cost: number;
  facility_count: number;
  active_count: number;
  average_rate: number;
  weighted_average_rate: number;
  highest_rate_facility: string;
  next_maturity: { facility: string; date: string } | null;
  next_payment: { facility: string; date: string; amount: number } | null;
  dscr: number | null;
  // By classification
  good_total: number;
  okay_total: number;
  bad_total: number;
  // By category
  lenders_total: number;
  lenders_monthly: number;
  creditors_total: number;
  creditors_monthly: number;
  director_loans_total: number;
  director_loans_monthly: number;
  tax_statutory_total: number;
  // Legacy (kept for compatibility)
  business_loans_total: number;
  mca_total: number;
  director_loans_total_legacy: number;
  creditor_plans_total: number;
  // Missing info count
  facilities_missing_info: number;
  facilities_action_required: number;
  // Credit-impacting DLAs
  credit_impacting_total: number;
  credit_impacting_count: number;
}

// Facility type display helpers
export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  term_loan: 'Term Loan',
  unsecured_loan: 'Unsecured Loan',
  secured_loan: 'Secured Loan',
  mca: 'Merchant Cash Advance',
  credit_card: 'Credit Card',
  overdraft: 'Overdraft',
  government_loan: 'Government Loan',
  director_loan: 'Director Loan',
  creditor_plan: 'Creditor Payment Plan',
  personal_loan: 'Personal Loan',
  paye_plan: 'PAYE Payment Plan',
  vat_liability: 'VAT Liability',
  corp_tax: 'Corporation Tax',
  other: 'Other',
};

export const CATEGORY_LABELS: Record<DebtCategory, string> = {
  lender: 'Financial Lenders',
  creditor: 'Operational Creditors',
  director_loan: 'Director Loans',
  tax_statutory: 'Tax & Statutory',
};

export const CLASSIFICATION_CONFIG: Record<DebtClassification, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  good: {
    label: 'Good',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: 'check-circle',
    description: 'Low interest, manageable repayments, long-term value',
  },
  okay: {
    label: 'Okay',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: 'alert-circle',
    description: 'Moderate cost, monitor closely, refinance when possible',
  },
  bad: {
    label: 'Bad',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: 'x-circle',
    description: 'High effective APR, cash drain, refinance immediately',
  },
  unclassified: {
    label: 'Unclassified',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: 'help-circle',
    description: 'Needs review and classification',
  },
};
