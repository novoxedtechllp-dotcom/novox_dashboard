import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Bell, HelpCircle, User, LogOut, Settings, Menu } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

const Header = ({ onLogout, userInfo, basePath = '/admin', searchQuery = '', setSearchQuery = () => {}, toggleSidebar }) => {
  const location = useLocation();
  const activeTab = location.pathname.split('/').pop() || 'dashboard';
  const showSearchBar = ['students', 'employees', 'courses', 'sales-crm', 'leave', 'work-reports', 'attendance', 'gallery', 'fees'].includes(activeTab);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Enrollment', shortMessage: 'Sarah Jenkins has enrolled in MERN Stack Development.', message: 'Sarah Jenkins has enrolled in MERN Stack Development cohort. Payment verified.', time: '10 mins ago', isUnread: true },
    { id: 2, title: 'System Update', shortMessage: 'Scheduled maintenance will occur at midnight.', message: 'Scheduled database maintenance will occur at midnight EST. Expected downtime is 15 minutes.', time: '2 hours ago', isUnread: true },
    { id: 3, title: 'New Lead Captured', shortMessage: 'Michael Chang requested syllabus details.', message: 'Michael Chang requested syllabus details for the Data Science Bootcamp.', time: 'Yesterday', isUnread: true },
    { id: 4, title: 'Report Ready', shortMessage: 'Monthly academic report is ready.', message: 'Monthly academic performance report is ready to be reviewed.', time: 'Oct 12, 2023', isUnread: true }
  ]);
  const hasUnread = notifications.some(n => n.isUnread);

  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
  const markAsRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, isUnread: false } : n));

  const profileRef = useClickOutside(() => setIsDropdownOpen(false));
  const notifRef = useClickOutside(() => setIsNotifOpen(false));

  let displayName = 'User';
  if (userInfo?.first_name) {
    displayName = `${userInfo.first_name} ${userInfo.last_name || ''}`;
  } else if (userInfo?.name) {
    displayName = userInfo.name;
  } else if (userInfo?.email) {
    displayName = userInfo.email.split('@')[0];
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  } else {
    displayName = userInfo?.role === 'ADMIN' ? 'Admin User' : 'User';
  }
  const displayEmail = userInfo?.email || 'admin@novoxedtech.com';
  
  let roleTitle = 'Super Admin';
  if (userInfo?.role === 'EMPLOYEE') {
    roleTitle = userInfo?.designation || 'Employee';
  } else if (userInfo?.role === 'STUDENT') {
    roleTitle = 'Student';
  }

  const [avatarError, setAvatarError] = useState(false);

  return (
    <>
    <header className="h-[72px] min-h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Search Bar & Title */}
      <div className="flex items-center gap-3 md:gap-6">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-400 hover:text-[#003F87] hover:bg-blue-50 rounded-xl transition-all"
        >
          <Menu size={20} />
        </button>
        {showSearchBar && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl w-[240px] md:w-[320px] h-[40px] transition-all duration-300 focus-within:bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 focus-within:shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'students' || activeTab === 'fees' ? "Search by student ID, name..." : activeTab === 'courses' ? "Search courses, mentors..." : activeTab === 'gallery' ? "Search images by title or description..." : "Search employees..."} 
              className="bg-transparent border-none outline-none text-[14px] w-full text-slate-800 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>
      
      {/* Header Actions */}
      <div className="flex items-center gap-4">

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <div 
            className="group flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-100"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="text-right hidden md:block">
              <div className="text-[13px] font-bold text-slate-800 leading-none group-hover:text-[#003F87] transition-colors">
                {displayName}
              </div>
              {userInfo?.role !== 'ADMIN' && (
                <div className="text-[11px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                  {roleTitle}
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm overflow-hidden transition-transform group-hover:scale-105">
              {userInfo?.avatar_url && !avatarError ? (
                <img 
                  src={userInfo.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <User size={18} className="text-[#003F87]/60" />
              )}
            </div>
          </div>
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-[110%] w-[260px] bg-white border border-slate-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-2 z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-3 mb-1 bg-slate-50/50">
                <div className="text-[15px] font-black text-slate-900">{displayName}</div>
                <div className="text-[12px] font-medium text-slate-500 truncate mt-0.5">{displayEmail}</div>
              </div>
              {userInfo?.role !== 'ADMIN' && (
                <>
                  <div className="px-2">
                    <Link to={`${basePath}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-[#003F87] transition-colors cursor-pointer text-[13px] font-bold" onClick={() => setIsDropdownOpen(false)}>
                      <User size={16} /> My Profile
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 my-1 mx-2"></div>
                </>
              )}
              <div className="px-2">
                <div 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#D80000] hover:bg-red-50 transition-colors cursor-pointer text-[13px] font-bold"
                  onClick={() => setShowLogoutModal(true)}
                >
                  <LogOut size={16} /> Log Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAllNotifications && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col scale-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="text-[#003F87]" />
                </div>
                All Notifications
              </h2>
              <button onClick={() => setShowAllNotifications(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-0 flex flex-col max-h-[60vh] overflow-y-auto">
              {notifications.map(notif => (
                <div key={notif.id} onClick={() => markAsRead(notif.id)} className="px-8 py-5 border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer flex justify-between items-start group">
                  <div className="pr-4">
                    <p className="text-[15px] font-bold text-slate-800 group-hover:text-[#003F87] transition-colors">{notif.title}</p>
                    <p className="text-[14px] text-slate-500 mt-1.5 leading-relaxed">{notif.message}</p>
                    <span className="text-[12px] text-slate-400 mt-3 block font-bold uppercase tracking-wider">{notif.time}</span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 shadow-sm ${notif.isUnread ? 'bg-blue-500 shadow-blue-500/50' : 'bg-slate-200'}`}></div>
                </div>
              ))}
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-[13px] font-medium text-slate-500">Showing {notifications.length} of 48 notifications</span>
              {hasUnread && (
                <button onClick={markAllRead} className="text-[13px] text-[#003F87] font-bold hover:underline">Mark All as Read</button>
              )}
            </div>
          </div>
        </div>
      )}
      
    </header>
    {showLogoutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
    
          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-[92%] max-w-md p-8 animate-scaleIn">
    
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <LogOut className="w-10 h-10 text-red-600" />
              </div>
            </div>
    
            <h2 className="text-2xl font-bold text-center mt-5">
              Confirm Logout
            </h2>
    
            <p className="text-center text-slate-500 mt-3">
              Are you sure you want to logout?
              <br />
              You will need to login again.
            </p>
    
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-12 rounded-xl border border-gray-300 font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
    
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
