-- Add the guardian name field expected by student create, read, and update APIs.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100);

NOTIFY pgrst, 'reload schema';
