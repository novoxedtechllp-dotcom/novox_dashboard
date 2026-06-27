import { Router } from "express";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  assignCourse,
  updateStudentCourse,
  removeStudentCourse,
  getStudentProgress,
  getStudentReports,
  addStudentDocument,
  getStudentDocuments,
  deleteStudentDocument,
  getStudentTasks,
  updateStudentTask,
  getStudentDailyPlan,
  submitStudentTask,
  reviewStudentTask,
  getStudentSubmoduleProgress,
  toggleStudentSubmoduleProgress,
  getStudentMentoringSessions,
  reviewMentoringSession
} from "../controllers/student.controller.js";

import { getAcademicJourney } from "../controllers/journey.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { ROLES, EMPLOYEE_ROLES } from "../constants/roles.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

// ==========================================
// GLOBAL REPORTS (Needs to be above /:studentId routes)
// ==========================================
router.route("/reports").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getStudentReports);

// ==========================================
// CORE STUDENT CRUD
// ==========================================
// Read
router.route("/").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getStudents);

router.route("/:studentId").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.STUDENT] }), getStudentById);
router.route("/:studentId/daily-plan").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.STUDENT] }), getStudentDailyPlan);

// Write
router.route("/").post(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), createStudent);
router.route("/:studentId").put(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.STUDENT] }), updateStudent);
router.route("/:studentId").delete(authorize({ roles: [ROLES.ADMIN] }), deleteStudent);

// ==========================================
// SUB-RESOURCES (Courses, Progress, Documents)
// ==========================================
const writeAuth = authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] });
const readAuth = authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.STUDENT] });

router.route("/:studentId/courses").post(writeAuth, assignCourse);
router.route("/:studentId/courses/:courseId")
  .put(writeAuth, updateStudentCourse)
  .delete(writeAuth, removeStudentCourse);
router.route("/:studentId/progress").get(readAuth, getStudentProgress);
router.route("/:studentId/progress/submodules").get(readAuth, getStudentSubmoduleProgress);
router.route("/:studentId/progress/submodules/:submoduleId").post(readAuth, toggleStudentSubmoduleProgress);

router.route("/:studentId/tasks").get(readAuth, getStudentTasks);
router.route("/:studentId/tasks/:taskId").put(readAuth, updateStudentTask);

// Task submission (student only)
router.route("/:studentId/tasks/:taskId/submit")
  .post(authorize({ roles: [ROLES.STUDENT] }), submitStudentTask);

// Task review (admin and employee)
router.route("/:studentId/tasks/:taskId/review")
  .patch(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), reviewStudentTask);

// Academic journey (all roles, internal RBAC inside the controller)
router.route("/:studentId/academic-journey")
  .get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.STUDENT] }), getAcademicJourney);

// Mentoring sessions
router.route("/:studentId/mentoring-sessions")
  .get(readAuth, getStudentMentoringSessions);
router.route("/:studentId/mentoring-sessions/:sessionId/review")
  .patch(authorize({ roles: [ROLES.STUDENT] }), reviewMentoringSession);

router.route("/:studentId/documents")
  .get(readAuth, getStudentDocuments)
  .post(writeAuth, addStudentDocument);

router.route("/:studentId/documents/:documentId").delete(writeAuth, deleteStudentDocument);

export default router;
