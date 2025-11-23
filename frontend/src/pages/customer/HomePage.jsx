// Customer Portal - Homepage
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { customerApi } from '../../api/customerApi';
import { Coffee, Calendar, ShoppingBag, ArrowRight, CupSoda, GlassWater, IceCream, Cookie, UtensilsCrossed } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [featuredItems, setFeaturedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes] = await Promise.all([
        customerApi.getMenuItems().catch(err => {
          console.error('Error loading menu items:', err);
          return { data: [] };
        }),
        customerApi.getCategories().catch(err => {
          console.error('Error loading categories:', err);
          return { data: [] };
        })
      ]);

      console.log('HomePage - Items response:', itemsRes);
      console.log('HomePage - Categories response:', categoriesRes);

      // Get first 6 items as featured
      if (itemsRes && itemsRes.data && Array.isArray(itemsRes.data)) {
        setFeaturedItems(itemsRes.data.slice(0, 6));
      } else {
        console.error('Invalid items response:', itemsRes);
        setFeaturedItems([]);
      }

      if (categoriesRes && categoriesRes.data && Array.isArray(categoriesRes.data)) {
        setCategories(categoriesRes.data);
      } else {
        console.error('Invalid categories response:', categoriesRes);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't use alert, just log and set empty arrays
      setFeaturedItems([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Chào mừng đến với<br />Coffee Shop
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Trải nghiệm hương vị cà phê & trà tuyệt vời trong không gian ấm cúng
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/customer/menu"
                className="px-8 py-3 bg-white text-[#c9975b] font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Xem thực đơn
              </Link>
              <Link
                to="/customer/reservation"
                className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-[#c9975b] transition"
              >
                Đặt bàn ngay
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#c9975b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Coffee className="w-7 h-7 text-[#c9975b]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Chất lượng cao</h3>
                <p className="text-gray-600">Nguyên liệu tươi ngon, chế biến tận tâm</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#c9975b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-7 h-7 text-[#c9975b]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Đặt bàn online</h3>
                <p className="text-gray-600">Dễ dàng đặt bàn trực tuyến, tiết kiệm thời gian</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#c9975b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-[#c9975b]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Đặt hàng nhanh</h3>
                <p className="text-gray-600">Đặt món trước, nhận hàng ngay</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Sản phẩm nổi bật</h2>
            <p className="text-xl text-gray-600">Những món được yêu thích nhất</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/customer/menu/${item.id}`)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition cursor-pointer group"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gray-200 rounded-t-xl overflow-hidden">
                    {item.hinh_anh_url ? (
                      <img
                        src={item.hinh_anh_url}
                        alt={item.ten}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Coffee className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="text-sm text-[#c9975b] font-medium mb-2">{item.loai_ten}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.ten}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.mo_ta || 'Đồ uống ngon'}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-500">Từ </span>
                        <span className="text-2xl font-bold text-[#c9975b]">
                          {item.gia_tu?.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <button className="p-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#d4a574] transition">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/customer/menu"
              className="inline-flex items-center space-x-2 px-8 py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition"
            >
              <span>Xem tất cả sản phẩm</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Danh mục</h2>
            <p className="text-xl text-gray-600">Khám phá các loại đồ uống</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              // Map category names to icons and colors
              const getCategoryConfig = (name) => {
                const nameLower = name.toLowerCase();
                if (nameLower.includes('cà phê') || nameLower.includes('coffee')) {
                  return {
                    icon: Coffee,
                    gradient: 'from-amber-700 via-amber-600 to-amber-500',
                    hoverGradient: 'hover:from-amber-600 hover:via-amber-500 hover:to-amber-400',
                    iconBg: 'bg-amber-500/20'
                  };
                }
                if (nameLower.includes('trà') || nameLower.includes('tea')) {
                  return {
                    icon: CupSoda,
                    gradient: 'from-emerald-600 via-emerald-500 to-emerald-400',
                    hoverGradient: 'hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-300',
                    iconBg: 'bg-emerald-500/20'
                  };
                }
                if (nameLower.includes('nước ép') || nameLower.includes('juice')) {
                  return {
                    icon: GlassWater,
                    gradient: 'from-orange-500 via-orange-400 to-orange-300',
                    hoverGradient: 'hover:from-orange-400 hover:via-orange-300 hover:to-orange-200',
                    iconBg: 'bg-orange-500/20'
                  };
                }
                if (nameLower.includes('sinh tố') || nameLower.includes('smoothie')) {
                  return {
                    icon: IceCream,
                    gradient: 'from-pink-500 via-pink-400 to-pink-300',
                    hoverGradient: 'hover:from-pink-400 hover:via-pink-300 hover:to-pink-200',
                    iconBg: 'bg-pink-500/20'
                  };
                }
                if (nameLower.includes('bánh') || nameLower.includes('cake') || nameLower.includes('dessert')) {
                  return {
                    icon: Cookie,
                    gradient: 'from-purple-600 via-purple-500 to-purple-400',
                    hoverGradient: 'hover:from-purple-500 hover:via-purple-400 hover:to-purple-300',
                    iconBg: 'bg-purple-500/20'
                  };
                }
                if (nameLower.includes('ăn') || nameLower.includes('snack') || nameLower.includes('food')) {
                  return {
                    icon: UtensilsCrossed,
                    gradient: 'from-red-600 via-red-500 to-red-400',
                    hoverGradient: 'hover:from-red-500 hover:via-red-400 hover:to-red-300',
                    iconBg: 'bg-red-500/20'
                  };
                }
                // Default
                return {
                  icon: Coffee,
                  gradient: 'from-[#c9975b] via-[#d4a574] to-[#c9975b]',
                  hoverGradient: 'hover:from-[#d4a574] hover:via-[#c9975b] hover:to-[#d4a574]',
                  iconBg: 'bg-[#c9975b]/20'
                };
              };

              const config = getCategoryConfig(category.ten);
              const IconComponent = config.icon;

              return (
                <Link
                  key={category.id}
                  to={`/customer/menu?category=${category.id}`}
                  className="group"
                >
                  <div className={`relative bg-gradient-to-br ${config.gradient} ${config.hoverGradient} rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden`}>
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
                    </div>
                    
                    {/* Icon with background */}
                    <div className={`relative ${config.iconBg} w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Category name */}
                    <h3 className="relative text-lg font-bold text-white group-hover:text-white/95 transition-colors">
                      {category.ten}
                    </h3>
                    
                    {/* Arrow indicator on hover */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Store Info */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Ghé thăm cửa hàng</h2>
            <p className="text-xl text-gray-600">Chúng tôi luôn chào đón bạn</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2">
              {/* Map Placeholder */}
              <div className="bg-gray-200 h-80 md:h-auto">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.3252927108054!2d106.68438761535797!3d10.786377792311834!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDQ3JzExLjAiTiAxMDbCsDQxJzA5LjMiRQ!5e0!3m2!1svi!2s!4v1234567890123!5m2!1svi!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Store Location"
                ></iframe>
              </div>

              {/* Info */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Thông tin liên hệ</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Địa chỉ</div>
                    <div className="text-gray-900">123 Đường 3/2, Phường Xuân Khánh, Ninh Kiều, Cần Thơ</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Điện thoại</div>
                    <a href="tel:0292388888" className="text-[#c9975b] hover:underline">
                      0292 388 888
                    </a>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Email</div>
                    <a href="mailto:info@coffeeshop-demo.vn" className="text-[#c9975b] hover:underline">
                      info@coffeeshop-demo.vn
                    </a>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Giờ mở cửa</div>
                    <div className="text-gray-900">Thứ 2 - Thứ 6: 7:00 - 22:00</div>
                    <div className="text-gray-900">Thứ 7 - CN: 8:00 - 23:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

