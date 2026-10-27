-- Align work reports with the fields read and written by the work-reports API.
ALTER TABLE work_reports
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS project_area VARCHAR(255) DEFAULT 'General Task',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);

NOTIFY pgrst, 'reload schema';
