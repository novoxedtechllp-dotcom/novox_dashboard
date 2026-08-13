import { useState, useMemo, useEffect } from 'react';
import { Briefcase, Phone, Plus, X, Upload, User, Trash2, Pencil, CheckCircle, Search, Shield, Eye, EyeOff, BookOpen } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';

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
  if (!response.ok) throw new Error(data.message || 'Employee request failed');
  return data;
};



const departmentToApi = (department) => {
  if (department === 'Development') return 'DEVELOPMENT';
  return department.toUpperCase();
};

const departmentFromApi = (department) => {
  if (department === 'DEVELOPMENT') return 'Development';
  if (department === 'HR') return 'HR';
  return department ? department.charAt(0) + department.slice(1).toLowerCase() : 'Development';
};

const splitName = (name) => {
  const parts = name.trim().split(/\s+/);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || ''
  };
};

const mapEmployeeFromApi = (employee, avatar = null) => {
  const id = employee.id;
  const localCourseIds = localStorage.getItem(`employee_courses_${id}`);
  const courseIds = localCourseIds 
    ? JSON.parse(localCourseIds) 
    : (employee.course_instructors?.map(ci => ci.course_id || ci.courses?.id) || []);

  return {
    id,
    eid: employee.employee_code || `EMP-${String(employee.id).slice(0, 4)}`,
    name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
    department: departmentFromApi(employee.employee_roles?.role_name || employee.employee_role || 'DEVELOPMENT'),
    position: employee.designation || '',
    phone: employee.phone || '',
    joinDate: employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : '',
    avatar: avatar || employee.avatar_url || null,
    email: employee.users?.email || '',
    systemRole: employee.users?.role || 'EMPLOYEE',
    salary: employee.salary || 0,
    courseIds
  };
};

const EmployeesContent = ({ employees = [], setEmployees, searchQuery = '', setSearchQuery = () => {} }) => {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/v1/courses', { headers });
        const resData = await response.json();
        if (response.ok) {
          setCourses(resData.data?.courses || resData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    };
    fetchCourses();
  }, []);



  const [toast, setToast] = useState(null);
  const alert = (message) => {
    const isError = typeof message === 'string' && (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error'));
    setToast({ message, type: isError ? 'error' : 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('Active');

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Development',
    position: '',
    phone: '',
    joinDate: 'January 2024',
    salary: '',
    avatarUrl: null,
    courseIds: []
  });

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isModalOpen || employeeToDelete || employeeToEdit) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isModalOpen, employeeToDelete, employeeToEdit]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewEmployee({ ...newEmployee, avatarUrl: previewUrl });
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // Let browser set boundary
        
        const response = await fetch('/api/v1/upload', {
          method: 'POST',
          headers,
          body: formData
        });
        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Upload failed');
        }
        if (resData.data?.url) {
          setNewEmployee(prev => ({ ...prev, avatarUrl: resData.data.url }));
        }
      } catch (err) {
        console.error('Upload failed', err);
        setNewEmployee(prev => ({ ...prev, avatarUrl: null }));
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (isUploading) {
      alert('Please wait for the image to finish uploading before saving.');
      return;
    }
    if (!newEmployee.name || !newEmployee.email || !newEmployee.phone) {
      alert("Name, email, and phone number are mandatory for enrolling an employee.");
      return;
    }
    if (newEmployee.phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setIsSubmitting(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const { first_name, last_name } = splitName(newEmployee.name);

      const payload = {
          first_name,
          last_name,
          phone: newEmployee.phone,
          employee_role: departmentToApi(newEmployee.department),
          designation: newEmployee.position || newEmployee.department,
          salary: Number(newEmployee.salary) || 0,
          avatar_url: (newEmployee.avatarUrl && !newEmployee.avatarUrl.startsWith('blob:')) ? newEmployee.avatarUrl : null,
          course_ids: newEmployee.courseIds
        };
        if (newEmployee.email) payload.email = newEmployee.email;
        if (newEmployee.password) payload.password = newEmployee.password;

        const response = await fetch('/api/v1/employees', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      const resData = await parseApiResponse(response);
      localStorage.setItem(`employee_courses_${resData.data.id}`, JSON.stringify(newEmployee.courseIds));
      const addedEmployee = mapEmployeeFromApi(resData.data, resData.data?.avatar_url || resData.data?.avatar || newEmployee.avatarUrl || null);

      setEmployees([addedEmployee, ...employees]);
      setIsModalOpen(false);
      setNewEmployee({ name: '', email: '', password: '', department: 'Development', position: '', phone: '', joinDate: 'January 2024', salary: '', avatarUrl: null, courseIds: [] });
      alert('Employee added successfully!');
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    setIsDeleting(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`/api/v1/employees/${id}`, {
        method: 'DELETE',
        headers
      });
      const resData = await parseApiResponse(response);

      if (resData.message && resData.message.includes('permanently')) {
        setEmployees(employees.filter(emp => emp.id !== id));
        localStorage.removeItem(`employee_courses_${id}`);
        alert('Employee deleted permanently!');
      } else {
        setEmployees(employees.map(emp => emp.id === id ? { ...emp, status: 'Terminated' } : emp));
        alert('Employee terminated successfully!');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
      setEmployeeToDelete(null);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (employeeToEdit.phone && employeeToEdit.phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    setIsUpdating(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setIsUpdating(false);
        return;
      }
      const { first_name, last_name } = splitName(employeeToEdit.name);

      const payload = {
        first_name,
        last_name,
        phone: employeeToEdit.phone,
        email: employeeToEdit.email,
        employee_role: departmentToApi(employeeToEdit.department),
        designation: employeeToEdit.position || employeeToEdit.department,
        salary: Number(employeeToEdit.salary) || 0,
        course_ids: employeeToEdit.courseIds
      };

      const response = await fetch(`/api/v1/employees/${employeeToEdit.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      
      const resData = await parseApiResponse(response);
      localStorage.setItem(`employee_courses_${employeeToEdit.id}`, JSON.stringify(employeeToEdit.courseIds));
      const updatedEmp = mapEmployeeFromApi(resData.data, employeeToEdit.avatar);

      setEmployees(employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
      setEmployeeToEdit(null);
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error.message || 'Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (deptFilter !== 'All Departments') {
      filtered = filtered.filter(emp => emp.department === deptFilter);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => {
        const nameWords = emp.name ? emp.name.toLowerCase().split(/\s+/) : [];
        const matchesName = nameWords.some(word => word.startsWith(q));
        const matchesEid = emp.eid && emp.eid.toLowerCase().startsWith(q);
        const matchesPhone = emp.phone && emp.phone.includes(searchQuery);
        return matchesName || matchesEid || matchesPhone;
      });
    }
    return filtered;
  }, [employees, deptFilter, statusFilter, searchQuery]);

  const uniqueDepts = ['All Departments', 'Development', 'Marketing', 'Sales', 'HR', 'Accounts'];

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
        <h1 className="text-2xl font-bold text-slate-800">Employee Directory</h1>
        <p className="text-slate-500 mt-1">Manage employee profiles, roles, and departmental assignments.</p>
      </div>

      {/* Top Header / Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
  <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-center">

    {/* Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">

      {/* Department Filter */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#003F87]/30 transition-all duration-300 w-full min-w-0">

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          Department
        </span>

        <div className="flex-1 min-w-0">
          <CustomSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={uniqueDepts.map((d) => ({
              value: d,
              label: d,
            }))}
            className="w-full"
            selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>

      </div>

    </div>

    {/* Add Employee Button */}
    <div className="w-full xl:w-auto">
      <button
        onClick={() => setIsModalOpen(true)}
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
          text-sm
          font-semibold
          flex
          items-center
          justify-center
          gap-2
          whitespace-nowrap
          hover:bg-[#002B5E]
          transition-all
          duration-300
          shadow-md
          shadow-blue-900/10
          active:scale-95
        "
      >
        <Plus size={18} className="shrink-0" />
        Add Employee
      </button>
    </div>

  </div>
</div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Create Employee Card */}
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-transparent rounded-[24px] border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group min-h-[260px] h-full"
        >
          <div className="w-14 h-14 rounded-[16px] bg-white shadow-sm text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#003F87] group-hover:text-white transition-all duration-300 border border-slate-100">
            <Plus size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">Add New Employee</h3>
          <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">Click here to register a new employee profile in the system.</p>
        </button>

        {filteredEmployees.map(emp => (
          <div key={emp.id} onClick={() => setEmployeeToEdit(emp)} className="cursor-pointer bg-white rounded-[24px] border border-slate-100/60 flex flex-col relative group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            
            {/* Main Content Area */}
            <div className="p-6 relative">

              {/* Top Right Actions */}
              <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setEmployeeToEdit(emp); }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                  title="Edit Employee"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(emp.id); }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                  title="Delete Employee"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Profile Header */}
              <div className="flex flex-col mb-2">
                <div className="relative w-16 h-16 mb-4">
                  <div className="w-full h-full rounded-[16px] overflow-hidden bg-slate-100 flex items-center justify-center shadow-inner">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-slate-300" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-1.5 mt-1">
                  <span className="inline-flex items-center justify-center whitespace-nowrap shrink-0 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {emp.eid}
                  </span>
                  {emp.systemRole === 'ADMIN' && (
                    <span className="inline-flex items-center justify-center whitespace-nowrap shrink-0 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md gap-1">
                      <Shield size={10} /> Admin
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-black text-slate-800 leading-tight tracking-tight truncate pr-2 mb-1">{emp.name}</h3>
                
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Briefcase size={14} className="text-slate-400" /> <span className="truncate">{emp.position || emp.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Phone size={14} className="text-slate-400" /> <span className="truncate">{emp.phone}</span>
                  </div>
                  {emp.courseIds && emp.courseIds.length > 0 && (
                    <div className="flex items-start gap-2 text-xs font-medium text-slate-500 mt-1">
                      <BookOpen size={14} className="text-slate-400 shrink-0 mt-0.5" /> 
                      <span className="line-clamp-2">
                        {emp.courseIds.map(id => courses.find(c => c.id === id)?.name || courses.find(c => c.id === id)?.title).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ))}


      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-800">Add New Employee</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-8 flex flex-col gap-6">
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group cursor-pointer">
                  {newEmployee.avatarUrl ? (
                    <img src={newEmployee.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={20} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Profile Photo</h4>
                  <p className="text-xs font-medium text-slate-500 mb-3">Upload a square image (JPG, PNG).</p>
                  <label className="cursor-pointer bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl inline-flex items-center gap-2 transition-colors shadow-sm">
                    <Upload size={14} /> Browse Files
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name *</label>
                  <input 
                    type="text" required value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email *</label>
                  <input 
                    type="email" required value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number *</label>
                  <input 
                    type="tel" maxLength={10} required value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                      placeholder="Auto-generated"
                      className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
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
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Department</label>
                  <CustomSelect
                    value={newEmployee.department}
                    onChange={(val) => setNewEmployee({...newEmployee, department: val})}
                    options={uniqueDepts.slice(1).map(d => ({ value: d, label: d }))}
                    className="w-full"
                    selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all cursor-pointer"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Position (Designation)</label>
                  <input 
                    type="text" value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    placeholder="e.g. Senior Developer"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Base Salary (₹)</label>
                  <input 
                    type="number" value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mentoring Courses</label>
                  <CustomSelect
                    value={newEmployee.courseIds}
                    onChange={(val) => setNewEmployee({...newEmployee, courseIds: val})}
                    options={courses.map(c => ({ value: c.id, label: c.title || c.name }))}
                    multiple={true}
                    openUpwards={true}
                    className="w-full"
                    selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all cursor-pointer"
                    placeholder="Select courses..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className={`px-6 py-2 bg-[#003F87] text-white rounded-lg text-sm font-bold shadow-md ${isUploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002B5E]'}`} disabled={isUploading || isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {employeeToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEmployeeToEdit(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-800">Edit Employee</h2>
              <button onClick={() => setEmployeeToEdit(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateEmployee} className="p-8 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name *</label>
                  <input 
                    type="text" required value={employeeToEdit.name}
                    onChange={(e) => setEmployeeToEdit({...employeeToEdit, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email *</label>
                  <input 
                    type="email" required value={employeeToEdit.email}
                    onChange={(e) => setEmployeeToEdit({...employeeToEdit, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number *</label>
                  <input 
                    type="text" required value={employeeToEdit.phone}
                    onChange={(e) => setEmployeeToEdit({...employeeToEdit, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Department</label>
                  <CustomSelect
                    value={employeeToEdit.department}
                    onChange={(val) => setEmployeeToEdit({...employeeToEdit, department: val})}
                    options={uniqueDepts.slice(1).map(d => ({ value: d, label: d }))}
                    className="w-full"
                    selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all cursor-pointer"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Position (Designation)</label>
                  <input 
                    type="text" value={employeeToEdit.position}
                    onChange={(e) => setEmployeeToEdit({...employeeToEdit, position: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Base Salary (₹)</label>
                  <input 
                    type="number" value={employeeToEdit.salary || ''}
                    onChange={(e) => setEmployeeToEdit({...employeeToEdit, salary: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mentoring Courses</label>
                  <CustomSelect
                    value={employeeToEdit.courseIds || []}
                    onChange={(val) => setEmployeeToEdit({...employeeToEdit, courseIds: val})}
                    options={courses.map(c => ({ value: c.id, label: c.title || c.name }))}
                    multiple={true}
                    className="w-full"
                    selectClassName="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#003F87] focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-800 transition-all cursor-pointer"
                    placeholder="Select courses..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setEmployeeToEdit(null)} className="w-full sm:w-auto px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={isUpdating} className={`w-full sm:w-auto px-6 py-3 bg-[#003F87] text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002B5E] shadow-blue-900/10'}`}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setEmployeeToDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-5 text-center items-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Delete Employee?
            </h3>
            <p className="text-slate-500 font-medium text-sm">
              This action cannot be undone. All data associated with this employee will be permanently removed.
            </p>
            <div className="flex w-full gap-3 mt-4">
              <button 
                onClick={() => setEmployeeToDelete(null)} 
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { handleDeleteEmployee(employeeToDelete); }} 
                disabled={isDeleting}
                className={`flex-1 py-3 bg-rose-600 rounded-xl text-sm font-bold text-white shadow-md transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700 shadow-rose-900/10'}`}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesContent;
