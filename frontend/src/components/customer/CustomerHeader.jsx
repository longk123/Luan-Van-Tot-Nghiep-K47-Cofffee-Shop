// Customer Portal Header
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isCustomerLoggedIn, getCustomerInfo, clearCustomerToken } from '../../auth/customerAuth';
import { customerApi } from '../../api/customerApi';
import { ShoppingCart, User, LogOut, Menu as MenuIcon, X, Coffee } from 'lucide-react';

const LOGO_URL = "https://ihmvdgqgfyjyeytkmpqc.supabase.co/storage/v1/object/public/system-images/logo/logo.png?v=" + Date.now();

export default function CustomerHeader() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isCustomerLoggedIn());
    setCustomerInfo(getCustomerInfo());
    loadCartCount();
    
    // Listen for cart-updated event
    const handleCartUpdated = () => {
      loadCartCount();
    };
    window.addEventListener('cart-updated', handleCartUpdated);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, []);

  const loadCartCount = async () => {
    try {
      const { data } = await customerApi.getCart();
      const count = (data?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartItemCount(count);
    } catch (error) {
      console.error('Error loading cart:', error);
      // Don't crash if cart fails to load
      setCartItemCount(0);
    }
  };

  const handleLogout = () => {
    clearCustomerToken();
    setIsLoggedIn(false);
    setCustomerInfo(null);
    navigate('/customer/login');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/customer" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md border-2 border-[#c9975b]/20 overflow-hidden">
              {logoError ? (
                <Coffee className="w-7 h-7 text-[#c9975b]" />
              ) : (
                <img 
                  src={LOGO_URL}
                  alt="Logo DevCoffee" 
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold"><span className="text-black">Dev</span><span className="text-[#CC7F2B]">Coffee</span></h1>
              <p className="text-xs text-gray-600">Cà phê & Trà ngon</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/customer" className="text-gray-700 hover:text-[#c9975b] font-medium transition">
              Trang chủ
            </Link>
            <Link to="/customer/menu" className="text-gray-700 hover:text-[#c9975b] font-medium transition">
              Thực đơn
            </Link>
            <Link to="/customer/promotions" className="text-gray-700 hover:text-[#c9975b] font-medium transition">
              Khuyến mãi
            </Link>
            <Link to="/customer/reservation" className="text-gray-700 hover:text-[#c9975b] font-medium transition">
              Đặt bàn
            </Link>
            {isLoggedIn && (
              <Link to="/customer/orders" className="text-gray-700 hover:text-[#c9975b] font-medium transition">
                Đơn hàng
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <button
              onClick={() => navigate('/customer/cart')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c9975b] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isLoggedIn ? (
              <div className="hidden lg:flex items-center space-x-2">
                <Link
                  to="/customer/profile"
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <User className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">{customerInfo?.fullName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            ) : (
              <Link
                to="/customer/login"
                className="hidden lg:block px-6 py-2 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <MenuIcon className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/customer"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link
                to="/customer/menu"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Thực đơn
              </Link>
              <Link
                to="/customer/promotions"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Khuyến mãi
              </Link>
              <Link
                to="/customer/reservation"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Đặt bàn
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/customer/orders"
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Đơn hàng
                  </Link>
                  <Link
                    to="/customer/profile"
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tài khoản
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/customer/login"
                  className="px-4 py-2 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Đăng nhập
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

