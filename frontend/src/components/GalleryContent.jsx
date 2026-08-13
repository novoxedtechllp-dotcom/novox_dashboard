import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon, Calendar, Cloud, Plus, Search,
  MoreVertical, ChevronLeft, ChevronRight, Check, X, Upload, ExternalLink, Pencil, Trash2
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import LoadingSpinner from './LoadingSpinner';
import { useClickOutside } from '../hooks/useClickOutside';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CATEGORY_STYLES = {
  EVENTS: { bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  ACADEMY: { bgColor: 'bg-green-100', textColor: 'text-green-700' },
  CEREMONY: { bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  DEFAULT: { bgColor: 'bg-slate-100', textColor: 'text-slate-700' }
};



const GalleryContent = ({ searchQuery = '', setSearchQuery = () => { } }) => {
  const datePickerRef = useRef(null);
  const [websites, setWebsites] = useState([]);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Storage
  const [storageData, setStorageData] = useState(null);
  const [storageError, setStorageError] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedDate, setSelectedDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  // Modals & Actions
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategories, setUploadCategories] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Change Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [newBulkCategories, setNewBulkCategories] = useState([]);

  // Edit Modal
  const [editImage, setEditImage] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);

  const previewRef = useClickOutside(() => setPreviewImage(null));

  // Category Management
  const [showCategoryManageModal, setShowCategoryManageModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchWebsites();
    fetchCloudinaryUsage();
  }, []);

  useEffect(() => {
    if (selectedWebsite) {
      fetchCategories();
      fetchGalleryData();
    }
  }, [selectedWebsite]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          setShowDeleteModal(true);
        } else if (previewImage) {
          setSelectedIds(new Set([previewImage.id]));
          setShowDeleteModal(true);
          setPreviewImage(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, previewImage]);

  const getAuthHeaders = () => {
    const userInfoStr = sessionStorage.getItem('userInfo');
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
    return userInfo?.token ? { 'Authorization': `Bearer ${userInfo.token}` } : {};
  };

  const fetchWebsites = async () => {
    try {
      const res = await fetch('/api/gallery/websites', { headers: getAuthHeaders(), cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        const data = result.data || [];
        setWebsites(data);
        const saved = localStorage.getItem('gallerySelectedWebsite');
        if (saved && data.find(w => w.id === saved)) {
          setSelectedWebsite(saved);
        } else if (data.length > 0) {
          setSelectedWebsite(data[0].id);
        }
      }
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories for website_id:', selectedWebsite);
      const response = await fetch(`/api/gallery/categories?website_id=${selectedWebsite}`, { headers: getAuthHeaders(), cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        console.log('Categories fetched:', result);
        setCategories(result.data || []);
      } else {
        console.error('Failed to fetch categories:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/gallery/categories/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) fetchCategories();
      else alert("Failed to delete category");
    } catch (e) { console.error(e); }
  };

  const handleCreateWebsite = async () => {
    if (!newWebsiteName.trim()) return;
    try {
      const slug = newWebsiteName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch('/api/gallery/websites', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ name: newWebsiteName.trim(), slug }) });
      if (res.ok) {
        setNewWebsiteName('');
        setShowWebsiteModal(false);
        fetchWebsites();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteWebsite = async (siteId, siteName) => {
    if (!window.confirm(`Are you absolutely sure you want to completely delete "${siteName}" and all its categories and images? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/gallery/websites/${siteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (selectedWebsite === siteId) {
          setSelectedWebsite('');
        }
        fetchWebsites();
      } else {
        const err = await res.json();
        alert(`Failed to delete website: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Network error: ${e.message}`);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const response = await fetch('/api/gallery/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ name: newCategoryName.trim(), slug, website_id: selectedWebsite })
      });
      if (response.ok) {
        setNewCategoryName('');
        setShowCategoryManageModal(false);
        fetchCategories();
      } else {
        const err = await response.json();
        alert(`Failed to create category: ${err.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert(`Network error creating category: ${error.message}`);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const fetchGalleryData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gallery?t=${Date.now()}&website_id=${selectedWebsite}`, { headers: getAuthHeaders() });
      if (response.ok) {
        const result = await response.json();
        const fetchedImages = Array.isArray(result?.data) ? result.data : [];
        setImages(fetchedImages);
      } else {
        const err = await response.json();
        console.error('Failed to fetch gallery images:', err);
      }
    } catch (error) {
      console.error('Error fetching gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCloudinaryUsage = async () => {
    try {
      const res = await fetch('/api/gallery/storage-usage', { headers: getAuthHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.storage) {
          const usageBytes = data.data.storage.usage || 0;
          const limitBytes = data.data.storage.limit || (5 * 1024 * 1024 * 1024); // fallback 5GB

          const gb = 1024 * 1024 * 1024;
          const usedGB = (usageBytes / gb).toFixed(2);
          const limitGB = (limitBytes / gb).toFixed(2);
          const leftGB = ((limitBytes - usageBytes) / gb).toFixed(2);

          const usedPercent = (usageBytes / limitBytes) * 100;
          const leftPercent = 100 - usedPercent;

          setStorageData({ usedGB, limitGB, leftGB, leftPercent });
        } else {
          setStorageError(true);
        }
      } else {
        setStorageError(true);
      }
    } catch (error) {
      console.error('Cloudinary API Error:', error);
      setStorageError(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/gallery/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (response.ok) {
        setSelectedIds(new Set());
        fetchGalleryData();
        fetchCloudinaryUsage();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.message || response.statusText || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting images:', error);
      alert(`Network error deleting images: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleChangeCategory = async () => {
    if (newBulkCategories.length === 0 || selectedIds.size === 0) return;
    setIsChangingCategory(true);

    let completed = 0;
    for (const id of selectedIds) {
      try {
        const response = await fetch(`/api/gallery/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ category_ids: newBulkCategories })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Failed to update category');
        }
      } catch (err) {
        console.error('Failed to update category for', id, err);
        alert(`Failed to update category: ${err.message}`);
      }
      completed++;
    }

    setIsChangingCategory(false);
    setShowCategoryModal(false);
    setNewBulkCategories([]);
    setSelectedIds(new Set()); // Deselect all after bulk update
    fetchGalleryData();
  };

  const handleEditClick = (e, img) => {
    e.stopPropagation();
    setEditImage(img);
    setEditForm({ title: img.title || '', description: img.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editImage) return;
    setIsEditing(true);
    try {
      const response = await fetch(`/api/gallery/${editImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        fetchGalleryData();
        if (previewImage && previewImage.id === editImage.id) {
          setPreviewImage({ ...previewImage, ...editForm });
        }
      } else {
        const errData = await response.json();
        alert(`Failed to save edit: ${errData.message || response.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Network error saving edit: ${err.message}`);
    } finally {
      setIsEditing(false);
      setEditImage(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    let completed = 0;
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', file.name);
      if (uploadCategories.length > 0) {
        formData.append('category_ids', JSON.stringify(uploadCategories));
      }
      formData.append('website_id', selectedWebsite);

      try {
        const response = await fetch('/api/gallery/upload', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            alert('Your session has expired or you do not have permission. Please log in again.');
            sessionStorage.removeItem('userInfo');
            window.location.href = '/';
            throw new Error('Unauthorized');
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            throw new Error(errData.message || 'Upload failed');
          } else {
            const textData = await response.text();
            throw new Error(textData ? textData.substring(0, 100) : `Server responded with status ${response.status} but no error message.`);
          }
        }
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        alert(`Upload failed for ${file.name}: ${err.message}`);
      }
      completed++;
      setUploadProgress(Math.round((completed / uploadFiles.length) * 100));
    }

    setIsUploading(false);
    setShowUploadModal(false);
    setUploadFiles([]);
    setUploadCategories([]);
    setUploadProgress(0);
    fetchGalleryData();
    fetchCloudinaryUsage();
  };

  const removeFile = (indexToRemove) => {
    setUploadFiles(files => files.filter((_, i) => i !== indexToRemove));
  };

  // Stats calculation
  const now = new Date();
  const currentMonthImagesCount = images.filter(img => {
    if (!img.created_at) return false;
    const d = new Date(img.created_at);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthImagesCount = images.filter(img => {
    if (!img.created_at) return false;
    const d = new Date(img.created_at);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  }).length;

  let percentageChange = 0;
  if (lastMonthImagesCount === 0) {
    percentageChange = currentMonthImagesCount > 0 ? 100 : 0;
  } else {
    percentageChange = ((currentMonthImagesCount - lastMonthImagesCount) / lastMonthImagesCount) * 100;
  }
  const isIncrease = percentageChange >= 0;

  // Filtering
  const filteredImages = images.filter(img => {
    const q = searchQuery.toLowerCase();
    const titleWords = img.title ? String(img.title).toLowerCase().split(/\s+/) : [];
    const descWords = img.description ? String(img.description).toLowerCase().split(/\s+/) : [];
    const matchesSearch = !searchQuery ? true : (
      titleWords.some(word => word.startsWith(q)) ||
      descWords.some(word => word.startsWith(q))
    );

    const imgCategories = img.categories ? img.categories.map(c => typeof c.category === 'object' ? c.category.name : '').filter(Boolean) : [];
    const matchesCategory = selectedCategory === 'All Categories' || imgCategories.some(cat => String(cat).toUpperCase() === selectedCategory.toUpperCase());

    let matchesDate = true;
    if (selectedDate && img.created_at) {
      const d = new Date(img.created_at);
      if (!isNaN(d.getTime())) {
        const itemDateStr = d.toISOString().split('T')[0];
        matchesDate = itemDateStr === selectedDate;
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const handleSelect = (e, id) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);

    if (e.shiftKey && lastSelectedId) {
      const lastIdx = filteredImages.findIndex(img => img.id === lastSelectedId);
      const currIdx = filteredImages.findIndex(img => img.id === id);

      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);

        for (let i = start; i <= end; i++) {
          newSelected.add(filteredImages[i].id);
        }
        setSelectedIds(newSelected);
        setLastSelectedId(id);
        return;
      }
    }

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
      setLastSelectedId(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImageClick = (e, img) => {
    if (selectedIds.size > 0) {
      if (selectedIds.has(img.id)) {
        // Already selected -> preview it
        setPreviewImage(img);
      } else {
        // Not selected -> select it
        e.preventDefault();
        handleSelect(e, img.id);
      }
    } else {
      // Selection mode off -> preview it
      setPreviewImage(img);
    }
  };

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredImages.length / rowsPerPage));
  const paginatedImages = filteredImages.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col">
      {/* 1. Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gallery Management</h1>
        <p className="text-slate-500 mt-1">Manage gallery images and view your gallery collection.</p>
      </div>

      {/* 2. Filter Bar & Actions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 mb-6">
  <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start xl:items-center">

    {/* Filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 w-full">

      {/* Category Filter */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 transition-all duration-300 w-full min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          CATEGORY
        </span>

        <div className="flex-1 min-w-0">
          <CustomSelect
            options={[
              { value: "All Categories", label: "All Categories" },
              ...categories.map((cat) => ({
                value: cat.name,
                label: cat.name,
              })),
            ]}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
            placeholder="Category"
            className="w-full"
            selectClassName="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 transition-all duration-300 w-full min-w-0">

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-3 shrink-0">
          DATE
        </span>

        <div className="relative flex-1 min-w-0">
          <DatePicker
            ref={datePickerRef}
            selected={selectedDate ? new Date(selectedDate) : null}
            onChange={(date) => {
              if (date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, "0");
                const dd = String(date.getDate()).padStart(2, "0");
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
              } else {
                setSelectedDate("");
              }
              setCurrentPage(1);
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

    {/* Upload Button */}
    <div className="w-full xl:w-auto">
      <button
        onClick={() => setShowUploadModal(true)}
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
          active:scale-95
        "
      >
        <Plus size={18} className="shrink-0" />
        Upload Images
      </button>
    </div>

  </div>
</div>

      {/* 3. Website Selection Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
          {websites.map(site => (
            <button
              key={site.id}
              onClick={() => {
                setSelectedWebsite(site.id);
                localStorage.setItem('gallerySelectedWebsite', site.id);
                setSelectedIds(new Set());
                setCurrentPage(1);
                setPreviewImage(null);
              }}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 group ${selectedWebsite === site.id
                  ? 'bg-white text-[#003F87] shadow border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Top Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-800">{images.length}</div>
            <div className="text-slate-500 text-sm mt-1">All gallery images</div>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <ImageIcon className="text-green-600" size={24} />
          </div>
        </div>

        {!storageError && storageData && (
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-800">{storageData.usedGB} GB</div>
              <div className={`text-sm mt-1 font-medium ${storageData.leftPercent <= 10 ? 'text-red-600' :
                  storageData.leftPercent <= 25 ? 'text-orange-500' : 'text-slate-500'
                }`}>
                {storageData.leftGB}/{storageData.limitGB} GB left
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Cloud className="text-orange-500" size={24} />
            </div>
          </div>
        )}
      </div>

      {/* 4. Main Image Grid */}
      <div className="flex-1 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <LoadingSpinner text="Loading gallery..." />
          </div>
        ) : paginatedImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
            {paginatedImages.map((img) => {
              let catName = typeof img.category === 'object' ? img.category?.name : img.category;
              if (!catName && img.categories && img.categories.length > 0) {
                catName = img.categories.map(c => typeof c.category === 'object' ? c.category?.name : '').filter(Boolean).join(', ');
              }
              const catKey = String(catName || 'EVENTS').split(',')[0].trim().toUpperCase();
              const badgeStyle = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.DEFAULT;
              const isSelected = selectedIds.has(img.id);

              return (
                <div
                  key={img.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group relative cursor-pointer select-none"
                  onClick={(e) => handleImageClick(e, img)}
                >
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={img.image_url || img.url || img.cloudinary_url}
                      alt={img.title || 'Gallery image'}
                      className={`w-full h-full object-cover transition-all duration-200 ${isSelected ? 'p-3 rounded-2xl' : ''}`}
                    />
                    {/* Overlays */}
                    <div className={`absolute inset-0 transition-opacity duration-200 ${isSelected ? 'bg-[#003F87]/10 opacity-100' : 'bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100'}`}></div>

                    <button
                      onClick={(e) => handleSelect(e, img.id)}
                      className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 z-10 ${isSelected
                          ? 'bg-[#003F87] border-[#003F87] scale-100'
                          : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-105'
                        }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} className="text-white" />}
                    </button>

                    <button
                      onClick={(e) => handleEditClick(e, img)}
                      className="absolute top-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md p-1.5 hover:bg-black/30 rounded-full z-10"
                      title="Edit Details"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 text-sm truncate" title={img.title}>
                      {img.title || 'Untitled Image'}
                    </h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeStyle.bgColor} ${badgeStyle.textColor}`}>
                        {catName || 'Uncategorized'}
                      </span>
                      <span className="text-[12px] text-slate-500">
                        {(() => {
                          try {
                            const d = new Date(img.created_at);
                            if (isNaN(d.getTime())) return 'Unknown Date';
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          } catch (e) {
                            return 'Unknown Date';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <ImageIcon size={48} className="text-slate-300 mb-4" />
            <p>No images found.</p>
          </div>
        )}
      </div>

      {/* 5. Bottom Action & Pagination Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} selected
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-slate-600 border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors"
            >
              Unselect
            </button>
          )}
          {filteredImages.length > 0 && selectedIds.size !== filteredImages.length && (
            <button
              onClick={() => setSelectedIds(new Set(filteredImages.map(img => img.id)))}
              className="text-sm font-medium text-[#003F87] border border-[#003F87] px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
            >
              Select All
            </button>
          )}
          {selectedIds.size > 0 && (
            <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>
          )}
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm font-medium text-red-600 border border-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="text-sm font-medium text-[#003F87] border border-[#003F87] px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
              >
                Change Category
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-6">
          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-600 focus:outline-none focus:border-[#003F87]"
          >
            <option value={12}>12 / page</option>
            <option value={24}>24 / page</option>
            <option value={48}>48 / page</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1.5 transition-colors ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((num, idx) => (
              num === '...' ? (
                <span key={`ellipsis-${idx}`} className="text-slate-400 px-1">...</span>
              ) : (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${currentPage === num
                      ? 'bg-[#003F87] text-white'
                      : 'hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  {num}
                </button>
              )
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1.5 transition-colors ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Website Manage Modal */}
      {showWebsiteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Add New Website</h3>
              <button onClick={() => setShowWebsiteModal(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Website Name</label>
              <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003F87] focus:border-transparent outline-none mb-4" placeholder="e.g. Novox Global" value={newWebsiteName} onChange={e => setNewWebsiteName(e.target.value)} />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowWebsiteModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors">Cancel</button>
              <button onClick={handleCreateWebsite} className="px-4 py-2 bg-[#003F87] text-white rounded-md hover:bg-blue-800 font-medium transition-colors">Create Website</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Delete Images?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to delete {selectedIds.size} selected image{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
              </p>

              <div className="flex w-full gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex-1">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isDeleting} className={`px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex-1 ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Panel */}
      {previewImage && (
        <div ref={previewRef} className="fixed bottom-24 right-8 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 z-40 overflow-hidden flex flex-col transition-all">
          <div className="relative h-56 bg-slate-100 flex items-center justify-center group">
            <img
              src={previewImage.image_url || previewImage.url || previewImage.cloudinary_url}
              alt={previewImage.title || 'Gallery image'}
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => {
                setEditImage(previewImage);
                setEditForm({ title: previewImage.title || '', description: previewImage.description || '' });
              }}
              className="absolute top-2 right-10 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
              title="Edit Details"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => {
                setSelectedIds(new Set([previewImage.id]));
                setShowDeleteModal(true);
                setPreviewImage(null);
              }}
              className="absolute top-2 right-18 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-sm"
              style={{ right: '4.5rem' }}
              title="Delete Image"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={16} />
            </button>
            <a
              href={previewImage.image_url || previewImage.url || previewImage.cloudinary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-slate-800 text-base break-words select-text">
                {previewImage.title || 'Untitled Image'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 select-text">
                {(() => {
                  try {
                    const d = new Date(previewImage.created_at);
                    if (isNaN(d.getTime())) return 'Unknown Date';
                    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  } catch (e) {
                    return 'Unknown Date';
                  }
                })()}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category</span>
              <span className="text-sm text-slate-700 select-text">
                {(() => {
                  let cName = typeof previewImage.category === 'object' ? previewImage.category?.name : previewImage.category;
                  if (!cName && previewImage.categories && previewImage.categories.length > 0) {
                    cName = previewImage.categories.map(c => typeof c.category === 'object' ? c.category?.name : '').filter(Boolean).join(', ');
                  }
                  return cName || 'Uncategorized';
                })()}
              </span>
            </div>

            {previewImage.description && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</span>
                <p className="text-sm text-slate-700 break-words select-text">{previewImage.description}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">File ID</span>
              <code className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded break-all select-all">
                {previewImage.id}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {editImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Image Details</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#003F87]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#003F87] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditImage(null)}
                disabled={isEditing}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isEditing}
                className="px-4 py-2 text-sm font-medium text-white bg-[#003F87] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {isEditing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Category Bulk Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Change Category</h3>
            <p className="text-slate-600 text-sm mb-4">
              Select a new category for the {selectedIds.size} selected image{selectedIds.size > 1 ? 's' : ''}.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBulkCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) setNewBulkCategories([...newBulkCategories, cat.id]);
                      else setNewBulkCategories(newBulkCategories.filter(id => id !== cat.id));
                    }}
                  />
                  <span className="text-sm text-slate-700">{cat.name}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                disabled={isChangingCategory}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeCategory}
                disabled={isChangingCategory || newBulkCategories.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-[#003F87] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {isChangingCategory ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Manage Categories</h3>

            <div className="mb-6 max-h-40 overflow-y-auto border border-slate-200 rounded p-2">
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat.id} className="text-sm text-slate-700 py-1 px-2 border-b last:border-b-0 border-slate-100 flex items-center justify-between group">
                  <div>
                    {cat.name} <span className="text-slate-400 text-xs ml-2">({cat.slug})</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-red-50"
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <div className="text-sm text-slate-500 p-2">No categories yet.</div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Annual Day"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#003F87]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryManageModal(false)}
                disabled={isCreatingCategory}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#003F87] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {isCreatingCategory ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Upload Images</h3>
              <button
                onClick={() => !isUploading && setShowUploadModal(false)}
                disabled={isUploading}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category (Optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadCategories.includes(cat.id)}
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.checked) setUploadCategories([...uploadCategories, cat.id]);
                          else setUploadCategories(uploadCategories.filter(id => id !== cat.id));
                        }}
                      />
                      <span className="text-sm text-slate-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">This category will be applied to all uploaded images.</p>
              </div>

              {/* File input / drag drop area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploadFiles.length > 0 ? 'border-[#003F87] bg-blue-50/50' : 'border-slate-300 hover:border-[#003F87]'
                  }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <Upload className="mx-auto text-[#003F87] mb-2" size={32} />
                <p className="text-sm font-medium text-slate-700">Click to select files from your computer</p>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP up to 10MB</p>
              </div>

              {/* Selected Files Preview */}
              {uploadFiles.length > 0 && (
                <div className="bg-slate-50 rounded p-3 max-h-40 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">{uploadFiles.length} files selected</h4>
                  <ul className="space-y-2">
                    {uploadFiles.map((f, i) => (
                      <li key={i} className="flex justify-between items-center text-sm text-slate-700">
                        <span className="truncate max-w-[250px]">{f.name}</span>
                        {!isUploading && (
                          <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700">
                            <X size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#003F87] h-2 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || uploadFiles.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#003F87] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryContent;
