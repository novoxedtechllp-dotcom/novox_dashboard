import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.routes.js";
import studentRouter from "./routes/student.routes.js";
import userRouter from "./routes/user.routes.js";
import employeeRouter from "./routes/employee.routes.js";
import courseRouter from "./routes/course.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import workReportRouter from "./routes/work-report.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import profileRouter from "./routes/profile.routes.js";
import galleryRouter from "./routes/gallery.routes.js";
import leaveRouter from "./routes/leave.routes.js";
import blogRouter from "./routes/blog.routes.js";
import roleRouter from "./routes/role.routes.js";
import feeRouter from "./routes/fee.routes.js";

import leadRouter from "./routes/lead.routes.js";
import settingsRouter from "./routes/settings.routes.js";
import payrollRouter from "./routes/payroll.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    limit: "10mb",
    extended: true,
  }),
);

app.use(express.static("public"));
app.use(cookieParser());

// Health check for keep-alive pings
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/work-reports", workReportRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/leaves", leaveRouter);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/fees", feeRouter);

app.use("/api/v1/leads", leadRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/payroll", payrollRouter);
app.use("/api/gallery", galleryRouter);

import { streamImage } from "./controllers/blog.controller.js";
app.use("/api/blogs-image", streamImage);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Something went wrong",
    errors: err.errors || [],
  });
});

export { app };