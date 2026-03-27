-- ============================================================
-- Migration 015: Industry Blueprints
-- Pre-built configuration templates for different industries.
-- Each blueprint defines account mappings, KPI sets, dashboard
-- layouts, and interview prompts so new orgs get a head start.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.industry_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Mapping rules: [{source_pattern, target_category, target_subcategory}]
  account_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- KPI configs: [{key, label, priority, suggested_target?}]
  kpi_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Dashboard layout matching DashboardTemplate shape
  dashboard_template JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Extra onboarding questions for this industry
  interview_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Integrations commonly used in this industry
  common_integrations TEXT[] NOT NULL DEFAULT '{}',

  -- If this blueprint was learned from an existing org
  created_from_org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,

  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blueprints_slug ON public.industry_blueprints(slug);
CREATE INDEX IF NOT EXISTS idx_blueprints_industry ON public.industry_blueprints(industry);
CREATE INDEX IF NOT EXISTS idx_blueprints_active ON public.industry_blueprints(is_active);

-- RLS
ALTER TABLE public.industry_blueprints ENABLE ROW LEVEL SECURITY;

-- Everyone can read active blueprints
CREATE POLICY "blueprints_select_active" ON public.industry_blueprints
  FOR SELECT USING (is_active = true);

-- Only service role can insert/update (via API routes)
CREATE POLICY "blueprints_insert_service" ON public.industry_blueprints
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "blueprints_update_service" ON public.industry_blueprints
  FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- Seed data: 8 industry blueprints
-- ============================================================

INSERT INTO public.industry_blueprints (slug, name, industry, description, account_mappings, kpi_definitions, dashboard_template, interview_prompts, common_integrations) VALUES

-- 1. Technology / SaaS
(
  'technology-saas',
  'Technology / SaaS',
  'Technology',
  'Built for subscription software companies. Tracks MRR, churn, CAC, and LTV alongside standard financials. Dashboard emphasises recurring revenue health and runway.',
  '[
    {"source_pattern": "Subscription Revenue", "target_category": "Revenue", "target_subcategory": "Recurring Revenue"},
    {"source_pattern": "Professional Services", "target_category": "Revenue", "target_subcategory": "Services Revenue"},
    {"source_pattern": "Hosting Costs", "target_category": "Cost of Sales", "target_subcategory": "Infrastructure"},
    {"source_pattern": "Cloud Infrastructure", "target_category": "Cost of Sales", "target_subcategory": "Infrastructure"},
    {"source_pattern": "Software Licences", "target_category": "Operating Expenses", "target_subcategory": "Tools and Software"},
    {"source_pattern": "Marketing Spend", "target_category": "Operating Expenses", "target_subcategory": "Sales and Marketing"},
    {"source_pattern": "R&D Salaries", "target_category": "Operating Expenses", "target_subcategory": "Research and Development"},
    {"source_pattern": "Customer Support", "target_category": "Operating Expenses", "target_subcategory": "Customer Success"}
  ]'::jsonb,
  '[
    {"key": "mrr", "label": "MRR", "priority": "high"},
    {"key": "arr", "label": "ARR", "priority": "high"},
    {"key": "nrr", "label": "Net Revenue Retention", "priority": "high"},
    {"key": "grr", "label": "Gross Revenue Retention", "priority": "high"},
    {"key": "cac", "label": "CAC", "priority": "high"},
    {"key": "ltv", "label": "LTV", "priority": "high"},
    {"key": "ltv_cac_ratio", "label": "LTV:CAC", "priority": "high"},
    {"key": "payback_period", "label": "CAC Payback", "priority": "medium"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "burn_rate", "label": "Burn Rate", "priority": "high"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "high"},
    {"key": "revenue_per_employee", "label": "Revenue per Employee", "priority": "medium"}
  ]'::jsonb,
  '{"id": "saas-owner", "name": "SaaS Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "SaaS Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "MRR Trend", "size": "half", "order": 4},
    {"type": "waterfall_chart", "label": "Profit Bridge", "size": "half", "order": 5},
    {"type": "cash_forecast", "label": "Cash Runway", "size": "full", "order": 6},
    {"type": "custom_kpis", "label": "Growth Metrics", "size": "full", "order": 7}
  ]}'::jsonb,
  '[
    {"question": "What is your current MRR and how has it trended over the last 6 months?", "context": "Helps calibrate SaaS-specific KPI targets"},
    {"question": "What is your primary pricing model (per-seat, usage-based, flat-rate)?", "context": "Affects revenue recognition and expansion metrics"},
    {"question": "What are your main customer acquisition channels?", "context": "Informs CAC tracking and marketing spend analysis"}
  ]'::jsonb,
  ARRAY['xero', 'stripe', 'hubspot', 'intercom']
),

-- 2. Retail / E-commerce
(
  'retail-ecommerce',
  'Retail / E-commerce',
  'Retail',
  'Designed for online and omnichannel retailers. Focuses on GMV, average order value, repeat purchase rates, and inventory health. Great for Shopify and WooCommerce businesses.',
  '[
    {"source_pattern": "Product Sales", "target_category": "Revenue", "target_subcategory": "Product Revenue"},
    {"source_pattern": "Shipping Income", "target_category": "Revenue", "target_subcategory": "Shipping Revenue"},
    {"source_pattern": "Cost of Goods Sold", "target_category": "Cost of Sales", "target_subcategory": "COGS"},
    {"source_pattern": "Inventory Purchases", "target_category": "Cost of Sales", "target_subcategory": "Inventory"},
    {"source_pattern": "Shipping Costs", "target_category": "Cost of Sales", "target_subcategory": "Fulfilment"},
    {"source_pattern": "Platform Fees", "target_category": "Operating Expenses", "target_subcategory": "Platform and Marketplace Fees"},
    {"source_pattern": "Advertising", "target_category": "Operating Expenses", "target_subcategory": "Marketing"},
    {"source_pattern": "Warehouse", "target_category": "Operating Expenses", "target_subcategory": "Warehousing"}
  ]'::jsonb,
  '[
    {"key": "gmv", "label": "GMV", "priority": "high"},
    {"key": "aov", "label": "Average Order Value", "priority": "high"},
    {"key": "repeat_purchase_rate", "label": "Repeat Purchase Rate", "priority": "high"},
    {"key": "shipping_cost_ratio", "label": "Shipping Cost Ratio", "priority": "medium"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "medium"},
    {"key": "working_capital", "label": "Working Capital", "priority": "medium"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"}
  ]'::jsonb,
  '{"id": "ecommerce-owner", "name": "E-commerce Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Sales Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "Revenue Trend", "size": "half", "order": 4},
    {"type": "expense_breakdown", "label": "Cost Breakdown", "size": "half", "order": 5},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "full", "order": 6},
    {"type": "cash_forecast", "label": "Cash Flow", "size": "full", "order": 7}
  ]}'::jsonb,
  '[
    {"question": "What platforms do you sell on (own website, Amazon, Etsy, etc.)?", "context": "Determines revenue channel breakdown"},
    {"question": "Do you hold your own inventory or use dropshipping/3PL?", "context": "Affects COGS and working capital analysis"},
    {"question": "What is your typical return rate?", "context": "Impacts net revenue calculations"}
  ]'::jsonb,
  ARRAY['xero', 'shopify', 'stripe', 'amazon']
),

-- 3. Professional Services
(
  'professional-services',
  'Professional Services',
  'Services',
  'Tailored for consulting, legal, accounting, and similar firms. Tracks utilisation rate, average hourly rate, and project margins. Helps service businesses understand their true profitability per engagement.',
  '[
    {"source_pattern": "Consulting Fees", "target_category": "Revenue", "target_subcategory": "Consulting Revenue"},
    {"source_pattern": "Retainer Income", "target_category": "Revenue", "target_subcategory": "Retainer Revenue"},
    {"source_pattern": "Project Revenue", "target_category": "Revenue", "target_subcategory": "Project Revenue"},
    {"source_pattern": "Staff Salaries", "target_category": "Cost of Sales", "target_subcategory": "Direct Labour"},
    {"source_pattern": "Contractor Costs", "target_category": "Cost of Sales", "target_subcategory": "Subcontractors"},
    {"source_pattern": "Office Rent", "target_category": "Operating Expenses", "target_subcategory": "Premises"},
    {"source_pattern": "Professional Insurance", "target_category": "Operating Expenses", "target_subcategory": "Insurance"},
    {"source_pattern": "Training", "target_category": "Operating Expenses", "target_subcategory": "Professional Development"}
  ]'::jsonb,
  '[
    {"key": "utilisation_rate", "label": "Utilisation Rate", "priority": "high"},
    {"key": "average_hourly_rate", "label": "Avg Hourly Rate", "priority": "high"},
    {"key": "project_margin", "label": "Project Margin", "priority": "high"},
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "revenue_per_employee", "label": "Revenue per Employee", "priority": "high"},
    {"key": "ar_days", "label": "AR Days", "priority": "high"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "medium"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"}
  ]'::jsonb,
  '{"id": "services-owner", "name": "Services Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Service Metrics", "size": "full", "order": 3},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "half", "order": 4},
    {"type": "ar_ap_aging", "label": "AR/AP Aging", "size": "half", "order": 5},
    {"type": "revenue_trend", "label": "Revenue Trend", "size": "half", "order": 6},
    {"type": "expense_breakdown", "label": "Expense Breakdown", "size": "half", "order": 7},
    {"type": "cash_forecast", "label": "Cash Forecast", "size": "full", "order": 8}
  ]}'::jsonb,
  '[
    {"question": "How do you price your services (hourly, project-based, retainer)?", "context": "Determines how to measure revenue efficiency"},
    {"question": "What is your target utilisation rate for the team?", "context": "Sets benchmark for the utilisation KPI"},
    {"question": "Do you use subcontractors or is all work done in-house?", "context": "Affects margin and cost structure analysis"}
  ]'::jsonb,
  ARRAY['xero', 'harvest', 'toggl', 'hubspot']
),

-- 4. Fashion / Luxury (based on Alonuko learnings)
(
  'fashion-luxury',
  'Fashion / Luxury',
  'Fashion',
  'Shaped by real learnings from luxury fashion businesses like Alonuko. Tracks revenue by product line (bridal, ready-to-wear, bespoke), material costs, stock and WIP movements, and consultation-to-conversion metrics. Perfect for designers, ateliers, and luxury brands.',
  '[
    {"source_pattern": "Bridal Revenue", "target_category": "Revenue", "target_subcategory": "Bridal"},
    {"source_pattern": "Ready to Wear", "target_category": "Revenue", "target_subcategory": "Ready to Wear"},
    {"source_pattern": "Bespoke Orders", "target_category": "Revenue", "target_subcategory": "Bespoke"},
    {"source_pattern": "Robes Revenue", "target_category": "Revenue", "target_subcategory": "Robes and Loungewear"},
    {"source_pattern": "Undergarments Revenue", "target_category": "Revenue", "target_subcategory": "Undergarments"},
    {"source_pattern": "Consultation Fees", "target_category": "Revenue", "target_subcategory": "Consultations"},
    {"source_pattern": "Materials", "target_category": "Direct Costs", "target_subcategory": "Materials"},
    {"source_pattern": "Fabric Purchases", "target_category": "Direct Costs", "target_subcategory": "Materials"},
    {"source_pattern": "Trimmings", "target_category": "Direct Costs", "target_subcategory": "Materials"},
    {"source_pattern": "Production Labour", "target_category": "Direct Costs", "target_subcategory": "Production Labour"},
    {"source_pattern": "Seamstress Wages", "target_category": "Direct Costs", "target_subcategory": "Production Labour"},
    {"source_pattern": "Stock Purchases", "target_category": "Direct Costs", "target_subcategory": "Stock"},
    {"source_pattern": "Work in Progress", "target_category": "Direct Costs", "target_subcategory": "WIP"},
    {"source_pattern": "Studio Rent", "target_category": "Operating Expenses", "target_subcategory": "Premises"},
    {"source_pattern": "Showroom Costs", "target_category": "Operating Expenses", "target_subcategory": "Premises"},
    {"source_pattern": "Photography", "target_category": "Operating Expenses", "target_subcategory": "Marketing"},
    {"source_pattern": "Fashion Shows", "target_category": "Operating Expenses", "target_subcategory": "Marketing"}
  ]'::jsonb,
  '[
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "aov", "label": "Average Order Value", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "high"},
    {"key": "cost_of_revenue_ratio", "label": "Material Cost Ratio", "priority": "high"},
    {"key": "working_capital", "label": "Working Capital", "priority": "high"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "high"},
    {"key": "ar_days", "label": "AR Days", "priority": "medium"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"},
    {"key": "cash_conversion_cycle", "label": "Cash Conversion Cycle", "priority": "medium"}
  ]'::jsonb,
  '{"id": "fashion-owner", "name": "Fashion / Luxury Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Key Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "Revenue by Product Line", "size": "half", "order": 4},
    {"type": "waterfall_chart", "label": "Profit Bridge", "size": "half", "order": 5},
    {"type": "expense_breakdown", "label": "Cost Breakdown", "size": "half", "order": 6},
    {"type": "ar_ap_aging", "label": "AR/AP Aging", "size": "half", "order": 7},
    {"type": "cash_forecast", "label": "Cash Forecast", "size": "full", "order": 8},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "full", "order": 9}
  ]}'::jsonb,
  '[
    {"question": "What are your main product lines (bridal, ready-to-wear, bespoke, accessories)?", "context": "Helps segment revenue and margin tracking by collection"},
    {"question": "How do you handle consultations and fittings -- do you charge or include in garment price?", "context": "Affects revenue recognition and conversion tracking"},
    {"question": "What is your typical lead time from order to delivery?", "context": "Impacts WIP and cash conversion cycle analysis"},
    {"question": "Do you carry stock or produce to order?", "context": "Determines inventory vs WIP tracking approach"}
  ]'::jsonb,
  ARRAY['xero', 'shopify', 'square', 'instagram']
),

-- 5. Hospitality
(
  'hospitality',
  'Hospitality',
  'Hospitality',
  'For restaurants, hotels, bars, and events businesses. Tracks covers, RevPAR, food and beverage costs, and labour ratios. Designed around the tight margins and seasonal patterns typical of hospitality.',
  '[
    {"source_pattern": "Food Sales", "target_category": "Revenue", "target_subcategory": "Food Revenue"},
    {"source_pattern": "Beverage Sales", "target_category": "Revenue", "target_subcategory": "Beverage Revenue"},
    {"source_pattern": "Room Revenue", "target_category": "Revenue", "target_subcategory": "Accommodation"},
    {"source_pattern": "Events Income", "target_category": "Revenue", "target_subcategory": "Events"},
    {"source_pattern": "Food Costs", "target_category": "Cost of Sales", "target_subcategory": "Food Costs"},
    {"source_pattern": "Beverage Costs", "target_category": "Cost of Sales", "target_subcategory": "Beverage Costs"},
    {"source_pattern": "Kitchen Staff", "target_category": "Cost of Sales", "target_subcategory": "Kitchen Labour"},
    {"source_pattern": "Front of House Staff", "target_category": "Operating Expenses", "target_subcategory": "FOH Labour"},
    {"source_pattern": "Rent", "target_category": "Operating Expenses", "target_subcategory": "Premises"},
    {"source_pattern": "Utilities", "target_category": "Operating Expenses", "target_subcategory": "Utilities"}
  ]'::jsonb,
  '[
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "cost_of_revenue_ratio", "label": "Food/Bev Cost Ratio", "priority": "high"},
    {"key": "employee_cost_ratio", "label": "Labour Cost Ratio", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "high"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"},
    {"key": "cash_position", "label": "Cash Position", "priority": "medium"},
    {"key": "working_capital", "label": "Working Capital", "priority": "medium"},
    {"key": "ap_days", "label": "AP Days", "priority": "medium"}
  ]'::jsonb,
  '{"id": "hospitality-owner", "name": "Hospitality Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Key Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "Revenue Trend", "size": "half", "order": 4},
    {"type": "expense_breakdown", "label": "Cost Breakdown", "size": "half", "order": 5},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "full", "order": 6},
    {"type": "cash_forecast", "label": "Cash Flow", "size": "full", "order": 7}
  ]}'::jsonb,
  '[
    {"question": "What type of hospitality business are you (restaurant, hotel, bar, events)?", "context": "Determines which revenue and cost categories to prioritise"},
    {"question": "What is your target food cost percentage?", "context": "Sets benchmark for cost ratio tracking"},
    {"question": "How seasonal is your business?", "context": "Affects cash forecasting and variance analysis"}
  ]'::jsonb,
  ARRAY['xero', 'square', 'lightspeed', 'resy']
),

-- 6. Healthcare
(
  'healthcare',
  'Healthcare',
  'Healthcare',
  'For clinics, dental practices, physiotherapy, and private healthcare providers. Tracks patient volume, revenue per practitioner, and clinical vs administrative cost splits. Helps healthcare businesses balance patient care with financial sustainability.',
  '[
    {"source_pattern": "Patient Fees", "target_category": "Revenue", "target_subcategory": "Clinical Revenue"},
    {"source_pattern": "Consultation Income", "target_category": "Revenue", "target_subcategory": "Consultation Revenue"},
    {"source_pattern": "Insurance Reimbursements", "target_category": "Revenue", "target_subcategory": "Insurance Revenue"},
    {"source_pattern": "Clinical Supplies", "target_category": "Cost of Sales", "target_subcategory": "Clinical Supplies"},
    {"source_pattern": "Lab Costs", "target_category": "Cost of Sales", "target_subcategory": "Laboratory"},
    {"source_pattern": "Practitioner Salaries", "target_category": "Cost of Sales", "target_subcategory": "Clinical Staff"},
    {"source_pattern": "Admin Staff", "target_category": "Operating Expenses", "target_subcategory": "Administrative Staff"},
    {"source_pattern": "Medical Equipment", "target_category": "Operating Expenses", "target_subcategory": "Equipment"},
    {"source_pattern": "Compliance Costs", "target_category": "Operating Expenses", "target_subcategory": "Regulatory and Compliance"},
    {"source_pattern": "Insurance Premiums", "target_category": "Operating Expenses", "target_subcategory": "Professional Insurance"}
  ]'::jsonb,
  '[
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "revenue_per_employee", "label": "Revenue per Practitioner", "priority": "high"},
    {"key": "utilisation_rate", "label": "Practitioner Utilisation", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "high"},
    {"key": "ar_days", "label": "AR Days", "priority": "high"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"},
    {"key": "employee_cost_ratio", "label": "Staff Cost Ratio", "priority": "medium"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "medium"}
  ]'::jsonb,
  '{"id": "healthcare-owner", "name": "Healthcare Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Practice Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "Revenue Trend", "size": "half", "order": 4},
    {"type": "ar_ap_aging", "label": "AR/AP Aging", "size": "half", "order": 5},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "full", "order": 6},
    {"type": "expense_breakdown", "label": "Cost Breakdown", "size": "half", "order": 7},
    {"type": "cash_forecast", "label": "Cash Forecast", "size": "half", "order": 8}
  ]}'::jsonb,
  '[
    {"question": "What type of practice are you (GP, dental, physio, specialist clinic)?", "context": "Determines revenue and cost category breakdown"},
    {"question": "How many practitioners work in the practice?", "context": "Enables per-practitioner revenue tracking"},
    {"question": "What mix of private vs insured patients do you see?", "context": "Affects AR tracking and revenue recognition"}
  ]'::jsonb,
  ARRAY['xero', 'cliniko', 'dentally', 'stripe']
),

-- 7. Construction
(
  'construction',
  'Construction',
  'Construction',
  'For builders, contractors, and construction firms. Tracks project-level profitability, retention payments, and subcontractor costs. Built around the unique cash flow challenges of project-based construction work.',
  '[
    {"source_pattern": "Contract Revenue", "target_category": "Revenue", "target_subcategory": "Contract Revenue"},
    {"source_pattern": "Variation Orders", "target_category": "Revenue", "target_subcategory": "Variations"},
    {"source_pattern": "Retention Release", "target_category": "Revenue", "target_subcategory": "Retention"},
    {"source_pattern": "Materials", "target_category": "Cost of Sales", "target_subcategory": "Materials"},
    {"source_pattern": "Subcontractors", "target_category": "Cost of Sales", "target_subcategory": "Subcontractors"},
    {"source_pattern": "Plant Hire", "target_category": "Cost of Sales", "target_subcategory": "Plant and Equipment"},
    {"source_pattern": "Direct Labour", "target_category": "Cost of Sales", "target_subcategory": "Direct Labour"},
    {"source_pattern": "Site Costs", "target_category": "Operating Expenses", "target_subcategory": "Site Overheads"},
    {"source_pattern": "Compliance", "target_category": "Operating Expenses", "target_subcategory": "Health and Safety"},
    {"source_pattern": "Professional Fees", "target_category": "Operating Expenses", "target_subcategory": "Professional Fees"}
  ]'::jsonb,
  '[
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "project_margin", "label": "Project Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "cash_position", "label": "Cash Position", "priority": "high"},
    {"key": "cash_conversion_cycle", "label": "Cash Conversion Cycle", "priority": "high"},
    {"key": "ar_days", "label": "AR Days", "priority": "high"},
    {"key": "ap_days", "label": "AP Days", "priority": "medium"},
    {"key": "working_capital", "label": "Working Capital", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "medium"},
    {"key": "debt_to_equity", "label": "Debt to Equity", "priority": "medium"}
  ]'::jsonb,
  '{"id": "construction-owner", "name": "Construction Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Project Metrics", "size": "full", "order": 3},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "full", "order": 4},
    {"type": "ar_ap_aging", "label": "AR/AP Aging", "size": "half", "order": 5},
    {"type": "waterfall_chart", "label": "Profit Bridge", "size": "half", "order": 6},
    {"type": "cash_forecast", "label": "Cash Forecast", "size": "full", "order": 7},
    {"type": "expense_breakdown", "label": "Cost Breakdown", "size": "full", "order": 8}
  ]}'::jsonb,
  '[
    {"question": "What type of construction work do you do (residential, commercial, civil)?", "context": "Affects project margin benchmarks and cost categories"},
    {"question": "How many active projects do you typically run at once?", "context": "Determines project-level tracking needs"},
    {"question": "Do you deal with retention payments?", "context": "Impacts cash flow forecasting and AR tracking"},
    {"question": "What percentage of work goes to subcontractors vs in-house?", "context": "Affects cost structure and margin analysis"}
  ]'::jsonb,
  ARRAY['xero', 'procore', 'buildertrend', 'sage']
),

-- 8. Creative Agency
(
  'creative-agency',
  'Creative Agency',
  'Creative',
  'For design studios, marketing agencies, and creative firms. Balances utilisation tracking with project profitability and client concentration analysis. Understands the feast-or-famine cycles typical of agency life.',
  '[
    {"source_pattern": "Project Fees", "target_category": "Revenue", "target_subcategory": "Project Revenue"},
    {"source_pattern": "Retainer Fees", "target_category": "Revenue", "target_subcategory": "Retainer Revenue"},
    {"source_pattern": "Media Buying", "target_category": "Revenue", "target_subcategory": "Pass-through Revenue"},
    {"source_pattern": "Creative Staff", "target_category": "Cost of Sales", "target_subcategory": "Creative Team"},
    {"source_pattern": "Freelancers", "target_category": "Cost of Sales", "target_subcategory": "Freelancers"},
    {"source_pattern": "Production Costs", "target_category": "Cost of Sales", "target_subcategory": "Production"},
    {"source_pattern": "Software Subscriptions", "target_category": "Operating Expenses", "target_subcategory": "Creative Tools"},
    {"source_pattern": "Office Rent", "target_category": "Operating Expenses", "target_subcategory": "Premises"},
    {"source_pattern": "New Business Costs", "target_category": "Operating Expenses", "target_subcategory": "Business Development"}
  ]'::jsonb,
  '[
    {"key": "revenue", "label": "Revenue", "priority": "high"},
    {"key": "utilisation_rate", "label": "Utilisation Rate", "priority": "high"},
    {"key": "average_hourly_rate", "label": "Avg Hourly Rate", "priority": "high"},
    {"key": "project_margin", "label": "Project Margin", "priority": "high"},
    {"key": "gross_margin", "label": "Gross Margin", "priority": "high"},
    {"key": "net_margin", "label": "Net Margin", "priority": "high"},
    {"key": "revenue_per_employee", "label": "Revenue per Head", "priority": "high"},
    {"key": "ar_days", "label": "AR Days", "priority": "high"},
    {"key": "revenue_growth", "label": "Revenue Growth", "priority": "medium"},
    {"key": "cash_runway_months", "label": "Cash Runway", "priority": "medium"},
    {"key": "opex_ratio", "label": "OpEx Ratio", "priority": "medium"}
  ]'::jsonb,
  '{"id": "agency-owner", "name": "Agency Owner", "role": "owner", "widgets": [
    {"type": "data_freshness", "label": "Data Freshness", "size": "full", "order": 1},
    {"type": "narrative_summary", "label": "AI Summary", "size": "full", "order": 2},
    {"type": "kpi_cards", "label": "Agency Metrics", "size": "full", "order": 3},
    {"type": "revenue_trend", "label": "Revenue Trend", "size": "half", "order": 4},
    {"type": "waterfall_chart", "label": "Profit Bridge", "size": "half", "order": 5},
    {"type": "pnl_table", "label": "Profit & Loss", "size": "half", "order": 6},
    {"type": "ar_ap_aging", "label": "AR/AP Aging", "size": "half", "order": 7},
    {"type": "cash_forecast", "label": "Cash Forecast", "size": "full", "order": 8}
  ]}'::jsonb,
  '[
    {"question": "What services does your agency offer (design, marketing, digital, PR)?", "context": "Determines revenue segmentation and skill-based utilisation"},
    {"question": "How many active clients do you typically serve at once?", "context": "Helps assess client concentration risk"},
    {"question": "What is your mix of project vs retainer work?", "context": "Affects revenue predictability and cash flow analysis"},
    {"question": "Do you use freelancers to scale capacity?", "context": "Impacts margin tracking and capacity planning"}
  ]'::jsonb,
  ARRAY['xero', 'harvest', 'asana', 'figma']
);
