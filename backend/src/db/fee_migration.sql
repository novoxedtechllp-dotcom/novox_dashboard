-- Fee Management System Migration
-- This migration ALTERS existing tables — no drops or deletes.

-- Courses provide the default fee for enrollments without a student-specific fee plan.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS total_fee NUMERIC(12,2) DEFAULT 0;

-- 1. Add new columns to student_fee_plans
ALTER TABLE student_fee_plans
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS admission_fee NUMERIC(12,2) DEFAULT 5000.00,
  ADD COLUMN IF NOT EXISTS monthly_installment NUMERIC(12,2) DEFAULT 10000.00,
  ADD COLUMN IF NOT EXISTS start_month INTEGER,
  ADD COLUMN IF NOT EXISTS start_year INTEGER,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add unique constraint on student_id + course_id to prevent duplicate fee plans
-- (using DO block to avoid error if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_fee_plans_student_course_unique'
  ) THEN
    ALTER TABLE student_fee_plans
      ADD CONSTRAINT student_fee_plans_student_course_unique UNIQUE (student_id, course_id);
  END IF;
END $$;

-- 2. Add new columns to fee_payments
ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'INSTALLMENT',
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fee_plans_student ON student_fee_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_plans_course ON student_fee_plans(course_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_month_year ON fee_payments(month, year);
CREATE INDEX IF NOT EXISTS idx_fee_payments_plan ON fee_payments(fee_plan_id);

NOTIFY pgrst, 'reload schema';
