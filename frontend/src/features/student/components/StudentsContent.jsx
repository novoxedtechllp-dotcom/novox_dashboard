import { useState, useMemo, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { GraduationCap, Phone, Plus, X, Upload, User, Trash2, MapPin, FileText, Briefcase, ListTodo, CheckCircle, Eye, EyeOff, Search, Pencil, Mail, GitBranch, Camera, Terminal, Calendar, IndianRupee, CreditCard, BookOpen, AlertCircle, Link as LinkIcon } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import CloudinaryPdfViewer from '../../../components/CloudinaryPdfViewer';

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
  if (!response.ok) {
    throw new Error(data.message || 'Student request failed');
  }
  return data;
};

const StudentsContent = ({ searchQuery = '', setSearchQuery = () => {}, courses = [] }) => {
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
  const isAdmin = userInfo?.role === 'ADMIN';

  const [toast, setToast] = useState(null);
  const alert = (message) => {
    const isError = typeof message === 'string' && (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error'));
    setToast({ message, type: isError ? 'error' : 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const [students, setStudents] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  const [studentDocuments, setStudentDocuments] = useState([]);
  const [studentTasks, setStudentTasks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [courseToRemove, setCourseToRemove] = useState(null);
  
  // "View Details" Modal State
  const [activeStudent, setActiveStudent] = useState(null);
  const [detailsTab, setDetailsTab] = useState('overview'); // overview, courses, documents, tasks
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [currentDocUrl, setCurrentDocUrl] = useState(null);
  // Filter States
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', email: '', password: '', phone: '', parent_phone: '', guardian_name: '', address: '', joining_date: '', course_ids: [], avatarUrl: null
  });

  const [newStudentDocuments, setNewStudentDocuments] = useState([]);

  const addNewStudentDocument = () => {
    setNewStudentDocuments([...newStudentDocuments, { type: '', file: null }]);
  };

  const updateNewStudentDocument = (idx, field, value) => {
    const updated = [...newStudentDocuments];
    updated[idx][field] = value;
    setNewStudentDocuments(updated);
  };

  const removeNewStudentDocument = (idx) => {
    setNewStudentDocuments(newStudentDocuments.filter((_, i) => i !== idx));
  };

  const [newEnrollment, setNewEnrollment] = useState('');
  const [payInitialFee, setPayInitialFee] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('All Students');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [studentFees, setStudentFees] = useState({});

  const fetchStudents = useCallback(async (currentOwnershipFilter, currentDepartmentFilter) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setLoading(false);
        return;
      }

      let url = '/api/v1/students?limit=1000';
      if (currentOwnershipFilter === 'My Students') {
        const profRes = await fetch('/api/v1/profile/me', { headers });
        const profData = await profRes.json();
        const empId = profData?.data?.employeeProfile?.id;
        if (empId) {
          url += `&instructorId=${empId}`;
        }
      }
      
      if (currentDepartmentFilter && currentDepartmentFilter !== 'All Departments') {
        url += (url.includes('?') ? '&' : '?') + `department=${currentDepartmentFilter}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Students API error: ${response.status}`);
      const resData = await response.json();
      if (response.ok) {
        const studentsList = resData.data?.students || resData.data || [];
        const mappedData = studentsList.map(d => ({
          id: d.id || d._id,
          student_code: d.student_code || d.sid || `STD-${Math.floor(Math.random()*1000)}`,
          first_name: d.first_name || (d.name ? d.name.split(' ')[0] : 'Unknown'),
          last_name: d.last_name || (d.name ? d.name.split(' ')[1] || '' : ''),
          phone: d.phone || '',
          parent_phone: d.parent_phone || '',
          address: d.address || 'N/A',
          joining_date: d.joining_date || new Date().toISOString().split('T')[0],
          status: d.status || 'ACTIVE',
          avatar: d.avatar_url || null,
          email: d.users?.email || '',
          courses_count: d.student_courses ? d.student_courses.length : 0
        }));
        setStudents(mappedData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentBalances = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch('/api/v1/fees/balances', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          // Group by studentId and sum up balances across courses
          const balanceMap = {};
          (data.data || []).forEach(b => {
            if (!balanceMap[b.studentId]) {
              balanceMap[b.studentId] = { totalFees: 0, totalPaid: 0, remainingBalance: 0 };
            }
            balanceMap[b.studentId].totalFees += (b.totalCourseFee || 0);
            balanceMap[b.studentId].totalPaid += (b.totalPaidOverall || 0);
            balanceMap[b.studentId].remainingBalance += (b.remainingBalance || 0);
          });
          setStudentFees(balanceMap);
        }
      }
    } catch (e) {
      console.error('Error fetching student balances:', e);
    }
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => { fetchStudents(ownershipFilter, departmentFilter); }, 0);
    fetchStudentBalances();
    return () => clearTimeout(loadTimer);
  }, [fetchStudents, ownershipFilter, departmentFilter, fetchStudentBalances]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (activeStudent || isAddModalOpen || isEditStudentOpen || studentToDelete || documentToDelete || courseToRemove) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [activeStudent, isAddModalOpen, isEditStudentOpen, studentToDelete, documentToDelete, courseToRemove]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewStudent({ ...newStudent, avatarUrl: previewUrl });
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const headers = getAuthHeaders();
        delete headers['Content-Type'];
        
        const response = await fetch('/api/v1/upload', { method: 'POST', headers, body: formData });
        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Upload failed');
        }
        if (resData.data?.url) {
          setNewStudent(prev => ({ ...prev, avatarUrl: resData.data.url }));
        }
      } catch (err) {
        console.error('Upload failed', err);
        setNewStudent(prev => ({ ...prev, avatarUrl: null }));
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (isUploading) {
      alert('Please wait for the image to finish uploading before saving.');
      return;
    }
    if (!newStudent.first_name || !newStudent.email || !newStudent.phone) {
      alert("Name, email, and phone number are mandatory for enrolling a student.");
      return;
    }
    if (newStudent.phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (newStudent.parent_phone && newStudent.parent_phone.length !== 10) {
      alert("Parent phone number must be exactly 10 digits.");
      return;
    }
    try {
      setIsSubmitting(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const payload = {
        first_name: newStudent.first_name, last_name: newStudent.last_name, phone: newStudent.phone, parent_phone: newStudent.parent_phone,
        guardian_name: newStudent.guardian_name,
        address: newStudent.address, joining_date: newStudent.joining_date || new Date().toISOString().split('T')[0],
        avatar_url: (newStudent.avatarUrl && !newStudent.avatarUrl.startsWith('blob:')) ? newStudent.avatarUrl : null
      };
      if (newStudent.email) payload.email = newStudent.email;
      if (newStudent.password) payload.password = newStudent.password;
      if (newStudent.course_ids && newStudent.course_ids.length > 0) payload.course_ids = newStudent.course_ids;

      const response = await fetch('/api/v1/students', { method: 'POST', headers, body: JSON.stringify(payload) });
      const resData = await parseApiResponse(response);
      const addedStudent = { ...resData.data, avatar: resData.data?.avatar_url || resData.data?.avatar || newStudent.avatarUrl };
      setStudents([addedStudent, ...students]);
      setIsAddModalOpen(false);
      setNewStudent({ first_name: '', last_name: '', email: '', password: '', phone: '', parent_phone: '', guardian_name: '', address: '', joining_date: '', course_ids: [], avatarUrl: null });
    } catch (error) {
      console.error('Error adding student:', error);
      alert(error.message || 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!studentToEdit.first_name || !studentToEdit.phone) {
      alert("Please fill all required fields (Name and Phone).");
      return;
    }
    if (studentToEdit.phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (studentToEdit.parent_phone && studentToEdit.parent_phone.length !== 10) {
      alert("Parent phone number must be exactly 10 digits.");
      return;
    }
    try {
      setIsSubmitting(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const payload = {
        first_name: studentToEdit.first_name,
        last_name: studentToEdit.last_name,
        phone: studentToEdit.phone,
        email: studentToEdit.email,
        parent_phone: studentToEdit.parent_phone,
        guardian_name: studentToEdit.guardian_name,
        address: studentToEdit.address,
        joining_date: studentToEdit.joining_date,
        course_id: studentToEdit.course_id,
        status: studentToEdit.status || 'ACTIVE',
        avatar_url: (studentToEdit.avatarUrl && !studentToEdit.avatarUrl.startsWith('blob:')) ? studentToEdit.avatarUrl : null
      };
      if (studentToEdit.password) payload.password = studentToEdit.password;
      if (studentToEdit.course_id) payload.course_id = studentToEdit.course_id;

      const response = await fetch(`/api/v1/students/${studentToEdit.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const resData = await parseApiResponse(response);
      setStudents(students.map(s => s.id === studentToEdit.id ? { ...s, ...payload, avatar: resData.data?.avatar_url || resData.data?.avatar || studentToEdit.avatarUrl } : s));
      setIsEditStudentOpen(false);
      setStudentToEdit(null);
      alert('Student updated successfully!');
    } catch (error) {
      console.error('Error updating student:', error);
      alert(error.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      setIsDeleting(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`/api/v1/students/${id}`, { method: 'DELETE', headers });
      await parseApiResponse(response);
      setStudents(students.filter(s => s.id !== id));
      setStudentCourses(studentCourses.filter(sc => sc.student_id !== id));
      setStudentDocuments(studentDocuments.filter(sd => sd.student_id !== id));
      setStudentTasks(studentTasks.filter(st => st.student_id !== id));
      setStudentToDelete(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      alert(error.message || 'Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchStudentSubResources = async (studentId) => {
    try {
      setIsFetchingDetails(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const [progressResponse, documentsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/v1/students/${studentId}/progress`, { headers }),
        fetch(`/api/v1/students/${studentId}/documents`, { headers }),
        fetch(`/api/v1/students/${studentId}/tasks`, { headers })
      ]);
      const progressData = await parseApiResponse(progressResponse);
      const documentsData = await parseApiResponse(documentsResponse);
      const tasksData = await parseApiResponse(tasksResponse);
      setStudentCourses(prev => [ ...prev.filter(sc => sc.student_id !== studentId), ...(progressData.data || []).map(sc => ({ ...sc, student_id: studentId })) ]);
      setStudentDocuments(prev => [ ...prev.filter(sd => sd.student_id !== studentId), ...(documentsData.data || []).map(sd => ({ ...sd, student_id: studentId })) ]);
      setStudentTasks(prev => [ ...prev.filter(st => st.student_id !== studentId), ...(tasksData.data || []).map(st => ({ ...st, student_id: studentId })) ]);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const openStudentDetails = (student) => {
    setActiveStudent(student);
    setDetailsTab('overview');
    fetchStudentSubResources(student.id);
  };

  const handleEnrollCourse = async () => {
    if (!newEnrollment || !activeStudent) return;
    try {
      setIsEnrolling(true);
      const headers = getAuthHeaders();
      const response = await fetch(`/api/v1/students/${activeStudent.id}/courses`, { method: 'POST', headers, body: JSON.stringify({ course_id: newEnrollment }) });
      const resData = await response.json();
      if (response.ok) {
        setStudentCourses([...studentCourses, { ...resData.data, student_id: activeStudent.id }]);
        
        // Record the initial ₹5,000 fee locally
        const courseData = courses.find(c => c.id === newEnrollment);
        const courseName = courseData?.title || courseData?.name || 'Unknown Course';
        const feeId = 'FEE-' + Math.floor(1000 + Math.random() * 9000);
        
        const newFeeRecord = {
          id: feeId,
          studentId: activeStudent.id,
          name: `${activeStudent.first_name} ${activeStudent.last_name}`.trim(),
          initials: `${activeStudent.first_name?.[0] || ''}${activeStudent.last_name?.[0] || ''}`.toUpperCase(),
          course: courseName,
          type: 'Full',
          amount: '₹5,000',
          numericAmount: 5000,
          totalAmount: 5000,
          paidAmount: payInitialFee ? 5000 : 0,
          remainingBalance: payInitialFee ? 0 : 5000,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: new Date().toISOString(),
          status: payInitialFee ? 'Paid' : 'Pending',
          statusColor: payInitialFee ? 'green' : 'red'
        };

        const existingFees = JSON.parse(localStorage.getItem('novox_student_fees') || '[]');
        const updatedFees = [newFeeRecord, ...existingFees];
        localStorage.setItem('novox_student_fees', JSON.stringify(updatedFees));
        setStudentFees(updatedFees);
        
        setNewEnrollment('');
        setPayInitialFee(false);
        alert('Course enrolled and initial fee recorded successfully!');
      } else {
        alert(resData.message || 'Failed to enroll course');
      }
    } catch (error) {
      console.error('Error enrolling course:', error);
      alert(error.message || 'Failed to enroll course');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!courseToRemove) return;
    try {
      setIsDeleting(true);
      const headers = getAuthHeaders();
      const response = await fetch(`/api/v1/students/${courseToRemove.studentId}/courses/${courseToRemove.courseId}`, { method: 'DELETE', headers });
      if (response.ok) {
        setStudentCourses(studentCourses.filter(sc => !(sc.student_id === courseToRemove.studentId && sc.course_id === courseToRemove.courseId)));
        setCourseToRemove(null);
      } else {
        alert("Failed to remove course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if(!documentToDelete) return;
    try {
      setIsDeleting(true);
      const headers = getAuthHeaders();
      const response = await fetch(`/api/v1/students/${documentToDelete.student_id}/documents/${documentToDelete.id}`, { method: 'DELETE', headers });
      if (response.ok) {
        setStudentDocuments(studentDocuments.filter(sd => sd.id !== documentToDelete.id));
        setDocumentToDelete(null);
      } else {
        alert("Failed to delete document");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddDocument = async () => {
    if(!newDocName || !selectedDocFile) { alert("Please select a document type and a file to upload."); return; }
    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', selectedDocFile);
      const headers = getAuthHeaders();
      let uploadHeaders = { ...headers };
      delete uploadHeaders['Content-Type'];
      const uploadRes = await fetch('/api/v1/upload', { method: 'POST', headers: uploadHeaders, body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.data?.url) throw new Error(uploadData.message || 'File upload failed');

      const response = await fetch(`/api/v1/students/${activeStudent.id}/documents`, { method: 'POST', headers, body: JSON.stringify({ document_type: newDocName, document_url: uploadData.data.url }) });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || 'Failed to add document');

      setStudentDocuments([...studentDocuments, { ...resData.data, student_id: activeStudent.id }]);
      setNewDocName('');
      setSelectedDocFile(null);
    } catch (error) {
      console.error('Error adding document:', error);
      alert(error.message || 'Failed to add document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, currentStatus, newGrade, newFeedback) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      let payload = {};
      if (newGrade !== undefined) {
        payload = { status: 'GRADED', grade: newGrade, feedback: newFeedback };
      } else if (currentStatus === 'PENDING') {
        payload = { status: 'SUBMITTED', submission_url: 'https://example.com/submission' };
      }
      const response = await fetch(`/api/v1/students/${activeStudent.id}/tasks/${taskId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const resData = await parseApiResponse(response);
      setStudentTasks(studentTasks.map(t => t.id === taskId ? { ...t, ...resData.data } : t));
    } catch (error) {
      console.error('Error updating task:', error);
      alert(error.message || 'Failed to update task');
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const matchSearch = searchQuery.trim() === '' ? true : (() => {
        const term = searchQuery.toLowerCase();
        const nameWords = fullName.split(/\s+/);
        const matchesName = nameWords.some(word => word.startsWith(term));
        const matchesCode = student.student_code.toLowerCase().startsWith(term);
        const matchesPhone = student.phone && student.phone.includes(searchQuery);
        return matchesName || matchesCode || matchesPhone;
      })();
      
      if (searchQuery.trim() !== '') {
        return matchSearch; // Ignore other filters when searching
      }

      const matchStatus = statusFilter === 'All Statuses' || student.status === statusFilter;
      // Note: If you want to also apply courseFilter or ownershipFilter locally, add them here.
      return matchStatus && matchSearch;
    });
  }, [students, statusFilter, searchQuery]);

  const uniqueStatuses = ['All Statuses', 'ACTIVE', 'INACTIVE'];

  const getStatusColor = (status) => {
    if(status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if(status === 'INACTIVE') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusDotColor = (status) => {
    if(status === 'ACTIVE') return 'bg-emerald-500';
    if(status === 'INACTIVE') return 'bg-rose-500';
    return 'bg-slate-400';
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 w-full relative bg-[#FAFBFC] min-h-full">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[9999] px-6 py-4 rounded-xl shadow-2xl font-bold text-sm transform transition-all duration-300 flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.type === 'error' ? <X size={18} /> : <CheckCircle size={18} className="text-green-400" />}
          {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Student Management</h1>
        <p className="text-slate-500 mt-1">Manage enrollments, track performance, and maintain student records.</p>
      </div>

      {/* Top Header / Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
  <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start xl:items-center">

    {/* Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {/* Status Filter */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all w-full min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          Status
        </span>

        <div className="flex-1 min-w-0">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={uniqueStatuses.map((s) => ({
              value: s,
              label: s,
            }))}
            className="w-full"
            selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
      </div>

      {/* Department Filter */}
      {isAdmin && (
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all w-full min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
            Department
          </span>

          <div className="flex-1 min-w-0">
            <CustomSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                {
                  value: "All Departments",
                  label: "All Departments",
                },
                {
                  value: "DEVELOPMENT",
                  label: "Development",
                },
                {
                  value: "MARKETING",
                  label: "Marketing",
                },
                {
                  value: "DESIGN",
                  label: "Design",
                },
              ]}
              className="w-full"
              selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700"
            />
          </div>
        </div>
      )}

      {/* Ownership Filter */}
      {!isAdmin && (
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all w-full min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
            Ownership
          </span>

          <div className="flex-1 min-w-0">
            <CustomSelect
              value={ownershipFilter}
              onChange={setOwnershipFilter}
              options={[
                {
                  value: "All Students",
                  label: "All Students",
                },
                {
                  value: "My Students",
                  label: "My Students",
                },
              ]}
              className="w-full"
              selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700"
            />
          </div>
        </div>
      )}
    </div>

    {/* Add Student Button */}
    <div className="w-full xl:w-auto">
      <button
        onClick={() => {
          setNewStudent({
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            phone: "",
            parent_phone: "",
            guardian_name: "",
            address: "",
            joining_date: new Date().toISOString().split("T")[0],
            course_ids: [],
            avatarUrl: null,
          });

          setNewStudentDocuments([]);
          setIsAddModalOpen(true);
        }}
        className="
          w-full
          sm:w-full
          md:w-full
          lg:w-auto
          xl:w-auto
          min-h-[48px]
          px-6
          py-3
          rounded-xl
          bg-[#003F87]
          text-white
          font-semibold
          text-sm
          flex
          items-center
          justify-center
          gap-2
          hover:bg-[#002B5E]
          transition-all
          duration-300
          shadow-md
          active:scale-95
          whitespace-nowrap
        "
      >
        <Plus size={18} />
        Add New Student
      </button>
    </div>

  </div>
</div>

      {/* Grid Container */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <LoadingSpinner text="Fetching Students..." />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Enroll Card */}
        <button 
          onClick={() => {
            setNewStudent({
              first_name: '', last_name: '', email: '', password: '', phone: '', parent_phone: '', guardian_name: '', address: '', joining_date: new Date().toISOString().split('T')[0], course_ids: [], avatarUrl: null
            });
            setNewStudentDocuments([]);
            setIsAddModalOpen(true);
          }}
          className="bg-transparent rounded-[24px] border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group min-h-[260px]"
        >
          <div className="w-14 h-14 rounded-[16px] bg-white shadow-sm text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#003F87] group-hover:text-white transition-all duration-300 border border-slate-100">
            <Plus size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">Enroll Student</h3>
          <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">Click here to register a new student profile in the system.</p>
        </button>

        {filteredStudents.map(student => {
          const studentEnrolledCourses = studentCourses.filter(sc => sc.student_id === student.id);
          
          return (
            <div key={student.id} onClick={() => openStudentDetails(student)} className="cursor-pointer bg-white rounded-[24px] border border-slate-100/60 flex flex-col relative group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 overflow-hidden min-h-[260px]">
              
              {/* Floating Status Badge */}
              <div className={`absolute top-6 right-6 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusColor(student.status)}`}>
                {student.status}
              </div>

              {/* Main Content Area */}
              <div className="p-6 relative flex flex-col h-full">
                
                {/* Profile Header */}
                <div className="flex flex-col mb-auto">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="w-full h-full rounded-[16px] overflow-hidden bg-slate-100 flex items-center justify-center shadow-inner">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.first_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#003F87] font-black text-2xl">{student.first_name[0]}{student.last_name[0]}</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-[3px] border-white rounded-full shadow-sm ${getStatusDotColor(student.status)}`}></div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1.5 mt-1">
                    <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                      {student.student_code}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 leading-tight tracking-tight truncate pr-2 mb-1">{student.first_name} {student.last_name}</h3>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Phone size={14} className="text-slate-400" /> <span className="truncate">{student.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <GraduationCap size={14} className="text-slate-400" /> <span>{Math.max(student.courses_count || 0, studentEnrolledCourses.length)} Courses</span>
                    </div>
                    {studentFees[student.id] && studentFees[student.id].remainingBalance > 0 && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                        <IndianRupee size={14} className="text-rose-400" /> 
                        <span className="text-rose-600 font-bold">
                          Balance: ₹{(studentFees[student.id]?.remainingBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-slate-50/50 mt-auto flex items-center gap-2 border-t border-slate-50">
                <button 
                  onClick={(e) => { e.stopPropagation(); openStudentDetails(student); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[10px] xl:text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-3 rounded-[12px] transition-all"
                >
                  <FileText size={14} /> Full Details
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setStudentToEdit({...student, avatarUrl: student.avatar}); setIsEditStudentOpen(true); }}
                  className="flex shrink-0 items-center justify-center w-12 h-10 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-600 rounded-[12px] transition-all"
                  title="Edit Student"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setStudentToDelete(student.id); }}
                  className="flex shrink-0 items-center justify-center w-12 h-10 text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 rounded-[12px] transition-all"
                  title="Remove Student"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          );
        })}

      </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Enroll New Student</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Fill out the details below to register a new student.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddStudent} className="p-8 flex flex-col gap-8 overflow-y-auto bg-slate-50/50">
              
              {/* Profile Photo */}
              <div className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {newStudent.avatarUrl ? (
                    <img src={newStudent.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload size={20} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 mb-1">Student Photo</h3>
                  <p className="text-sm font-medium text-slate-500">Upload a clear passport-sized photo. JPG, PNG (Max 2MB).</p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2"><User size={16} className="text-[#003F87]" /> Personal Details</h3>
                
                {/* Line 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                    <input type="text" required value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name</label>
                    <input type="text" value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="Doe" />
                  </div>
                </div>

                {/* Line 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Student Phone *</label>
                    <input type="text" maxLength={10} required value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Parent/Guardian Phone</label>
                    <input type="text" maxLength={10} value={newStudent.parent_phone} onChange={(e) => setNewStudent({...newStudent, parent_phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="9876543210" />
                  </div>
                </div>

                {/* Line 3 & 4 */}
                <div className="grid grid-cols-1 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Guardian Name</label>
                    <input type="text" value={newStudent.guardian_name} onChange={(e) => setNewStudent({...newStudent, guardian_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Address</label>
                    <textarea rows="2" value={newStudent.address} onChange={(e) => setNewStudent({...newStudent, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all resize-none" placeholder="123 Education St, City, Country" />
                  </div>
                </div>
              </div>

              {/* Account Setup */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2"><Briefcase size={16} className="text-[#003F87]" /> Account & Enrollment Setup</h3>
                
                <div className="grid grid-cols-1 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                    <input type="email" required value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" placeholder="student@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={newStudent.password} 
                        onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all pr-12" 
                        placeholder="Auto-generated if blank" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Joining Date</label>
                    <input type="date" value={newStudent.joining_date} onChange={(e) => setNewStudent({...newStudent, joining_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Courses</label>
                  <div className="w-full max-h-[120px] overflow-y-auto px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl custom-scrollbar flex flex-wrap gap-2">
                    {courses.length === 0 ? (
                      <p className="text-sm text-slate-500 px-2 py-1">No courses available.</p>
                    ) : (
                      courses.map(c => (
                        <label key={c.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-white px-3 rounded-md transition-colors bg-white border border-slate-200">
                          <input 
                            type="checkbox" 
                            checked={newStudent.course_ids.includes(c.id)}
                            onChange={(e) => {
                              const newCourseIds = e.target.checked 
                                ? [...newStudent.course_ids, c.id]
                                : newStudent.course_ids.filter(id => id !== c.id);
                              setNewStudent({...newStudent, course_ids: newCourseIds});
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#003F87] focus:ring-[#003F87]"
                          />
                          <span className="text-sm font-bold text-slate-700">{c.title || c.name} <span className="font-normal text-xs text-slate-400 ml-1">({c.category || 'Course'})</span></span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Documents */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2"><FileText size={16} className="text-[#003F87]" /> Initial Documents (Optional)</h3>
                
                <div className="space-y-4">
                  {newStudentDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-end gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 relative group">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Document Type</label>
                        <select 
                          value={doc.type}
                          onChange={(e) => updateNewStudentDocument(idx, 'type', e.target.value)}
                          className="w-full px-4 h-[44px] bg-white border border-slate-200 rounded-lg outline-none focus:border-[#003F87] text-sm font-medium text-slate-700"
                        >
                          <option value="">Select Type...</option>
                          <option value="ID Proof">ID Proof</option>
                          <option value="Address Proof">Address Proof</option>
                          <option value="Previous Education">Previous Education Certificate</option>
                          <option value="Other">Other Document</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">File</label>
                        <input 
                          type="file" 
                          onChange={(e) => updateNewStudentDocument(idx, 'file', e.target.files[0])}
                          className="w-full h-[44px] text-sm text-slate-500 file:mr-4 file:h-full file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#E5F0FF] file:text-[#003F87] hover:file:bg-[#d0e3ff] cursor-pointer bg-white border border-slate-200 rounded-lg p-1"
                        />
                      </div>
                      <button type="button" onClick={() => removeNewStudentDocument(idx)} className="h-[44px] w-[44px] flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addNewStudentDocument}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#003F87] bg-[#E5F0FF] rounded-lg hover:bg-[#d0e3ff] transition-colors w-max"
                  >
                    <Plus size={16} /> Add Document
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-[12px] mt-[24px]">
                <button className="px-[20px] py-[10px] text-[#555F6B] font-bold text-[14px] hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button className={`px-[20px] py-[10px] bg-[#003F87] text-white font-bold text-[14px] rounded-lg transition-colors ${isUploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002b5c]'}`} onClick={handleAddStudent} disabled={isUploading || isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditStudentOpen && studentToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsEditStudentOpen(false)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center rotate-3">
                  <Pencil size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">Edit Student</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Update student information</p>
                </div>
              </div>
              <button onClick={() => setIsEditStudentOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-8 flex flex-col gap-8 overflow-y-auto bg-slate-50/50">
              <div className="flex items-center gap-8">


                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">First Name *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                      <input required type="text" placeholder="e.g. John" value={studentToEdit.first_name} onChange={e => setStudentToEdit({...studentToEdit, first_name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Last Name</label>
                    <input type="text" placeholder="e.g. Doe" value={studentToEdit.last_name} onChange={e => setStudentToEdit({...studentToEdit, last_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email *</label>
                    <input required type="email" placeholder="e.g. john@example.com" value={studentToEdit.email} onChange={e => setStudentToEdit({...studentToEdit, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Phone *</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={18} /></div>
                    <input required type="tel" maxLength={10} placeholder="9876543210" value={studentToEdit.phone} onChange={e => setStudentToEdit({...studentToEdit, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Parent Phone</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={18} /></div>
                    <input type="tel" maxLength={10} placeholder="9876543210" value={studentToEdit.parent_phone} onChange={e => setStudentToEdit({...studentToEdit, parent_phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Guardian Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                    <input type="text" placeholder="Optional" value={studentToEdit.guardian_name || ''} onChange={e => setStudentToEdit({...studentToEdit, guardian_name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all" />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-3 lg:col-span-4">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4 text-slate-400"><MapPin size={18} /></div>
                    <textarea placeholder="Full residential address" value={studentToEdit.address} onChange={e => setStudentToEdit({...studentToEdit, address: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all min-h-[100px] resize-none" />
                  </div>
                </div>
              </div>



              <div className="flex gap-4 justify-end mt-2">
                <button type="button" onClick={() => setIsEditStudentOpen(false)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={`px-8 py-3 bg-[#003F87] rounded-xl text-sm font-bold text-white shadow-md shadow-blue-900/10 active:scale-95 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002B5E]'}`}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setStudentToDelete(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Remove Student?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to completely remove this student profile? This will delete all their records and cannot be undone.</p>
              
              <div className="flex w-full gap-3">
              <button onClick={() => setStudentToDelete(null)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex-1">
                Cancel
              </button>
              <button onClick={() => handleDeleteStudent(studentToDelete)} disabled={isDeleting} className={`px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex-1 ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}>
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirm Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setDocumentToDelete(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Delete Document?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this document? This action cannot be undone.</p>
              <div className="flex w-full gap-3">
                <button onClick={() => setDocumentToDelete(null)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex-1">Cancel</button>
                <button onClick={handleDeleteDocument} disabled={isDeleting} className={`px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex-1 ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Course Confirm Modal */}
      {courseToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setCourseToRemove(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Remove Course?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to remove this course from the student?</p>
              <div className="flex w-full gap-3">
                <button onClick={() => setCourseToRemove(null)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex-1">Cancel</button>
                <button onClick={handleRemoveCourse} disabled={isDeleting} className={`px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex-1 ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}>{isDeleting ? 'Removing...' : 'Remove'}</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* View Details Command Center Modal */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200" onClick={() => setActiveStudent(null)}>
          <div className="bg-[#FAFBFC] rounded-3xl shadow-2xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header - Elegant & Clean */}
            <div className="bg-white px-8 py-8 border-b border-slate-100 flex items-start justify-between shrink-0 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {activeStudent.avatar ? (
                    <img src={activeStudent.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#003F87] font-black text-3xl">{activeStudent.first_name[0]}{activeStudent.last_name[0]}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeStudent.first_name} {activeStudent.last_name}</h2>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest ${activeStudent.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {activeStudent.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-slate-400"><Briefcase size={10} /></span> ID: <span className="text-slate-800 font-bold">{activeStudent.student_code}</span></div>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <div>Joined <span className="text-slate-800 font-bold">{new Date(activeStudent.joining_date).toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>

              <button onClick={() => setActiveStudent(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors relative z-10">
                <X size={20} />
              </button>
            </div>

            {/* Modern Pill Navigation Tabs */}
            <div className="px-8 py-6 border-b border-slate-100 bg-white shrink-0 overflow-x-auto hide-scrollbar">
              <div className="flex gap-2">
                {[
                  { id: 'overview', icon: <User size={16} />, label: 'Overview', count: null },
                  { id: 'courses', icon: <GraduationCap size={16} />, label: 'Enrollments', count: studentCourses.filter(c => c.student_id === activeStudent.id).length },
                  { id: 'documents', icon: <FileText size={16} />, label: 'Documents', count: studentDocuments.filter(d => d.student_id === activeStudent.id).length },
                  { id: 'tasks', icon: <ListTodo size={16} />, label: 'Tasks', count: studentTasks.filter(t => t.student_id === activeStudent.id).length }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id)} 
                    className={`
                      px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all whitespace-nowrap
                      ${detailsTab === tab.id 
                        ? 'bg-[#003F87] text-white shadow-md shadow-blue-900/10' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }
                    `}
                  >
                    {tab.icon} {tab.label}
                    {tab.count !== null && (
                      <span className={`px-2 py-0.5 rounded text-[10px] ${detailsTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content Area */}
            <div className="p-8 overflow-y-auto flex-1">
              
              {/* Overview Tab */}
              {detailsTab === 'overview' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPin size={18} className="text-[#003F87]" /> Contact Information</h3>
                      <div className="space-y-5">
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Phone size={18} /></div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Phone</div>
                            <div className="text-[15px] font-bold text-slate-800">{activeStudent.phone || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0"><Mail size={18} /></div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</div>
                            <div className="text-[15px] font-bold text-slate-800">{activeStudent.email || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0"><Phone size={18} /></div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent/Guardian Phone</div>
                            <div className="text-[15px] font-bold text-slate-800">{activeStudent.parent_phone || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start pt-2 border-t border-slate-50">
                          <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Address</div>
                            <div className="text-[14px] font-medium text-slate-700 leading-relaxed">{activeStudent.address || 'No address provided'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Briefcase size={18} className="text-[#003F87]" /> Account Status</h3>
                      <div className="space-y-5">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</div>
                          <div className="text-[15px] font-mono font-bold text-slate-800">{activeStudent.student_code}</div>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Joining Date</div>
                          <div className="text-[15px] font-bold text-slate-800">{new Date(activeStudent.joining_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</div>
                          <div className="text-[15px] font-bold text-[#008A2E]">{activeStudent.status}</div>
                        </div>
                        {(() => {
                          const feeData = studentFees[activeStudent.id];
                          const totalFeesRequired = feeData?.totalFees || 0;
                          const totalFeesPaid = feeData?.totalPaid || 0;
                          const remainingBalance = feeData?.remainingBalance || 0;
                          
                          return (
                            <>
                              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fees</div>
                                <div className="text-[15px] font-bold text-slate-800">₹{totalFeesRequired.toLocaleString('en-IN')}</div>
                              </div>
                              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
                                <div className="text-[15px] font-bold text-emerald-600">₹{totalFeesPaid.toLocaleString('en-IN')}</div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</div>
                                <div className="text-[15px] font-bold text-rose-600">₹{remainingBalance.toLocaleString('en-IN')}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm md:col-span-2">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><GitBranch size={18} className="text-[#003F87]" /> Social Profiles</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* GitHub */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-2 text-slate-700">
                            <GitBranch size={16} /> <span className="text-xs font-bold uppercase tracking-wider">GitHub</span>
                          </div>
                          {(() => {
                            const link = JSON.parse(localStorage.getItem(`student_social_links_${activeStudent.id}`) || '{}').github;
                            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#003F87] hover:underline truncate">{link.replace('https://', '').replace('http://', '')}</a> : <span className="text-sm text-slate-400 font-medium">Not Provided</span>;
                          })()}
                        </div>
                        {/* LinkedIn */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-2 text-[#0A66C2]">
                            <Briefcase size={16} /> <span className="text-xs font-bold uppercase tracking-wider">LinkedIn</span>
                          </div>
                          {(() => {
                            const link = JSON.parse(localStorage.getItem(`student_social_links_${activeStudent.id}`) || '{}').linkedin;
                            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#003F87] hover:underline truncate">{link.replace('https://', '').replace('http://', '')}</a> : <span className="text-sm text-slate-400 font-medium">Not Provided</span>;
                          })()}
                        </div>
                        {/* Leetcode */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-2 text-orange-500">
                            <Terminal size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Leetcode</span>
                          </div>
                          {(() => {
                            const link = JSON.parse(localStorage.getItem(`student_social_links_${activeStudent.id}`) || '{}').leetcode;
                            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#003F87] hover:underline truncate">{link.replace('https://', '').replace('http://', '')}</a> : <span className="text-sm text-slate-400 font-medium">Not Provided</span>;
                          })()}
                        </div>
                        {/* Instagram */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-2 text-pink-600">
                            <Camera size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Instagram</span>
                          </div>
                          {(() => {
                            const link = JSON.parse(localStorage.getItem(`student_social_links_${activeStudent.id}`) || '{}').instagram;
                            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#003F87] hover:underline truncate">{link.replace('https://', '').replace('http://', '')}</a> : <span className="text-sm text-slate-400 font-medium">Not Provided</span>;
                          })()}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Courses Tab */}
              {detailsTab === 'courses' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 fade-in">
                  {isFetchingDetails ? (
                    <div className="flex flex-col items-center justify-center py-24"><LoadingSpinner /><p className="text-slate-500 font-medium mt-4 text-sm">Loading courses...</p></div>
                  ) : (
                    <>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Enroll Student in a New Course</label>
                      <CustomSelect 
                        value={newEnrollment}
                        onChange={setNewEnrollment}
                        placeholder="Select an available course..."
                        options={courses.map(c => ({ value: c.id, label: `${c.title || c.name} (${c.category || 'Course'})` }))}
                        className="w-full"
                        selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all"
                      />
                      {newEnrollment && (
                        <div className="mt-3 flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <input 
                            type="checkbox" 
                            id="payInitialFee" 
                            checked={payInitialFee}
                            onChange={(e) => setPayInitialFee(e.target.checked)}
                            className="w-4 h-4 text-[#003F87] rounded border-blue-300 focus:ring-[#003F87]"
                          />
                          <label htmlFor="payInitialFee" className="text-sm font-bold text-[#003F87] cursor-pointer">
                            Mark initial ₹5,000 enrollment fee as Paid
                          </label>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={handleEnrollCourse}
                      disabled={!newEnrollment || isEnrolling}
                      className="w-full md:w-auto px-8 py-3 bg-[#003F87] text-white rounded-xl text-sm font-bold hover:bg-[#002B5E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                      {isEnrolling ? 'Enrolling...' : <><Plus size={18} /> Enroll Now</>}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest px-2">Active Enrollments</h3>
                    {studentCourses.filter(sc => sc.student_id === activeStudent.id).length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <GraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700">No Courses Yet</h4>
                        <p className="text-sm text-slate-500 mt-1">Enroll this student in a course using the section above.</p>
                      </div>
                    ) : (
                      studentCourses.filter(sc => sc.student_id === activeStudent.id).map(sc => {
                        const courseData = courses.find(c => c.id === sc.course_id);
                        const storedFeesStr = localStorage.getItem('novox_student_fees');
                        let coursePaid = 0;
                        if (storedFeesStr) {
                          const allFees = JSON.parse(storedFeesStr);
                          const courseFees = allFees.filter(f => f.studentId === activeStudent.id && f.courseId === sc.course_id);
                          coursePaid = courseFees.reduce((sum, f) => sum + (Number(f.paidAmount) || parseInt(String(f.amount).replace(/[^0-9]/g, ''), 10) || 0), 0);
                        }
                        const courseTotal = parseInt(String(courseData?.price || '0').replace(/[^0-9]/g, ''), 10) || 0;
                        const courseBalance = Math.max(0, courseTotal - coursePaid);

                        return (
                          <div key={sc.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-6 group">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-blue-50 text-[#003F87] rounded-xl flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-[#003F87] group-hover:text-white transition-colors">
                                <GraduationCap size={24} />
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-slate-900">{courseData?.title || courseData?.name || sc.courses?.name || 'Unknown Course'}</h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
                                  <span>Enrolled: {new Date(sc.enrolled_at).toLocaleDateString()}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className={`${sc.completion_status === 'IN_PROGRESS' ? 'text-amber-600' : sc.completion_status === 'COMPLETED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {sc.completion_status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-19 md:pl-0 border-t border-slate-50 pt-4 md:pt-0 md:border-0">
                              <div className="flex flex-col gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</div>
                                    <span className="text-xs font-black text-[#003F87]">{sc.progress_percentage}%</span>
                                  </div>
                                  <div className="w-full md:w-40 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-[#003F87] rounded-full" style={{ width: `${sc.progress_percentage}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Fee</span>
                                    <span className="text-xs font-bold text-slate-700">₹{courseTotal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance</span>
                                    <span className="text-xs font-bold text-rose-500">₹{courseBalance.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => setCourseToRemove({ studentId: activeStudent.id, courseId: sc.course_id })} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500 rounded-full transition-all shrink-0 bg-slate-50" title="Remove Course">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {detailsTab === 'documents' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 fade-in">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Document Type</label>
                        <CustomSelect 
                          value={newDocName}
                          onChange={setNewDocName}
                          placeholder="Select type..."
                          options={[
                            { value: 'ID Proof', label: 'ID Proof' },
                            { value: 'Previous Marksheet', label: 'Previous Marksheet' },
                            { value: 'Enrollment Agreement', label: 'Enrollment Agreement' },
                            { value: 'Other', label: 'Other' }
                          ]}
                          className="w-full"
                          selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select File</label>
                        <div className="relative">
                          <input type="file" onChange={(e) => setSelectedDocFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`w-full px-4 py-3 border rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${selectedDocFile ? 'bg-blue-50 border-blue-200 text-[#003F87]' : 'bg-slate-50 border-slate-200 border-dashed text-slate-500 hover:bg-slate-100'}`}>
                            <Upload size={18} /> <span className="truncate">{selectedDocFile ? selectedDocFile.name : 'Click to browse files'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleAddDocument}
                      disabled={!newDocName || !selectedDocFile || isUploadingDoc}
                      className="w-full md:w-auto px-8 py-3 bg-[#003F87] text-white rounded-xl text-sm font-bold hover:bg-[#002B5E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                      {isUploadingDoc ? 'Uploading...' : <><Plus size={18} /> Upload</>}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {studentDocuments.filter(sd => sd.student_id === activeStudent.id).length === 0 ? (
                      <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700">No Documents Uploaded</h4>
                        <p className="text-sm text-slate-500 mt-1">Upload ID proofs or agreements using the form above.</p>
                      </div>
                    ) : (
                      studentDocuments.filter(sd => sd.student_id === activeStudent.id).map(sd => (
                        <div key={sd.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-[#003F87] rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-[#003F87] group-hover:text-white transition-colors">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className="text-[15px] font-black text-slate-900 leading-tight mb-1">{sd.document_type}</h4>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Added {new Date(sd.uploaded_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setCurrentDocUrl(sd.document_url); setIsDocModalOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-[#003F87] hover:text-white transition-colors" title="View Document">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => setDocumentToDelete({ student_id: activeStudent.id, id: sd.id })} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-rose-500 hover:text-white transition-colors" title="Delete Document">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tasks Tab */}
              {detailsTab === 'tasks' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 fade-in">
                  {isFetchingDetails ? (
                    <div className="flex flex-col items-center justify-center py-24"><LoadingSpinner /><p className="text-slate-500 font-medium mt-4 text-sm">Loading tasks...</p></div>
                  ) : (
                    <>
                  {studentTasks.filter(st => st.student_id === activeStudent.id).length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <ListTodo size={48} className="mx-auto text-slate-200 mb-4" />
                      <h4 className="text-lg font-bold text-slate-700">No Assigned Tasks</h4>
                      <p className="text-sm text-slate-500 mt-1">This student has no tasks or homework assigned yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                      {studentTasks.filter(st => st.student_id === activeStudent.id).map(task => (
                        <div key={task.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-[#003F87] bg-[#E5F0FF] px-2 py-0.5 rounded uppercase tracking-wider">{task.course_tasks?.course_modules?.courses?.name}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{task.course_tasks?.course_modules?.title}</span>
                              </div>
                              <h4 className="text-lg font-black text-slate-900 leading-tight">{task.course_tasks?.title}</h4>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 w-fit ${task.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700' : task.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              {task.status}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{task.course_tasks?.description}</p>
                          
                          {(() => {
                            const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
                            const isAdmin = userInfo.role === 'ADMIN';
                            const instructors = task.course_tasks?.course_submodules?.course_modules?.courses?.course_instructors || [];
                            const isTeacher = instructors.some(inst => inst.employee_id === userInfo.employee_profile_id);
                            const canViewResources = isAdmin || isTeacher;
                            
                            return task.task_submission_resources && task.task_submission_resources.length > 0 && (
                              <div className="mb-6">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Submitted Work</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {task.task_submission_resources.map(res => (
                                    <div key={res.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-3 relative">
                                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        {res.resource_type === 'LINK' ? <LinkIcon size={14} /> : res.resource_type === 'FILE' ? <FileText size={14} /> : <BookOpen size={14} />}
                                      </div>
                                      <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-bold text-slate-700 truncate">{res.label || (res.resource_type === 'FILE' ? 'Uploaded File' : 'Submission')}</div>
                                        {canViewResources ? (
                                          res.resource_type === 'NOTE' ? (
                                            <div className="text-[11px] text-slate-500 mt-1 line-clamp-3 italic">"{res.content}"</div>
                                          ) : (
                                            <button onClick={() => { setCurrentDocUrl(res.content); setIsDocModalOpen(true); }} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline truncate block mt-0.5 text-left">
                                              View Material
                                            </button>
                                          )
                                        ) : (
                                          <div className="text-[10px] font-black text-rose-500 mt-1 uppercase tracking-wide flex items-center gap-1">
                                            <AlertCircle size={10} /> Access Denied
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex flex-wrap gap-4 items-center">
                            {task.status === 'PENDING' && (
                              <button onClick={() => handleUpdateTaskStatus(task.id, task.status)} className="px-6 py-2.5 bg-[#003F87] text-white text-sm font-bold rounded-xl hover:bg-[#002B5E] shadow-sm active:scale-95 transition-all">
                                Mark as Submitted
                              </button>
                            )}
                            
                            {task.status === 'SUBMITTED' && (
                              <div className="flex flex-wrap gap-3 items-center w-full bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <input id={`grade-${task.id}`} type="text" placeholder="Grade (e.g. 95/100)" className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-40 focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                <input id={`feedback-${task.id}`} type="text" placeholder="Add detailed feedback..." className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium flex-1 focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                <button onClick={() => {
                                  const g = document.getElementById(`grade-${task.id}`).value;
                                  const f = document.getElementById(`feedback-${task.id}`).value;
                                  if (g) handleUpdateTaskStatus(task.id, task.status, g, f);
                                }} className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-95 transition-all w-full sm:w-auto">
                                  <CheckCircle size={16} /> Submit Grade
                                </button>
                              </div>
                            )}

                            {task.status === 'GRADED' && (
                              <div className="flex flex-col sm:flex-row gap-6 w-full bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                                <div><div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Grade</div> <div className="text-lg font-black text-slate-900">{task.grade}</div></div>
                                {task.feedback && <div className="flex-1"><div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Feedback</div> <div className="text-sm font-medium text-slate-700">{task.feedback}</div></div>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {/* Document View Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-4">
          <div className={`bg-white rounded-xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${currentDocUrl && currentDocUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'w-fit max-w-[95vw] max-h-[95vh]' : 'w-full max-w-4xl h-[85vh]'}`}>
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-[#003F87]" />
                Attached Document
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-auto flex justify-center items-center">
              {currentDocUrl && currentDocUrl.split('?')[0].match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={currentDocUrl} alt="Attached Document" className="max-w-full max-h-[calc(95vh-60px)] object-contain" />
              ) : currentDocUrl && currentDocUrl.split('?')[0].match(/\.pdf$/i) ? (
                <CloudinaryPdfViewer pdfUrl={currentDocUrl} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full space-y-4 p-8 text-center bg-white">
                  <div className="max-w-md border border-slate-200 rounded-xl p-8 bg-slate-50">
                    <h4 className="text-[18px] font-bold text-slate-800 mb-2">Unsupported Document</h4>
                    <p className="text-slate-500 text-[14px] mb-6 leading-relaxed">
                      This document format requires direct download to view.
                    </p>
                    <a 
                      href={currentDocUrl ? currentDocUrl.replace('/upload/', '/upload/fl_attachment/') : '#'} 
                      className="bg-[#003F87] hover:bg-[#002B5E] text-white px-8 py-3 rounded-lg font-bold text-[14px] transition-colors inline-flex items-center justify-center shadow-sm w-full"
                    >
                      Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsContent;
