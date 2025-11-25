// Customer Portal - Product Detail Page
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { useToast } from '../../components/CustomerToast';
import { ShoppingCart, ArrowLeft, Plus, Minus, Coffee, X } from 'lucide-react';

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
  const [selectedToppingToAdd, setSelectedToppingToAdd] = useState(''); // ID của topping đang chọn để thêm
  const [availableToppings, setAvailableToppings] = useState([]); // List of available toppings
  const [notes, setNotes] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadItemDetail();
  }, [id]);

  const loadItemDetail = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getItemDetail(parseInt(id));
      console.log('📦 Item data:', data);
      console.log('📋 Options:', data.options);
      console.log('🍰 Is drink?', isDrinkItem(data));
      
      setItem(data);
      
      // Set default variant (first one)
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      } else if (data.gia_mac_dinh && data.gia_mac_dinh > 0) {
        // Nếu không có variants nhưng có gia_mac_dinh, tạo variant mặc định
        setSelectedVariant({
          id: null,
          mon_id: data.id,
          ten_bien_the: 'Mặc định',
          gia: data.gia_mac_dinh
        });
      }
      
      setItem(data);
      
      // Tách options thành PERCENT (mức đá, độ ngọt) và AMOUNT (toppings)
      if (data.options && data.options.length > 0) {
        // PERCENT options (SUGAR, ICE) - có muc_tuy_chon
        const percentOptions = data.options.filter(opt => opt.loai === 'PERCENT' && opt.muc_tuy_chon && opt.muc_tuy_chon.length > 0);
        
        // AMOUNT options (toppings) - loại AMOUNT
        const amountOptions = data.options.filter(opt => opt.loai === 'AMOUNT');
        
        // Set PERCENT options với giá trị mặc định
        if (percentOptions.length > 0) {
          const defaultOptions = {};
          percentOptions.forEach(opt => {
            const middleIndex = Math.floor(opt.muc_tuy_chon.length / 2);
            defaultOptions[opt.id] = opt.muc_tuy_chon[middleIndex].id;
          });
          setOptions(defaultOptions);
          console.log('✅ Default PERCENT options set:', defaultOptions);
        }
        
        // Set AMOUNT options (toppings) trực tiếp từ data.options
        if (amountOptions.length > 0) {
          // Load giá từ API để có giá chính xác theo variant
          const variantId = data.variants?.[0]?.id || null;
          try {
            const { data: toppingsData } = await customerApi.getItemToppings(data.id, variantId);
            if (toppingsData && toppingsData.length > 0) {
              setAvailableToppings(toppingsData);
              console.log('✅ Toppings loaded from API:', toppingsData);
            } else {
              // Fallback: dùng giá mặc định từ options
              const toppingsData = amountOptions.map(opt => ({
                tuy_chon_id: opt.id,
                ma: opt.ma,
                ten: opt.ten,
                don_vi: opt.don_vi || 'phần',
                gia_moi_don_vi: opt.gia_mac_dinh || 0
              }));
              setAvailableToppings(toppingsData);
              console.log('✅ Toppings loaded from options (fallback):', toppingsData);
            }
          } catch (error) {
            console.error('Error loading toppings from API, using fallback:', error);
            // Fallback: dùng giá mặc định từ options
            const toppingsData = amountOptions.map(opt => ({
              tuy_chon_id: opt.id,
              ma: opt.ma,
              ten: opt.ten,
              don_vi: opt.don_vi || 'phần',
              gia_moi_don_vi: opt.gia_mac_dinh || 0
            }));
            setAvailableToppings(toppingsData);
          }
        }
      } else {
        console.log('⚠️  No options found in data');
      }

      // Load toppings từ API nếu chưa có (fallback)
      if (isDrinkItem(data) && (!data.options || data.options.filter(opt => opt.loai === 'AMOUNT').length === 0)) {
        console.log('🍰 Loading toppings from API (no options)...');
        await loadToppings(data.id, data.variants?.[0]?.id || null);
      }
    } catch (error) {
      console.error('Error loading item:', error);
      toast.error('Không thể tải thông tin sản phẩm');
      navigate('/customer/menu');
    } finally {
      setLoading(false);
    }
  };

  // Check if item is a drink (not food)
  const isDrinkItem = (itemData) => {
    if (!itemData || !itemData.loai_ten) return false;
    const categoryName = itemData.loai_ten.toLowerCase();
    const drinkCategories = ['cà phê', 'trà', 'nước ép', 'sinh tố', 'đá xay', 'đồ uống'];
    return drinkCategories.some(drink => categoryName.includes(drink));
  };

  // Load toppings for item
  const loadToppings = async (itemId, variantId = null) => {
    try {
      const { data } = await customerApi.getItemToppings(itemId, variantId);
      setAvailableToppings(data || []);
    } catch (error) {
      console.error('Error loading toppings:', error);
      setAvailableToppings([]);
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    // Reload toppings when variant changes
    if (item && isDrinkItem(item)) {
      loadToppings(item.id, variant?.id || null);
    }
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

  const handleAddTopping = () => {
    if (!selectedToppingToAdd) {
      toast.warning('Vui lòng chọn topping');
      return;
    }
    
    const toppingId = parseInt(selectedToppingToAdd);
    const currentQuantity = toppings[toppingId] || 0;
    setToppings({ ...toppings, [toppingId]: currentQuantity + 1 });
    setSelectedToppingToAdd(''); // Reset dropdown
  };

  const handleRemoveTopping = (toppingId) => {
    const newToppings = { ...toppings };
    delete newToppings[toppingId];
    setToppings(newToppings);
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
    // Kiểm tra có variant hoặc có gia_mac_dinh
    if (!selectedVariant && (!item.gia_mac_dinh || item.gia_mac_dinh <= 0)) {
      toast.warning('Sản phẩm chưa có giá');
      return;
    }

    try {
      setAddingToCart(true);
      
      await customerApi.addToCart({
        item_id: item.id,
        variant_id: selectedVariant?.id || null, // Cho phép null nếu không có variant
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
          {item.variants && item.variants.length > 0 ? (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Chọn size</label>
              <div className="flex flex-wrap gap-3">
                {item.variants.map((variant, index) => (
                  <button
                    key={variant.id || `default-${index}`}
                    onClick={() => handleVariantChange(variant)}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      selectedVariant?.id === variant.id || 
                      (!selectedVariant?.id && !variant.id && index === 0)
                        ? 'bg-[#c9975b] text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-[#c9975b]'
                    }`}
                  >
                    {variant.ten_bien_the}
                    <div className="text-xs mt-1">
                      {variant.gia ? variant.gia.toLocaleString('vi-VN') : '0'}đ
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : item.gia_mac_dinh && item.gia_mac_dinh > 0 ? (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Giá</label>
              <div className="text-2xl font-bold text-[#c9975b]">
                {item.gia_mac_dinh.toLocaleString('vi-VN')}đ
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="text-sm text-gray-500">Liên hệ để biết giá</div>
            </div>
          )}

          {/* Options (Sugar, Ice) - Chỉ hiển thị cho đồ uống */}
          {isDrinkItem(item) && item.options && item.options.filter(opt => opt.loai === 'PERCENT' && opt.muc_tuy_chon && opt.muc_tuy_chon.length > 0).length > 0 && (
            <div className="mb-6">
              {item.options.filter(opt => opt.loai === 'PERCENT' && opt.muc_tuy_chon && opt.muc_tuy_chon.length > 0).map((option) => (
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

          {/* Toppings - Chỉ hiển thị cho đồ uống */}
          {isDrinkItem(item) && availableToppings.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Topping (tùy chọn)
              </label>
              
              {/* Dropdown để chọn topping */}
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedToppingToAdd}
                  onChange={(e) => setSelectedToppingToAdd(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                >
                  <option value="">-- Chọn topping --</option>
                  {availableToppings
                    .filter(topping => !toppings[topping.tuy_chon_id] || toppings[topping.tuy_chon_id] === 0)
                    .map((topping) => (
                      <option key={topping.tuy_chon_id} value={topping.tuy_chon_id}>
                        {topping.ten} - {topping.gia_moi_don_vi?.toLocaleString('vi-VN')}đ/{topping.don_vi || 'phần'}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddTopping}
                  disabled={!selectedToppingToAdd}
                  className="px-4 py-2 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* Danh sách toppings đã chọn */}
              {Object.keys(toppings).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(toppings).map(([toppingId, quantity]) => {
                    if (quantity <= 0) return null;
                    const topping = availableToppings.find(t => t.tuy_chon_id === parseInt(toppingId));
                    if (!topping) return null;
                    
                    return (
                      <div key={toppingId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{topping.ten}</div>
                          <div className="text-sm text-gray-500">
                            {quantity} {topping.don_vi || 'phần'} × {topping.gia_moi_don_vi?.toLocaleString('vi-VN')}đ = {(quantity * (topping.gia_moi_don_vi || 0)).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToppingChange(parseInt(toppingId), quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-200 transition"
                            title="Giảm"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{quantity}</span>
                          <button
                            onClick={() => handleToppingChange(parseInt(toppingId), quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-200 transition"
                            title="Tăng"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveTopping(parseInt(toppingId))}
                            className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Xóa"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
                  {selectedVariant && selectedVariant.gia 
                    ? (selectedVariant.gia * quantity).toLocaleString('vi-VN') 
                    : item.gia_mac_dinh && item.gia_mac_dinh > 0
                      ? (item.gia_mac_dinh * quantity).toLocaleString('vi-VN')
                      : '0'}đ
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

