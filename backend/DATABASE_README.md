# Novox Database Architecture & Schema Guide

This document explains every table currently present in the Supabase database and **why** it exists. This architecture follows relational database best practices (Normalization) to prevent data duplication and ensure the application remains fast and bug-free as it scales.

---

## 1. Users & Access Control
Why these exist: To handle login credentials securely while keeping personal profile data separate, and to manage what features employees can access.

* **`users`**: The core authentication table. Stores the email, encrypted password, and high-level role (Admin, Employee, Student).
* **`employee_roles`**: Defines custom roles (like HR, Sales, Developer) and stores their specific JSON permissions.
* **`employee_profiles`**: Linked to `users`. Stores the employee's personal details (name, salary, joining date). We keep this separate from `users` so the auth system stays lightweight.
* **`employee_documents`**: Stores links to an employee's uploaded files (ID proofs, offer letters).

---

## 2. Course Management
Why these exist: To break down large courses into manageable, structured pieces (chapters, assignments) and to track who teaches them and when.

* **`courses`**: The top-level table (e.g., "Full Stack Web Development").
* **`course_modules`**: The main chapters of a course (e.g., "React.js Basics").
* **`course_submodules`**: Specific lessons within a chapter (e.g., "React Hooks").
* **`course_tasks`**: Assignments attached to a submodule.
* **`course_task_subtasks`**: A checklist of smaller steps required to complete a task.
* **`course_submodule_reviews`**: Allows students to leave feedback/suggestions on specific lessons.
* **`course_instructors`**: A junction table that links an `employee_profile` to a `course`. Allows one course to have multiple instructors, and one instructor to teach multiple courses.
* **`course_schedules`**: Stores the timetable (days of week, start/end times) for a specific course.

---

## 3. Student Management
Why these exist: To track enrolled students, their progress in courses, and their assignment submissions.

* **`students`**: Linked to `users`. Stores personal information (parent phone, address) specifically for students.
* **`student_documents`**: Stores files uploaded by the student (ID proofs, previous certificates).
* **`student_courses`**: Tracks which courses a student is enrolled in, their overall progress percentage, and enrollment status.
* **`student_tasks`**: Tracks an individual student's submission for a specific `course_task`, including their grade and reviewer feedback.

---

## 4. Sales CRM (Customer Relationship Management)
Why these exist: To track potential students (leads) from the moment they inquire to the moment they enroll, preventing any lead from being forgotten.

* **`lead_sources`**: A simple list of where leads come from (Meta Ads, Indeed, Referrals).
* **`leads`**: Stores the contact info of a potential student and their current pipeline stage (New, Contacted, Admission).
* **`lead_activities`**: A timeline of every action taken on a lead (e.g., "Called on Monday", "Sent Email"). Crucial for sales accountability.
* **`followups`**: Scheduled reminders for the sales team to contact a lead again.

---

## 5. Attendance & Leave Management
Why these exist: To monitor daily presence for both staff and students, and to handle formal time-off requests.

* **`employee_attendance`**: Tracks daily check-in/check-out times for staff.
* **`student_attendance`**: Tracks daily check-in/check-out times for students.
* **`leaves`**: Tracks formal requests for time off, including dates, reasons, and admin approval status.

---

## 6. Projects & Work Reports
Why these exist: To track employee productivity and associate their daily tasks with specific internal projects.

* **`projects`**: High-level internal projects (e.g., "Website Redesign", "Marketing Campaign").
* **`project_members`**: Links employees to the projects they are working on.
* **`work_reports`**: Daily or weekly submissions by employees detailing what they worked on and any blockers they faced.

---

## 7. Payroll & Fees
Why these exist: To manage financial records, ensuring employees are paid accurately and students are billed correctly.

* **`payroll`**: The monthly salary calculation for an employee, including bonuses and deductions.
* **`salary_slips`**: Links to the generated PDF payslip for a specific payroll record.
* **`student_fee_plans`**: Defines how much a student owes for their course, including any discounts applied.
* **`fee_payments`**: A ledger of individual payments made by the student toward their fee plan.

---

## 8. Automations (WhatsApp & Recruitment)
Why these exist: To automate marketing outreach and streamline the hiring process for new employees.

* **`whatsapp_templates`**: Pre-approved message formats for WhatsApp broadcasts.
* **`whatsapp_campaigns`**: Scheduled bulk-messages sent to specific lead segments.
* **`whatsapp_conversations` & `whatsapp_messages`**: Stores individual chat logs between leads/students and employees.
* **`candidates`**: People applying for a job at Novox.
* **`interviews`**: Scheduled interview dates, linked to a specific candidate and an employee interviewer.
* **`candidate_evaluations`**: The score and remarks given by the interviewer after the interview.

---

## 9. Blogs & Gallery
Why these exist: To power the content on the public-facing website and track content performance.

* **`blogs`**: The blog posts written for the site.
* **`blog_statistics`**: Tracks views, clicks, and engagement over time for a blog.
* **`gallery_websites` & `gallery_categories`**: Allows images to be organized by the website they belong to and their category (e.g., "Campus Events").
* **`gallery_images`**: The actual image files (Cloudinary URLs) and their metadata.
* **`gallery_image_categories`**: A junction table allowing one image to belong to multiple categories.

---

## 10. System Utilities
Why these exist: To keep the system running smoothly, alert users of events, and provide a security trail.

* **`notifications`**: In-app alerts sent to users (e.g., "Task Graded", "New Lead Assigned").
* **`audit_logs`**: A security timeline that records exactly who created, updated, or deleted a record in the database. Essential for tracing unauthorized changes or accidental deletions.
