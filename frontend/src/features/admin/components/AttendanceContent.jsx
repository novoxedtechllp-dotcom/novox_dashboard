import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Calendar, RefreshCcw, MoreVertical, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmployeeCalendarModal from './EmployeeCalendarModal';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AttendanceContent = ({ employees = [], courses = [], searchQuery = '', setSearchQuery = () => {} }) => {
  const datePickerRef = useRef(null);
  const [students, setStudents] = useState([]);
  
  // Database tables mock state
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);

  const [activeTab, setActiveTab] = useState('Employees');
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'PRESENT', check_in: '', check_out: '', remarks: '' });
  
  const [courseFilter, setCourseFilter] = useState('All Categories');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [selectedCalendarEmployee, setSelectedCalendarEmployee] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown-container') && !e.target.closest('.action-dropdown-btn')) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openActionMenuId]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        if (!userInfo || !userInfo.token) {
          return;
        }

        const headers = { 'Authorization': `Bearer ${userInfo.token}` };
        const selectedDate = dateFilter || new Date().toISOString().split('T')[0];

        // Fetch students
        const stdRes = await fetch('/api/v1/students', { headers });
        if (stdRes.ok) {
          const resData = await stdRes.json();
          const studs = resData.data?.students || resData.data || (Array.isArray(resData) ? resData : []);
          setStudents(studs);
        }

        // Fetch attendance specifically for the selected date
        const studentAttRes = await fetch(`/api/v1/attendance?type=student&from=${selectedDate}&to=${selectedDate}`, { headers });
        const employeeAttRes = await fetch(`/api/v1/attendance?type=employee&from=${selectedDate}&to=${selectedDate}`, { headers });
        
        if (studentAttRes.ok) {
          const sData = await studentAttRes.json();
          setStudentAttendance(sData.data || []);
        }
        if (employeeAttRes.ok) {
          const eData = await employeeAttRes.json();
          setEmployeeAttendance(eData.data || []);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFilter]); // Refetch when dateFilter changes

  useEffect(() => {
    if (typeof setSearchQuery === 'function') {
      setSearchQuery('');
    }
    setCourseFilter(activeTab === 'Employees' ? 'All Departments' : 'All Categories');
  }, [activeTab, setSearchQuery]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (selectedCalendarEmployee || editRecord) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [selectedCalendarEmployee, editRecord]);

  const handleRefresh = () => {
    if (typeof setSearchQuery === 'function') {
      setSearchQuery('');
    }
    setCourseFilter(activeTab === 'Employees' ? 'All Departments' : 'All Categories');
    setDateFilter(new Date().toISOString().split('T')[0]);
  };

  const handleUpdateStatus = async (userId, type, newStatus) => {
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
      if (!userInfo || !userInfo.token) return;
      const headers = { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' };
      
      const selectedDate = dateFilter || new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const payload = {
        userId: userId,
        date: selectedDate,
        status: newStatus,
        type: type === 'Student' ? 'student' : 'employee',
        check_in: newStatus === 'PRESENT' || newStatus === 'LATE' || newStatus === 'HALF_DAY' ? now : null,
      };

      const res = await fetch('/api/v1/attendance', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Re-fetch attendance
        const studentAttRes = await fetch(`/api/v1/attendance?type=student&from=${selectedDate}&to=${selectedDate}`, { headers });
        const employeeAttRes = await fetch(`/api/v1/attendance?type=employee&from=${selectedDate}&to=${selectedDate}`, { headers });
        
        if (studentAttRes.ok) {
          const sData = await studentAttRes.json();
          setStudentAttendance(sData.data || []);
        }
        if (employeeAttRes.ok) {
          const eData = await employeeAttRes.json();
          setEmployeeAttendance(eData.data || []);
        }
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
    }
    setOpenActionMenuId(null);
  };

  const handleOpenEdit = (item) => {
    setEditForm({
      status: item.status,
      check_in: item.check_in ? item.check_in.substring(11, 16) : '', // 'HH:mm' for time input
      check_out: item.check_out ? item.check_out.substring(11, 16) : '',
      remarks: item.remarks || ''
    });
    setEditRecord(item);
    setOpenActionMenuId(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
      if (!userInfo || !userInfo.token) return;
      const headers = { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' };
      
      const datePrefix = editRecord.attendance_date || dateFilter || new Date().toISOString().split('T')[0];
      const payload = {
        userId: editRecord.userId,
        date: datePrefix,
        status: editForm.status,
        check_in: editForm.check_in ? `${datePrefix}T${editForm.check_in}:00` : null,
        check_out: editForm.check_out ? `${datePrefix}T${editForm.check_out}:00` : null,
        remarks: editForm.remarks,
        type: editRecord.type === 'Student' ? 'student' : 'employee'
      };

      const res = await fetch('/api/v1/attendance', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const studentAttRes = await fetch(`/api/v1/attendance?type=student&from=${datePrefix}&to=${datePrefix}`, { headers });
        const employeeAttRes = await fetch(`/api/v1/attendance?type=employee&from=${datePrefix}&to=${datePrefix}`, { headers });
        
        if (studentAttRes.ok) {
          const sData = await studentAttRes.json();
          setStudentAttendance(sData.data || []);
        }
        if (employeeAttRes.ok) {
          const eData = await employeeAttRes.json();
          setEmployeeAttendance(eData.data || []);
        }
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
    }
    setEditRecord(null);
  };

  // Join data with respective Profiles
  const getMappedData = () => {
    const selectedDate = dateFilter || new Date().toISOString().split('T')[0];
    if (activeTab === 'Students') {
      return students.map(student => {
        const studentId = student.id || student._id;
        const sa = studentAttendance.find(a => a.student_id === studentId && (a.attendance_date === selectedDate || a.date === selectedDate || a.attendance_date?.startsWith(selectedDate)));
        const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Unknown Student`;
        const initials = student.first_name ? `${student.first_name[0]}${student.last_name ? student.last_name[0] : ''}`.toUpperCase() : '??';
        return { 
          ...(sa || {}), 
          userId: studentId,
          type: 'Student', 
          identifier: student.student_code || 'N/A', 
          name, 
          initials, 
          course: student.course?.name || 'N/A',
          status: sa ? sa.status : 'NOT_MARKED',
          attendance_date: sa ? sa.attendance_date : selectedDate
        };
      });
    } else {
      return employees.map(employee => {
        const employeeId = employee.id || employee._id;
        const ea = employeeAttendance.find(a => a.employee_id === employeeId && (a.attendance_date === selectedDate || a.date === selectedDate || a.attendance_date?.startsWith(selectedDate)));
        const name = employee.name || `Unknown Employee`;
        const initials = name !== 'Unknown Employee' ? name.substring(0, 2).toUpperCase() : '??';
        return { 
          ...(ea || {}), 
          userId: employeeId,
          type: 'Employee', 
          identifier: employee.eid || 'N/A', 
          name, 
          initials, 
          course: employee.department || 'N/A',
          status: ea ? ea.status : 'NOT_MARKED',
          attendance_date: ea ? ea.attendance_date : selectedDate
        };
      });
    }
  };

  const formattedTime = (isoString) => {
    if (!isoString) return '-- : --';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const joinedData = getMappedData();

  const filteredData = joinedData.filter(item => {
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const nameWords = item.name.toLowerCase().split(/\s+/);
      const matchesName = nameWords.some(word => word.startsWith(term));
      const matchesIdentifier = item.identifier.toLowerCase().startsWith(term);
      if (!matchesName && !matchesIdentifier) {
        return false;
      }
    }
    if (courseFilter !== 'All Categories' && courseFilter !== 'All Departments') {
      if (item.course?.toLowerCase() !== courseFilter.toLowerCase()) {
        return false;
      }
    }
    return true; // We map using dateFilter globally, so no need to filter date here
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const timeA = new Date(a.check_out || a.check_in || 0).getTime();
    const timeB = new Date(b.check_out || b.check_in || 0).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });

  const uniqueDepts = ['All Departments', ...new Set(employees.map(e => e.department).filter(Boolean))];
  const uniqueCourses = ['All Categories', ...courses.map(c => c.title)];

  if (loading) {
    return <LoadingSpinner text="Loading attendance data..." />;
  }

  return (
    <div className="p-[24px] flex flex-col gap-[24px] w-full">
      {/* Header Section */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-h-[52px]">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Management</h1>
          <p className="text-slate-500 mt-1">Track and monitor attendance records across all departments.</p>
        </div>
        <div className="flex bg-[#F8FAFC] rounded-[4px] p-[4px] border border-[#C2C6D4]">
          <button 
            onClick={() => setActiveTab('Employees')}
            className={`px-6 py-1.5 text-[13px] font-bold rounded-[4px] transition-colors ${activeTab === 'Employees' ? 'bg-white text-[#003F87] shadow-sm border border-[#C2C6D4]' : 'text-[#555F6B] hover:text-slate-800'}`}
          >
            Employees
          </button>
          <button 
            onClick={() => setActiveTab('Students')}
            className={`px-6 py-1.5 text-[13px] font-bold rounded-[4px] transition-colors ${activeTab === 'Students' ? 'bg-white text-[#003F87] shadow-sm border border-[#C2C6D4]' : 'text-[#555F6B] hover:text-slate-800'}`}
          >
            Students
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 mb-6">
  <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start xl:items-center">

    {/* Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">

      {/* Department / Course */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all duration-300 w-full min-w-0">

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          {activeTab === "Employees" ? "Department" : "Course"}
        </span>

        <div className="flex-1 min-w-0">
          <CustomSelect
            value={courseFilter}
            onChange={setCourseFilter}
            options={
              activeTab === "Employees"
                ? uniqueDepts.map((d) => ({
                    value: d,
                    label: d,
                  }))
                : uniqueCourses.map((course) => ({
                    value: course,
                    label: course,
                  }))
            }
            className="w-full"
            selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>

      </div>

      {/* Date Filter */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all duration-300 w-full min-w-0">

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          Date
        </span>

        <div className="relative flex-1 min-w-0">

          <DatePicker
            ref={datePickerRef}
            selected={dateFilter ? new Date(dateFilter) : null}
            onChange={(date) => {
              if (date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, "0");
                const dd = String(date.getDate()).padStart(2, "0");

                setDateFilter(`${yyyy}-${mm}-${dd}`);
              } else {
                setDateFilter("");
              }
            }}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            showMonthDropdown
            showYearDropdown
            scrollableYearDropdown
            dropdownMode="scroll"
            className="
              w-full
              bg-transparent
              text-sm
              font-semibold
              text-slate-700
              outline-none
              pr-8
              cursor-pointer
            "
          />

          <Calendar
            size={18}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
            onClick={() => datePickerRef.current?.setFocus()}
          />

        </div>

      </div>

    </div>

    {/* Refresh Button */}
    <div className="flex justify-end xl:justify-center w-full xl:w-auto">
      <button
        onClick={handleRefresh}
        title="Refresh Filters"
        className="
          w-full
          sm:w-12
          h-12
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          hover:bg-slate-100
          flex
          items-center
          justify-center
          text-slate-500
          transition-all
          duration-300
          active:scale-95
          shadow-sm
        "
      >
        <RefreshCcw size={18} />
      </button>
    </div>

  </div>
</div>
      {/* Table Section */}
      <div className="bg-white border border-[#C2C6D4] rounded-[8px] shadow-sm overflow-hidden">
        <div 
          className="w-full overflow-x-auto relative z-10 transition-all duration-200 ease-in-out"
          style={{ 
            minHeight: (() => {
              if (!openActionMenuId) return 'auto';
              const openIndex = sortedData.findIndex(item => item.userId === openActionMenuId);
              if (openIndex === -1) return 'auto';
              const rendersUpwards = openIndex >= 3 && openIndex >= sortedData.length - 3;
              if (rendersUpwards) return 'auto'; 
              return `${50 + (openIndex + 1) * 55 + 215}px`;
            })()
          }}
        >
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="border-b border-[#C2C6D4] bg-white">
                <th className="py-4 pl-6 pr-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[12%]">ID</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[22%]">Name</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[18%]">Course / Dept</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[14%]">Status</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[12%]">Check In</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider w-[12%]">Check Out</th>
                <th className="py-4 px-4 text-[11px] font-bold text-[#555F6B] uppercase tracking-wider text-right w-[10%]">Actions</th>

              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((item, index) => (
                <tr key={item.userId} className={index !== sortedData.length - 1 ? "border-b border-slate-100" : ""}>
                  <td className="py-[16px] pl-6 pr-2">
                    <div className="text-[13px] font-bold text-[#003F87] leading-tight break-words max-w-[80px]">{item.identifier}</div>
                  </td>
                  <td className="py-[16px] px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-[32px] h-[32px] rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${item.type === 'Student' ? 'bg-[#E5F0FF] text-[#003F87]' : 'bg-[#F3F4F6] text-[#555F6B]'}`}>
                        {item.initials}
                      </div>
                      <div className="text-[14px] font-bold text-slate-900 leading-tight">{item.name}</div>
                    </div>
                  </td>
                  <td className="py-[16px] px-2">
                    <div className="text-[13px] text-[#555F6B] leading-tight">{item.course}</div>
                  </td>
                  <td className="py-[16px] px-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center gap-2 px-[12px] py-[4px] rounded-full text-[11px] font-bold tracking-wide
                        ${item.status === 'PRESENT' ? 'bg-[#E5F7ED] text-[#008A2E]' : ''}
                        ${item.status === 'LATE' ? 'bg-[#FFF4E5] text-[#B26E00]' : ''}
                        ${item.status === 'ABSENT' ? 'bg-[#FDE2E2] text-[#D80000]' : ''}
                        ${item.status === 'HALF_DAY' ? 'bg-[#E5F0FF] text-[#003F87]' : ''}
                        ${item.status === 'NOT_MARKED' ? 'bg-slate-100 text-slate-500' : ''}
                      `}>
                        <span className={`w-[6px] h-[6px] rounded-full 
                          ${item.status === 'PRESENT' ? 'bg-[#008A2E]' : ''}
                          ${item.status === 'LATE' ? 'bg-[#B26E00]' : ''}
                          ${item.status === 'ABSENT' ? 'bg-[#D80000]' : ''}
                          ${item.status === 'HALF_DAY' ? 'bg-[#003F87]' : ''}
                          ${item.status === 'NOT_MARKED' ? 'bg-slate-400' : ''}
                        `}></span> 
                        {item.status.replace('_', ' ')}
                      </span>
                      {item.remarks && <span className="text-[10px] text-[#B26E00] leading-tight max-w-[140px] truncate" title={item.remarks}>R: {item.remarks}</span>}
                    </div>
                  </td>
                  <td className="py-[16px] px-[24px]">
                    <div className="text-[13px] font-medium text-slate-900 leading-tight">{formattedTime(item.check_in)}</div>
                  </td>
                  <td className="py-[16px] px-[24px]">
                    <div className="text-[13px] font-medium text-slate-900 leading-tight">{formattedTime(item.check_out)}</div>
                  </td>
                  <td className="py-[16px] px-[24px] text-right relative">
                    <button 
                      onClick={() => setOpenActionMenuId(openActionMenuId === item.userId ? null : item.userId)}
                      className="text-[#555F6B] hover:text-[#003F87] p-1 rounded hover:bg-slate-100 transition-colors action-dropdown-btn"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openActionMenuId === item.userId && (
                      <div className={`action-dropdown-container absolute right-[24px] ${index >= 3 && index >= sortedData.length - 3 ? 'bottom-[40px]' : 'top-[40px]'} w-[140px] bg-white border border-[#C2C6D4] shadow-lg rounded-[8px] z-50 overflow-hidden text-left flex flex-col`}>
                        <button onClick={() => { setSelectedCalendarEmployee(item); setOpenActionMenuId(null); }} className="px-4 py-2 text-[12px] font-semibold text-[#003F87] hover:bg-slate-50 text-left border-b border-slate-100 transition-colors flex items-center gap-2"><Calendar size={14}/> View Calendar</button>
                        <button onClick={() => handleUpdateStatus(item.userId, item.type, 'PRESENT')} className="px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#008A2E] text-left border-b border-slate-100 transition-colors">Mark Present</button>
                        <button onClick={() => handleUpdateStatus(item.userId, item.type, 'LATE')} className="px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#B26E00] text-left border-b border-slate-100 transition-colors">Mark Late</button>
                        <button onClick={() => handleUpdateStatus(item.userId, item.type, 'ABSENT')} className="px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#D80000] text-left border-b border-slate-100 transition-colors">Mark Absent</button>
                        <button onClick={() => handleUpdateStatus(item.userId, item.type, 'HALF_DAY')} className="px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#003F87] text-left border-b border-slate-100 transition-colors">Mark Half Day</button>
                        <button onClick={() => handleOpenEdit(item)} className="px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors">Edit Record</button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="py-[32px] text-center text-[13px] text-[#555F6B]">
                    No attendance records found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {editRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Attendance Record</h2>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                <select 
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#003F87] focus:ring-1 focus:ring-[#003F87] text-sm bg-white"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="HALF_DAY">HALF DAY</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Check In</label>
                  <input 
                    type="time" 
                    value={editForm.check_in}
                    onChange={(e) => setEditForm({...editForm, check_in: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#003F87] focus:ring-1 focus:ring-[#003F87] text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Check Out</label>
                  <input 
                    type="time" 
                    value={editForm.check_out}
                    onChange={(e) => setEditForm({...editForm, check_out: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#003F87] focus:ring-1 focus:ring-[#003F87] text-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Remarks</label>
                <textarea 
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#003F87] focus:ring-1 focus:ring-[#003F87] text-sm resize-none" 
                  placeholder="E.g. Transit delay..."
                />
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditRecord(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#003F87] rounded-lg text-sm font-semibold text-white hover:bg-[#002B5E]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedCalendarEmployee && (
        <EmployeeCalendarModal 
          employee={selectedCalendarEmployee} 
          onClose={() => setSelectedCalendarEmployee(null)} 
        />
      )}
    </div>
  );
};

export default AttendanceContent;

