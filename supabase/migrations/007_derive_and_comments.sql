-- Migration: Add OTM derivation columns and comments table
-- Run this in your Supabase SQL Editor if running live

-- 1. Add columns to otm_requests for derivation
ALTER TABLE otm_requests 
ADD COLUMN IF NOT EXISTS derived_to_area TEXT,
ADD COLUMN IF NOT EXISTS derived_notes TEXT,
ADD COLUMN IF NOT EXISTS derived_to_jefatura_name TEXT,
ADD COLUMN IF NOT EXISTS derived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS derived_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS derived_response_notes TEXT,
ADD COLUMN IF NOT EXISTS derived_response_at TIMESTAMPTZ;

-- Update the check constraint for status to include 'derived'
-- In PostgreSQL we cannot easily modify enum checks directly, but since it's a TEXT column check constraint,
-- we drop the old constraint and add the new one.
-- First, let's identify and drop the old status check constraint if it exists.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'otm_requests'::regclass AND consrc LIKE '%status%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE otm_requests DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE otm_requests 
ADD CONSTRAINT chk_otm_status 
CHECK (status IN ('pending', 'scheduled', 'in_progress', 'rq', 'awaiting_supervisor', 'awaiting_conformity', 'closed', 'cancelled', 'derived'));

-- 2. Create the otm_comments table
CREATE TABLE IF NOT EXISTS otm_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_id UUID NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_comments_otm ON otm_comments(otm_id);
