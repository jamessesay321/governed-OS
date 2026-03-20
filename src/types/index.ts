// === Roles ===
export const ROLES = ['owner', 'admin', 'advisor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  advisor: 2,
  viewer: 1,
};

// === Organisation ===
export type Organisation = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// === Profile ===
export type Profile = {
  id: string;
  org_id: string;
  role: Role;
  display_name: string;
  created_at: string;
  updated_at: string;
};

// === Invitation ===
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type OrgInvitation = {
  id: string;
  org_id: string;
  email: string;
  role: Role;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
};

// === Xero Connection ===
export type XeroConnectionStatus = 'active' | 'disconnected';

export type XeroConnection = {
  id: string;
  org_id: string;
  xero_tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  connected_by: string;
  status: XeroConnectionStatus;
  created_at: string;
  updated_at: string;
};

// === Chart of Accounts ===
export type ChartOfAccount = {
  id: string;
  org_id: string;
  xero_account_id: string;
  code: string;
  name: string;
  type: string;
  class: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// === Transactions ===
export type TransactionType =
  | 'invoice'
  | 'bill'
  | 'payment'
  | 'bank_transaction'
  | 'credit_note'
  | 'manual_journal';

export type RawTransaction = {
  id: string;
  org_id: string;
  xero_id: string;
  date: string;
  type: TransactionType;
  contact_name: string | null;
  line_items: Record<string, unknown>[];
  total: number;
  currency: string;
  raw_payload: Record<string, unknown>;
  synced_at: string;
  created_at: string;
};

// === Normalised Financials ===
export type NormalisedFinancial = {
  id: string;
  org_id: string;
  period: string; // YYYY-MM-01
  account_id: string;
  amount: number;
  transaction_count: number;
  source: string;
  created_at: string;
  updated_at: string;
};

// === Sync Log ===
export type SyncStatus = 'running' | 'completed' | 'failed';

export type SyncLog = {
  id: string;
  org_id: string;
  sync_type: string;
  status: SyncStatus;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

// === Audit Log ===
export type AuditLog = {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// === Scenario Engine Enums ===
export const ASSUMPTION_TYPES = ['percentage', 'currency', 'integer', 'boolean', 'decimal'] as const;
export type AssumptionType = (typeof ASSUMPTION_TYPES)[number];

export const ASSUMPTION_CATEGORIES = [
  'revenue_drivers', 'pricing', 'costs', 'growth_rates',
  'headcount', 'marketing', 'capital', 'custom',
] as const;
export type AssumptionCategory = (typeof ASSUMPTION_CATEGORIES)[number];

export const SCENARIO_STATUSES = ['draft', 'active', 'locked', 'archived'] as const;
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

export const AI_COMMENTARY_TYPES = ['anomaly', 'risk', 'opportunity', 'insight'] as const;
export type AICommentaryType = (typeof AI_COMMENTARY_TYPES)[number];

// === Assumption Set ===
export type AssumptionSet = {
  id: string;
  org_id: string;
  name: string;
  description: string;
  version: number;
  base_period_start: string;
  base_period_end: string;
  forecast_horizon_months: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// === Assumption Value ===
export type AssumptionValue = {
  id: string;
  org_id: string;
  assumption_set_id: string;
  category: AssumptionCategory;
  key: string;
  label: string;
  type: AssumptionType;
  value: number;
  effective_from: string;
  effective_to: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// === Scenario ===
export type Scenario = {
  id: string;
  org_id: string;
  assumption_set_id: string;
  name: string;
  description: string;
  status: ScenarioStatus;
  is_base: boolean;
  created_by: string;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
};

// === Scenario Version ===
export type ScenarioVersion = {
  id: string;
  org_id: string;
  scenario_id: string;
  version: number;
  change_summary: string;
  assumption_set_snapshot: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

// === Model Version ===
export type ModelVersion = {
  id: string;
  org_id: string;
  scenario_id: string;
  version: number;
  assumption_set_id: string;
  assumption_hash: string;
  engine_version: string;
  triggered_by: string;
  created_at: string;
};

// === Model Snapshot ===
export type ModelSnapshot = {
  id: string;
  org_id: string;
  model_version_id: string;
  scenario_id: string;
  period: string;
  revenue: number;
  cost_of_sales: number;
  gross_profit: number;
  gross_margin_pct: number;
  operating_expenses: number;
  net_profit: number;
  net_margin_pct: number;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  closing_cash: number;
  burn_rate: number;
  runway_months: number;
  is_break_even: boolean;
  created_at: string;
};

// === Unit Economics Snapshot ===
export type UnitEconomicsSnapshot = {
  id: string;
  org_id: string;
  model_version_id: string;
  scenario_id: string;
  period: string;
  segment_key: string;
  segment_label: string;
  units_sold: number;
  revenue_per_unit: number;
  variable_cost_per_unit: number;
  contribution_per_unit: number;
  contribution_margin_pct: number;
  total_revenue: number;
  total_variable_cost: number;
  total_contribution: number;
  cac: number;
  ltv: number;
  ltv_cac_ratio: number;
  created_at: string;
};

// === Forecast Snapshot ===
export type ForecastSnapshot = {
  id: string;
  org_id: string;
  model_version_id: string;
  scenario_id: string;
  period: string;
  metric_key: string;
  metric_label: string;
  actual_value: number | null;
  forecast_value: number;
  variance: number | null;
  variance_pct: number | null;
  created_at: string;
};

// === AI Commentary ===
export type AICommentary = {
  id: string;
  org_id: string;
  model_version_id: string;
  scenario_id: string;
  commentary_type: AICommentaryType;
  title: string;
  body: string;
  confidence_score: number;
  source_data_ids: string[];
  ai_model_name: string;
  ai_model_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

// === Scenario Change Log ===
export const SCENARIO_CHANGE_TYPES = ['proposed', 'confirmed', 'rejected'] as const;
export type ScenarioChangeType = (typeof SCENARIO_CHANGE_TYPES)[number];

export type ProposedAssumptionChange = {
  category: AssumptionCategory;
  key: string;
  label: string;
  type: AssumptionType;
  current_value: number | null;
  new_value: number;
  reasoning: string;
  effective_from: string;
};

export type LLMInterpretation = {
  interpretation_summary: string;
  confidence: number;
  assumption_changes: ProposedAssumptionChange[];
  follow_up_questions: string[];
};

export type ScenarioChangeLog = {
  id: string;
  org_id: string;
  scenario_id: string;
  change_type: ScenarioChangeType;
  natural_language_input: string;
  ai_interpretation: LLMInterpretation;
  proposed_changes: ProposedAssumptionChange[];
  confirmation_token: string | null;
  user_confirmed: boolean;
  created_by: string;
  created_at: string;
};

// === Interview Engine ===
export const INTERVIEW_STAGES = [
  'business_model_confirmation',
  'goals_and_priorities',
  'contextual_enrichment',
  'benchmarking_baseline',
] as const;
export type InterviewStage = (typeof INTERVIEW_STAGES)[number];

export const INTERVIEW_STATUSES = ['in_progress', 'completed', 'abandoned'] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export type BusinessContextProfile = {
  id: string;
  org_id: string;
  // Business model
  revenue_model: string;
  revenue_streams: string[];
  seasonality_description: string | null;
  key_clients_description: string | null;
  industry: string | null;
  business_stage: string | null;
  // Goals & priorities
  twelve_month_goals: string[];
  biggest_challenges: string[];
  success_definition: string | null;
  // Context
  team_size: number | null;
  team_structure: string | null;
  customer_concentration_risk: string | null;
  competitive_positioning: string | null;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive' | null;
  // Baseline KPIs
  target_revenue_growth: number | null;
  target_gross_margin: number | null;
  target_net_margin: number | null;
  acceptable_burn_rate: number | null;
  runway_requirement_months: number | null;
  custom_kpis: Record<string, unknown>[];
  // Metadata
  interview_id: string;
  created_at: string;
  updated_at: string;
};

export type InterviewMessage = {
  id: string;
  org_id: string;
  interview_id: string;
  role: 'user' | 'assistant';
  content: string;
  stage: InterviewStage;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Interview = {
  id: string;
  org_id: string;
  user_id: string;
  status: InterviewStatus;
  current_stage: InterviewStage;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

// === Database types (Supabase format) ===
export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: Organisation;
        Insert: Omit<Organisation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organisation, 'id' | 'created_at'>>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'profiles_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_invitations: {
        Row: OrgInvitation;
        Insert: Omit<OrgInvitation, 'id' | 'created_at'>;
        Update: Partial<Omit<OrgInvitation, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'org_invitations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      xero_connections: {
        Row: XeroConnection;
        Insert: Omit<XeroConnection, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<XeroConnection, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'xero_connections_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      chart_of_accounts: {
        Row: ChartOfAccount;
        Insert: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChartOfAccount, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'chart_of_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      raw_transactions: {
        Row: RawTransaction;
        Insert: Omit<RawTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<RawTransaction, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'raw_transactions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      normalised_financials: {
        Row: NormalisedFinancial;
        Insert: Omit<NormalisedFinancial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NormalisedFinancial, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'normalised_financials_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'normalised_financials_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'chart_of_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_log: {
        Row: SyncLog;
        Insert: Omit<SyncLog, 'id' | 'error_message' | 'completed_at'> & { error_message?: string | null; completed_at?: string | null };
        Update: Partial<Omit<SyncLog, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'sync_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never; // Immutable
        Relationships: [
          {
            foreignKeyName: 'audit_logs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      assumption_sets: {
        Row: AssumptionSet;
        Insert: Omit<AssumptionSet, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AssumptionSet, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'assumption_sets_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      assumption_values: {
        Row: AssumptionValue;
        Insert: Omit<AssumptionValue, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AssumptionValue, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'assumption_values_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assumption_values_assumption_set_id_fkey';
            columns: ['assumption_set_id'];
            isOneToOne: false;
            referencedRelation: 'assumption_sets';
            referencedColumns: ['id'];
          },
        ];
      };
      scenarios: {
        Row: Scenario;
        Insert: Omit<Scenario, 'id' | 'created_at' | 'updated_at' | 'locked_at' | 'locked_by'> & { locked_at?: string | null; locked_by?: string | null };
        Update: Partial<Omit<Scenario, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'scenarios_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scenarios_assumption_set_id_fkey';
            columns: ['assumption_set_id'];
            isOneToOne: false;
            referencedRelation: 'assumption_sets';
            referencedColumns: ['id'];
          },
        ];
      };
      scenario_versions: {
        Row: ScenarioVersion;
        Insert: Omit<ScenarioVersion, 'id' | 'created_at' | 'version'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'scenario_versions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scenario_versions_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      model_versions: {
        Row: ModelVersion;
        Insert: Omit<ModelVersion, 'id' | 'created_at' | 'version'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'model_versions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'model_versions_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      model_snapshots: {
        Row: ModelSnapshot;
        Insert: Omit<ModelSnapshot, 'id' | 'created_at'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'model_snapshots_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'model_snapshots_model_version_id_fkey';
            columns: ['model_version_id'];
            isOneToOne: false;
            referencedRelation: 'model_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'model_snapshots_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      unit_economics_snapshots: {
        Row: UnitEconomicsSnapshot;
        Insert: Omit<UnitEconomicsSnapshot, 'id' | 'created_at'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'unit_economics_snapshots_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'unit_economics_snapshots_model_version_id_fkey';
            columns: ['model_version_id'];
            isOneToOne: false;
            referencedRelation: 'model_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      forecast_snapshots: {
        Row: ForecastSnapshot;
        Insert: Omit<ForecastSnapshot, 'id' | 'created_at'> & { actual_value?: number | null; variance?: number | null; variance_pct?: number | null };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'forecast_snapshots_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forecast_snapshots_model_version_id_fkey';
            columns: ['model_version_id'];
            isOneToOne: false;
            referencedRelation: 'model_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_commentary: {
        Row: AICommentary;
        Insert: Omit<AICommentary, 'id' | 'created_at'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'ai_commentary_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_commentary_model_version_id_fkey';
            columns: ['model_version_id'];
            isOneToOne: false;
            referencedRelation: 'model_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      scenario_change_log: {
        Row: ScenarioChangeLog;
        Insert: Omit<ScenarioChangeLog, 'id' | 'created_at' | 'ai_interpretation' | 'proposed_changes'> & {
          id?: string;
          ai_interpretation: Record<string, unknown>;
          proposed_changes: Record<string, unknown>[];
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'scenario_change_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scenario_change_log_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      intelligence_events: {
        Row: IntelligenceEvent;
        Insert: Omit<IntelligenceEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<IntelligenceEvent, 'id' | 'created_at'>>;
        Relationships: [];
      };
      intelligence_impacts: {
        Row: IntelligenceImpact;
        Insert: Omit<IntelligenceImpact, 'id' | 'created_at'>;
        Update: Partial<Omit<IntelligenceImpact, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'intelligence_impacts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'intelligence_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'intelligence_impacts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      benchmarks: {
        Row: Benchmark;
        Insert: Omit<Benchmark, 'id' | 'created_at'>;
        Update: Partial<Omit<Benchmark, 'id' | 'created_at'>>;
        Relationships: [];
      };
      kpi_snapshots: {
        Row: KPISnapshot;
        Insert: Omit<KPISnapshot, 'id' | 'created_at'>;
        Update: Partial<Omit<KPISnapshot, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'kpi_snapshots_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      budget_lines: {
        Row: BudgetLine;
        Insert: Omit<BudgetLine, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BudgetLine, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'budget_lines_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      financial_statements: {
        Row: FinancialStatement;
        Insert: Omit<FinancialStatement, 'id' | 'created_at'>;
        Update: Partial<Omit<FinancialStatement, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'financial_statements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'notifications_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: ReportRow;
        Insert: Omit<ReportRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<ReportRow, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'reports_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
  };
};

// === Report (DB Row) ===
export type ReportRow = {
  id: string;
  org_id: string;
  report_type: string;
  title: string;
  status: string;
  period_start: string;
  period_end: string;
  sections: Record<string, unknown>;
  ai_commentary: string;
  generated_by: string;
  approved_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

// === Intelligence Layer ===

export const INTELLIGENCE_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
export type IntelligenceSeverity = (typeof INTELLIGENCE_SEVERITY)[number];

export const IMPACT_TYPES = ['positive', 'negative', 'neutral', 'mixed'] as const;
export type ImpactType = (typeof IMPACT_TYPES)[number];

export const NOTIFICATION_TYPES = ['intelligence', 'kpi_alert', 'variance_alert', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TREND_DIRECTIONS = ['up', 'down', 'flat'] as const;
export type TrendDirection = (typeof TREND_DIRECTIONS)[number];

export const STATEMENT_TYPES = ['profit_and_loss', 'balance_sheet', 'cash_flow'] as const;
export type StatementType = (typeof STATEMENT_TYPES)[number];

export type IntelligenceEvent = {
  id: string;
  event_type: string;
  title: string;
  summary: string;
  source: string;
  severity: IntelligenceSeverity;
  sectors_affected: string[];
  countries_affected: string[];
  published_at: string;
  created_at: string;
};

export type IntelligenceImpact = {
  id: string;
  event_id: string;
  org_id: string;
  relevance_score: number;
  impact_type: ImpactType;
  impact_narrative: string;
  estimated_impact_pence: number;
  created_at: string;
};

export type Benchmark = {
  id: string;
  sector: string;
  metric_key: string;
  percentiles: Record<string, number>;
  source: string;
  period: string;
  created_at: string;
};

export type KPISnapshot = {
  id: string;
  org_id: string;
  kpi_type: string;
  value: number;
  period: string;
  trend_direction: TrendDirection;
  trend_percentage: number;
  benchmark_value: number | null;
  created_at: string;
};

export type BudgetLine = {
  id: string;
  org_id: string;
  category: string;
  period: string;
  amount_pence: number;
  created_at: string;
  updated_at: string;
};

export type FinancialStatement = {
  id: string;
  org_id: string;
  statement_type: StatementType;
  period: string;
  data: Record<string, unknown>;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  org_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

// === UK Tax Engine ===
export type VATScheme = 'standard' | 'flat_rate' | 'cash' | 'annual';

export type TaxSettings = {
  id: string;
  org_id: string;
  // Corporation Tax
  corporation_tax_rate: number;
  // VAT
  vat_registered: boolean;
  vat_rate: number;
  vat_flat_rate: number | null;
  vat_quarter_start_month: number;
  vat_scheme: VATScheme;
  // PAYE / Employment
  paye_rate: number;
  employee_ni_rate: number;
  employer_ni_rate: number;
  employer_ni_threshold: number;
  employer_pension_rate: number;
  // HMRC Payment Plans
  has_vat_payment_plan: boolean;
  vat_payment_plan_balance: number;
  vat_payment_plan_monthly: number;
  has_corp_tax_payment_plan: boolean;
  corp_tax_payment_plan_balance: number;
  corp_tax_payment_plan_monthly: number;
  has_paye_payment_plan: boolean;
  paye_payment_plan_balance: number;
  paye_payment_plan_monthly: number;
  // Metadata
  created_at: string;
  updated_at: string;
};

export type PayrollGroup = {
  id: string;
  org_id: string;
  name: string;
  employer_ni_rate: number | null;
  employer_pension_rate: number | null;
  headcount: number;
  total_annual_salary: number;
  created_at: string;
  updated_at: string;
};

export type AccountMapping = {
  id: string;
  org_id: string;
  account_id: string;
  standard_category: string;
  ai_confidence: number | null;
  ai_suggested: boolean;
  user_confirmed: boolean;
  user_overridden: boolean;
  created_at: string;
  updated_at: string;
};
