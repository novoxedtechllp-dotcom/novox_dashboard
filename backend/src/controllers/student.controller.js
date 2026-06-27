import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, extractPublicIdFromUrl, deleteFromCloudinary } from "../utils/cloudinary.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/sendEmail.js";

const studentSelectFields = "id, student_code, first_name, last_name, phone, parent_phone, guardian_name, address, joining_date, status, avatar_url, created_at, users(email), student_courses(id, course_id)";

// ==========================================
// CORE STUDENT CRUD
// ==========================================

const generateNextStudentCode = async () => {
  const { data } = await supabase
    .from("students")
    .select("student_code")
    .like("student_code", "NVX-S%")
    .order("student_code", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastCode = data[0].student_code; // e.g. "NVX-S0012"
    const numPart = parseInt(lastCode.replace("NVX-S", ""), 10) || 0;
    return `NVX-S${String(numPart + 1).padStart(4, "0")}`;
  }
  return "NVX-S0001";
};

// @desc    Create a new student
// @route   POST /api/v1/students
const createStudent = asyncHandler(async (req, res) => {
  const {
    user_id,
    email,
    password,
    student_code,
    first_name,
    last_name,
    phone,
    parent_phone,
    guardian_name,
    address,
    joining_date,
    course_ids,
    avatar_url
  } = req.body;

  if (!first_name || !email || !phone) {
    throw new ApiError(400, "Please provide Name, Email, and Phone number");
  }

  if (phone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }

  if (parent_phone && parent_phone.length !== 10) {
    throw new ApiError(400, "Parent phone number must be exactly 10 digits");
  }

  let avatarUrl = avatar_url || null;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult?.url) avatarUrl = uploadResult.url;
  }

  const finalStudentCode = student_code || await generateNextStudentCode();

  let studentUserId = user_id;
  let createdUserId = null;

  if (studentUserId) {
    const { data: userExists } = await supabase.from("users").select("id").eq("id", studentUserId).single();
    if (!userExists) throw new ApiError(400, "User not found");
  } else {
    const loginEmail = email || `${finalStudentCode.toLowerCase()}@students.novox.local`;
    const loginPassword = password || `${finalStudentCode}@123`;
    const hashedPassword = await bcrypt.hash(loginPassword, 10);

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([{
        email: loginEmail,
        password_hash: hashedPassword,
        role: "STUDENT",
        status: "ACTIVE",
      }])
      .select("id")
      .single();

    if (userError) throw new ApiError(500, userError.message || "Failed to create student user");

    studentUserId = user.id;
    createdUserId = user.id;

    // Send Welcome Email
    await sendEmail({
      to: loginEmail,
      subject: 'Welcome to Novox Dashboard',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; border-radius: 16px;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #f3e8ff; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 32px;">🚀</span>
              </div>
              <h1 style="color: #1e1b4b; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Welcome to our platform!</h1>
              <p style="color: #6b7280; font-size: 16px; margin-top: 8px; font-weight: 500;">We are excited to welcome you as a new student.</p>
            </div>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hey <strong>${first_name}</strong>! 🎮</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your student profile has been created and you are officially ready to embark on your learning quest. Complete modules, earn XP, and track your progress on the leaderboard!</p>
            <div style="background: linear-gradient(to right, #f3f4f6, #ffffff); border: 2px dashed #d1d5db; padding: 24px; margin: 24px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 13px; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px;">🔥 Your Access Keys 🔥</p>
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Player ID (Email):</span><br/>
                <strong style="color: #111827; font-size: 18px;">${loginEmail}</strong>
              </div>
              <div>
                <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Secret Passcode:</span><br/>
                <strong style="color: #111827; font-size: 18px;">${loginPassword}</strong>
              </div>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://novox.local/login" style="background: linear-gradient(to right, #6366f1, #8b5cf6); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);">Start Your Journey</a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 32px;">Don't forget to change your passcode after your first login.<br>See you on the leaderboard!</p>
          </div>
        </div>
      `
    });
  }

  const { data, error } = await supabase
    .from("students")
    .insert([{
      user_id: studentUserId, student_code: finalStudentCode, first_name, last_name, phone, parent_phone, guardian_name,
      address, joining_date, status: "ACTIVE", avatar_url: avatarUrl
    }])
    .select(studentSelectFields);

  if (error) {
    if (createdUserId) await supabase.from("users").delete().eq("id", createdUserId);
    throw new ApiError(500, error.message || "Failed to create student");
  }

  const newStudent = data[0];

  if (course_ids && Array.isArray(course_ids) && course_ids.length > 0) {
    for (const cid of course_ids) {
      // Assign course
      const { error: courseError } = await supabase
        .from("student_courses")
        .insert([{ 
          student_id: newStudent.id, 
          course_id: cid, 
          progress_percentage: 0,
          completion_status: 'IN_PROGRESS'
        }]);

      if (!courseError) {
        // Auto-assign existing tasks for this course
        const { data: modulesTasks } = await supabase
          .from("course_modules")
          .select('id, course_submodules(id, course_tasks(id))')
          .eq('course_id', cid);

        if (modulesTasks && modulesTasks.length > 0) {
          const tasksToAssign = [];
          modulesTasks.forEach(module => {
            module.course_submodules?.forEach(sub => {
              sub.course_tasks?.forEach(task => {
                tasksToAssign.push({
                  student_id: newStudent.id,
                  task_id: task.id,
                  status: 'NOT_STARTED'
                });
              });
            });
          });

          if (tasksToAssign.length > 0) {
            await supabase.from("student_tasks").insert(tasksToAssign);
          }
        }
      }
    }
  }

  return res.status(201).json(new ApiResponse(201, newStudent, "Student created successfully"));
});

// @desc    Get all students with filters
// @route   GET /api/v1/students
const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, courseId, instructorId, status, search, department } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  let query;

  if (courseId) {
    query = supabase.from("students").select(`
      ${studentSelectFields},
      student_courses!inner(course_id)
    `, { count: "exact" }).eq("student_courses.course_id", courseId);
  } else if (instructorId) {
    query = supabase.from("students").select(`
      ${studentSelectFields},
      student_courses!inner(courses!inner(course_instructors!inner(employee_id)))
    `, { count: "exact" }).eq("student_courses.courses.course_instructors.employee_id", instructorId);
  } else if (department && department !== 'All Departments') {
    query = supabase.from("students").select(`
      ${studentSelectFields},
      student_courses!inner(courses!inner(track))
    `, { count: "exact" }).eq("student_courses.courses.track", department);
  } else {
    query = supabase.from("students").select(studentSelectFields, { count: "exact" });
  }

  if (status) query = query.eq("status", status);
  
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_code.ilike.%${search}%`);
  }

  query = query.range(offset, offset + limitNum - 1).order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) throw new ApiError(500, error.message || "Failed to fetch students");

  const formattedData = (courseId || instructorId || department) ? data.map(s => {
    const { student_courses, ...rest } = s;
    return rest;
  }) : data;

  return res.status(200).json(new ApiResponse(200, {
    students: formattedData,
    total: count,
    page: pageNum,
    limit: limitNum
  }, "Students fetched successfully"));
});

// @desc    Get single student by ID
// @route   GET /api/v1/students/:id
const getStudentById = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const { data, error } = await supabase
    .from("students")
    .select(studentSelectFields)
    .or(`id.eq.${studentId},user_id.eq.${studentId}`)
    .single();

  if (error) throw new ApiError(404, "Student not found");

  return res.status(200).json(new ApiResponse(200, data, "Student fetched successfully"));
});

// @desc    Update student
// @route   PUT /api/v1/students/:id
const updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { first_name, last_name, phone, parent_phone, guardian_name, address, status, avatar_url, email } = req.body;

  // Students can only update their own profile
  if (req.user.role === "STUDENT") {
    const { data: studentRecord } = await supabase.from("students").select("user_id").eq("id", studentId).single();
    if (!studentRecord || studentRecord.user_id !== req.user.id) {
      throw new ApiError(403, "You can only update your own profile");
    }
  }

  if (email !== undefined) {
    const { data: currentStudent } = await supabase.from("students").select("user_id").eq("id", studentId).single();
    if (currentStudent?.user_id) {
      // Get current email
      const { data: userData } = await supabase.from("users").select("email").eq("id", currentStudent.user_id).single();
      
      if (userData?.email !== email) {
        await supabase.from("users").update({ email }).eq("id", currentStudent.user_id);
        
        // Send email update notification
        await sendEmail({
          to: email,
          subject: 'Your Novox Dashboard Email Has Been Updated',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 16px;">
              <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background: #e0e7ff; width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 24px;">✉️</span>
                  </div>
                  <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Email Updated</h2>
                </div>
                <p style="color: #334155; font-size: 16px; line-height: 1.6; text-align: center;">Your email address for the Novox Dashboard has been successfully updated to:</p>
                <div style="background-color: #f1f5f9; padding: 16px; margin: 24px 0; border-radius: 8px; text-align: center;">
                  <strong style="color: #0f172a; font-size: 18px;">${email}</strong>
                </div>
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">You will now use this email address to log in to your account.</p>
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">If you did not request this change, please contact your administrator immediately.</p>
              </div>
            </div>
          `
        });
      }
    }
  }

  if (phone !== undefined && phone.length !== 10) {
    throw new ApiError(400, "Phone number must be exactly 10 digits");
  }
  if (parent_phone !== undefined && parent_phone.length !== 10) {
    throw new ApiError(400, "Parent phone number must be exactly 10 digits");
  }

  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name;
  if (last_name !== undefined) updates.last_name = last_name;
  if (phone !== undefined) updates.phone = phone;
  if (parent_phone !== undefined) updates.parent_phone = parent_phone;
  if (guardian_name !== undefined) updates.guardian_name = guardian_name;
  if (address !== undefined) updates.address = address;
  if (status !== undefined) updates.status = status;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult?.url) {
      updates.avatar_url = uploadResult.url;

      const { data: oldStudent } = await supabase.from("students").select("avatar_url").eq("id", studentId).single();
      if (oldStudent?.avatar_url) {
        const publicId = extractPublicIdFromUrl(oldStudent.avatar_url);
        if (publicId) await deleteFromCloudinary(publicId);
      }
    }
  }

  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", studentId)
    .select(studentSelectFields);

  if (error) throw new ApiError(500, error.message || "Failed to update student");
  if (!data || data.length === 0) throw new ApiError(404, "Student not found");

  return res.status(200).json(new ApiResponse(200, data[0], "Student updated successfully"));
});

// @desc    Delete student
// @route   DELETE /api/v1/students/:id
const deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single();

  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to delete student");
  if (!data || data.length === 0) throw new ApiError(404, "Student not found");

  if (student?.user_id) await supabase.from("users").delete().eq("id", student.user_id);

  return res.status(200).json(new ApiResponse(200, {}, "Student deleted successfully"));
});

// ==========================================
// STUDENT COURSES & PROGRESS
// ==========================================

// @desc    Assign course to student
// @route   POST /api/v1/students/:studentId/courses
const assignCourse = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { course_id } = req.body;

  if (!course_id) throw new ApiError(400, "Please provide course_id");

  const { data: existing } = await supabase
    .from("student_courses")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", course_id)
    .single();

  if (existing) throw new ApiError(409, "Course already assigned to this student");

  const { data, error } = await supabase
    .from("student_courses")
    .insert([{ 
      student_id: studentId, 
      course_id, 
      progress_percentage: 0,
      completion_status: 'IN_PROGRESS'
    }])
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to assign course");

  // Auto-assign existing tasks for this course
  const { data: modulesTasks } = await supabase
    .from("course_modules")
    .select('id, course_submodules(id, course_tasks(id))')
    .eq('course_id', course_id);

  if (modulesTasks && modulesTasks.length > 0) {
    const tasksToAssign = modulesTasks.flatMap(m => 
      m.course_submodules.flatMap(sm => 
        sm.course_tasks.map(t => ({
          student_id: studentId,
          task_id: t.id,
          status: 'PENDING'
        }))
      )
    );

    if (tasksToAssign.length > 0) {
      const { error: taskError } = await supabase.from("student_tasks").insert(tasksToAssign);
      if (taskError) console.error("Failed to auto-assign tasks:", taskError);
    }
  }

  return res.status(201).json(new ApiResponse(201, data[0], "Course assigned successfully"));
});

// @desc    Update student course enrollment
// @route   PUT /api/v1/students/:studentId/courses/:courseId
const updateStudentCourse = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.params;
  const { progress_percentage, completion_status } = req.body;

  const updates = {};
  if (progress_percentage !== undefined) updates.progress_percentage = progress_percentage;
  if (completion_status !== undefined) updates.completion_status = completion_status;

  const { data, error } = await supabase
    .from("student_courses")
    .update(updates)
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to update course enrollment");
  if (!data || data.length === 0) throw new ApiError(404, "Course enrollment not found");

  return res.status(200).json(new ApiResponse(200, data[0], "Course enrollment updated successfully"));
});

// @desc    Remove course from student
// @route   DELETE /api/v1/students/:studentId/courses/:courseId
const removeStudentCourse = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.params;

  const { data, error } = await supabase
    .from("student_courses")
    .delete()
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to remove course");
  if (!data || data.length === 0) throw new ApiError(404, "Course enrollment not found");

  return res.status(200).json(new ApiResponse(200, {}, "Course removed successfully"));
});

// @desc    Get student progress
// @route   GET /api/v1/students/:studentId/progress
const getStudentProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const { data, error } = await supabase
    .from("student_courses")
    .select(`
      id, course_id, progress_percentage, completion_status, enrolled_at,
      courses(name, track)
    `)
    .eq("student_id", studentId);

  if (error) throw new ApiError(500, error.message || "Failed to fetch student progress");

  return res.status(200).json(new ApiResponse(200, data, "Student progress fetched successfully"));
});

// @desc    Get student tasks
// @route   GET /api/v1/students/:studentId/tasks
const getStudentTasks = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Auto-assign missing tasks for this student to ensure older enrollments aren't missing them
  const { data: enrollments } = await supabase.from("student_courses").select("course_id").eq("student_id", studentId);
  if (enrollments && enrollments.length > 0) {
    const courseIds = enrollments.map(e => e.course_id);
    const { data: modulesTasks } = await supabase
      .from("course_modules")
      .select("id, course_submodules(id, course_tasks(id))")
      .in("course_id", courseIds);
      
    if (modulesTasks && modulesTasks.length > 0) {
      const { data: existingTasks } = await supabase.from("student_tasks").select("task_id").eq("student_id", studentId);
      const existingTaskIds = new Set((existingTasks || []).map(t => t.task_id));
      
      const missingTasksToAssign = [];
      modulesTasks.forEach(m => {
        m.course_submodules?.forEach(sm => {
          sm.course_tasks?.forEach(t => {
            if (!existingTaskIds.has(t.id)) {
              missingTasksToAssign.push({ student_id: studentId, task_id: t.id });
            }
          });
        });
      });
      
      if (missingTasksToAssign.length > 0) {
        await supabase.from("student_tasks").insert(missingTasksToAssign);
      }
    }
  }

  const { data, error } = await supabase
    .from("student_tasks")
    .select(`
      id, student_id, task_id, status, submitted_at,
      reviewer_id, review_timestamp, review_comment,
      course_tasks(
        title, description, sequence_order, task_type, due_date,
        course_task_subtasks(id, title, sequence_order),
        course_submodules(
          title, scheduled_date, module_id,
          course_modules(title, course_id, courses(name, course_instructors(employee_id)))
        )
      ),
      task_submission_resources(id, resource_type, content, label, uploaded_at)
    `)
    .eq("student_id", studentId);

  if (error) throw new ApiError(500, error.message || "Failed to fetch student tasks");

  return res.status(200).json(new ApiResponse(200, data, "Student tasks fetched successfully"));
});

// @desc    Update student task (submit or grade)
// @route   PUT /api/v1/students/:studentId/tasks/:taskId
const updateStudentTask = asyncHandler(async (req, res) => {
  const { studentId, taskId } = req.params;
  const { status } = req.body;

  const isStudentRole = req.user.role === "STUDENT";

  if (isStudentRole) {
    if (status !== undefined && !["IN_PROGRESS"].includes(status)) {
      throw new ApiError(403, "Students can only set their task to IN_PROGRESS. Use the submit endpoint to submit.");
    }
  }

  const updates = {};
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("student_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("student_id", studentId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to update student task");
  if (!data || data.length === 0) throw new ApiError(404, "Student task not found");

  return res.status(200).json(new ApiResponse(200, data[0], "Student task updated successfully"));
});

// ==========================================
// STUDENT REPORTS
// ==========================================

// @desc    Get global student reports
// @route   GET /api/v1/students/reports
const getStudentReports = asyncHandler(async (req, res) => {
  const { count: totalActive } = await supabase.from("students").select("*", { count: 'exact', head: true }).eq("status", "ACTIVE");
  const { count: totalCompleted } = await supabase.from("students").select("*", { count: 'exact', head: true }).eq("status", "COMPLETED");
  const { count: totalDropped } = await supabase.from("students").select("*", { count: 'exact', head: true }).eq("status", "DROPPED");
  
  return res.status(200).json(new ApiResponse(200, {
    totalActive,
    totalCompleted,
    totalDropped
  }, "Student reports fetched successfully"));
});

// ==========================================
// STUDENT DOCUMENTS
// ==========================================

// @desc    Add student document
// @route   POST /api/v1/students/:studentId/documents
const addStudentDocument = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { document_type, document_url } = req.body;

  if (!document_type || !document_url) throw new ApiError(400, "Please provide document_type and document_url");

  const { data, error } = await supabase
    .from("student_documents")
    .insert([{ student_id: studentId, document_type, document_url }])
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to add document");

  return res.status(201).json(new ApiResponse(201, data[0], "Document added successfully"));
});

// @desc    Get student documents
// @route   GET /api/v1/students/:studentId/documents
const getStudentDocuments = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const { data, error } = await supabase
    .from("student_documents")
    .select("id, document_type, document_url, uploaded_at")
    .eq("student_id", studentId);

  if (error) throw new ApiError(500, error.message || "Failed to fetch documents");

  return res.status(200).json(new ApiResponse(200, data, "Documents fetched successfully"));
});

// @desc    Delete student document
// @route   DELETE /api/v1/students/:studentId/documents/:documentId
const deleteStudentDocument = asyncHandler(async (req, res) => {
  const { studentId, documentId } = req.params;

  const { data, error } = await supabase
    .from("student_documents")
    .delete()
    .eq("id", documentId)
    .eq("student_id", studentId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to delete document");
  if (!data || data.length === 0) throw new ApiError(404, "Document not found");

  return res.status(200).json(new ApiResponse(200, {}, "Document deleted successfully"));
});
// @desc    Get Student Daily Plan
// @route   GET /api/v1/students/:studentId/daily-plan
const getStudentDailyPlan = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { date } = req.query;

  if (!date) throw new ApiError(400, "Please provide a date query parameter");

  // Resolve studentId in case it's a user_id
  const { data: stu } = await supabase.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).single();
  const actualStudentId = stu ? stu.id : studentId;

  // Fetch courses this student is enrolled in
  const { data: enrollments, error: enrollError } = await supabase
    .from("student_courses")
    .select("course_id")
    .eq("student_id", actualStudentId);

  if (enrollError) throw new ApiError(500, "Failed to fetch student courses");

  if (!enrollments || enrollments.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No courses enrolled"));
  }

  const courseIds = enrollments.map(e => e.course_id);

  // Fetch submodules for those courses scheduled on the given date
  const { data, error } = await supabase
    .from("course_submodules")
    .select(`
      *,
      course_modules!inner(id, course_id, title, sequence_order, status, courses(name)),
      course_tasks(
        *,
        course_task_subtasks(*)
      )
    `)
    .in("course_modules.course_id", courseIds)
    .eq("course_modules.status", "PUBLISHED")
    .eq("scheduled_date", date)
    .order("sequence_order", { ascending: true });

  if (error) throw new ApiError(500, error.message || "Failed to fetch daily plan");

  return res.status(200).json(new ApiResponse(200, data, "Daily plan fetched successfully"));
});

// ============================================================
// FEATURE 2 — Task submission
// ============================================================

// @desc    Student submits a task with at least one resource
// @route   POST /api/v1/students/:studentId/tasks/:taskId/submit
const submitStudentTask = asyncHandler(async (req, res) => {
  const { studentId, taskId } = req.params;
  const { resources } = req.body;

  // Verify the requesting user owns this student profile
  const { data: studentProfile } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", req.user.id)
    .single();

  if (!studentProfile || studentProfile.id !== studentId) {
    throw new ApiError(403, "You can only submit tasks for your own profile");
  }

  // Resource gate
  if (!resources || !Array.isArray(resources) || resources.length === 0) {
    throw new ApiError(400, "At least one resource (link, file, or note) is required to submit a task");
  }

  for (const r of resources) {
    if (!["LINK", "FILE", "NOTE"].includes(r.resource_type)) {
      throw new ApiError(400, `Invalid resource_type: ${r.resource_type}`);
    }
    if (!r.content || !r.content.trim()) {
      throw new ApiError(400, "Each resource must have non-empty content");
    }
  }

  // Block resubmission if already pending or approved
  const { data: existingTask } = await supabase
    .from("student_tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("student_id", studentId)
    .single();

  if (!existingTask) throw new ApiError(404, "Task not found for this student");

  if (existingTask.status === "PENDING_REVIEW") {
    throw new ApiError(400, "Task is already pending review");
  }
  if (existingTask.status === "APPROVED") {
    throw new ApiError(400, "Task is already approved and cannot be resubmitted");
  }

  // Insert resources
  const resourceRows = resources.map(r => ({
    student_task_id: taskId,
    resource_type: r.resource_type,
    content: r.content.trim(),
    label: r.label?.trim() || null,
  }));

  const { error: resourceError } = await supabase
    .from("task_submission_resources")
    .insert(resourceRows);

  if (resourceError) throw new ApiError(500, resourceError.message);

  // Update task status
  const { data: updatedTask, error: updateError } = await supabase
    .from("student_tasks")
    .update({
      status: "PENDING_REVIEW",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("student_id", studentId)
    .select()
    .single();

  if (updateError) throw new ApiError(500, updateError.message);

  return res.status(200).json(new ApiResponse(200, updatedTask, "Task submitted for review"));
});

// ============================================================
// FEATURE 2 — Task review
// ============================================================

// Internal helper — not exported
const recalculateCourseProgress = async (studentId, taskId) => {
  // Find the course this task belongs to
  const { data: taskData } = await supabase
    .from("course_tasks")
    .select(`
      id,
      course_submodules(
        course_modules(course_id)
      )
    `)
    .eq("id", taskId)
    .single();

  const courseId = taskData?.course_submodules?.course_modules?.course_id;
  if (!courseId) return;

  // Fetch all student_tasks for this student, with enough join to filter by course
  const { data: allTasks } = await supabase
    .from("student_tasks")
    .select(`
      id, status,
      course_tasks(
        course_submodules(
          course_modules(course_id)
        )
      )
    `)
    .eq("student_id", studentId);

  if (!allTasks) return;

  const courseTasks = allTasks.filter(
    t => t.course_tasks?.course_submodules?.course_modules?.course_id === courseId
  );

  const total = courseTasks.length;
  if (total === 0) return;

  const approved = courseTasks.filter(t => t.status === "APPROVED").length;
  const percentage = parseFloat(((approved / total) * 100).toFixed(2));

  await supabase
    .from("student_courses")
    .update({ progress_percentage: percentage })
    .eq("student_id", studentId)
    .eq("course_id", courseId);
};

// @desc    Employee/Admin reviews a student task submission
// @route   PATCH /api/v1/students/:studentId/tasks/:taskId/review
const reviewStudentTask = asyncHandler(async (req, res) => {
  const { studentId, taskId } = req.params;
  const { outcome, comment } = req.body;

  if (!["APPROVED", "CHANGES_REQUESTED"].includes(outcome)) {
    throw new ApiError(400, "Outcome must be APPROVED or CHANGES_REQUESTED");
  }

  if (outcome === "CHANGES_REQUESTED" && (!comment || !comment.trim())) {
    throw new ApiError(400, "A comment is required when requesting changes");
  }

  // Get reviewer's employee profile — admin may not have one, that's fine
  const { data: reviewerProfile } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .single();

  const reviewerId = reviewerProfile?.id || null;

  // Verify task is in PENDING_REVIEW
  const { data: existingTask } = await supabase
    .from("student_tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("student_id", studentId)
    .single();

  if (!existingTask) throw new ApiError(404, "Task not found");
  if (existingTask.status !== "PENDING_REVIEW") {
    throw new ApiError(400, `Task is not pending review (current status: ${existingTask.status})`);
  }

  const newStatus = outcome === "APPROVED" ? "APPROVED" : "IN_PROGRESS";

  const { data: updatedTask, error } = await supabase
    .from("student_tasks")
    .update({
      status: newStatus,
      reviewer_id: reviewerId,
      review_timestamp: new Date().toISOString(),
      review_comment: comment?.trim() || null,
    })
    .eq("id", taskId)
    .eq("student_id", studentId)
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);

  if (outcome === "APPROVED") {
    await recalculateCourseProgress(studentId, taskId);
  }

  return res.status(200).json(
    new ApiResponse(200, updatedTask, `Task ${outcome === "APPROVED" ? "approved" : "sent back for changes"}`)
  );
});

export {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  assignCourse,
  getStudentProgress,
  getStudentReports,
  updateStudentCourse,
  removeStudentCourse,
  addStudentDocument,
  getStudentDocuments,
  deleteStudentDocument,
  getStudentTasks,
  updateStudentTask,
  getStudentDailyPlan,
  submitStudentTask,
  reviewStudentTask
};

// @desc    Get student submodule progress
// @route   GET /api/v1/students/:studentId/progress/submodules
export const getStudentSubmoduleProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { data: stu } = await supabase.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).single();
  const actualStudentId = stu ? stu.id : studentId;

  const { data, error } = await supabase
    .from("student_submodule_progress")
    .select("*")
    .eq("student_id", actualStudentId);

  if (error) throw new ApiError(500, error.message || "Failed to fetch submodule progress");
  return res.status(200).json(new ApiResponse(200, data, "Submodule progress fetched successfully"));
});

// @desc    Toggle student submodule progress
// @route   POST /api/v1/students/:studentId/progress/submodules/:submoduleId
export const toggleStudentSubmoduleProgress = asyncHandler(async (req, res) => {
  const { studentId, submoduleId } = req.params;
  const { is_completed } = req.body;
  const { data: stu } = await supabase.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).single();
  const actualStudentId = stu ? stu.id : studentId;

  // check existing
  const { data: existing } = await supabase
    .from("student_submodule_progress")
    .select("id")
    .eq("student_id", actualStudentId)
    .eq("submodule_id", submoduleId)
    .single();

  let resultData;
  if (existing) {
    const { data, error } = await supabase
      .from("student_submodule_progress")
      .update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null })
      .eq("id", existing.id)
      .select();
    if (error) throw new ApiError(500, error.message);
    resultData = data[0];
  } else {
    const { data, error } = await supabase
      .from("student_submodule_progress")
      .insert([{ student_id: actualStudentId, submodule_id: submoduleId, is_completed, completed_at: is_completed ? new Date().toISOString() : null }])
      .select();
    if (error) throw new ApiError(500, error.message);
    resultData = data[0];
  }

  return res.status(200).json(new ApiResponse(200, resultData, "Submodule progress updated"));
});

// @desc    Get mentoring sessions for a student
// @route   GET /api/v1/students/:studentId/mentoring-sessions
export const getStudentMentoringSessions = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { date } = req.query;

  const { data: stu } = await supabase.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).single();
  const actualStudentId = stu ? stu.id : studentId;

  let query = supabase
    .from("mentoring_sessions")
    .select(`
      *,
      employee_profiles(first_name, last_name, avatar_url),
      course_submodules(title, course_modules(title, courses(name)))
    `)
    .eq("student_id", actualStudentId);

  if (date) {
    query = query.eq("session_date", date);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new ApiError(500, error.message || "Failed to fetch sessions");

  return res.status(200).json(new ApiResponse(200, data, "Sessions fetched successfully"));
});

// @desc    Student submits a review/rating for a mentoring session
// @route   PATCH /api/v1/students/:studentId/mentoring-sessions/:sessionId/review
export const reviewMentoringSession = asyncHandler(async (req, res) => {
  const { studentId, sessionId } = req.params;
  const { student_review, student_rating } = req.body;

  const { data: stu } = await supabase.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).single();
  const actualStudentId = stu ? stu.id : studentId;

  if (student_rating !== undefined && (student_rating < 1 || student_rating > 5)) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const updates = {};
  if (student_review !== undefined) updates.student_review = student_review;
  if (student_rating !== undefined) updates.student_rating = student_rating;

  const { data, error } = await supabase
    .from("mentoring_sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("student_id", actualStudentId)
    .select()
    .single();

  if (error) throw new ApiError(500, error.message || "Failed to submit review");

  return res.status(200).json(new ApiResponse(200, data, "Review submitted successfully"));
});
