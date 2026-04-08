-- Scheduled report email delivery
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  report_type text NOT NULL, -- 'executive_summary', 'kpi_dashboard', 'cash_flow', 'income_statement', 'balance_sheet', 'variance', 'board_pack', 'daily_briefing'
  frequency text NOT NULL DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  day_of_week integer, -- 0=Sun, 1=Mon...6=Sat (for weekly)
  day_of_month integer, -- 1-28 (for monthly)
  time_of_day text NOT NULL DEFAULT '08:00', -- HH:MM in 24h
  recipients jsonb NOT NULL DEFAULT '[]', -- array of email addresses
  subject_template text, -- optional custom subject
  include_ai_summary boolean DEFAULT true,
  include_attachments boolean DEFAULT true, -- PDF attachment
  active boolean DEFAULT true,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28))
);

-- RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org scheduled reports"
  ON scheduled_reports FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_scheduled_reports_org ON scheduled_reports(org_id);
CREATE INDEX idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE active = true;
