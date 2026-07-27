import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Calendar, 
  CheckCircle, 
  MessageSquare, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { login } from '../api/authApi';

export default function StudentLogin({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmitStudentLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);

      if (data) {
        const userInfoToSave = { ...data.data.user, token: data.data.accessToken };
        
        // Enforce student login panel restriction
        if (userInfoToSave.role !== 'STUDENT') {
          setError('Access Denied: This portal is for students only.');
          setLoading(false);
          return;
        }

        // Save to session storage for persistence across reloads
        sessionStorage.setItem('userInfo', JSON.stringify(userInfoToSave));

        // Pass to parent
        onLogin(userInfoToSave.role);
        navigate('/student/dashboard'); // Redirect directly to student dashboard
      } else {
        setError("Invalid email or password!");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      
      // Developer fallback for testing frontend components offline when backend is not running
      if (email === 'student@novox.com' && password === 'student@novox') {
        const mockStudentUser = {
          id: 'mock-student-id',
          email: 'student@novox.com',
          role: 'STUDENT',
          first_name: 'Alex',
          last_name: 'Student',
          token: 'mock-jwt-token'
        };
        sessionStorage.setItem('userInfo', JSON.stringify(mockStudentUser));
        if (onLogin) onLogin('STUDENT');
        navigate('/student/dashboard');
        return;
      }

      setError(err.response?.data?.message || err.message || "Failed to connect to the server. Please ensure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#FAFBFC] font-sans selection:bg-blue-200">
      
      {/* Left Blue Panel */}
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

      {/* Right White Panel (Form) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white lg:rounded-l-3xl relative z-10 lg:-ml-6 shadow-[-20px_0_40px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium text-sm">Please enter your credentials to access your portal.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email or Student ID</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400 tracking-widest"
                  placeholder="e.g. 2024-ST-001"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <Link to="#" className="text-[#0051A8] text-xs font-bold hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#003F87] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#002B5E] shadow-md shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400">
            <span>© 2024 Novox Edtech. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="#" className="hover:text-[#003F87] transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-[#003F87] transition-colors">Terms of Service</Link>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
