import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, BookOpen, CheckCircle, Plus, LayoutList, X, ChevronDown, ChevronRight, ChevronLeft, CalendarDays, Clock, User, MessageSquare, Search, Star } from 'lucide-react';
import LoadingSpinner from '../../../components/LoadingSpinner';

const getAuthHeaders = () => {
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
  if (!userInfo?.token) return null;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userInfo.token}`
  };
};

const parseApiResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const formatDateDDMMYYYY = (value) => {
  if (!value) return '';
  const [year, month, day] = String(value).split('T')[0].split('-');
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
};

const formatWeekday = (value) => {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });
};

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StarRating = ({ rating, setRating, readOnly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && setRating(star)}
          className={`focus:outline-none transition-transform ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}
        >
          <Star 
            size={18} 
            className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} 
          />
        </button>
      ))}
    </div>
  );
};

const DailyPlan = ({ userType, userId }) => {
  const [toast, setToast] = useState(null);
  const alert = (message) => {
    const isError = typeof message === 'string' && (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error'));
    setToast({ message, type: isError ? 'error' : 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  
  // Admin only state
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedAdminEmployeeId, setSelectedAdminEmployeeId] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');

  // Date array for custom date selector (3 days before, today, 3 days after)
  const [dateRange, setDateRange] = useState([]);

  useEffect(() => {
    // Generate dates around selected date
    const centerDate = new Date(selectedDate);
    const range = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(centerDate);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      range.push({
        dateString: `${year}-${month}-${day}`,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: `${year}-${month}-${day}` === getLocalDateString()
      });
    }
    setDateRange(range);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  useEffect(() => {
    if (userType === 'ADMIN') {
      const fetchEmployees = async () => {
        try {
          const headers = getAuthHeaders();
          if (!headers) return;
          const response = await fetch('/api/v1/employees', { headers });
          const resData = await parseApiResponse(response);
          let emps = resData.data?.employees || resData.data || [];
          emps = emps.filter(emp => emp.course_instructors && emp.course_instructors.length > 0);
          setEmployeesList(emps);
          if (emps.length > 0) setSelectedAdminEmployeeId(emps[0].id);
        } catch (error) {
           console.error('Error fetching employees:', error);
        }
      };
      fetchEmployees();
    }
  }, [userType]);

  useEffect(() => {
    fetchSessions();
  }, [selectedDate, userType, userId, selectedAdminEmployeeId]);

  const fetchSessions = async () => {
    if (!userId && userType !== 'ADMIN') return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      
      let endpoint = '';
      if (userType === 'STUDENT') {
        endpoint = `/api/v1/students/${userId}/mentoring-sessions?date=${selectedDate}`;
      } else if (userType === 'ADMIN') {
        if (!selectedAdminEmployeeId) {
          setSessions([]);
          setLoading(false);
          return;
        }
        endpoint = `/api/v1/employees/${selectedAdminEmployeeId}/mentoring-sessions?date=${selectedDate}`;
      } else {
        endpoint = `/api/v1/employees/${userId}/mentoring-sessions?date=${selectedDate}`;
      }

      const response = await fetch(endpoint, { headers });
      const resData = await parseApiResponse(response);
      setSessions(resData.data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentReview = async (sessionId, reviewText, rating) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/v1/students/${userId}/mentoring-sessions/${sessionId}/review`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ student_review: reviewText, student_rating: rating })
      });
      await parseApiResponse(response);
      alert('Review submitted successfully!');
      fetchSessions();
    } catch (error) {
      alert(error.message || 'Failed to submit review');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 h-full bg-[#FAFBFC] relative overflow-hidden">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[9999] px-6 py-4 rounded-xl shadow-2xl font-bold text-sm transform transition-all duration-300 flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.type === 'error' ? <X size={18} /> : <CheckCircle size={18} className="text-green-400" />}
          {toast.message}
        </div>
      )}

      {/* Header & Date Navigation Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mentoring Sessions</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <CalendarDays size={14} /> View and log mentoring sessions.
          </p>
        </div>

        {/* Custom Date Navigator */}
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button onClick={handlePrevDay} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-[#003F87] hover:shadow-sm border border-slate-200 transition-all active:scale-95">
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex gap-2">
            {dateRange.map((d, i) => (
              <button 
                key={i}
                onClick={() => setSelectedDate(d.dateString)}
                className={`
                  flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all
                  ${d.dateString === selectedDate 
                    ? 'bg-[#003F87] text-white shadow-md scale-105 font-bold border border-blue-600' 
                    : 'bg-transparent text-slate-600 hover:bg-white hover:shadow-sm font-medium border border-transparent hover:border-slate-200'
                  }
                `}
              >
                <span className={`text-[10px] uppercase ${d.dateString === selectedDate ? 'text-blue-200' : 'text-slate-400'}`}>{d.dayName}</span>
                <span className="text-lg leading-none mt-1">{d.dayNumber}</span>
                {d.isToday && <span className={`w-1 h-1 rounded-full mt-1 ${d.dateString === selectedDate ? 'bg-white' : 'bg-[#003F87]'}`}></span>}
              </button>
            ))}
          </div>

          <button onClick={handleNextDay} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-[#003F87] hover:shadow-sm border border-slate-200 transition-all active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100%-120px)]">
        {/* Left Sidebar (Controls) */}
        {(userType === 'ADMIN' || userType === 'EMPLOYEE') && (
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
            
            {userType === 'ADMIN' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <User size={14} />
                  </div>
                  <h3 className="font-bold text-slate-800">Select Mentor</h3>
                </div>
                <div className="relative">
                  <div 
                    onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                    className="w-full p-3.5 pl-4 pr-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#003F87] focus:ring-4 focus:ring-[#003F87]/10 bg-slate-50 cursor-pointer transition-all hover:bg-slate-100 flex justify-between items-center"
                  >
                    <span>
                      {employeesList.find(emp => emp.id === selectedAdminEmployeeId) 
                        ? `${employeesList.find(emp => emp.id === selectedAdminEmployeeId).first_name} ${employeesList.find(emp => emp.id === selectedAdminEmployeeId).last_name}` 
                        : 'Select Mentor...'}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isStaffDropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-[300px] flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search mentors..." 
                            value={staffSearchTerm}
                            onChange={(e) => setStaffSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003F87] focus:ring-2 focus:ring-[#003F87]/10 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {employeesList
                          .filter(emp => `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(staffSearchTerm.toLowerCase()))
                          .map(emp => (
                          <div 
                            key={emp.id} 
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 transition-colors"
                            onClick={() => {
                              setSelectedAdminEmployeeId(emp.id);
                              setIsStaffDropdownOpen(false);
                              setStaffSearchTerm('');
                            }}
                          >
                            {emp.first_name} {emp.last_name}
                          </div>
                        ))}
                        {employeesList.filter(emp => `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(staffSearchTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-6 text-sm text-slate-500 text-center italic">No mentors found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {userType === 'EMPLOYEE' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors z-0"></div>
                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003F87] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20 mb-2">
                    <LayoutList size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Log Session</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Record a mentoring session with a student.</p>
                  </div>
                  <button
                    onClick={() => setIsLogSessionModalOpen(true)}
                    className="w-full py-3.5 mt-2 bg-[#003F87] hover:bg-[#002B5E] transition-all duration-300 text-white text-sm font-bold rounded-xl cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-blue-900/10"
                  >
                    <Plus size={18} /> Log Session
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {formatWeekday(selectedDate)}'s Sessions
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">{formatDateDDMMYYYY(selectedDate)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
            {loading ? (
              <div className="h-full flex items-center justify-center"><LoadingSpinner text="Fetching sessions..." /></div>
            ) : sessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100">
                  <BookOpen size={40} className="opacity-50" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">No Sessions</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">No mentoring sessions logged for this date.</p>
                {userType === 'EMPLOYEE' && (
                  <button onClick={() => setIsLogSessionModalOpen(true)} className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-[#003F87] hover:text-[#003F87] transition-colors">
                    Log Session Now
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                {sessions.map((session, index) => (
                  <div key={session.id} className="relative pl-6 md:pl-10">
                    {index !== sessions.length - 1 && <div className="absolute left-3 md:left-[19px] top-8 bottom-[-24px] w-[2px] bg-slate-200"></div>}
                    <div className="absolute left-0 md:left-[10px] top-5 w-6 h-6 rounded-full bg-white border-[3px] border-[#003F87] shadow-sm z-10 flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#003F87] rounded-full"></div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                      <div className="p-5 border-b border-slate-100 flex flex-col gap-4 bg-white relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#003F87] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-[#E5F0FF] text-[#003F87] text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {session.course_submodules?.course_modules?.courses?.name}
                              </span>
                              <span className="text-slate-400 text-xs font-bold">Mod {session.course_submodules?.course_modules?.title}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 leading-tight">
                              {session.course_submodules?.title}
                            </h4>
                          </div>
                          <div className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg flex items-center gap-1.5">
                            <Clock size={12} /> {session.time_taken_minutes} mins
                          </div>
                        </div>

                        {userType !== 'STUDENT' && session.students && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                              {session.students.first_name?.[0]}{session.students.last_name?.[0]}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Student: {session.students.first_name} {session.students.last_name}</span>
                          </div>
                        )}
                        {userType === 'STUDENT' && session.employee_profiles && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-[10px]">
                              {session.employee_profiles.first_name?.[0]}{session.employee_profiles.last_name?.[0]}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Mentor: {session.employee_profiles.first_name} {session.employee_profiles.last_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 bg-slate-50/50 flex flex-col gap-4">
                        <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-slate-400" /> Mentor's Note
                          </h5>
                          <div className="p-3.5 bg-[#FFFDF0] border border-[#F2E8A2]/60 rounded-xl shadow-sm text-sm font-medium text-slate-700 leading-relaxed relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F59E0B]"></div>
                            {session.note}
                          </div>
                        </div>

                        {/* Student Review Section */}
                        <div className="pt-4 border-t border-slate-200">
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <MessageSquare size={14} className="text-slate-400" /> Student Feedback
                          </h5>
                          
                          {(session.student_review || session.student_rating) ? (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                              {session.student_rating && (
                                <StarRating rating={session.student_rating} readOnly={true} />
                              )}
                              {session.student_review && (
                                <p className="text-sm text-slate-700 leading-relaxed mt-1">{session.student_review}</p>
                              )}
                            </div>
                          ) : userType === 'STUDENT' ? (
                            <StudentReviewForm 
                              sessionId={session.id} 
                              onSubmit={(review, rating) => handleStudentReview(session.id, review, rating)} 
                            />
                          ) : (
                            <div className="text-sm text-slate-400 italic">No feedback provided yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLogSessionModalOpen && (
        <LogSessionModal
          isOpen={isLogSessionModalOpen}
          onClose={() => setIsLogSessionModalOpen(false)}
          selectedDate={selectedDate}
          userId={userId}
          onSuccess={fetchSessions}
        />
      )}
    </div>
  );
};

const StudentReviewForm = ({ sessionId, onSubmit }) => {
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating && !review.trim()) return;
    setSubmitting(true);
    await onSubmit(review, rating);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-700">Rate this session:</span>
        <StarRating rating={rating} setRating={setRating} />
      </div>
      <textarea
        placeholder="Add your review or feedback (optional)..."
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003F87] focus:ring-2 focus:ring-blue-500/10 transition-all resize-none h-20"
      ></textarea>
      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={submitting || (!rating && !review.trim())}
          className="px-4 py-2 bg-[#003F87] text-white text-sm font-bold rounded-lg hover:bg-[#002B5E] disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
};

const LogSessionModal = ({ isOpen, onClose, selectedDate, userId, onSuccess }) => {
  const [students, setStudents] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        // Fetch students for this instructor
        const stuRes = await fetch(`/api/v1/students?instructorId=${userId}&limit=1000`, { headers });
        const stuData = await parseApiResponse(stuRes);
        setStudents(stuData.data?.students || stuData.data || []);

        // Fetch topics
        const topRes = await fetch(`/api/v1/employees/${userId}/available-topics?date=${selectedDate}`, { headers });
        const topData = await parseApiResponse(topRes);
        setTopics(topData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, userId, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedTopic || !timeTaken || !note.trim()) return;
    setSubmitting(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/v1/employees/${userId}/mentoring-sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: selectedStudent,
          submodule_id: selectedTopic,
          session_date: selectedDate,
          time_taken_minutes: parseInt(timeTaken),
          note: note.trim()
        })
      });
      await parseApiResponse(res);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to log session');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 md:px-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 relative">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Log Mentoring Session</h2>
            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <CalendarDays size={14} /> {formatDateDDMMYYYY(selectedDate)}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 bg-[#FAFBFC]">
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Student *</label>
                <select 
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                >
                  <option value="" disabled>Select a student</option>
                  {students.map(stu => (
                    <option key={stu.id} value={stu.id}>{stu.first_name} {stu.last_name} ({stu.student_code || stu.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Module/Topic Covered *</label>
                <select 
                  required
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                >
                  <option value="" disabled>Select topic</option>
                  {topics.map(top => (
                    <option key={top.id} value={top.id}>Mod {top.course_modules?.title}: {top.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Time Taken (minutes) *</label>
                <input 
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 60"
                  value={timeTaken}
                  onChange={(e) => setTimeTaken(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Session Note *</label>
                <textarea 
                  required
                  placeholder="Add details about what was covered, student progress, etc."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none h-32"
                ></textarea>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-3 border border-slate-200 bg-white text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-3 bg-[#003F87] text-white text-sm font-bold rounded-xl hover:bg-[#002B5E] active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPlan;
