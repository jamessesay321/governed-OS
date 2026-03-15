-- ============================================================
-- Migration 005: Add onboarding fields to organisations
-- ============================================================

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS business_scan jsonb;
