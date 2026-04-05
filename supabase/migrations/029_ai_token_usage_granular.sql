-- Add granular tracking columns to ai_token_usage
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0;
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0;
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS cache_read_tokens integer DEFAULT 0;
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS cache_creation_tokens integer DEFAULT 0;
ALTER TABLE ai_token_usage ADD COLUMN IF NOT EXISTS estimated_cost_usd numeric(10,6) DEFAULT 0;

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_id ON ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_model ON ai_token_usage(model);
