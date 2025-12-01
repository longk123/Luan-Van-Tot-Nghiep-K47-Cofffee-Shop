// Customer Portal - Menu Page
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { Coffee, Search, ShoppingCart } from 'lucide-react';

export default function MenuPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    // Initialize from URL
    const categoryId = searchParams.get('category');
    return categoryId ? parseInt(categoryId) : null;
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    // Sync state with URL when URL changes
    const categoryId = searchParams.get('category');
    const newCategory = categoryId ? parseInt(categoryId) : null;
    if (newCategory !== selectedCategory) {
      setSelectedCategory(newCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    loadItems();
  }, [selectedCategory, searchKeyword]);

  // Update URL when category changes from button click
  const handleCategoryChange = (categoryId) => {
    setSearchKeyword('');
    if (categoryId === null) {
      setSearchParams({});
    } else {
      setSearchParams({ category: categoryId.toString() });
    }
  };

  const loadCategories = async () => {
    try {
      const result = await customerApi.getCategories();
      console.log('Categories response:', result);
      if (result && result.data) {
        setCategories(result.data);
      } else {
        console.error('Invalid categories response:', result);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Không thể tải danh mục: ' + error.message);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      let result;
      if (searchKeyword) {
        result = await customerApi.searchItems(searchKeyword);
      } else {
        result = await customerApi.getMenuItems(selectedCategory);
      }
      console.log('Items response:', result);
      if (result && result.data) {
        setItems(result.data);
      } else {
        console.error('Invalid items response:', result);
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Không thể tải sản phẩm: ' + error.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadItems();
  };

  const handleAddToCart = async (item) => {
    // Simple add to cart (giả sử chọn variant đầu tiên)
    // Trong thực tế nên mở ProductDetail để chọn variant/options
    navigate(`/customer/menu/${item.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Thực đơn</h1>
        <p className="text-xl text-gray-600">Khám phá các món ngon của chúng tôi</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm món..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-8 py-3 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition"
          >
            Tìm
          </button>
        </div>
      </form>

      {/* Category Filter */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            selectedCategory === null
              ? 'bg-[#c9975b] text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          Tất cả
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              selectedCategory === category.id
                ? 'bg-[#c9975b] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            {category.ten}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Không tìm thấy sản phẩm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition cursor-pointer group"
            >
              {/* Image */}
              <div
                onClick={() => navigate(`/customer/menu/${item.id}`)}
                className="aspect-[4/3] bg-gray-200 rounded-t-xl overflow-hidden"
              >
                {item.hinh_anh_url ? (
                  <img
                    src={item.hinh_anh_url}
                    alt={item.ten}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Coffee className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="text-xs text-[#c9975b] font-medium mb-1">{item.loai_ten}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{item.ten}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.mo_ta || 'Đồ uống ngon'}</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    {item.gia_tu && item.gia_tu > 0 ? (
                      <>
                        <span className="text-xs text-gray-500">Từ </span>
                        <span className="text-lg font-bold text-[#c9975b]">
                          {item.gia_tu.toLocaleString('vi-VN')}đ
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Liên hệ</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="p-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#d4a574] transition"
                    title="Thêm vào giỏ"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

