-- Monday.com and WIP import link columns for bridal_orders
-- Adds source tracking, order codes, payment totals, and Monday.com item linkage

-- ============================================================
-- 1. Add Monday.com link columns
-- ============================================================
ALTER TABLE bridal_orders
  ADD COLUMN IF NOT EXISTS monday_item_id text,
  ADD COLUMN IF NOT EXISTS monday_board_id text;

-- ============================================================
-- 2. Add order code (e.g. "BR26-01")
-- ============================================================
ALTER TABLE bridal_orders
  ADD COLUMN IF NOT EXISTS order_code text;

-- ============================================================
-- 3. Add payment tracking totals (denormalised for fast reads)
-- ============================================================
ALTER TABLE bridal_orders
  ADD COLUMN IF NOT EXISTS total_paid numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2) DEFAULT 0;

-- ============================================================
-- 4. Add source tracking
-- ============================================================
ALTER TABLE bridal_orders
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add check constraint for source (use DO block to avoid error if exists)
DO $$
BEGIN
  ALTER TABLE bridal_orders
    ADD CONSTRAINT bridal_orders_source_check
    CHECK (source IN ('manual', 'monday', 'wip_import'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. Unique index on (org_id, monday_item_id) for upsert
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_bridal_orders_monday_item
  ON bridal_orders (org_id, monday_item_id)
  WHERE monday_item_id IS NOT NULL;

-- ============================================================
-- 6. Index on order_code for fast lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bridal_orders_order_code
  ON bridal_orders (org_id, order_code)
  WHERE order_code IS NOT NULL;

-- ============================================================
-- 7. Index on source for filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bridal_orders_source
  ON bridal_orders (org_id, source);
