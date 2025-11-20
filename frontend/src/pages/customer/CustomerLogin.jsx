// Customer Login Page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { setCustomerToken, setCustomerInfo } from '../../auth/customerAuth';
import { Coffee, LogIn, AlertCircle } from 'lucide-react';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phoneOrEmail: '',
    password: '',
    remember: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phoneOrEmail || !formData.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const { data } = await customerApi.login({
        phoneOrEmail: formData.phoneOrEmail,
        password: formData.password
      });

      // Save token and info
      setCustomerToken(data.token);
      setCustomerInfo(data.account);

      // Redirect to home or previous page
      const returnUrl = new URLSearchParams(window.location.search).get('return') || '/customer';
      navigate(returnUrl);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/customer" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#c9975b] to-[#d4a574] rounded-lg flex items-center justify-center">
              <Coffee className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#c9975b]">Coffee Shop</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h1>
          <p className="text-gray-600">Đăng nhập để đặt hàng và xem lịch sử</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Phone/Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại hoặc Email
              </label>
              <input
                type="text"
                value={formData.phoneOrEmail}
                onChange={(e) => setFormData({ ...formData, phoneOrEmail: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                placeholder="0987654321 hoặc email@example.com"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.remember}
                  onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-[#c9975b] focus:ring-[#c9975b]"
                />
                <span className="text-sm text-gray-700">Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/customer/forgot-password" className="text-sm text-[#c9975b] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link to="/customer/register" className="text-[#c9975b] font-medium hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Demo Account */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-1">Tài khoản demo:</p>
            <p className="text-xs text-blue-600">SĐT: 0987654321</p>
            <p className="text-xs text-blue-600">Mật khẩu: customer123</p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/customer" className="text-sm text-gray-600 hover:text-[#c9975b]">
            ← Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

