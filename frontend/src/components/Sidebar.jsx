import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, BookOpen, Calendar, 
  CreditCard, Wallet, MessageSquare, Handshake, Trophy, 
  GraduationCap, FileText, Globe, Settings, HelpCircle, Menu, LogOut,
  CheckSquare, ClipboardList, Bot, Image, User, Shield
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'daily-plan', label: 'Mentoring Sessions', icon: BookOpen },
  { id: 'my-students', label: 'My Students', icon: GraduationCap },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'employees', label: 'Employees', icon: Briefcase },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'leave', label: 'Leave Management', icon: FileText },
  { id: 'fees', label: 'Fees', icon: CreditCard },
    { id: 'sales-crm', label: 'Sales CRM', icon: Handshake },


  { id: 'my-payroll', label: 'My Payroll', icon: Wallet },
  { id: 'payroll', label: 'Payroll Management', icon: Wallet },
  { id: 'work-reports', label: 'Work Reports', icon: CheckSquare },
  // { id: 'whatsapp-automation', label: 'WhatsApp Automation', icon: MessageSquare },
  // { id: 'sales-crm', label: 'Sales CRM', icon: Handshake },
  // { id: 'recruitment', label: 'Recruitment', icon: Users },
  // { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  // { id: 'journey', label: 'Academic Journey', icon: GraduationCap },
  { id: 'blog-agent', label: 'Blog Agent', icon: Bot },
  { id: 'profile', label: 'My Profile', icon: User },

  // { id: 'seo', label: 'SEO Agent', icon: Globe },
];

const Sidebar = ({ userRole, permissions = {}, isHR, isDesign, isDevelopment, isSales, isMarketing, isAccounts, basePath = '/admin', isOpen, setIsOpen, onLogout }) => {
  const location = useLocation();
  const activeTab = location.pathname.split('/').pop() || 'dashboard';
  
  let visibleNavItems = navItems;
  if (userRole === 'STUDENT') {
    visibleNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'journey', label: 'My Academic Journey', icon: GraduationCap },
      { id: 'daily-plan', label: 'Action Plan', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: Calendar },
      { id: 'leave', label: 'Leave Requests', icon: FileText },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList },
      { id: 'jobs', label: 'Job Portal', icon: Briefcase },
      { id: 'fees', label: 'Financial Overview', icon: CreditCard },
      { id: 'profile', label: 'Profile', icon: User }
    ];
  }
   else if (userRole !== 'ADMIN') {
    const hiddenItems = [];
    
    // Mapping of navItem id to permissions key in SettingsContent
    const permKeys = {
      'students': 'students',
      'employees': 'employees',
      'courses': 'courses',
      'fees': 'fees',
      'sales-crm': 'sales',
      'attendance': 'attendance',
      'gallery': 'gallery',
      'leave': 'leave',
      'work-reports': 'work-reports',
      'blog-agent': 'blog-agent'
    };

    // Evaluate hidden items based on permissions
    navItems.forEach(item => {
      const permKey = permKeys[item.id];
      if (permKey) {
        // Hide if the permissions object doesn't grant 'view'
        if (!permissions[permKey]?.view) {
          hiddenItems.push(item.id);
        }
      }
    });

    // Handle legacy items that are commented out but might be uncommented later
    if (!(isHR || isAccounts)) hiddenItems.push('payroll');
    if (!isHR) hiddenItems.push('recruitment');
    if (!(isSales || isMarketing)) hiddenItems.push('whatsapp-automation');
    if (!isMarketing) hiddenItems.push('seo');
    if (!(isDevelopment || isDesign)) hiddenItems.push('daily-plan');

    
    visibleNavItems = navItems.filter(item => !hiddenItems.includes(item.id))
      .map(item => {
        if (item.id === 'leave') {
          return { ...item, label: userRole === 'STUDENT' ? 'Leave Requests' : 'Leave Management' };
        }
        if (item.id === 'daily-plan') {
          return { ...item, label: 'Mentoring Sessions' };
        }
        if (item.id === 'profile') {
          return { ...item, label: 'Profile' };
        }
        return item;
      });
  } else {
    // Admin role
    visibleNavItems = navItems.filter(item => item.id !== 'profile').map(item => {
        if (item.id === 'leave') {
          return { ...item, label: 'Leave Management' };
        }
        if (item.id === 'daily-plan') {
          return { ...item, label: 'Mentoring Sessions' };
        }
        if (item.id === 'my-students') {
          return { ...item, label: "Students' Progress" };
        }
        return item;
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`
        fixed lg:static top-0 left-0 h-screen bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        flex flex-col z-50 transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen 
          ? 'w-[260px] min-w-[260px] translate-x-0 pl-[20px] py-[28px]' 
          : 'w-[260px] min-w-[260px] lg:w-0 lg:min-w-0 lg:p-0 -translate-x-full lg:translate-x-0 lg:border-r-0'}
      `}>
        {/* Container to prevent text wrapping when width shrinks */}
        <div className="w-[220px] min-w-[220px] flex flex-col h-full">
          {/* Top Logo Container */}
          <div className="flex flex-col justify-start shrink-0 relative mb-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-start px-2">
                <img src="/novox-edtech-calicut-logo.png" alt="Novox Edtech" className="h-[44px] w-[180px] object-contain object-left -ml-2" />
                <p className="text-[9px] font-bold text-[#555F6B] tracking-[0.15em] uppercase mt-2 text-center w-[180px] -ml-2">
                  {userRole === 'STUDENT' ? 'Student Portal' : 'Institutional Management'}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all shrink-0 ml-1"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Main Nav Container */}
          <nav 
            className="flex-1 flex flex-col gap-1.5 overflow-y-auto mt-4 pb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={`${basePath}/${item.id}`}
                  onClick={() => {
                    if (item.id === 'leave') {
                      localStorage.setItem('employee_leave_view', 'My Record');
                      localStorage.setItem('employee_leave_tab', 'Request Leave');
                    }
                    if (window.innerWidth < 1024 && setIsOpen) setIsOpen(false);
                  }}
                  className={`group flex items-center gap-[14px] px-[14px] py-[10px] rounded-xl transition-all duration-300 text-left w-full shrink-0 relative overflow-hidden
                    ${isActive 
                      ? 'bg-blue-50 text-[#003F87] font-bold' 
                      : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#003F87] rounded-r-full"></div>
                  )}
                  <Icon size={18} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#003F87]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="text-[14px] leading-none whitespace-nowrap mt-0.5">
                    {item.id === 'leave' && (userRole === 'ADMIN' || isHR) ? 'Leave Management' : item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Action (Settings & Logout) */}
          <div className="mt-auto pt-4 border-t border-slate-100 shrink-0 pr-3 flex flex-col gap-1.5">
            {userRole === 'ADMIN' && (
              <Link
                to={`${basePath}/settings`}
                onClick={() => window.innerWidth < 1024 && setIsOpen && setIsOpen(false)}
                className={`group flex items-center gap-[14px] px-[14px] py-[10px] rounded-xl transition-all duration-300 text-left w-full shrink-0 relative overflow-hidden
                  ${activeTab === 'settings' 
                    ? 'bg-blue-50/80 text-[#003F87] font-bold shadow-sm border border-blue-100/50' 
                    : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                {activeTab === 'settings' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#003F87] rounded-r-full"></div>
                )}
                <Settings size={18} className={`transition-transform duration-300 group-hover:scale-110 ${activeTab === 'settings' ? 'text-[#003F87]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-[14px] leading-none whitespace-nowrap mt-0.5">Settings</span>
              </Link>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="group flex items-center gap-[14px] px-[14px] py-[10px] rounded-xl transition-all duration-300 text-left w-full text-[#D80000] font-medium hover:bg-red-50 hover:shadow-sm"
              >
                <LogOut size={18} className="text-[#D80000]/80 group-hover:text-[#D80000] transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="text-[14px] leading-none whitespace-nowrap mt-0.5">Log Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
