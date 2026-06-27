import { Router } from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  addEmployeeDocument,
  deleteEmployeeDocument,
  assignCourse,
  removeCourse,
  getEmployeeReport,
  getEmployeeDailyPlan,
  getAvailableTeachingTopics,
  scheduleTeachingTopic,
  createMentoringSession,
  getEmployeeMentoringSessions
} from "../controllers/employee.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { ROLES, EMPLOYEE_ROLES } from "../constants/roles.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

// Employees and Admins can read
router.route("/").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getEmployees);
router.route("/reports").get(authorize({ roles: [ROLES.ADMIN], employeeRoles: [EMPLOYEE_ROLES.HR] }), getEmployeeReport);
router.route("/:employeeId").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getEmployeeById);
router.route("/:employeeId/daily-plan").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getEmployeeDailyPlan);
router.route("/:employeeId/available-topics").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getAvailableTeachingTopics);
router.route("/:employeeId/topics/:submoduleId/schedule").patch(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), scheduleTeachingTopic);
router.route("/:employeeId/mentoring-sessions").get(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), getEmployeeMentoringSessions);
router.route("/:employeeId/mentoring-sessions").post(authorize({ roles: [ROLES.ADMIN, ROLES.EMPLOYEE] }), createMentoringSession);

// Only Admin / HR can create, update, delete
const writeAuth = authorize({ roles: [ROLES.ADMIN], employeeRoles: [EMPLOYEE_ROLES.HR] });

router.route("/").post(writeAuth, createEmployee);
router.route("/:employeeId").put(writeAuth, updateEmployee).delete(writeAuth, deleteEmployee);

router.route("/:employeeId/documents").post(writeAuth, addEmployeeDocument);
router.route("/:employeeId/documents/:docId").delete(writeAuth, deleteEmployeeDocument);

router.route("/:employeeId/courses").post(writeAuth, assignCourse);
router.route("/:employeeId/courses/:courseId").delete(writeAuth, removeCourse);

export default router;
