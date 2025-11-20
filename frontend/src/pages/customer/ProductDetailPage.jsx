// Customer Portal - Product Detail Page
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { useToast } from '../../components/CustomerToast';
import { ShoppingCart, ArrowLeft, Plus, Minus, Coffee } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState({}); // { option_id: muc_id }
  const [toppings, setToppings] = useState({}); // { topping_id: quantity }
  const [notes, setNotes] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadItemDetail();
  }, [id]);

  const loadItemDetail = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getItemDetail(parseInt(id));
      setItem(data);
      
      // Set default variant (first one)
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      
      // Initialize options with default values
      if (data.options) {
        const defaultOptions = {};
        data.options.forEach(opt => {
          if (opt.muc_tuy_chon && opt.muc_tuy_chon.length > 0) {
            // Default to middle option (50%)
            const middleIndex = Math.floor(opt.muc_tuy_chon.length / 2);
            defaultOptions[opt.id] = opt.muc_tuy_chon[middleIndex].id;
          }
        });
        setOptions(defaultOptions);
      }
    } catch (error) {
      console.error('Error loading item:', error);
      toast.error('Không thể tải thông tin sản phẩm');
      navigate('/customer/menu');
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  const handleOptionChange = (optionId, mucId) => {
    setOptions({ ...options, [optionId]: mucId });
  };

  const handleToppingChange = (toppingId, quantity) => {
    if (quantity <= 0) {
      const newToppings = { ...toppings };
      delete newToppings[toppingId];
      setToppings(newToppings);
    } else {
      setToppings({ ...toppings, [toppingId]: quantity });
    }
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
  };

  const calculatePrice = () => {
    if (!selectedVariant) return 0;
    
    let basePrice = selectedVariant.gia * quantity;
    
    // Add topping prices
    // Note: Topping pricing logic cần tính từ backend, tạm thời return basePrice
    return basePrice;
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.warning('Vui lòng chọn size');
      return;
    }

    try {
      setAddingToCart(true);
      
      await customerApi.addToCart({
        item_id: item.id,
        variant_id: selectedVariant.id,
        quantity: quantity,
        options: options,
        toppings: toppings,
        notes: notes
      });

      // Show success message
      toast.success('Đã thêm vào giỏ hàng!');
      
      // Optionally navigate to cart
      // navigate('/customer/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Không thể thêm vào giỏ hàng: ' + error.message);
    } finally {
      setAddingToCart(false);
    }
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

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-xl text-gray-600">Sản phẩm không tồn tại</p>
          <Link to="/customer/menu" className="text-[#c9975b] hover:underline mt-4 inline-block">
            Quay về thực đơn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customer/menu')}
        className="flex items-center space-x-2 text-gray-600 hover:text-[#c9975b] mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Quay lại thực đơn</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Image */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-xl overflow-hidden">
            {item.hinh_anh_url ? (
              <img
                src={item.hinh_anh_url}
                alt={item.ten}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Coffee className="w-32 h-32 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Info */}
        <div>
          {/* Category */}
          <div className="text-sm text-[#c9975b] font-medium mb-2">{item.loai_ten}</div>
          
          {/* Name */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{item.ten}</h1>
          
          {/* Description */}
          {item.mo_ta && (
            <p className="text-lg text-gray-600 mb-6">{item.mo_ta}</p>
          )}

          {/* Variants (Size) */}
          {item.variants && item.variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Chọn size</label>
              <div className="flex flex-wrap gap-3">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantChange(variant)}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      selectedVariant?.id === variant.id
                        ? 'bg-[#c9975b] text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-[#c9975b]'
                    }`}
                  >
                    {variant.ten_bien_the}
                    <div className="text-xs mt-1">
                      {variant.gia.toLocaleString('vi-VN')}đ
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options (Sugar, Ice) */}
          {item.options && item.options.length > 0 && (
            <div className="mb-6">
              {item.options.map((option) => (
                <div key={option.id} className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {option.ten}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {option.muc_tuy_chon && option.muc_tuy_chon.map((muc) => (
                      <button
                        key={muc.id}
                        onClick={() => handleOptionChange(option.id, muc.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          options[option.id] === muc.id
                            ? 'bg-[#c9975b] text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#c9975b]'
                        }`}
                      >
                        {muc.ten}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toppings (if any) */}
          {/* Note: Cần load toppings từ API, tạm thời bỏ qua */}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: ít đá, không đường..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price & Add to Cart */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-gray-500">Tổng cộng</div>
                <div className="text-3xl font-bold text-[#c9975b]">
                  {selectedVariant ? (selectedVariant.gia * quantity).toLocaleString('vi-VN') : '0'}đ
                </div>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || addingToCart}
              className="w-full py-4 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {addingToCart ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang thêm...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>Thêm vào giỏ hàng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {/* TODO: Load related products from same category */}
    </div>
  );
}

