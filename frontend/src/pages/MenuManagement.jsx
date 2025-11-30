// src/pages/MenuManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';

export default function MenuManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('categories'); // categories | items | variants | toppings | options
  const [loading, setLoading] = useState(false);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: null, ten: '', mo_ta: '', thu_tu: 0 });
  
  // Items
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ 
    id: null, ten: '', ma: '', loai_id: null, gia_mac_dinh: 0, mo_ta: '', hinh_anh: '' 
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Variants
  const [selectedCategoryForVariant, setSelectedCategoryForVariant] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [variants, setVariants] = useState([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantForm, setVariantForm] = useState({ id: null, mon_id: null, ten_bien_the: '', gia: 0, thu_tu: 0 });
  
  // Options (Tùy chọn - Sugar, Ice, etc.)
  const [options, setOptions] = useState([]);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [optionForm, setOptionForm] = useState({ 
    id: null, ma: '', ten: '', loai: 'PERCENT', don_vi: '', gia_mac_dinh: 0 
  });
  const [optionLevels, setOptionLevels] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [allOptionLevels, setAllOptionLevels] = useState({}); // Store levels for all options
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [levelForm, setLevelForm] = useState({ id: null, tuy_chon_id: null, ten_muc: '', he_so: 0, thu_tu: 0 });
  const [isEditMode, setIsEditMode] = useState(false); // true = edit mode, false = view mode
  const [toppingForm, setToppingForm] = useState({ 
    id: null, tuy_chon_id: null, mon_id: null, mon_bien_the_id: null, gia: 0 
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        await loadCategories();
      } else if (activeTab === 'items') {
        await loadCategories(); // Need for dropdown
        await loadItems();
      } else if (activeTab === 'variants') {
        await loadItems(); // Need for dropdown
        if (selectedItem) {
          await loadVariants(selectedItem);
        }
      } else if (activeTab === 'options') {
        await loadOptions();
      } else if (activeTab === 'toppings') {
        await loadOptions(); // Load options, then filter by loai='AMOUNT' in render
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('❌ Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== CATEGORIES ==========
  const loadCategories = async () => {
    const res = await api.get('/menu/categories');
    setCategories(res?.data || []);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (categoryForm.id) {
        // UPDATE
        await api.updateCategory(categoryForm.id, categoryForm);
        alert('✅ Cập nhật danh mục thành công!');
      } else {
        // CREATE
        await api.createCategory(categoryForm);
        alert('✅ Tạo danh mục thành công!');
      }
      setShowCategoryForm(false);
      setCategoryForm({ id: null, ten: '', mo_ta: '', thu_tu: 0 });
      loadCategories();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  const handleEditCategory = (cat) => {
    setCategoryForm({ id: cat.id, ten: cat.ten, mo_ta: cat.mo_ta || '', thu_tu: cat.thu_tu || 0 });
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Xác nhận xóa danh mục này?')) return;
    try {
      await api.deleteCategory(id);
      alert('✅ Xóa danh mục thành công!');
      loadCategories();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // ========== ITEMS ==========
  const loadItems = async () => {
    const res = await api.get('/menu/categories/0/items'); // Get all items
    setItems(res?.data || []);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Chỉ chấp nhận file ảnh: JPEG, PNG, WebP, GIF');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Kích thước file không được vượt quá 5MB');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!selectedImage) return null;

    try {
      setUploadingImage(true);

      // Determine folder based on category
      let folder = 'other';
      if (itemForm.loai_id) {
        const category = categories.find(c => c.id === itemForm.loai_id);
        if (category) {
          const categoryName = category.ten.toLowerCase();
          if (categoryName.includes('cà phê') || categoryName.includes('ca phe')) {
            folder = 'ca-phe';
          } else if (categoryName.includes('trà')) {
            folder = 'tra';
          } else if (categoryName.includes('đá xay') || categoryName.includes('da xay')) {
            folder = 'da-xay';
          }
        }
      }

      // Create FormData
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('folder', folder);

      // Upload to backend
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/upload/menu-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      return result.data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      // Upload image if selected
      let imageUrl = itemForm.hinh_anh;
      if (selectedImage) {
        imageUrl = await handleUploadImage();
      }

      const itemData = {
        ...itemForm,
        hinh_anh: imageUrl
      };

      if (itemForm.id) {
        // UPDATE
        await api.updateMenuItem(itemForm.id, itemData);
        alert('✅ Cập nhật đồ uống thành công!');
      } else {
        // CREATE
        await api.createMenuItem(itemData);
        alert('✅ Tạo đồ uống thành công!');
      }
      
      setShowItemForm(false);
      setItemForm({ id: null, ten: '', ma: '', loai_id: null, gia_mac_dinh: 0, mo_ta: '', hinh_anh: '' });
      setSelectedImage(null);
      setImagePreview(null);
      loadItems();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      id: item.id,
      ten: item.ten,
      ma: item.ma || '',
      loai_id: item.loai_id,
      gia_mac_dinh: item.gia_mac_dinh,
      mo_ta: item.mo_ta || '',
      hinh_anh: item.hinh_anh || ''
    });
    setImagePreview(item.hinh_anh || null);
    setSelectedImage(null);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Xác nhận xóa món này?')) return;
    try {
      await api.deleteMenuItem(id);
      alert('✅ Xóa đồ uống thành công!');
      loadItems();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // ========== VARIANTS ==========
  const loadVariants = async (monId) => {
    try {
      const res = await api.get(`/menu/items/${monId}/variants`);
      setVariants(res?.data || []);
    } catch (error) {
      console.error('Error loading variants:', error);
      setVariants([]);
    }
  };

  const handleSaveVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.mon_id) {
      alert('Vui lòng chọn món trước!');
      return;
    }
    try {
      if (variantForm.id) {
        // UPDATE
        await api.updateVariant(variantForm.id, variantForm);
        alert('✅ Cập nhật size thành công!');
      } else {
        // CREATE
        await api.createVariant(variantForm);
        alert('✅ Tạo size thành công!');
      }
      setShowVariantForm(false);
      setVariantForm({ id: null, mon_id: selectedItem, ten_bien_the: '', gia: 0, thu_tu: 0 });
      if (selectedItem) loadVariants(selectedItem);
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  const handleEditVariant = (variant) => {
    setVariantForm({
      id: variant.id,
      mon_id: selectedItem,
      ten_bien_the: variant.ten_bien_the,
      gia: variant.gia,
      thu_tu: variant.thu_tu || 0
    });
    setShowVariantForm(true);
  };

  const handleDeleteVariant = async (id) => {
    if (!confirm('Xác nhận xóa size này?')) return;
    try {
      await api.deleteVariant(id);
      alert('✅ Xóa size thành công!');
      if (selectedItem) loadVariants(selectedItem);
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // ========== OPTIONS ==========
  const loadOptions = async () => {
    const res = await api.get('/menu/options');
    const opts = res?.data || [];
    setOptions(opts);
    
    // Load levels for all options (both PERCENT and AMOUNT)
    const levelsMap = {};
    for (const opt of opts) {
      try {
        const levelsRes = await api.get(`/menu/options/${opt.id}/levels`);
        levelsMap[opt.id] = levelsRes?.data || [];
      } catch (error) {
        console.error(`Error loading levels for option ${opt.id}:`, error);
        levelsMap[opt.id] = [];
      }
    }
    setAllOptionLevels(levelsMap);
  };

  const loadOptionLevels = async (optId) => {
    try {
      const res = await api.get(`/menu/options/${optId}/levels`);
      setOptionLevels(res?.data || []);
    } catch (error) {
      console.error('Error loading option levels:', error);
      setOptionLevels([]);
    }
  };

  const handleSaveOption = async (e) => {
    e.preventDefault();
    try {
      if (optionForm.id) {
        await api.updateOption(optionForm.id, optionForm);
        alert('✅ Cập nhật tùy chọn thành công!');
      } else {
        await api.createOption(optionForm);
        alert('✅ Tạo tùy chọn thành công!');
      }
      setShowOptionForm(false);
      setOptionForm({ id: null, ma: '', ten: '', loai: 'PERCENT', don_vi: '', gia_mac_dinh: 0 });
      loadOptions();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  const handleDeleteOption = async (id) => {
    if (!confirm('Xác nhận xóa topping này?')) return;
    try {
      await api.deleteOption(id);
      alert('✅ Xóa topping thành công!');
      loadOptions();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // ========== RENDER ==========
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter(item => item.loai_id === selectedCategory);
  }, [items, selectedCategory]);

  return (
    <AuthedLayout pageName="Quản lý Thực đơn" backUrl="/manager">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#c9975b] rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Thực đơn</h1>
              <p className="text-sm text-gray-500 mt-0.5">Danh mục, đồ uống, size, đường/đá, topping</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manager')}
            className="px-4 py-2.5 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { 
              id: 'categories', 
              name: 'Danh mục', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )
            },
            { 
              id: 'items', 
              name: 'Đồ uống', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                </svg>
              )
            },
            { 
              id: 'variants', 
              name: 'Size', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              )
            },
            { 
              id: 'options', 
              name: 'Đường/đá', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              )
            },
            { 
              id: 'toppings', 
              name: 'Topping', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
                activeTab === tab.id
                  ? 'bg-[#c9975b] text-white border-[#c9975b] shadow-md'
                  : 'text-gray-600 border-transparent hover:bg-[#f5e6d3] hover:text-[#c9975b] hover:border-[#c9975b]'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9975b]"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* ========== CATEGORIES TAB ========== */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Danh mục thực đơn</h2>
                  <button
                    onClick={() => {
                      setCategoryForm({ id: null, ten: '', mo_ta: '', thu_tu: 0 });
                      setShowCategoryForm(true);
                    }}
                    className="px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm danh mục
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên danh mục</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mô tả</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thứ tự</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat, idx) => (
                        <tr key={cat.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-600">{cat.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.ten}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{cat.mo_ta || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{cat.thu_tu || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditCategory(cat)}
                                className="text-[#c9975b] hover:text-[#b8864a]"
                                title="Sửa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Chưa có danh mục</div>
                  )}
                </div>
              </div>
            )}

            {/* ========== ITEMS TAB ========== */}
            {activeTab === 'items' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Đồ uống</h2>
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.ten}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setItemForm({ id: null, ten: '', ma: '', loai_id: null, gia_mac_dinh: 0, mo_ta: '', hinh_anh: '' });
                      setSelectedImage(null);
                      setImagePreview(null);
                      setShowItemForm(true);
                    }}
                    className="px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] transition-all duration-200 flex items-center gap-2 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm đồ uống
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên đồ uống</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Danh mục</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá mặc định</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.ma}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.ten}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.loai_ten || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            {formatCurrency(item.gia_mac_dinh)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-[#c9975b] hover:text-[#b8864a]"
                                title="Sửa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Chưa có đồ uống</div>
                  )}
                </div>
              </div>
            )}

            {/* ========== VARIANTS TAB ========== */}
            {activeTab === 'variants' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Size (Biến thể)</h2>
                    <select
                      value={selectedCategoryForVariant || ''}
                      onChange={(e) => {
                        const categoryId = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedCategoryForVariant(categoryId);
                        setSelectedItem(null);
                        setVariants([]);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.ten}</option>
                      ))}
                    </select>
                    <select
                      value={selectedItem || ''}
                      onChange={(e) => {
                        const itemId = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedItem(itemId);
                        if (itemId) loadVariants(itemId);
                      }}
                      disabled={!selectedCategoryForVariant}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn đồ uống --</option>
                      {items.filter(item => item.loai_id === selectedCategoryForVariant).map(item => (
                        <option key={item.id} value={item.id}>{item.ten}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedItem) {
                        alert('Vui lòng chọn đồ uống trước!');
                        return;
                      }
                      setVariantForm({ id: null, mon_id: selectedItem, ten_bien_the: '', gia: 0, thu_tu: 0 });
                      setShowVariantForm(true);
                    }}
                    className="px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedItem}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm size
                  </button>
                </div>

                {selectedItem ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên size</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thứ tự</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                      </tr>
                      </thead>
                      <tbody>
                        {variants.map((variant, idx) => (
                          <tr key={variant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-600">{variant.id}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{variant.ten_bien_the}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(variant.gia)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{variant.thu_tu || 0}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditVariant(variant)}
                                  className="text-[#c9975b] hover:text-[#b8864a]"
                                  title="Sửa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteVariant(variant.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Xóa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {variants.length === 0 && (
                      <div className="text-center py-8 text-gray-500">Đồ uống này chưa có size</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Vui lòng chọn đồ uống để xem size</p>
                  </div>
                )}
              </div>
            )}

            {/* ========== OPTIONS TAB (Đường/đá - PERCENT only) ========== */}
            {activeTab === 'options' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Đường/đá</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Mức tùy chọn</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {options.filter(opt => opt.loai === 'PERCENT').map((opt, idx) => {
                        const levels = allOptionLevels[opt.id] || [];
                        
                        return (
                          <tr key={opt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{opt.ma}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{opt.ten}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-700">
                              {levels.length > 0 ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-semibold">
                                  {levels.length} mức
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">0 mức</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedOption(opt.id);
                                    setIsEditMode(false);
                                    loadOptionLevels(opt.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Xem mức"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOption(opt.id);
                                    setIsEditMode(true);
                                    loadOptionLevels(opt.id);
                                  }}
                                  className="text-[#c9975b] hover:text-[#b8864a]"
                                  title="Sửa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {options.filter(opt => opt.loai === 'PERCENT').length === 0 && (
                    <div className="text-center py-8 text-gray-500">Chưa có tùy chọn đường/đá</div>
                  )}
                </div>
              </div>
            )}

            {/* ========== TOPPINGS TAB (AMOUNT options) ========== */}
            {activeTab === 'toppings' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Topping</h2>
                  <button
                    onClick={() => {
                      setOptionForm({ id: null, ma: '', ten: '', loai: 'AMOUNT', don_vi: 'viên', gia_mac_dinh: 0 });
                      setShowOptionForm(true);
                    }}
                    className="px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm topping
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Đơn vị</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá mặc định</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {options.filter(opt => opt.loai === 'AMOUNT').map((opt, idx) => (
                        <tr key={opt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{opt.ma}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{opt.ten}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{opt.don_vi || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            {opt.gia_mac_dinh ? formatCurrency(opt.gia_mac_dinh) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setOptionForm({
                                    id: opt.id,
                                    ma: opt.ma,
                                    ten: opt.ten,
                                    loai: 'AMOUNT',
                                    don_vi: opt.don_vi || '',
                                    gia_mac_dinh: opt.gia_mac_dinh || 0
                                  });
                                  setShowOptionForm(true);
                                }}
                                className="text-[#c9975b] hover:text-[#b8864a]"
                                title="Sửa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteOption(opt.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {options.filter(opt => opt.loai === 'AMOUNT').length === 0 && (
                    <div className="text-center py-8 text-gray-500">Chưa có topping</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== MODALS ========== */}
      
      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {categoryForm.id ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.ten}
                    onChange={(e) => setCategoryForm({ ...categoryForm, ten: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={categoryForm.mo_ta}
                    onChange={(e) => setCategoryForm({ ...categoryForm, mo_ta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    value={categoryForm.thu_tu}
                    onChange={(e) => setCategoryForm({ ...categoryForm, thu_tu: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] font-medium"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {itemForm.id ? 'Sửa đồ uống' : 'Thêm đồ uống mới'}
            </h3>
            <form onSubmit={handleSaveItem}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên đồ uống *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.ten}
                    onChange={(e) => setItemForm({ ...itemForm, ten: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đồ uống</label>
                  <input
                    type="text"
                    value={itemForm.ma}
                    onChange={(e) => setItemForm({ ...itemForm, ma: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <select
                    required
                    value={itemForm.loai_id || ''}
                    onChange={(e) => setItemForm({ ...itemForm, loai_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.ten}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá mặc định (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={itemForm.gia_mac_dinh}
                    onChange={(e) => setItemForm({ ...itemForm, gia_mac_dinh: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={itemForm.mo_ta}
                    onChange={(e) => setItemForm({ ...itemForm, mo_ta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh đồ uống</label>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedImage(null);
                          setItemForm({ ...itemForm, hinh_anh: '' });
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                        title="Xóa ảnh"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-white hover:text-blue-500 border-2 border-blue-500 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {selectedImage ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                      </div>
                    </label>
                    {selectedImage && (
                      <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Đã chọn
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Chấp nhận: JPG, PNG, WebP, GIF. Tối đa 5MB</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemForm(false);
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  disabled={uploadingImage}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tải ảnh...
                    </>
                  ) : (
                    'Lưu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Form Modal */}
      {showVariantForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {variantForm.id ? 'Sửa size' : 'Thêm size mới'}
            </h3>
            <form onSubmit={handleSaveVariant}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên size *</label>
                  <input
                    type="text"
                    required
                    value={variantForm.ten_bien_the}
                    onChange={(e) => setVariantForm({ ...variantForm, ten_bien_the: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: Size M, Size L"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={variantForm.gia}
                    onChange={(e) => setVariantForm({ ...variantForm, gia: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    value={variantForm.thu_tu}
                    onChange={(e) => setVariantForm({ ...variantForm, thu_tu: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVariantForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] font-medium"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Levels Detail Modal */}
      {selectedOption && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                {isEditMode ? 'Quản lý các mức tùy chọn' : 'Xem các mức tùy chọn'}
              </h3>
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setIsEditMode(false);
                }}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isEditMode && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => {
                    setLevelForm({ id: null, tuy_chon_id: selectedOption, ten_muc: '', he_so: 0, thu_tu: 0 });
                    setShowLevelForm(true);
                  }}
                  className="px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm mức
                </button>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mức</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hệ số</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thứ tự</th>
                    {isEditMode && (
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {optionLevels.map((level, idx) => (
                    <tr key={level.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{level.ten}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{level.gia_tri}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{level.thu_tu || 0}</td>
                      {isEditMode && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setLevelForm({
                                  id: level.id,
                                  tuy_chon_id: selectedOption,
                                  ten_muc: level.ten,
                                  he_so: level.gia_tri,
                                  thu_tu: level.thu_tu || 0
                                });
                                setShowLevelForm(true);
                              }}
                              className="text-[#c9975b] hover:text-[#b8864a]"
                              title="Sửa"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Xác nhận xóa mức "${level.ten}"?`)) {
                                  try {
                                    await api.deleteOptionLevel(level.id);
                                    alert('✅ Xóa mức tùy chọn thành công!');
                                    loadOptionLevels(selectedOption);
                                    loadOptions(); // Reload to update counts
                                  } catch (error) {
                                    alert('❌ Lỗi: ' + error.message);
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Xóa"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {optionLevels.length === 0 && (
                <div className="text-center py-8 text-gray-500">Chưa có mức nào</div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setIsEditMode(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Form Modal */}
      {showLevelForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {levelForm.id ? 'Sửa mức tùy chọn' : 'Thêm mức tùy chọn'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const levelData = {
                  tuy_chon_id: levelForm.tuy_chon_id,
                  ten: levelForm.ten_muc,
                  gia_tri: levelForm.he_so,
                  thu_tu: levelForm.thu_tu
                };

                if (levelForm.id) {
                  await api.updateOptionLevel(levelForm.id, levelData);
                  alert('✅ Cập nhật mức tùy chọn thành công!');
                } else {
                  await api.createOptionLevel(levelData);
                  alert('✅ Tạo mức tùy chọn thành công!');
                }
                setShowLevelForm(false);
                loadOptionLevels(selectedOption);
                loadOptions(); // Reload to update counts
              } catch (error) {
                alert('❌ Lỗi: ' + error.message);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên mức *</label>
                  <input
                    type="text"
                    required
                    value={levelForm.ten_muc}
                    onChange={(e) => setLevelForm({ ...levelForm, ten_muc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: 0%, 50%, 100%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hệ số *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={levelForm.he_so}
                    onChange={(e) => setLevelForm({ ...levelForm, he_so: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: 0, 0.3, 0.5, 0.7, 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    value={levelForm.thu_tu}
                    onChange={(e) => setLevelForm({ ...levelForm, thu_tu: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLevelForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] font-medium"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Form Modal (Topping/Đường-đá) */}}
      {showOptionForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {optionForm.id ? (optionForm.loai === 'AMOUNT' ? 'Sửa topping' : 'Sửa đường/đá') : (optionForm.loai === 'AMOUNT' ? 'Thêm topping mới' : 'Thêm đường/đá mới')}
            </h3>
            <form onSubmit={handleSaveOption}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã</label>
                  <input
                    type="text"
                    value={optionForm.ma}
                    onChange={(e) => setOptionForm({ ...optionForm, ma: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: TOPPING_FLAN, ICE, SUGAR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                  <input
                    type="text"
                    required
                    value={optionForm.ten}
                    onChange={(e) => setOptionForm({ ...optionForm, ten: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: Bánh flan, Mức đá, Độ ngọt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị *</label>
                  <input
                    type="text"
                    required
                    value={optionForm.don_vi}
                    onChange={(e) => setOptionForm({ ...optionForm, don_vi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: viên, vá, %"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá mặc định (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={optionForm.gia_mac_dinh}
                    onChange={(e) => setOptionForm({ ...optionForm, gia_mac_dinh: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b]"
                    placeholder="VD: 8000"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowOptionForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:text-[#c9975b] font-medium"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthedLayout>
  );
}

