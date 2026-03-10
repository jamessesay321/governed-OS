-- ============================================================
-- Governed OS — Seed Data
-- Creates a full year (Jan–Dec 2025) of realistic SME data
-- for a SaaS company: "Acme Analytics Pty Ltd"
--
-- IMPORTANT: Run this AFTER both migrations (001 + 002).
-- You must replace the placeholder user ID below with a real
-- auth.users ID from your Supabase project.
-- ============================================================

-- ============================================================
-- STEP 0: Set the user ID variable
-- Replace this UUID with an actual auth.users(id) from your project.
-- You can find it in Supabase Dashboard → Authentication → Users.
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_coa_revenue uuid;
  v_coa_directcosts uuid;
  v_coa_overheads uuid;
  v_assumption_set_base uuid;
  v_assumption_set_growth uuid;
  v_scenario_base uuid;
  v_scenario_growth uuid;
BEGIN

  -- Find the first user in the system (adjust if needed)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users found. Please create a user first via Supabase Auth.';
  END IF;

  -- Get the user's org
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no profile/org. Complete the onboarding flow first.';
  END IF;

  -- ============================================================
  -- STEP 1: Chart of Accounts (if not already present)
  -- ============================================================
  INSERT INTO public.chart_of_accounts (id, org_id, xero_account_id, code, name, type, class)
  VALUES
    (uuid_generate_v4(), v_org_id, 'SEED-REV-200', '200', 'Sales Revenue', 'REVENUE', 'REVENUE'),
    (uuid_generate_v4(), v_org_id, 'SEED-COGS-310', '310', 'Cost of Goods Sold', 'DIRECTCOSTS', 'DIRECTCOSTS'),
    (uuid_generate_v4(), v_org_id, 'SEED-OPS-400', '400', 'Operating Expenses', 'OVERHEADS', 'EXPENSE')
  ON CONFLICT (org_id, xero_account_id) DO NOTHING;

  -- Fetch the account IDs
  SELECT id INTO v_coa_revenue FROM public.chart_of_accounts
    WHERE org_id = v_org_id AND xero_account_id = 'SEED-REV-200';
  SELECT id INTO v_coa_directcosts FROM public.chart_of_accounts
    WHERE org_id = v_org_id AND xero_account_id = 'SEED-COGS-310';
  SELECT id INTO v_coa_overheads FROM public.chart_of_accounts
    WHERE org_id = v_org_id AND xero_account_id = 'SEED-OPS-400';

  -- ============================================================
  -- STEP 2: Normalised Financials — 12 months (Jan–Dec 2025)
  -- Realistic SaaS company: growing revenue, stable COGS, rising opex
  -- ============================================================
  INSERT INTO public.normalised_financials (org_id, period, account_id, amount, transaction_count, source)
  VALUES
    -- Revenue (growing ~5% MoM with seasonality)
    (v_org_id, '2025-01-01', v_coa_revenue, 85000.00, 42, 'seed'),
    (v_org_id, '2025-02-01', v_coa_revenue, 88500.00, 45, 'seed'),
    (v_org_id, '2025-03-01', v_coa_revenue, 93200.00, 48, 'seed'),
    (v_org_id, '2025-04-01', v_coa_revenue, 97800.00, 51, 'seed'),
    (v_org_id, '2025-05-01', v_coa_revenue, 102500.00, 54, 'seed'),
    (v_org_id, '2025-06-01', v_coa_revenue, 98000.00, 50, 'seed'),  -- seasonal dip (EOFY)
    (v_org_id, '2025-07-01', v_coa_revenue, 105000.00, 55, 'seed'),
    (v_org_id, '2025-08-01', v_coa_revenue, 110500.00, 58, 'seed'),
    (v_org_id, '2025-09-01', v_coa_revenue, 116000.00, 61, 'seed'),
    (v_org_id, '2025-10-01', v_coa_revenue, 121800.00, 64, 'seed'),
    (v_org_id, '2025-11-01', v_coa_revenue, 128000.00, 67, 'seed'),
    (v_org_id, '2025-12-01', v_coa_revenue, 118000.00, 60, 'seed'),  -- holiday slowdown

    -- Direct Costs (~30-35% of revenue)
    (v_org_id, '2025-01-01', v_coa_directcosts, 27200.00, 15, 'seed'),
    (v_org_id, '2025-02-01', v_coa_directcosts, 28320.00, 16, 'seed'),
    (v_org_id, '2025-03-01', v_coa_directcosts, 29824.00, 17, 'seed'),
    (v_org_id, '2025-04-01', v_coa_directcosts, 31296.00, 18, 'seed'),
    (v_org_id, '2025-05-01', v_coa_directcosts, 32800.00, 19, 'seed'),
    (v_org_id, '2025-06-01', v_coa_directcosts, 32340.00, 18, 'seed'),
    (v_org_id, '2025-07-01', v_coa_directcosts, 33600.00, 20, 'seed'),
    (v_org_id, '2025-08-01', v_coa_directcosts, 35360.00, 21, 'seed'),
    (v_org_id, '2025-09-01', v_coa_directcosts, 37120.00, 22, 'seed'),
    (v_org_id, '2025-10-01', v_coa_directcosts, 38976.00, 23, 'seed'),
    (v_org_id, '2025-11-01', v_coa_directcosts, 40960.00, 24, 'seed'),
    (v_org_id, '2025-12-01', v_coa_directcosts, 37760.00, 22, 'seed'),

    -- Operating Expenses (rent, salaries, marketing — relatively fixed with step increases)
    (v_org_id, '2025-01-01', v_coa_overheads, 52000.00, 28, 'seed'),
    (v_org_id, '2025-02-01', v_coa_overheads, 52000.00, 27, 'seed'),
    (v_org_id, '2025-03-01', v_coa_overheads, 53500.00, 30, 'seed'),
    (v_org_id, '2025-04-01', v_coa_overheads, 53500.00, 29, 'seed'),
    (v_org_id, '2025-05-01', v_coa_overheads, 55000.00, 31, 'seed'),
    (v_org_id, '2025-06-01', v_coa_overheads, 55000.00, 30, 'seed'),
    (v_org_id, '2025-07-01', v_coa_overheads, 58000.00, 33, 'seed'),  -- new hire
    (v_org_id, '2025-08-01', v_coa_overheads, 58000.00, 32, 'seed'),
    (v_org_id, '2025-09-01', v_coa_overheads, 58500.00, 34, 'seed'),
    (v_org_id, '2025-10-01', v_coa_overheads, 59000.00, 33, 'seed'),
    (v_org_id, '2025-11-01', v_coa_overheads, 59500.00, 35, 'seed'),
    (v_org_id, '2025-12-01', v_coa_overheads, 62000.00, 36, 'seed')  -- bonuses
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- STEP 3: Assumption Set — Base Case
  -- ============================================================
  v_assumption_set_base := uuid_generate_v4();

  INSERT INTO public.assumption_sets (id, org_id, name, description, version, base_period_start, base_period_end, forecast_horizon_months, created_by)
  VALUES (v_assumption_set_base, v_org_id, 'Base Case 2025 Assumptions', 'Conservative base case using historical trends', 1, '2025-01-01', '2025-12-01', 12, v_user_id);

  -- Assumption Values — Base Case
  INSERT INTO public.assumption_values (org_id, assumption_set_id, category, key, label, type, value, effective_from, version, created_by)
  VALUES
    -- Growth rates
    (v_org_id, v_assumption_set_base, 'growth_rates', 'revenue_growth_rate', 'Monthly Revenue Growth Rate', 'percentage', 0.04, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'growth_rates', 'seasonality_factor', 'Seasonality Factor', 'decimal', 1.0, '2025-01-01', 1, v_user_id),

    -- Costs
    (v_org_id, v_assumption_set_base, 'costs', 'variable_cost_rate', 'Variable Cost Rate (% of Revenue)', 'percentage', 0.32, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'costs', 'fixed_costs', 'Monthly Fixed Costs', 'currency', 55000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'costs', 'fixed_costs', 'Monthly Fixed Costs (H2)', 'currency', 58000.0000, '2025-07-01', 1, v_user_id),

    -- Capital
    (v_org_id, v_assumption_set_base, 'capital', 'capital_expenditure', 'Monthly CapEx', 'currency', 5000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'capital', 'receivables_days', 'Receivables Days', 'integer', 30.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'capital', 'payables_days', 'Payables Days', 'integer', 20.0000, '2025-01-01', 1, v_user_id),

    -- Segment: SaaS Subscriptions
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_units', 'SaaS Subscriptions — units', 'decimal', 250.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_price', 'SaaS Subscriptions — price', 'currency', 350.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_varcost', 'SaaS Subscriptions — varcost', 'currency', 85.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_acqspend', 'SaaS Subscriptions — acqspend', 'currency', 15000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_customers', 'SaaS Subscriptions — customers', 'integer', 30.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_lifespan', 'SaaS Subscriptions — lifespan', 'decimal', 18.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_saas_arpc', 'SaaS Subscriptions — arpc', 'currency', 320.0000, '2025-01-01', 1, v_user_id),

    -- Segment: Professional Services
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_units', 'Professional Services — units', 'decimal', 15.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_price', 'Professional Services — price', 'currency', 2500.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_varcost', 'Professional Services — varcost', 'currency', 1200.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_acqspend', 'Professional Services — acqspend', 'currency', 5000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_customers', 'Professional Services — customers', 'integer', 8.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_lifespan', 'Professional Services — lifespan', 'decimal', 6.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_base, 'revenue_drivers', 'segment_services_arpc', 'Professional Services — arpc', 'currency', 2200.0000, '2025-01-01', 1, v_user_id);

  -- ============================================================
  -- STEP 4: Scenario — Base Case
  -- ============================================================
  v_scenario_base := uuid_generate_v4();

  INSERT INTO public.scenarios (id, org_id, assumption_set_id, name, description, status, is_base, created_by)
  VALUES (v_scenario_base, v_org_id, v_assumption_set_base, 'Base Case 2025', 'Conservative projection using historical run-rates and current cost structure.', 'active', true, v_user_id);

  -- ============================================================
  -- STEP 5: Assumption Set — Growth Case
  -- ============================================================
  v_assumption_set_growth := uuid_generate_v4();

  INSERT INTO public.assumption_sets (id, org_id, name, description, version, base_period_start, base_period_end, forecast_horizon_months, created_by)
  VALUES (v_assumption_set_growth, v_org_id, 'Growth Case 2025 Assumptions', 'Aggressive growth scenario with increased marketing spend', 1, '2025-01-01', '2025-12-01', 12, v_user_id);

  -- Assumption Values — Growth Case (higher growth, more spend)
  INSERT INTO public.assumption_values (org_id, assumption_set_id, category, key, label, type, value, effective_from, version, created_by)
  VALUES
    (v_org_id, v_assumption_set_growth, 'growth_rates', 'revenue_growth_rate', 'Monthly Revenue Growth Rate', 'percentage', 0.08, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'growth_rates', 'seasonality_factor', 'Seasonality Factor', 'decimal', 1.0, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'costs', 'variable_cost_rate', 'Variable Cost Rate', 'percentage', 0.30, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'costs', 'fixed_costs', 'Monthly Fixed Costs', 'currency', 65000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'capital', 'capital_expenditure', 'Monthly CapEx', 'currency', 10000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'capital', 'receivables_days', 'Receivables Days', 'integer', 25.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'capital', 'payables_days', 'Payables Days', 'integer', 30.0000, '2025-01-01', 1, v_user_id),

    -- Segment: SaaS (more aggressive)
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_units', 'SaaS Subscriptions — units', 'decimal', 350.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_price', 'SaaS Subscriptions — price', 'currency', 380.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_varcost', 'SaaS Subscriptions — varcost', 'currency', 80.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_acqspend', 'SaaS Subscriptions — acqspend', 'currency', 30000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_customers', 'SaaS Subscriptions — customers', 'integer', 50.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_lifespan', 'SaaS Subscriptions — lifespan', 'decimal', 24.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_saas_arpc', 'SaaS Subscriptions — arpc', 'currency', 350.0000, '2025-01-01', 1, v_user_id),

    -- Segment: Enterprise
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_units', 'Enterprise Tier — units', 'decimal', 8.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_price', 'Enterprise Tier — price', 'currency', 5000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_varcost', 'Enterprise Tier — varcost', 'currency', 1500.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_acqspend', 'Enterprise Tier — acqspend', 'currency', 20000.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_customers', 'Enterprise Tier — customers', 'integer', 5.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_lifespan', 'Enterprise Tier — lifespan', 'decimal', 36.0000, '2025-01-01', 1, v_user_id),
    (v_org_id, v_assumption_set_growth, 'revenue_drivers', 'segment_enterprise_arpc', 'Enterprise Tier — arpc', 'currency', 4500.0000, '2025-01-01', 1, v_user_id);

  -- ============================================================
  -- STEP 6: Scenario — Growth Case
  -- ============================================================
  v_scenario_growth := uuid_generate_v4();

  INSERT INTO public.scenarios (id, org_id, assumption_set_id, name, description, status, is_base, created_by)
  VALUES (v_scenario_growth, v_org_id, v_assumption_set_growth, 'Growth Case 2025', 'Aggressive growth with doubled marketing budget and enterprise tier launch.', 'active', false, v_user_id);

  -- ============================================================
  -- STEP 7: Audit Logs for seed data
  -- ============================================================
  INSERT INTO public.audit_logs (org_id, user_id, action, entity_type, entity_id, changes)
  VALUES
    (v_org_id, v_user_id, 'scenario.created', 'scenario', v_scenario_base::text, '{"name": "Base Case 2025", "source": "seed"}'::jsonb),
    (v_org_id, v_user_id, 'scenario.created', 'scenario', v_scenario_growth::text, '{"name": "Growth Case 2025", "source": "seed"}'::jsonb);

  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE 'Org ID: %', v_org_id;
  RAISE NOTICE 'Base Case scenario: %', v_scenario_base;
  RAISE NOTICE 'Growth Case scenario: %', v_scenario_growth;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to /scenarios in the app';
  RAISE NOTICE '2. Click into "Base Case 2025" or "Growth Case 2025"';
  RAISE NOTICE '3. Click "Run Model" to generate projections';
  RAISE NOTICE '4. Explore the Forecast, Cash Flow, Margins, Unit Economics, and AI Insights tabs';
  RAISE NOTICE '5. Use the Compare Scenarios page to see side-by-side deltas';

END $$;
