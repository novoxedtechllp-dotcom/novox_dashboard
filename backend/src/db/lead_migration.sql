-- Add CRM fields used by the leads API.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS owner VARCHAR(150),
  ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS note TEXT;

NOTIFY pgrst, 'reload schema';
