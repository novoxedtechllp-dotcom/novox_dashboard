-- Drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS 
  gallery_images, gallery_categories, audit_logs, notifications, blog_statistics, blogs, candidate_evaluations, interviews, candidates, 
  whatsapp_messages, whatsapp_conversations, whatsapp_campaigns, whatsapp_templates, 
  followups, lead_activities, leads, lead_sources, 
  fee_payments, student_fee_plans, 
  salary_slips, payroll, 
  work_reports, project_members, projects, 
  automated_alerts_log, employee_attendance, student_attendance, 
  student_tasks, student_courses, student_documents, students, 
  course_module_reviews, course_task_subtasks, course_tasks, course_submodules, course_schedules, course_instructors, course_modules, courses, 
  employee_documents, employee_profiles, employee_roles, 
  user_sessions, users 
CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS 
  USER_ROLE, USER_STATUS, EMPLOYEE_STATUS, COURSE_TRACK, COURSE_STATUS, 
  STUDENT_STATUS, STUDENT_COURSE_STATUS, ATTENDANCE_STATUS, REPORT_TYPE, 
  PAYROLL_STATUS, PAYMENT_METHOD, CRM_STAGE, ACTIVITY_TYPE, 
  CAMPAIGN_STATUS, SENDER_TYPE, CANDIDATE_STATUS, INTERVIEW_RESULT, AUDIT_ACTION, 
  PROJECT_STATUS, CONVERSATION_STATUS, PLATFORM_TYPE, TASK_STATUS, TASK_TYPE
CASCADE;

-- Recreate Types
CREATE TYPE USER_ROLE AS ENUM ('ADMIN', 'EMPLOYEE', 'STUDENT');
CREATE TYPE USER_STATUS AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE EMPLOYEE_STATUS AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');
CREATE TYPE COURSE_TRACK AS ENUM ('DEVELOPMENT', 'MARKETING', 'DESIGN');
CREATE TYPE COURSE_STATUS AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE STUDENT_STATUS AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
CREATE TYPE STUDENT_COURSE_STATUS AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DROPPED');
CREATE TYPE ATTENDANCE_STATUS AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');
CREATE TYPE TASK_STATUS AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
CREATE TYPE TASK_TYPE AS ENUM ('PRE_PLANNED', 'EXTRA');
CREATE TYPE REPORT_TYPE AS ENUM ('DAILY', 'WEEKLY');
CREATE TYPE PAYROLL_STATUS AS ENUM ('PENDING', 'PAID');
CREATE TYPE PAYMENT_METHOD AS ENUM ('CASH', 'UPI', 'CARD', 'BANK');
CREATE TYPE CRM_STAGE AS ENUM ('NEW', 'CONTACTED', 'FOLLOWUP', 'INTERESTED', 'ADMISSION', 'NOT CONNECTED');
CREATE TYPE ACTIVITY_TYPE AS ENUM ('CALL', 'MESSAGE', 'EMAIL', 'NOTE');
CREATE TYPE CAMPAIGN_STATUS AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED');
CREATE TYPE SENDER_TYPE AS ENUM ('USER', 'BOT', 'EMPLOYEE');
CREATE TYPE CANDIDATE_STATUS AS ENUM ('APPLIED', 'SCREENED', 'SCHEDULED', 'HIRED', 'REJECTED');
CREATE TYPE INTERVIEW_RESULT AS ENUM ('PASS', 'FAIL', 'PENDING');
CREATE TYPE AUDIT_ACTION AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN');
CREATE TYPE PROJECT_STATUS AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE CONVERSATION_STATUS AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE PLATFORM_TYPE AS ENUM ('INDEED', 'NAUKRI', 'OTHER');

-- 1. USERS & ACCESS CONTROL MODULE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role USER_ROLE NOT NULL,
    status USER_STATUS DEFAULT 'ACTIVE',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    refresh_token VARCHAR(255)
);

CREATE TABLE employee_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    permissions JSONB DEFAULT '{}'::jsonb
);
-- Optional defaults for roles:
INSERT INTO employee_roles (role_name) VALUES ('SALES'), ('MARKETING'), ('DEVELOPMENT'), ('DESIGN'), ('HR'), ('ACCOUNTS');

CREATE TABLE employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(30) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    joining_date DATE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES employee_roles(id),
    salary NUMERIC(12,2) NOT NULL,
    status EMPLOYEE_STATUS DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 2. COURSE MANAGEMENT MODULE
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    track COURSE_TRACK NOT NULL,
    duration_months INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    status COURSE_STATUS DEFAULT 'DRAFT',
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    status COURSE_STATUS DEFAULT 'DRAFT'
);

CREATE TABLE course_submodules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    scheduled_date DATE
);

CREATE TABLE course_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submodule_id UUID NOT NULL REFERENCES course_submodules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    task_type TASK_TYPE DEFAULT 'PRE_PLANNED',
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course_task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES course_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_submodule_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule_id UUID NOT NULL REFERENCES course_submodules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  suggestion_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    UNIQUE (course_id, employee_id)
);

CREATE TABLE course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_of_week VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

-- 8. SALES CRM MODULE (Need leads before students for foreign key, actually students doesn't have lead_id anymore based on the new spec, but let's just keep the order safe)
CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100) UNIQUE NOT NULL
);
-- Optional defaults for sources:
INSERT INTO lead_sources (source_name) VALUES ('Meta Ads'), ('Google Ads'), ('Website'), ('Referral'), ('Indeed'), ('Naukri');

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    source_id UUID NOT NULL REFERENCES lead_sources(id),
    interested_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    assigned_sales_id UUID REFERENCES employee_profiles(id),
    stage CRM_STAGE DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type ACTIVITY_TYPE NOT NULL,
    notes TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES employee_profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    followup_time TIMESTAMP NOT NULL,
    reminder_sent BOOLEAN DEFAULT FALSE
);

-- 3. STUDENT MANAGEMENT MODULE
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_code VARCHAR(30) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    parent_phone VARCHAR(20),
    address TEXT,
    joining_date DATE NOT NULL,
    status STUDENT_STATUS DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    completion_status STUDENT_COURSE_STATUS DEFAULT 'IN_PROGRESS',
    UNIQUE (student_id, course_id)
);

CREATE TABLE student_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES course_tasks(id) ON DELETE CASCADE,
    status TASK_STATUS DEFAULT 'PENDING',
    submission_url TEXT,
    grade VARCHAR(50),
    feedback TEXT,
    submitted_at TIMESTAMP,
    UNIQUE(student_id, task_id)
);

-- 4. ATTENDANCE MODULE
CREATE TABLE student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status ATTENDANCE_STATUS NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, attendance_date)
);

CREATE TABLE employee_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status ATTENDANCE_STATUS NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- 5. WORK REPORT MODULE
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status PROJECT_STATUS DEFAULT 'ACTIVE'
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

CREATE TABLE work_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    report_type REPORT_TYPE NOT NULL,
    work_done TEXT NOT NULL,
    blockers TEXT,
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES employee_profiles(id)
);

-- 6. PAYROLL MODULE
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basic_salary NUMERIC(12,2) NOT NULL,
    bonus NUMERIC(12,2) DEFAULT 0.00,
    deductions NUMERIC(12,2) DEFAULT 0.00,
    net_salary NUMERIC(12,2) NOT NULL,
    payment_date DATE,
    status PAYROLL_STATUS DEFAULT 'PENDING',
    UNIQUE (employee_id, month, year)
);

CREATE TABLE salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- 7. STUDENT FEES MODULE
CREATE TABLE student_fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_fee NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0.00,
    final_fee NUMERIC(12,2) NOT NULL,
    start_date DATE
);

CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_plan_id UUID NOT NULL REFERENCES student_fee_plans(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method PAYMENT_METHOD NOT NULL,
    transaction_reference VARCHAR(100),
    paid_at TIMESTAMP DEFAULT NOW()
);

-- 9. WHATSAPP AUTOMATION MODULE
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    template_content TEXT NOT NULL
);

CREATE TABLE whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES whatsapp_templates(id),
    target_segment VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES employee_profiles(id),
    scheduled_at TIMESTAMP NOT NULL,
    status CAMPAIGN_STATUS DEFAULT 'SCHEDULED'
);

CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    assigned_employee_id UUID REFERENCES employee_profiles(id),
    status CONVERSATION_STATUS DEFAULT 'OPEN'
);

CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    sender_type SENDER_TYPE NOT NULL,
    message_content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- 10. RECRUITMENT AUTOMATION MODULE
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    resume_url TEXT NOT NULL,
    source_platform PLATFORM_TYPE NOT NULL,
    status CANDIDATE_STATUS DEFAULT 'APPLIED'
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES employee_profiles(id),
    interview_date TIMESTAMP NOT NULL,
    google_calendar_event_id VARCHAR(255),
    result INTERVIEW_RESULT DEFAULT 'PENDING'
);

CREATE TABLE candidate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES employee_profiles(id),
    score INTEGER NOT NULL,
    remarks TEXT NOT NULL
);

-- 11. BLOG DASHBOARD MODULE
CREATE TABLE blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    publish_date TIMESTAMP NOT NULL,
    views BIGINT DEFAULT 0,
    engagement_score NUMERIC(5,2) DEFAULT 0.00,
    source_platform VARCHAR(100) NOT NULL
);

CREATE TABLE blog_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    views BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    fetched_at TIMESTAMP DEFAULT NOW()
);

-- 12. NOTIFICATIONS MODULE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. SYSTEM AUDIT MODULE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action AUDIT_ACTION NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. GALLERY MODULE
CREATE TABLE gallery_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gallery_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES gallery_categories(id) ON DELETE CASCADE,
    website_id UUID REFERENCES gallery_websites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    description TEXT,
    cloudinary_url TEXT NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    image_hash TEXT NOT NULL,
    tags TEXT[],
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    website_id UUID REFERENCES gallery_websites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT gallery_images_image_hash_website_id_key UNIQUE NULLS NOT DISTINCT (image_hash, website_id)
);

CREATE TABLE gallery_image_categories (
    image_id UUID REFERENCES gallery_images(id) ON DELETE CASCADE,
    category_id UUID REFERENCES gallery_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (image_id, category_id)
);

-- Indexes
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_student_attendance_date ON student_attendance(attendance_date);
CREATE INDEX idx_employee_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_payroll_cycle ON payroll(month, year);
CREATE INDEX idx_fee_payments_date ON fee_payments(paid_at);
CREATE INDEX idx_work_reports_date ON work_reports(submitted_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_gallery_images_hash ON gallery_images(image_hash);
CREATE INDEX idx_gallery_images_website ON gallery_images(website_id);
CREATE INDEX idx_gallery_categories_slug ON gallery_categories(slug);
CREATE INDEX idx_gallery_categories_website ON gallery_categories(website_id);

-- 15. LEAVE MANAGEMENT MODULE
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employee_profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    document_url TEXT,
    status APPROVAL_STATUS DEFAULT 'PENDING',
    admin_message TEXT,
    applied_on TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves(employee_id);
