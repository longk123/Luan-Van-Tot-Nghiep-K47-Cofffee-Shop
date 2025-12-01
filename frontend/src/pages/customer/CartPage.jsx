// Customer Portal - Cart Page
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { useToast } from '../../components/CustomerToast';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, ArrowLeft, Edit2 } from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cart, setCart] = useState(null);
  const [cartItemsWithDetails, setCartItemsWithDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  // Load item details for cart items
  const enrichCartItems = async (items) => {
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const { data: itemDetail } = await customerApi.getItemDetail(item.item_id);
          const variant = itemDetail.variants?.find(v => v.id === item.variant_id);
          
          return {
            ...item,
            item_name: itemDetail.ten,
            variant_name: variant?.ten_bien_the || '',
            price: variant?.gia || 0
          };
        } catch (error) {
          console.error(`Error loading item ${item.item_id}:`, error);
          return {
            ...item,
            item_name: `Món #${item.item_id}`,
            variant_name: '',
            price: 0
          };
        }
      })
    );
    return enriched;
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getCart();
      setCart(data);
      
      if (data.promoCode) {
        setPromoCode(data.promoCode);
      }
      
      // Enrich cart items with details
      if (data.items && data.items.length > 0) {
        const enriched = await enrichCartItems(data.items);
        setCartItemsWithDetails(enriched);
      } else {
        setCartItemsWithDetails([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = async (index, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(index);
      return;
    }

      try {
      setUpdating(true);
      const { data } = await customerApi.updateCartItem(index, newQuantity);
      setCart(data);
      
      // Re-enrich items
      if (data.items && data.items.length > 0) {
        const enriched = await enrichCartItems(data.items);
        setCartItemsWithDetails(enriched);
      } else {
        setCartItemsWithDetails([]);
      }
      
      // Dispatch event to update cart badge in header
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Không thể cập nhật giỏ hàng');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (index) => {
    // Remove without confirmation for better UX (can add confirmation dialog later)
    try {
      setUpdating(true);
      const { data } = await customerApi.removeFromCart(index);
      setCart(data);
      
      // Re-enrich items
      if (data.items && data.items.length > 0) {
        const enriched = await enrichCartItems(data.items);
        setCartItemsWithDetails(enriched);
      } else {
        setCartItemsWithDetails([]);
      }
      
      // Dispatch event to update cart badge in header
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Không thể xóa món khỏi giỏ hàng');
    } finally {
      setUpdating(false);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.warning('Vui lòng nhập mã khuyến mãi');
      return;
    }

    try {
      setApplyingPromo(true);
      const { data } = await customerApi.applyPromoCode(promoCode.trim());
      setCart(data);
      setPromoCode(''); // Clear input after successful apply
      // Re-enrich items
      if (data.items && data.items.length > 0) {
        const enriched = await enrichCartItems(data.items);
        setCartItemsWithDetails(enriched);
      }
    } catch (error) {
      console.error('Error applying promo:', error);
      toast.error(error.message || 'Mã khuyến mãi không hợp lệ');
    } finally {
      setApplyingPromo(false);
    }
  };

  const clearPromoCode = async () => {
    try {
      const { data } = await customerApi.clearPromoCode();
      setCart(data);
      setPromoCode('');
      // Re-enrich items
      if (data.items && data.items.length > 0) {
        const enriched = await enrichCartItems(data.items);
        setCartItemsWithDetails(enriched);
      }
    } catch (error) {
      console.error('Error clearing promo:', error);
    }
  };

  const calculateSubtotal = () => {
    if (cartItemsWithDetails.length === 0) return 0;
    return cartItemsWithDetails.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = cart?.promoDiscount || 0;
    return Math.max(0, subtotal - discount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Giỏ hàng trống</h2>
          <p className="text-lg text-gray-600 mb-8">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Link
            to="/customer/menu"
            className="inline-flex items-center space-x-2 px-8 py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition"
          >
            <span>Xem thực đơn</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Giỏ hàng</h1>
        <p className="text-lg text-gray-600">{cart.items.length} sản phẩm trong giỏ hàng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItemsWithDetails.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-6 flex items-start space-x-4"
            >
              {/* Image placeholder */}
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>

              {/* Item Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {item.item_name}
                </h3>
                {item.variant_name && (
                  <p className="text-sm text-gray-600 mb-1">Size: {item.variant_name}</p>
                )}
                {item.options && Object.keys(item.options).length > 0 && (
                  <p className="text-xs text-gray-500 mb-1">
                    Tùy chọn: {Object.entries(item.options).map(([optId, mucId]) => {
                      // This is simplified - in real app, you'd load option names
                      return 'Đã chọn';
                    }).join(', ')}
                  </p>
                )}
                {item.toppings && Object.keys(item.toppings).length > 0 && (
                  <p className="text-xs text-gray-500 mb-1">
                    Topping: {Object.keys(item.toppings).length} loại
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-500 mb-2">Ghi chú: {item.notes}</p>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
                    <button
                      onClick={() => updateItemQuantity(index, (item.quantity || 1) - 1)}
                      disabled={updating}
                      className="p-2 hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 font-medium">{item.quantity || 1}</span>
                    <button
                      onClick={() => updateItemQuantity(index, (item.quantity || 1) + 1)}
                      disabled={updating}
                      className="p-2 hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-lg font-bold text-[#c9975b]">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={async () => {
                    // Xóa item cũ và điều hướng đến trang chi tiết để chọn lại
                    await removeItem(index);
                    navigate(`/customer/menu/${item.item_id}`);
                  }}
                  disabled={updating}
                  className="p-2 text-[#c9975b] hover:bg-amber-50 rounded-lg transition disabled:opacity-50 border border-[#c9975b]"
                  title="Sửa"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => removeItem(index)}
                  disabled={updating}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title="Xóa"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>

            {/* Promo Code */}
            <div className="mb-6">
              {cart.promoCode ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Mã khuyến mãi</div>
                    <div className="font-medium text-green-700">{cart.promoCode}</div>
                  </div>
                  <button
                    onClick={clearPromoCode}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã khuyến mãi
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={applyingPromo}
                      className="px-4 py-2 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{calculateSubtotal().toLocaleString('vi-VN')}đ</span>
              </div>
              {cart.promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{cart.promoDiscount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                <span className="text-2xl font-bold text-[#c9975b]">
                  {calculateTotal().toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/customer/checkout')}
                className="w-full py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition"
              >
                Thanh toán
              </button>
              <Link
                to="/customer/menu"
                className="flex items-center justify-center space-x-2 w-full py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Tiếp tục mua sắm</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

