import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  CheckSquare,
  Loader2,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { login } from "../api/authApi";
import "../styles/Login.css";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("Admin");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isForgotPassword) {
      if (!otpSent) {
        setOtpSent(true);
        // Simulate sending OTP
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match!");
          return;
        }
        // Simulate resetting password
        setIsForgotPassword(false);
        setOtpSent(false);
        setPassword("");
        setConfirmPassword("");
        setOtp("");
      }
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);

      if (data) {
        const userInfoToSave = {
          ...data.data.user,
          token: data.data.accessToken,
        };

        // Enforce login panel restriction
        if (role === "Admin" && userInfoToSave.role !== "ADMIN") {
          setError("Invalid login panel. You do not have Admin privileges.");
          setLoading(false);
          return;
        }
        if (role === "Employee" && userInfoToSave.role !== "EMPLOYEE") {
          if (userInfoToSave.role === "STUDENT") {
            setError(
              "Access Denied. Please use the Student Portal at /student-login.",
            );
          } else {
            setError("Invalid login panel. Please use the Employee panel.");
          }
          setLoading(false);
          return;
        }

        if (role === "Student" && userInfoToSave.role !== "STUDENT") {
    setError("Invalid Student credentials.");
    setLoading(false);
    return;
}

        sessionStorage.setItem("userInfo", JSON.stringify(userInfoToSave));
        if (onLogin) onLogin(userInfoToSave.role);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Backend connection failed:", err);
      // Developer fallback for testing frontend components offline when backend is not running
      if (
        email === "admin@novox.com" &&
        password === "admin@novox" &&
        role === "Admin"
      ) {
        const mockAdminUser = {
          id: "mock-admin-id",
          email: "admin@novox.com",
          role: "ADMIN",
          first_name: "System",
          last_name: "Admin",
          token: "mock-jwt-token",
        };
        sessionStorage.setItem("userInfo", JSON.stringify(mockAdminUser));
        if (onLogin) onLogin(userInfoToSave.role);

switch (userInfoToSave.role) {
  case "ADMIN":
    navigate("/dashboard");
    break;

  case "EMPLOYEE":
    navigate("/employee/dashboard");
    break;

  case "STUDENT":
    navigate("/student/dashboard");
    break;

  default:
    navigate("/");
}
      }
      setError(
        err.message ||
          "Failed to connect to the server. Please ensure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#FAFBFC] font-sans selection:bg-blue-200">
      {/* Left Panel - Branding */}
      {(role === "Employee" || role === "Admin") && (
        <div className="lg:w-1/2 bg-gradient-to-br from-[#001D4A] via-[#003F87] to-[#0056B3] text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden hidden md:flex">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-400 opacity-10 blur-3xl"></div>
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-white opacity-5 blur-2xl"></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16 bg-white py-3 px-4 rounded-2xl inline-flex shadow-lg">
            <img
              src="/novox-edtech-calicut-logo.png"
              alt="Novox Edtech"
              className="h-[40px] object-contain"
            />
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
            Manage Everything
            <br />
            with Novox Edtech
          </h1>
          <p className="text-blue-100/80 text-lg leading-relaxed mb-12 font-medium max-w-md">
            Your all-in-one hub for students, employees, attendance, courses,
            and more. Streamline your institution's operations with our advanced
            administrative suite.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/20 transition-all cursor-default">
              <div className="bg-white/20 p-2 rounded-lg shrink-0">
                <LayoutDashboard className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  Real-time Analytics
                </h4>
                <p className="text-xs text-blue-200 mt-1 font-medium">
                  Monitor all operations
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/20 transition-all cursor-default">
              <div className="bg-white/20 p-2 rounded-lg shrink-0">
                <ShieldCheck className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  Secure Protocols
                </h4>
                <p className="text-xs text-blue-200 mt-1 font-medium">
                  Enterprise grade safety
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        )}

        {role === "Student" && (
          <div className="lg:w-1/2 bg-gradient-to-br from-[#001D4A] via-[#003F87] to-[#0056B3] text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden hidden md:flex">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-400 opacity-10 blur-3xl"></div>
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-white opacity-5 blur-2xl"></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16 bg-white py-3 px-4 rounded-2xl inline-flex shadow-lg">
            <img src="/novox-edtech-calicut-logo.png" alt="Novox Edtech" className="h-[40px] object-contain" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
            Empower Your <br/> Academic Journey
          </h1>

          {/* Paragraph */}
          <p className="text-blue-100 text-lg mb-12 leading-relaxed max-w-md font-medium">
            Welcome to your centralized hub. Manage your schedules, track your progress, and achieve academic excellence seamlessly with Novox Edtech.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/20 transition-all cursor-default">
              <div className="bg-white/20 p-2 rounded-lg shrink-0">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Real-time Schedule</h4>
                <p className="text-xs text-blue-200 mt-1 font-medium">Track all your classes</p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/20 transition-all cursor-default">
              <div className="bg-white/20 p-2 rounded-lg shrink-0">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Seamless Tasks</h4>
                <p className="text-xs text-blue-200 mt-1 font-medium">Manage assignments effortlessly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        )}

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white lg:rounded-l-3xl relative z-10 lg:-ml-6 shadow-[-20px_0_40px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {isForgotPassword ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              {isForgotPassword
                ? otpSent
                  ? "Enter the OTP sent to your email and your new password."
                  : "Enter your email to receive a password reset OTP."
                : "Enter your credentials to access the management portal."}
            </p>
          </div>

          {!isForgotPassword && (
            <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-8">
              {["Employee", "Student"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                  }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    role === r
                      ? "bg-white text-[#003F87] shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isForgotPassword ? (
              <>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="email"
                      placeholder="name@novox-edtech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={otpSent}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        OTP Code
                      </label>
                      <div className="relative">
                        <CheckSquare
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400 tracking-widest"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="•••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="email"
                      placeholder="name@novox-edtech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Password
                    </label>
                    {role === "Employee" && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[11px] font-bold text-[#003F87] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400 tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold p-4 rounded-xl flex items-center gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#003F87] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#002B5E] shadow-md shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 mt-6"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : isForgotPassword ? (
                otpSent ? (
                  "Reset Password"
                ) : (
                  "Send OTP"
                )
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-8">
              <button
                  
                  type="button"
                  onClick={() => {
                    setRole("Admin");
                  }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    role === 'Admin'
                      ? "bg-white text-[#003F87] shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Admin
                </button>
            </div>
            

            {isForgotPassword && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setOtpSent(false);
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            )}
          </form>

          <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400">
            <span>© 2024 Novox Edtech. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-[#003F87] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-[#003F87] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
