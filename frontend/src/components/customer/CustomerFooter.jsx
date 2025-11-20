// Customer Portal Footer
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function CustomerFooter() {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9975b] to-[#d4a574] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h3 className="text-xl font-bold">Coffee Shop</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Cà phê & Trà ngon - Không gian ấm cúng, phục vụ tận tâm.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/customer" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/customer/menu" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  Thực đơn
                </Link>
              </li>
              <li>
                <Link to="/customer/reservation" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  Đặt bàn
                </Link>
              </li>
              <li>
                <Link to="/customer/orders" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  Đơn hàng
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 text-[#c9975b] mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm">
                  123 Đường ABC, Quận XYZ, TP.HCM
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-[#c9975b] flex-shrink-0" />
                <a href="tel:0123456789" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  0123 456 789
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-[#c9975b] flex-shrink-0" />
                <a href="mailto:info@coffeeshop.vn" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                  info@coffeeshop.vn
                </a>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Giờ mở cửa</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#c9975b] flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-gray-400">Thứ 2 - Thứ 6</p>
                  <p className="text-white font-medium">7:00 - 22:00</p>
                </div>
              </li>
              <li className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#c9975b] flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-gray-400">Thứ 7 - Chủ nhật</p>
                  <p className="text-white font-medium">8:00 - 23:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              &copy; 2025 Coffee Shop. Mọi quyền được bảo lưu.
            </p>
            <div className="flex space-x-6">
              <Link to="/customer/privacy" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                Chính sách bảo mật
              </Link>
              <Link to="/customer/terms" className="text-gray-400 hover:text-[#c9975b] transition text-sm">
                Điều khoản dịch vụ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

