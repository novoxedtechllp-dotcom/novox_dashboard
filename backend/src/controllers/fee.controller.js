import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ==========================================
// HELPER: Calculate carry-forward balances
// ==========================================

/**
 * Calculates the month-by-month fee breakdown for a student's fee plan,
 * including carry-forward logic.
 * 
 * Business rules:
 * - Admission fee: ₹5,000 due in the enrollment month
 * - Monthly installment: ₹10,000 due every month after admission
 * - If a student pays less than the installment, the shortfall carries forward
 */
const calculateFeeBreakdown = (feePlan, payments, targetDateStr = null) => {
  const admissionFee = parseFloat(feePlan.admission_fee) || 5000;
  const monthlyInstallment = parseFloat(feePlan.monthly_installment) || 10000;
  
  const startDateStr = feePlan.start_date || feePlan.created_at;
  if (!startDateStr) {
    return {
      totalDue: 0,
      totalPaid: 0,
      remainingBalance: 0,
      currentMonthDue: 0,
      carryForward: 0,
      monthsElapsed: 0,
      nextDueDate: null
    };
  }

  const startDate = new Date(startDateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

  // Calculate days elapsed from start date
  const msElapsed = targetDate.getTime() - startDate.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  
  // Every 28 days is exactly one month cycle
  const monthsElapsed = daysElapsed >= 0 ? Math.floor(daysElapsed / 28) : -1;

  if (monthsElapsed < 0) {
    return {
      totalDue: 0,
      totalPaid: 0,
      remainingBalance: 0,
      currentMonthDue: 0,
      carryForward: 0,
      monthsElapsed,
      nextDueDate: new Date(startDate.getTime()).toISOString()
    };
  }

  // Total due = admission fee + (months elapsed × monthly installment)
  // Months elapsed of 0 means the start month itself (only admission fee is due)
  // Months elapsed of 1+ means installments are due
  let totalDue = admissionFee;
  if (monthsElapsed > 0) {
    totalDue += monthsElapsed * monthlyInstallment;
  }

  // Cap total due at the total course fee if set
  const totalCourseFee = parseFloat(feePlan.total_fee) || 0;
  if (totalCourseFee > 0 && totalDue > totalCourseFee) {
    totalDue = totalCourseFee;
  }

  // Sum payments made up to the target date
  // For simplicity, we just count all payments. If we want point-in-time, we'd filter by p.paid_at <= targetDate.
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const remainingBalance = Math.max(0, totalDue - totalPaid);

  let dueUpToPreviousMonth = admissionFee;
  if (monthsElapsed > 1) {
    dueUpToPreviousMonth += (monthsElapsed - 1) * monthlyInstallment;
  }
  if (totalCourseFee > 0 && dueUpToPreviousMonth > totalCourseFee) {
    dueUpToPreviousMonth = totalCourseFee;
  }

  const carryForward = Math.max(0, dueUpToPreviousMonth - totalPaid);
  const overPayment = Math.max(0, totalPaid - dueUpToPreviousMonth);
  
  let currentMonthDue = monthsElapsed > 0
    ? monthlyInstallment + carryForward - overPayment
    : admissionFee - totalPaid; // first month: just the admission fee minus what's paid

  // Cap the current month due by the overall remaining balance of the course!
  const overallRemainingBalance = totalCourseFee > 0 ? Math.max(0, totalCourseFee - totalPaid) : Infinity;
  if (currentMonthDue > overallRemainingBalance) {
    currentMonthDue = overallRemainingBalance;
  }

  // Next due date logic: exactly (monthsElapsed + 1) * 28 days from start_date
  // But wait, if monthsElapsed is 0, the next installment is at (1 * 28) days.
  // Actually, the next due date for the *upcoming* installment.
  // If they are fully paid for the whole course, nextDueDate might not matter.
  const nextDueMs = startDate.getTime() + ((monthsElapsed + 1) * 28 * 24 * 60 * 60 * 1000);
  const nextDueDate = new Date(nextDueMs).toISOString();

  return {
    totalDue,
    totalPaid,
    remainingBalance,
    currentMonthDue: Math.max(0, currentMonthDue),
    carryForward,
    monthsElapsed,
    nextDueDate
  };
};

// ==========================================
// HELPER: Build or resolve a fee plan for an enrollment
// ==========================================
const resolveFeePlan = (feePlans, enrollment) => {
  let plan = (feePlans || []).find(fp => fp.student_id === enrollment.student_id && fp.course_id === enrollment.course_id);
  const courseFeeStr = enrollment.courses?.total_fee ? String(enrollment.courses.total_fee).replace(/[^0-9.]/g, '') : "0";
  const defaultTotalFee = parseFloat(courseFeeStr) || 0;

  if (!plan) {
    const enrollDate = enrollment.enrolled_at ? new Date(enrollment.enrolled_at) : new Date();
    plan = {
      id: `virtual-${enrollment.student_id}-${enrollment.course_id}`,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      total_fee: defaultTotalFee,
      admission_fee: 5000,
      monthly_installment: 10000,
      start_month: enrollDate.getMonth() + 1,
      start_year: enrollDate.getFullYear(),
      start_date: enrollDate.toISOString().split('T')[0],
      created_at: enrollment.enrolled_at || new Date().toISOString()
    };
  } else {
    if (!plan.total_fee) plan.total_fee = defaultTotalFee;
    if (!plan.start_date) {
      const planDate = plan.created_at ? new Date(plan.created_at) : new Date();
      plan.start_date = planDate.toISOString().split('T')[0];
    }
  }

  return plan;
};

// ==========================================
// 1. CREATE FEE PLAN
// ==========================================

// @desc    Create a fee plan for a student-course enrollment
// @route   POST /api/v1/fees/plans
const createFeePlan = asyncHandler(async (req, res) => {
  const {
    student_id,
    course_id,
    admission_fee = 5000,
    monthly_installment = 10000,
    total_fee,
    discount = 0
  } = req.body;

  if (!student_id) throw new ApiError(400, "Please provide student_id");
  if (!course_id) throw new ApiError(400, "Please provide course_id");

  // Check if a plan already exists for this student-course combo
  const { data: existing } = await supabase
    .from("student_fee_plans")
    .select("id")
    .eq("student_id", student_id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (existing) {
    throw new ApiError(409, "A fee plan already exists for this student-course combination");
  }

  const now = new Date();
  const finalFee = (total_fee || 0) - discount;

  const { data, error } = await supabase
    .from("student_fee_plans")
    .insert([{
      student_id,
      course_id,
      admission_fee,
      monthly_installment,
      total_fee: total_fee || 0,
      discount,
      final_fee: Math.max(0, finalFee),
      start_month: now.getMonth() + 1,
      start_year: now.getFullYear(),
      start_date: now.toISOString().split('T')[0],
    }])
    .select(`
      *,
      students(id, first_name, last_name, student_code),
      courses(id, name, track)
    `);

  if (error) throw new ApiError(500, error.message || "Failed to create fee plan");

  return res.status(201).json(new ApiResponse(201, data[0], "Fee plan created successfully"));
});

// ==========================================
// 2. GET FEE PLANS
// ==========================================

// @desc    Get all fee plans (optionally filtered by student/course)
// @route   GET /api/v1/fees/plans
const getFeePlans = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.query;

  let query = supabase
    .from("student_fee_plans")
    .select(`
      *,
      students(id, first_name, last_name, student_code, avatar_url),
      courses(id, name, track)
    `)
    .order("created_at", { ascending: false });

  if (studentId) query = query.eq("student_id", studentId);
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;

  if (error) throw new ApiError(500, error.message || "Failed to fetch fee plans");

  return res.status(200).json(new ApiResponse(200, data, "Fee plans fetched successfully"));
});

// ==========================================
// 3. RECORD PAYMENT
// ==========================================

// @desc    Record a fee payment
// @route   POST /api/v1/fees/payments
const recordPayment = asyncHandler(async (req, res) => {
  const {
    student_id,
    fee_plan_id,
    amount,
    payment_method = "CASH",
    payment_type = "INSTALLMENT",
    month,
    year,
    transaction_reference,
    notes
  } = req.body;

  if (!student_id) throw new ApiError(400, "Please provide student_id");
  if (!fee_plan_id) throw new ApiError(400, "Please provide fee_plan_id");
  if (!amount || parseFloat(amount) <= 0) throw new ApiError(400, "Please provide a valid positive amount");

  // Verify the fee plan exists and belongs to the student
  const { data: plan } = await supabase
    .from("student_fee_plans")
    .select("id, student_id")
    .eq("id", fee_plan_id)
    .eq("student_id", student_id)
    .single();

  if (!plan) throw new ApiError(404, "Fee plan not found for this student");

  const now = new Date();
  const paymentMonth = month || (now.getMonth() + 1);
  const paymentYear = year || now.getFullYear();

  const { data, error } = await supabase
    .from("fee_payments")
    .insert([{
      fee_plan_id,
      student_id,
      amount: parseFloat(amount),
      payment_method: payment_method.toUpperCase(),
      payment_type,
      month: paymentMonth,
      year: paymentYear,
      transaction_reference: transaction_reference || null,
      notes: notes || null,
      paid_at: now.toISOString()
    }])
    .select(`
      *,
      students(id, first_name, last_name, student_code),
      student_fee_plans(id, course_id, courses(id, name))
    `);

  if (error) throw new ApiError(500, error.message || "Failed to record payment");

  return res.status(201).json(new ApiResponse(201, data[0], "Payment recorded successfully"));
});

// ==========================================
// 4. GET PAYMENTS (with filters)
// ==========================================

// @desc    Get fee payments with optional filters
// @route   GET /api/v1/fees/payments
const getPayments = asyncHandler(async (req, res) => {
  const { studentId, month, year, page = 1, limit = 50 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from("fee_payments")
    .select(`
      *,
      students(id, first_name, last_name, student_code, avatar_url),
      student_fee_plans(id, course_id, admission_fee, monthly_installment, total_fee, courses(id, name, track))
    `, { count: "exact" })
    .order("paid_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  if (studentId) query = query.eq("student_id", studentId);
  if (month) query = query.eq("month", parseInt(month, 10));
  if (year) query = query.eq("year", parseInt(year, 10));

  const { data, error, count } = await query;

  if (error) throw new ApiError(500, error.message || "Failed to fetch payments");

  return res.status(200).json(new ApiResponse(200, {
    payments: data,
    total: count,
    page: pageNum,
    limit: limitNum
  }, "Payments fetched successfully"));
});

// ==========================================
// 5. GET STUDENT BALANCES (with carry-forward)
// ==========================================

// @desc    Get all student balances with carry-forward calculation
// @route   GET /api/v1/fees/balances
const getStudentBalances = asyncHandler(async (req, res) => {
  const { month, year, status: filterStatus, search } = req.query;

  const now = new Date();
  const targetMonth = month ? parseInt(month, 10) : (now.getMonth() + 1);
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();

  // 1. Get all student courses (enrollments)
  const { data: enrollments, error: enrollError } = await supabase
    .from("student_courses")
    .select(`
      id, student_id, course_id, enrolled_at, progress_percentage,
      students!inner(id, first_name, last_name, student_code, avatar_url, status),
      courses!inner(id, name, track, total_fee)
    `);

  if (enrollError) throw new ApiError(500, enrollError.message || "Failed to fetch enrollments");

  if (!enrollments || enrollments.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No enrollments found"));
  }

  // 2. Get all fee plans
  const studentIds = [...new Set(enrollments.map(e => e.student_id))];
  const { data: feePlans, error: feePlanError } = await supabase
    .from("student_fee_plans")
    .select("*")
    .in("student_id", studentIds);

  if (feePlanError) throw new ApiError(500, feePlanError.message || "Failed to fetch fee plans");

  // 3. Get all payments
  const { data: allPayments, error: payError } = await supabase
    .from("fee_payments")
    .select("*")
    .in("student_id", studentIds);

  if (payError) throw new ApiError(500, payError.message || "Failed to fetch payments");

  // Create a target date at the end of the month to project balances correctly for that month
  const targetDateForBreakdown = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59)).toISOString();

  // 4. Calculate balances for each enrollment
  const balances = enrollments.map(enrollment => {
    const plan = resolveFeePlan(feePlans, enrollment);

    const studentPayments = (allPayments || []).filter(p => p.student_id === enrollment.student_id && p.fee_plan_id === plan.id);
    const breakdown = calculateFeeBreakdown(plan, studentPayments, targetDateForBreakdown);

    const totalCourseFeeVal = parseFloat(plan.total_fee) || 0;
    const remainingCourseFee = Math.max(0, totalCourseFeeVal - breakdown.totalPaid);

    const monthPayments = studentPayments.filter(p => p.month === targetMonth && p.year === targetYear);
    const paidThisMonth = monthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    let paymentStatus = 'Pending';
    if (remainingCourseFee === 0 && totalCourseFeeVal > 0) {
      paymentStatus = 'Full Paid';
    } else if (breakdown.currentMonthDue === 0) {
      paymentStatus = 'Paid';
    } else if (paidThisMonth >= breakdown.currentMonthDue) {
      paymentStatus = 'Paid';
    } else if (paidThisMonth > 0) {
      paymentStatus = 'Partially Paid';
    }

    const overrideKey = `${targetYear}-${targetMonth}`;
    let finalDueDate;
    if (plan.due_date_overrides && plan.due_date_overrides[overrideKey]) {
      finalDueDate = plan.due_date_overrides[overrideKey];
    } else {
      // Calculate the original due date that falls inside the target month
      const startOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
      const startDate = new Date(plan.start_date || plan.created_at || now);
      const msElapsedStart = startOfTargetMonth.getTime() - startDate.getTime();
      const daysElapsedStart = Math.floor(msElapsedStart / (1000 * 60 * 60 * 24));
      const monthsElapsedStart = daysElapsedStart >= 0 ? Math.floor(daysElapsedStart / 28) : -1;
      const nextDueMs = startDate.getTime() + ((monthsElapsedStart + 1) * 28 * 24 * 60 * 60 * 1000);
      finalDueDate = new Date(nextDueMs).toISOString();
    }

    return {
      id: plan.id,
      studentId: enrollment.student_id,
      studentCode: enrollment.students?.student_code || '',
      name: `${enrollment.students?.first_name || ''} ${enrollment.students?.last_name || ''}`.trim(),
      initials: `${enrollment.students?.first_name?.[0] || ''}${enrollment.students?.last_name?.[0] || ''}`.toUpperCase() || 'ST',
      avatarUrl: enrollment.students?.avatar_url || null,
      course: enrollment.courses?.name || 'Unknown Course',
      courseId: enrollment.course_id,
      admissionFee: parseFloat(plan.admission_fee) || 5000,
      monthlyInstallment: parseFloat(plan.monthly_installment) || 10000,
      totalCourseFee: totalCourseFeeVal,
      totalDue: breakdown.totalDue,
      totalPaidOverall: breakdown.totalPaid,
      paidThisMonth,
      remainingBalance: remainingCourseFee,
      currentMonthDue: breakdown.currentMonthDue,
      carryForward: breakdown.carryForward,
      monthsElapsed: breakdown.monthsElapsed,
      nextDueDate: breakdown.nextDueDate,
      dueDate: finalDueDate,
      status: paymentStatus,
      feePlanId: plan.id.startsWith('virtual') ? null : plan.id
    };
  });

  // 5. Apply filters
  // Only show students whose fee plans have started (monthsElapsed >= 0)
  let filtered = balances.filter(b => b.monthsElapsed >= 0);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.studentCode.toLowerCase().includes(q)
    );
  }

  if (filterStatus && filterStatus !== 'All') {
    filtered = filtered.filter(b => b.status === filterStatus);
  }

  return res.status(200).json(new ApiResponse(200, filtered, "Student balances fetched successfully"));
});

// ==========================================
// 6. GET STUDENT FEE DETAILS
// ==========================================

// @desc    Get detailed fee info for a single student
// @route   GET /api/v1/fees/students/:studentId
const getStudentFeeDetails = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Resolve studentId in case it's a user_id
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, student_code, avatar_url")
    .or(`id.eq.${studentId},user_id.eq.${studentId}`)
    .single();

  if (!student) throw new ApiError(404, "Student not found");

  const actualStudentId = student.id;

  // Get enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from("student_courses")
    .select("id, student_id, course_id, enrolled_at, courses!inner(id, name, track, total_fee)")
    .eq("student_id", actualStudentId);

  if (enrollError) throw new ApiError(500, enrollError.message || "Failed to fetch enrollments");

  // Get fee plans
  const { data: feePlans, error: planError } = await supabase
    .from("student_fee_plans")
    .select("*")
    .eq("student_id", actualStudentId);

  if (planError) throw new ApiError(500, planError.message || "Failed to fetch fee plans");

  // Get all payments
  const { data: payments, error: payError } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("student_id", actualStudentId)
    .order("paid_at", { ascending: false });

  if (payError) throw new ApiError(500, payError.message || "Failed to fetch payments");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const targetDateForBreakdown = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)).toISOString();

  // Calculate breakdowns for each enrollment
  const plans = (enrollments || []).map(enrollment => {
    const plan = resolveFeePlan(feePlans, enrollment);

    // Embed courses for the response
    plan.courses = enrollment.courses;

    const planPayments = (payments || []).filter(p => p.fee_plan_id === plan.id);
    const breakdown = calculateFeeBreakdown(plan, planPayments, targetDateForBreakdown);

    const totalCourseFeeVal = parseFloat(plan.total_fee) || 0;
    const remainingCourseFee = Math.max(0, totalCourseFeeVal - breakdown.totalPaid);

    const monthPayments = planPayments.filter(p => p.month === currentMonth && p.year === currentYear);
    const paidThisMonth = monthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    let paymentStatus = 'Pending';
    if (remainingCourseFee === 0 && totalCourseFeeVal > 0) {
      paymentStatus = 'Full Paid';
    } else if (breakdown.currentMonthDue === 0) {
      paymentStatus = 'Paid';
    } else if (paidThisMonth >= breakdown.currentMonthDue) {
      paymentStatus = 'Paid';
    } else if (paidThisMonth > 0) {
      paymentStatus = 'Partially Paid';
    }

    // Upcoming installment logic
    const overrideKey = `${currentYear}-${currentMonth}`;
    let finalDueDate;
    if (plan.due_date_overrides && plan.due_date_overrides[overrideKey]) {
      finalDueDate = plan.due_date_overrides[overrideKey];
    } else {
      // Calculate the original due date that falls inside the target month
      const startOfTargetMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const startDate = new Date(plan.start_date || plan.created_at || now);
      const msElapsedStart = startOfTargetMonth.getTime() - startDate.getTime();
      const daysElapsedStart = Math.floor(msElapsedStart / (1000 * 60 * 60 * 24));
      const monthsElapsedStart = daysElapsedStart >= 0 ? Math.floor(daysElapsedStart / 28) : -1;
      const nextDueMs = startDate.getTime() + ((monthsElapsedStart + 1) * 28 * 24 * 60 * 60 * 1000);
      finalDueDate = new Date(nextDueMs).toISOString();
    }

    let upcomingInstallment = null;
    const remainingTotal = (parseFloat(plan.total_fee) || 0) - breakdown.totalPaid;
    if (remainingTotal > 0 && breakdown.nextDueDate) {
      let actualNextDueDate = breakdown.nextDueDate;
      const nextDueObj = new Date(breakdown.nextDueDate);
      const nextOverrideKey = `${nextDueObj.getFullYear()}-${nextDueObj.getMonth() + 1}`;
      
      if (plan.due_date_overrides && plan.due_date_overrides[nextOverrideKey]) {
        actualNextDueDate = plan.due_date_overrides[nextOverrideKey];
      }

      const nextDue = new Date(actualNextDueDate);
      const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const monthlyAmount = parseFloat(plan.monthly_installment) || 10000;
      const amountDue = Math.min(monthlyAmount, remainingTotal);
      
      upcomingInstallment = {
        amount: amountDue,
        dueDate: actualNextDueDate,
        daysRemaining: daysUntilDue
      };
    }

    return {
      ...plan,
      payments: planPayments,
      breakdown,
      status: paymentStatus,
      upcomingInstallment,
      dueDate: finalDueDate
    };
  });

  return res.status(200).json(new ApiResponse(200, {
    student,
    plans,
    totalPayments: payments?.length || 0
  }, "Student fee details fetched successfully"));
});

// ==========================================
// 7. DELETE PAYMENT
// ==========================================

// @desc    Delete a payment record
// @route   DELETE /api/v1/fees/payments/:paymentId
const deletePayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const { data, error } = await supabase
    .from("fee_payments")
    .delete()
    .eq("id", paymentId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to delete payment");
  if (!data || data.length === 0) throw new ApiError(404, "Payment not found");

  return res.status(200).json(new ApiResponse(200, {}, "Payment deleted successfully"));
});

// ==========================================
// 8. UPDATE PAYMENT
// ==========================================

// @desc    Update a payment record
// @route   PUT /api/v1/fees/payments/:paymentId
const updatePayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { amount, payment_method, payment_type, month, year, transaction_reference, notes } = req.body;

  const updates = {};
  if (amount !== undefined) {
    if (parseFloat(amount) <= 0) throw new ApiError(400, "Amount must be positive");
    updates.amount = parseFloat(amount);
  }
  if (payment_method !== undefined) updates.payment_method = payment_method.toUpperCase();
  if (payment_type !== undefined) updates.payment_type = payment_type;
  if (month !== undefined) updates.month = month;
  if (year !== undefined) updates.year = year;
  if (transaction_reference !== undefined) updates.transaction_reference = transaction_reference;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("fee_payments")
    .update(updates)
    .eq("id", paymentId)
    .select(`
      *,
      students(id, first_name, last_name, student_code),
      student_fee_plans(id, course_id, courses(id, name))
    `);

  if (error) throw new ApiError(500, error.message || "Failed to update payment");
  if (!data || data.length === 0) throw new ApiError(404, "Payment not found");

  return res.status(200).json(new ApiResponse(200, data[0], "Payment updated successfully"));
});

// ==========================================
// 9. GET FEE SUMMARY (Dashboard Stats)
// ==========================================

// @desc    Get fee summary stats for dashboard
// @route   GET /api/v1/fees/summary
const getFeeSummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const currentMonth = month ? parseInt(month, 10) : (now.getMonth() + 1);
  const currentYear = year ? parseInt(year, 10) : now.getFullYear();

  // Get all payments
  const { data: allPayments, error: payError } = await supabase
    .from("fee_payments")
    .select("amount, month, year, paid_at, student_id, fee_plan_id");

  if (payError) throw new ApiError(500, payError.message || "Failed to fetch payments");

  // Get all student courses (enrollments)
  const { data: enrollments, error: enrollError } = await supabase
    .from("student_courses")
    .select("student_id, course_id, enrolled_at, courses!inner(total_fee), students!inner(status)");

  if (enrollError) throw new ApiError(500, enrollError.message || "Failed to fetch enrollments");

  const { data: feePlans } = await supabase.from("student_fee_plans").select("*");

  // Calculate stats
  let thisMonthCollections = 0;
  let totalYearlyCollections = 0;

  (allPayments || []).forEach(payment => {
    const amt = parseFloat(payment.amount) || 0;
    if (payment.month === currentMonth && payment.year === currentYear) {
      thisMonthCollections += amt;
    }
    if (payment.year === currentYear) {
      totalYearlyCollections += amt;
    }
  });

  // Calculate outstanding fees
  let outstandingFees = 0;
  let outstandingCount = 0;

  (enrollments || []).forEach(enrollment => {
    if (enrollment.students?.status !== 'ACTIVE') return;

    const plan = resolveFeePlan(feePlans, enrollment);

    const planPayments = (allPayments || []).filter(p => p.student_id === enrollment.student_id && p.fee_plan_id === plan.id);
    const breakdown = calculateFeeBreakdown(plan, planPayments, now.toISOString());

    if (breakdown.monthsElapsed >= 0 && breakdown.totalDue > breakdown.totalPaid) {
      outstandingFees += (breakdown.totalDue - breakdown.totalPaid);
      outstandingCount++;
    }
  });

  return res.status(200).json(new ApiResponse(200, {
    thisMonthCollections,
    totalYearlyCollections,
    outstandingFees,
    outstandingCount
  }, "Fee summary fetched successfully"));
});

// ==========================================
// 10. UPDATE FEE PLAN (Change Billing Date)
// ==========================================

// @desc    Update a fee plan (e.g. to delay billing start date)
// @route   PUT /api/v1/fees/plans/:planId
const updateFeePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { start_date } = req.body;

  const updates = {};
  if (start_date !== undefined) updates.start_date = start_date;

  const { data, error } = await supabase
    .from("student_fee_plans")
    .update(updates)
    .eq("id", planId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to update fee plan");
  if (!data || data.length === 0) throw new ApiError(404, "Fee plan not found");

  return res.status(200).json(new ApiResponse(200, data[0], "Fee plan updated successfully"));
});

// ==========================================
// 11. UPDATE DUE DATE OVERRIDE
// ==========================================

// @desc    Update a custom due date for a specific month
// @route   PUT /api/v1/fees/plans/:planId/due-date
const updateDueDateOverride = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { month, year, due_date } = req.body;

  if (!month || !year || !due_date) {
    throw new ApiError(400, "Please provide month, year, and due_date");
  }

  // Fetch current plan
  const { data: plan, error: fetchError } = await supabase
    .from("student_fee_plans")
    .select("id, due_date_overrides")
    .eq("id", planId)
    .single();

  if (fetchError || !plan) throw new ApiError(404, "Fee plan not found");

  const overrides = plan.due_date_overrides || {};
  overrides[`${year}-${month}`] = due_date;

  const { data, error } = await supabase
    .from("student_fee_plans")
    .update({ due_date_overrides: overrides })
    .eq("id", planId)
    .select();

  if (error) throw new ApiError(500, error.message || "Failed to update due date");

  return res.status(200).json(new ApiResponse(200, data[0], "Due date updated successfully"));
});

export {
  calculateFeeBreakdown,
  createFeePlan,
  getFeePlans,
  recordPayment,
  getPayments,
  getStudentBalances,
  getStudentFeeDetails,
  deletePayment,
  updatePayment,
  getFeeSummary,
  updateFeePlan,
  updateDueDateOverride
};
