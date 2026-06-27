import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/sendEmail.js";
const userSelectFields = "id, email, role, status, last_login, created_at, updated_at";

// @desc    Create a new user
// @route   POST /api/v1/users
export const createUser = asyncHandler(async (req, res) => {
  const { email, password, role, status } = req.body;

  if (!email || !password || !role) {
    throw new ApiError(400, "Please provide email, password, and role");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password_hash: hashedPassword, role, status: status || "ACTIVE" }])
    .select(userSelectFields);

  if (error) throw new ApiError(500, error.message || "Failed to create user");

  // Send Welcome Email
  sendEmail({
    to: email,
    subject: 'Welcome to Novox Dashboard - Admin Account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 16px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">System Admin Account Created</h1>
          </div>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello,</p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">A new system administrator account has been provisioned for you.</p>
          <div style="background-color: #f1f5f9; border-left: 4px solid #003F87; padding: 20px; margin: 24px 0; border-radius: 4px 8px 8px 4px;">
            <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Login Credentials</p>
            <div style="margin-bottom: 8px;">
              <span style="color: #64748b; font-size: 14px;">Email:</span>
              <strong style="color: #0f172a; font-size: 16px; margin-left: 8px;">${email}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 14px;">Password:</span>
              <strong style="color: #0f172a; font-size: 16px; margin-left: 8px; font-family: monospace; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</strong>
            </div>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="http://localhost:5173/login" style="background-color: #003F87; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">Login to Dashboard</a>
          </div>
        </div>
      </div>
    `
  }).catch(err => console.error("Failed to send welcome email:", err));

  return res.status(201).json(new ApiResponse(201, data[0], "User created successfully"));
});

// @desc    Get all users
// @route   GET /api/v1/users
export const getUsers = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from("users").select(userSelectFields);

  if (error) throw new ApiError(500, error.message || "Failed to fetch users");

  return res.status(200).json(new ApiResponse(200, data, "Users fetched successfully"));
});

// @desc    Get single user by ID
// @route   GET /api/v1/users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select(userSelectFields)
    .eq("id", id)
    .single();

  if (error) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, data, "User fetched successfully"));
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, status, role } = req.body;

  const updates = {};
  if (email !== undefined) updates.email = email;
  if (status !== undefined) updates.status = status;
  if (role !== undefined) updates.role = role;

  // Prevent updating password through this route usually, but allowed here for simplicity
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select(userSelectFields);

  if (error) throw new ApiError(500, error.message || "Failed to update user");
  if (!data || data.length === 0) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, data[0], "User updated successfully"));
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)
    .select(userSelectFields);

  if (error) throw new ApiError(500, error.message || "Failed to delete user");
  if (!data || data.length === 0) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});
