import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  CheckSquare,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { login } from "../api/authApi";
import "../styles/Login.css";

// The three login panels this screen supports.
const ROLES = ["Admin", "Employee", "Student"];

// Branding content for the left-hand panel, keyed by the selected role.
// Pulling this into one config object (instead of three near-duplicate
// JSX blocks) makes it easy to add a fourth role later without copy-paste.
const PANEL_CONTENT = {
  Admin: {
    heading: (
      <>
        Manage Everything
        <br />
        with Novox Edtech
      </>
    ),
    paragraph:
      "Your all-in-one hub for students, employees, attendance, courses, and more. Streamline your institution's operations with our advanced administrative suite.",
    features: [
      {
        icon: LayoutDashboard,
        title: "Real-time Analytics",
        text: "Monitor all operations",
      },
      {
        icon: ShieldCheck,
        title: "Secure Protocols",
        text: "Enterprise grade safety",
      },
    ],
  },
  Employee: {
    heading: (
      <>
        Streamline Your
        <br />
        Daily Workflow
      </>
    ),
    paragraph:
      "Access your schedule, manage attendance, and stay on top of your tasks — all from your personal staff portal at Novox Edtech.",
    features: [
      {
        icon: Calendar,
        title: "Attendance Tracking",
        text: "Clock in & view records",
      },
      {
        icon: CheckSquare,
        title: "Task Management",
        text: "Stay on top of your duties",
      },
    ],
  },
  Student: {
    heading: (
      <>
        Empower Your
        <br />
        Academic Journey
      </>
    ),
    paragraph:
      "Welcome to your centralized hub. Manage your schedules, track your progress, and achieve academic excellence seamlessly with Novox Edtech.",
    features: [
      {
        icon: Calendar,
        title: "Real-time Schedule",
        text: "Track all your classes",
      },
      {
        icon: CheckCircle,
        title: "Seamless Tasks",
        text: "Manage assignments effortlessly",
      },
    ],
  },
};

// Maps the backend role string to where signed-in users should land.
// Adjust these to match the actual routes defined in your app's router.
const ROLE_DASHBOARD_PATH = {
  ADMIN: "/admin/dashboard",
  EMPLOYEE: "/employee/dashboard",
  STUDENT: "/student/dashboard",
};

// Lets the three panels keep working end-to-end (UI included) even when
// the backend isn't running locally. Remove this block once a real API
// is always available, or gate it behind an env flag like
// import.meta.env.DEV.
const MOCK_USERS = {
  Admin: {
    email: "admin@novox.com",
    password: "admin@novox",
    profile: {
      id: "mock-admin-id",
      email: "admin@novox.com",
      role: "ADMIN",
      first_name: "System",
      last_name: "Admin",
    },
  },
  Employee: {
    email: "employee@novox.com",
    password: "employee@novox",
    profile: {
      id: "mock-employee-id",
      email: "employee@novox.com",
      role: "EMPLOYEE",
      first_name: "Staff",
      last_name: "Member",
    },
  },
  Student: {
    email: "student@novox.com",
    password: "student@novox",
    profile: {
      id: "mock-student-id",
      email: "student@novox.com",
      role: "STUDENT",
      first_name: "Jane",
      last_name: "Doe",
    },
  },
};

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

  const panel = PANEL_CONTENT[role];

  // After a successful login, hand the role to the parent (so it can
  // update app-level auth state) and then route to that role's dashboard.
  const completeLogin = (userInfo) => {
    sessionStorage.setItem("userInfo", JSON.stringify(userInfo));
    if (onLogin) onLogin(userInfo.role);
    navigate(ROLE_DASHBOARD_PATH[userInfo.role] || "/dashboard");
  };

  // Checks that the account the backend returned actually belongs on the
  // panel the person chose. This is what stops, e.g., a student account
  // from signing in through the Admin or Employee panel.
  const getPanelMismatchError = (actualRole) => {
    const expectedRole = role.toUpperCase();
    if (actualRole === expectedRole) return null;

    if (actualRole === "ADMIN") {
      return "Please use the Admin panel to sign in with this account.";
    }
    if (actualRole === "EMPLOYEE") {
      return "Access denied. Please use the Employee panel to sign in.";
    }
    if (actualRole === "STUDENT") {
      return "Access denied. Please use the Student panel to sign in.";
    }
    return 'Invalid login panel. Please use the ${role} panel.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isForgotPassword) {
      if (!otpSent) {
        setOtpSent(true);
        // TODO: replace with a real "send OTP" API call for this role.
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match!");
          return;
        }
        // TODO: replace with a real "reset password" API call.
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

      if (data?.data?.user) {
        const userInfoToSave = {
          ...data.data.user,
          token: data.data.accessToken,
        };

        const mismatchError = getPanelMismatchError(userInfoToSave.role);
        if (mismatchError) {
          setError(mismatchError);
          setLoading(false);
          return;
        }

        completeLogin(userInfoToSave);
      } else {
        setError(data?.message || "Login failed");
      }
    } catch (err) {
      console.error("Backend connection failed:", err);

      // Developer fallback for testing frontend components offline when
      // the backend isn't running.
      const mock = MOCK_USERS[role];
      if (mock && email === mock.email && password === mock.password) {
        completeLogin({ ...mock.profile, token: "mock-jwt-token" });
        return;
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
    <div className="login-page flex flex-col lg:flex-row min-h-screen w-full bg-[#FAFBFC] font-sans selection:bg-blue-200">
      {/* Left Panel - Branding (content swaps based on the selected role) */}
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
            {panel.heading}
          </h1>
          <p className="text-blue-100/80 text-lg leading-relaxed mb-12 font-medium max-w-md">
            {panel.paragraph}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {panel.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/20 transition-all cursor-default"
                >
                  <div className="bg-white/20 p-2 rounded-lg shrink-0">
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-blue-200 mt-1 font-medium">
                      {feature.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
                : 'Sign in to the ${role} portal to continue.'}
            </p>
          </div>

          {/* Single 3-way role toggle: Admin / Employee / Student */}
          {!isForgotPassword && (
            <div
              className="bg-slate-100 p-1.5 rounded-2xl flex mb-8"
              role="tablist"
              aria-label="Login panel"
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => setRole(r)}
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
                  <div className="space-y-5 otp-fade-in animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                          aria-label={showPassword ? "Hide password" : "Show password"}
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
                          aria-label={
                            showConfirmPassword ? "Hide password" : "Show password"
                          }
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
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[11px] font-bold text-[#003F87] hover:underline"
                    >
                      Forgot Password?
                    </button>
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
                      aria-label={showPassword ? "Hide password" : "Show password"}
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