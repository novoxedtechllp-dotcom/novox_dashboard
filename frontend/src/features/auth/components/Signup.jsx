import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Briefcase,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
} from 'lucide-react';

const ROLES = ['EMPLOYEE', 'STUDENT'];

const PANEL_CONTENT = {
  EMPLOYEE: {
    heading: 'Grow With Novox Edtech',
    paragraph:
      'Create your employee account to manage tasks, track attendance, and collaborate with your team.',
    features: [
      {
        icon: Briefcase,
        title: 'Team Workspace',
        text: 'Access the tools built for your department',
      },
      {
        icon: ClipboardCheck,
        title: 'Attendance Tracking',
        text: 'Clock in and monitor your hours',
      },
    ],
  },
  STUDENT: {
    heading: 'Join Our Learning Community',
    paragraph:
      'Create an account to access courses, track attendance, and manage your academic journey with Novox Edtech.',
    features: [
      {
        icon: BookOpen,
        title: 'Course Access',
        text: 'Explore lessons anytime, anywhere',
      },
      {
        icon: TrendingUp,
        title: 'Progress Reports',
        text: 'Track your academic growth over time',
      },
    ],
  },
};

const COUNTRY_OPTIONS = [
  { code: '+91', flag: '🇮🇳' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+61', flag: '🇦🇺' },
  { code: '+65', flag: '🇸🇬' },
  { code: '+971', flag: '🇦🇪' },
];

export default function Signup() {
  const [role, setRole] = useState('STUDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [parentCountryCode, setParentCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Role-specific fields
  const [designation, setDesignation] = useState('');
  const [employeeRole, setEmployeeRole] = useState('HR');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');

  const navigate = useNavigate();
  const panel = PANEL_CONTENT[role];

  // Prevent the underlying document from scrolling/bouncing at all,
  // so the fixed panels never reveal the page background at the edges.
  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyMargin = document.body.style.margin;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.margin = originalBodyMargin;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        password,
        role,
      };

      payload.first_name = firstName;
      payload.last_name = lastName;
      payload.phone = `${countryCode}${phone}`;
      payload.joining_date = new Date().toISOString().split('T')[0];

      if (role === 'EMPLOYEE') {
        payload.designation = designation || 'Staff';
        payload.employee_role = employeeRole;
      } else if (role === 'STUDENT') {
        payload.parent_phone = parentPhone ? `${parentCountryCode}${parentPhone}` : '';
        payload.address = address;
      }

      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Backend connection failed:', err);
      setError('Failed to connect to the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400';

  const selectClasses =
    'w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all';

  const labelClasses = 'block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1';

  return (
    <div className="signup-page fixed inset-0 overflow-hidden bg-[#FAFBFC] font-sans selection:bg-blue-200">
      {/* Left Panel - Branding (content swaps based on the selected role) */}
      <div className="fixed inset-y-0 left-0 w-1/2 h-screen bg-gradient-to-br from-[#001D4A] via-[#003F87] to-[#0056B3] text-white p-8 md:p-16 flex flex-col justify-center overflow-hidden hidden md:flex">
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
                    <h4 className="font-bold text-white text-sm">{feature.title}</h4>
                    <p className="text-xs text-blue-200 mt-1 font-medium">{feature.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[calc(50%+1.5rem)] h-screen flex flex-col items-center p-6 sm:p-12 bg-white md:rounded-l-3xl z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.1)] overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="w-full max-w-md py-6 m-auto">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {success ? 'Welcome Aboard' : 'Create an Account'}
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              {success
                ? 'Your account has been created successfully.'
                : 'Select your role and fill in your details to get started.'}
            </p>
          </div>

          {/* Single 2-way role toggle: Employee / Student */}
          {!success && (
            <div
              className="bg-slate-100 p-1.5 rounded-2xl flex mb-8"
              role="tablist"
              aria-label="Signup role"
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 capitalize ${
                    role === r
                      ? 'bg-white text-[#003F87] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check size={32} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-black text-emerald-700">Registration Successful!</h3>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Redirecting you to the login page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>First Name</label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Last Name</label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Email Address</label>
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
                    className={inputClasses}
                  />
                </div>
              </div>

              {role === 'EMPLOYEE' && (
                <>
                  <div>
                    <label className={labelClasses}>Department Role</label>
                    <div className="relative">
                      <Briefcase
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <select
                        value={employeeRole}
                        onChange={(e) => setEmployeeRole(e.target.value)}
                        required
                        className={selectClasses}
                      >
                        <option value="HR">HR</option>
                        <option value="SALES">Sales</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="DEVELOPMENT">Development</option>
                        <option value="DESIGN">Design</option>
                        <option value="ACCOUNTS">Accounts</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Designation (Job Title)</label>
                    <div className="relative">
                      <ClipboardCheck
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="e.g. Senior Recruiter, Frontend Dev"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        required
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'STUDENT' && (
                <>
                  <div>
                    <label className={labelClasses}>Parent/Guardian Phone</label>
                    <div className="flex gap-2">
                      <select
                        value={parentCountryCode}
                        onChange={(e) => setParentCountryCode(e.target.value)}
                        className="px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type="tel"
                          placeholder="98765 43210"
                          pattern="[0-9]{10}"
                          maxLength="10"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Address</label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="123 Main St, City"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className={labelClasses}>Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputClasses} pr-12 tracking-widest`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Confirm Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`${inputClasses} pr-12 tracking-widest`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

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
                ) : (
                  <>
                    Create Account <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="text-center mt-6">
                <span className="text-sm font-medium text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-bold text-[#003F87] hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

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
