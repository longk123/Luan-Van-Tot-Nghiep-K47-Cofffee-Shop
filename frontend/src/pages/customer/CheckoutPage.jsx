// Customer Portal - Checkout Page
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { api } from '../../api';
import { isCustomerLoggedIn } from '../../auth/customerAuth';
import { useToast } from '../../components/CustomerToast';
import { ArrowLeft, CreditCard, Wallet, Smartphone, MapPin, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Yêu cầu đăng nhập để thanh toán
  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      navigate('/customer/login?return=/customer/checkout&message=Vui lòng đăng nhập để đặt hàng');
    }
  }, [navigate]);
  
  // Order type
  const [orderType, setOrderType] = useState('TAKEAWAY'); // TAKEAWAY or DELIVERY
  
  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    phone: '',
    email: ''
  });
  
  // Pickup info (for takeaway - khách đến lấy tại quán)
  const [pickupInfo, setPickupInfo] = useState({
    pickupTime: '',  // Thời gian khách muốn đến lấy
    notes: ''         // Ghi chú đặc biệt
  });
  
  // Delivery info (for delivery - giao hàng tận nhà)
  const [deliveryInfo, setDeliveryInfo] = useState({
    deliveryAddress: '',  // Địa chỉ giao hàng (tự động ghép từ số nhà + phường)
    deliveryPhone: '',   // Số điện thoại người nhận
    deliveryTime: '',     // Thời gian muốn nhận hàng
    deliveryNotes: '',    // Ghi chú địa chỉ
    latitude: null,       // Vĩ độ
    longitude: null,      // Kinh độ
    distance: null,       // Khoảng cách từ quán (km)
    deliveryFee: 0        // Phí giao hàng
  });
  
  // Địa chỉ giao hàng - chọn phường và nhập số nhà/đường
  const [selectedWard, setSelectedWard] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  
  // Danh sách 4 phường mới sau sáp nhập (Q. Ninh Kiều, TP. Cần Thơ)
  // Theo Nghị quyết sáp nhập 2024-2025
  const ALLOWED_WARDS = [
    { 
      id: 'ninh_kieu', 
      name: 'Phường Ninh Kiều', 
      description: 'Từ P. Tân An, Thới Bình, Xuân Khánh cũ',
      oldWards: ['tân an', 'tan an', 'thới bình', 'thoi binh', 'xuân khánh', 'xuan khanh', 'ninh kiều', 'ninh kieu']
    },
    { 
      id: 'cai_khe', 
      name: 'Phường Cái Khế', 
      description: 'Từ P. An Hòa, Cái Khế cũ, một phần Bùi Hữu Nghĩa',
      oldWards: ['an hòa', 'an hoa', 'cái khế', 'cai khe', 'bùi hữu nghĩa', 'bui huu nghia']
    },
    { 
      id: 'tan_an', 
      name: 'Phường Tân An', 
      description: 'Từ P. An Khánh, Hưng Lợi cũ',
      oldWards: ['an khánh', 'an khanh', 'hưng lợi', 'hung loi']
    },
    { 
      id: 'an_binh', 
      name: 'Phường An Bình', 
      description: 'Từ P. An Bình cũ, xã Mỹ Khánh, một phần Long Tuyền',
      oldWards: ['an bình', 'an binh', 'mỹ khánh', 'my khanh', 'long tuyền', 'long tuyen']
    }
  ];
  
  // Store location (địa chỉ ảo cho demo)
  const STORE_LOCATION = {
    lat: 10.0310,
    lng: 105.7690,
    address: '123 Đường 3/2, Phường Ninh Kiều, Q. Ninh Kiều, TP. Cần Thơ'
  };
  
  const DELIVERY_FEE = 8000; // Phí giao hàng cố định
  
  // Kiểm tra địa chỉ thuộc phường nào trong 4 phường mới
  const detectWard = (address) => {
    if (!address) return null;
    const addressLower = address.toLowerCase();
    
    // Kiểm tra có Cần Thơ không
    const hasCanTho = addressLower.includes('cần thơ') || addressLower.includes('can tho');
    if (!hasCanTho) return null;
    
    // Tìm phường phù hợp
    for (const ward of ALLOWED_WARDS) {
      if (ward.oldWards.some(keyword => addressLower.includes(keyword))) {
        return ward;
      }
    }
    return null;
  };
  
  // Kiểm tra địa chỉ có hợp lệ không
  const checkIsValidAddress = (address) => {
    return detectWard(address) !== null;
  };
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, ONLINE, CARD

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState(''); // Dùng để hiển thị địa chỉ đầy đủ

  // Tự động ghép địa chỉ khi chọn phường hoặc nhập số nhà/đường
  useEffect(() => {
    if (selectedWard && streetAddress.trim()) {
      const ward = ALLOWED_WARDS.find(w => w.id === selectedWard);
      if (ward) {
        const fullAddress = `${streetAddress.trim()}, ${ward.name}, TP. Cần Thơ`;
        setDeliveryInfo(prev => ({
          ...prev,
          deliveryAddress: fullAddress,
          deliveryFee: DELIVERY_FEE
        }));
        setSearchQuery(fullAddress);
        
        // Geocode địa chỉ để lấy tọa độ
        geocodeAddress(fullAddress, ward.name);
      }
    } else if (!selectedWard || !streetAddress.trim()) {
      setDeliveryInfo(prev => ({
        ...prev,
        deliveryAddress: '',
        latitude: null,
        longitude: null,
        distance: null,
        deliveryFee: 0
      }));
      setSearchQuery('');
    }
  }, [selectedWard, streetAddress]);
  
  // Geocode địa chỉ để lấy tọa độ và tính khoảng cách
  const geocodeAddress = async (fullAddress, wardName) => {
    try {
      // Tìm theo tên phường trước
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(wardName + ', Cần Thơ, Việt Nam')}&limit=1&addressdetails=1&accept-language=vi`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const distance = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);
        
        setDeliveryInfo(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          distance: distance,
          deliveryFee: DELIVERY_FEE
        }));
        
        // Cập nhật marker trên bản đồ
        if (mapInstanceRef.current) {
          if (markerRef.current) {
            mapInstanceRef.current.removeLayer(markerRef.current);
          }
          const deliveryIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });
          markerRef.current = L.marker([lat, lng], { icon: deliveryIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`Giao đến: ${fullAddress}`);
          
          mapInstanceRef.current.setView([lat, lng], 15);
        }
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  useEffect(() => {
    loadCart();
    if (isCustomerLoggedIn()) {
      loadCustomerInfo();
    }
  }, []);

  // Load Leaflet map when DELIVERY is selected
  useEffect(() => {
    if (orderType !== 'DELIVERY') {
      // Cleanup when switching away from DELIVERY
      cleanupMap();
      return;
    }

    // Initialize Leaflet map
    if (mapRef.current && !mapInstanceRef.current) {
      initMap();
    }
    
    return () => {
      cleanupMap();
    };
  }, [orderType]);

  const cleanupMap = () => {
    if (markerRef.current) {
      mapInstanceRef.current?.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    // Không cần xóa circle nữa - đã bỏ vòng tròn bán kính
    if (storeMarkerRef.current) {
      mapInstanceRef.current?.removeLayer(storeMarkerRef.current);
      storeMarkerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const initMap = () => {
    if (!mapRef.current) {
      console.error('Map container chưa được mount');
      return;
    }

    try {
      // Initialize Leaflet map
      const map = L.map(mapRef.current).setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 14);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add store marker (red)
      const storeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      storeMarkerRef.current = L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], { icon: storeIcon })
        .addTo(map)
        .bindPopup('Quán của chúng tôi');

      // Click trên bản đồ để chọn địa chỉ
      map.on('click', async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        try {
          // Reverse geocoding using Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`
          );
          const data = await response.json();

          if (data && data.display_name) {
            const address = data.display_name;
            const detectedWard = detectWard(address);
            
            if (!detectedWard) {
              toast.error('Vị trí này không thuộc 4 phường được giao hàng (Ninh Kiều, Cái Khế, Tân An, An Bình). Vui lòng chọn vị trí khác.');
              return;
            }
            
            // Trích xuất số nhà/đường từ địa chỉ
            let street = '';
            if (data.address) {
              const parts = [];
              if (data.address.house_number) parts.push(data.address.house_number);
              if (data.address.road) parts.push(data.address.road);
              if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
              street = parts.join(' ') || address.split(',')[0];
            } else {
              street = address.split(',')[0];
            }
            
            const distance = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);
            
            // Tự động điền vào các field
            setSelectedWard(detectedWard.id);
            setStreetAddress(street);
            
            // Update delivery info
            const fullAddress = `${street}, ${detectedWard.name}, Q. Ninh Kiều, TP. Cần Thơ`;
            setDeliveryInfo(prev => ({
              ...prev,
              deliveryAddress: fullAddress,
              latitude: lat,
              longitude: lng,
              distance: distance,
              deliveryFee: DELIVERY_FEE
            }));
            setSearchQuery(fullAddress);

            // Add/update marker (blue)
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
            }
            const deliveryIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
            markerRef.current = L.marker([lat, lng], { icon: deliveryIcon })
              .addTo(map)
              .bindPopup(`Giao đến: ${fullAddress}`);

            map.setView([lat, lng], 16);

            toast.success(`✓ ${detectedWard.name} - Cách quán ${distance.toFixed(2)}km - Phí ship: ${DELIVERY_FEE.toLocaleString()}đ`);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          toast.error('Không thể lấy địa chỉ từ vị trí này. Vui lòng thử lại.');
        }
      });
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      toast.error('Có lỗi xảy ra khi khởi tạo bản đồ. Vui lòng thử lại.');
    }
  };

  // Enrich cart items with price information
  const enrichCartItems = async (items) => {
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const { data: itemDetail } = await customerApi.getItemDetail(item.item_id);
          const variant = itemDetail.variants?.find(v => v.id === item.variant_id);
          
          return {
            ...item,
            price: variant?.gia || itemDetail.gia_mac_dinh || 0
          };
        } catch (error) {
          console.error(`Error loading item ${item.item_id}:`, error);
          return {
            ...item,
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
      
      if (data.items.length === 0) {
        toast.warning('Giỏ hàng trống');
        navigate('/customer/cart');
        return;
      }

      // Enrich cart items with price information
      const enrichedItems = await enrichCartItems(data.items);
      setCart({
        ...data,
        items: enrichedItems
      });
    } catch (error) {
      console.error('Error loading cart:', error);
      navigate('/customer/cart');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInfo = async () => {
    try {
      const { data } = await customerApi.getProfile();
      setCustomerInfo({
        fullName: data.fullName || '',
        phone: data.phone || '',
        email: data.email || ''
      });
    } catch (error) {
      console.error('Error loading customer info:', error);
    }
  };

  const loadAvailableTables = async () => {
    try {
      setLoadingTables(true);
      const { data } = await customerApi.getAvailableTables();
      setAvailableTables(data || []);
    } catch (error) {
      console.error('Error loading available tables:', error);
      toast.error('Không thể tải danh sách bàn: ' + error.message);
    } finally {
      setLoadingTables(false);
    }
  };

  const calculateSubtotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 0);
    }, 0);
  };

  const calculateDeliveryFee = () => {
    if (orderType === 'DELIVERY' && deliveryInfo.deliveryFee) {
      return deliveryInfo.deliveryFee;
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = cart?.promoDiscount || 0;
    const deliveryFee = calculateDeliveryFee();
    return Math.max(0, subtotal - discount + deliveryFee);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!customerInfo.fullName || !customerInfo.phone) {
      toast.warning('Vui lòng nhập đầy đủ thông tin khách hàng');
      return;
    }

    if (orderType === 'TAKEAWAY' && !pickupInfo.pickupTime) {
      toast.warning('Vui lòng chọn thời gian đến lấy hàng');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!selectedWard) {
        toast.warning('Vui lòng chọn phường giao hàng');
        return;
      }
      if (!streetAddress.trim()) {
        toast.warning('Vui lòng nhập số nhà, tên đường');
        return;
      }
      if (!deliveryInfo.deliveryAddress.trim()) {
        toast.warning('Vui lòng điền đầy đủ địa chỉ giao hàng');
        return;
      }
      if (!deliveryInfo.deliveryPhone.trim()) {
        toast.warning('Vui lòng nhập số điện thoại người nhận');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Prepare cart items with cups format for options/toppings
      const cartItemsWithCups = await Promise.all(
        cart.items.map(async (item) => {
          const hasOptions = item.options && Object.keys(item.options).length > 0;
          const hasToppings = item.toppings && Object.keys(item.toppings).length > 0;
          const hasNotes = item.notes && item.notes.trim().length > 0;
          
          if (hasOptions || hasToppings || hasNotes) {
            // Load item detail to get option/topping metadata
            let itemDetail = null;
            try {
              const { data } = await customerApi.getItemDetail(item.item_id);
              itemDetail = data;
            } catch (error) {
              console.error('Error loading item detail:', error);
            }

            // Convert options and toppings to cups format
            const convertedOptions = {};
            if (hasOptions && itemDetail?.options) {
              for (const [optionId, mucId] of Object.entries(item.options)) {
                const option = itemDetail.options.find(opt => opt.id === parseInt(optionId));
                if (option) {
                  const muc = option.muc_tuy_chon?.find(m => m.id === parseInt(mucId));
                  if (muc && option.ma) {
                    if (option.loai === 'PERCENT') {
                      convertedOptions[option.ma] = muc.he_so || 0.5;
                    } else if (option.loai === 'AMOUNT') {
                      convertedOptions[option.ma] = { so_luong: muc.he_so || 1 };
                    }
                  }
                }
              }
            }

            if (hasToppings && itemDetail?.options) {
              for (const [toppingId, quantity] of Object.entries(item.toppings)) {
                const topping = itemDetail.options.find(opt => 
                  opt.id === parseInt(toppingId) && opt.loai === 'AMOUNT'
                );
                if (topping && topping.ma && quantity > 0) {
                  convertedOptions[topping.ma] = { so_luong: quantity };
                }
              }
            }

            // Create cups array (one cup per quantity)
            const cups = [];
            for (let i = 0; i < item.quantity; i++) {
              cups.push({
                tuy_chon: convertedOptions,
                ghi_chu: hasNotes ? item.notes : null
              });
            }

            return {
              ...item,
              cups
            };
          }

          return item;
        })
      );

      // Create order using customer API (works for both logged-in and guest users)
      const orderResponse = await customerApi.createOrder({
        orderType,
        customerInfo,
        deliveryInfo: orderType === 'DELIVERY' ? deliveryInfo : null,
        cartItems: cartItemsWithCups
      });

      const orderId = orderResponse.data.id;

      // For now, orders are created as OPEN status
      // Payment processing can be added later if needed
      
      toast.success(`Đơn hàng #${orderId} đã được tạo thành công!`);
      
      // Dispatch event to refresh cart count in header
      window.dispatchEvent(new CustomEvent('cart-updated'));
      
      // Redirect to success page
      navigate(`/customer/orders/success?orderId=${orderId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Không thể tạo đơn hàng: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setSubmitting(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/customer/cart')}
          className="flex items-center space-x-2 text-gray-600 hover:text-[#c9975b] mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại giỏ hàng</span>
        </button>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Thanh toán</h1>
        <p className="text-lg text-gray-600">Hoàn tất thông tin để đặt hàng</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Type */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Loại đơn hàng</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOrderType('TAKEAWAY')}
                  className={`p-4 border-2 rounded-lg transition ${
                    orderType === 'TAKEAWAY'
                      ? 'border-[#c9975b] bg-[#c9975b]/10'
                      : 'border-gray-300 hover:border-[#c9975b]'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Mang đi</div>
                  <div className="text-sm text-gray-600 mt-1">Đến quán lấy hàng</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('DELIVERY')}
                  className={`p-4 border-2 rounded-lg transition ${
                    orderType === 'DELIVERY'
                      ? 'border-[#c9975b] bg-[#c9975b]/10'
                      : 'border-gray-300 hover:border-[#c9975b]'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Giao hàng</div>
                  <div className="text-sm text-gray-600 mt-1">Giao hàng tận nhà</div>
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin khách hàng</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerInfo.fullName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Pickup Info (for takeaway) */}
            {orderType === 'TAKEAWAY' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin đến lấy hàng</h2>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Đơn hàng "Mang đi" là khách hàng đến lấy tại quán, không phải giao hàng tận nhà.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời gian đến lấy <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={pickupInfo.pickupTime}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, pickupTime: e.target.value })}
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Chọn thời gian bạn muốn đến quán để lấy hàng</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú đặc biệt
                    </label>
                    <textarea
                      value={pickupInfo.notes}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, notes: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      placeholder="Ví dụ: Ít đá, không đường, gói riêng..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Info (for delivery) */}
            {orderType === 'DELIVERY' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin giao hàng</h2>
                
                {/* Store location info */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Địa chỉ quán:</p>
                      <p className="text-sm text-blue-800">{STORE_LOCATION.address}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Giao hàng: 4 phường Q. Ninh Kiều (Ninh Kiều, Cái Khế, Tân An, An Bình)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Bản đồ - Click để chọn địa chỉ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn vị trí trên bản đồ <span className="text-gray-400 font-normal">(hoặc tự nhập bên dưới)</span>
                    </label>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                      <div 
                        ref={mapRef}
                        className="w-full h-72 cursor-crosshair"
                        style={{ 
                          minHeight: '288px',
                          position: 'relative',
                          zIndex: 1
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Click vào bản đồ để chọn vị trí giao hàng. Chỉ chấp nhận 4 phường: Ninh Kiều, Cái Khế, Tân An, An Bình
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-400">hoặc tự nhập</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  
                  {/* Chọn phường */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn phường <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent bg-white"
                    >
                      <option value="">-- Chọn phường --</option>
                      {ALLOWED_WARDS.map(ward => (
                        <option key={ward.id} value={ward.id}>
                          {ward.name} ({ward.description})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Nhập số nhà, tên đường */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số nhà, tên đường <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      placeholder="Ví dụ: 123 Đường 3/2, Hẻm 5..."
                    />
                  </div>
                  
                  {/* Hiển thị địa chỉ đầy đủ đã ghép */}
                  {deliveryInfo.deliveryAddress && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-900">Địa chỉ giao hàng:</p>
                          <p className="text-sm text-green-800">{deliveryInfo.deliveryAddress}</p>
                          {deliveryInfo.distance !== null && (
                            <p className="text-xs text-green-600 mt-1">
                              Khoảng cách: <strong>{deliveryInfo.distance.toFixed(2)}km</strong> từ quán
                              {deliveryInfo.deliveryFee > 0 && (
                                <> • Phí ship: <strong>{deliveryInfo.deliveryFee.toLocaleString('vi-VN')}đ</strong></>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số điện thoại người nhận <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={deliveryInfo.deliveryPhone}
                      onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryPhone: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      placeholder="Số điện thoại người nhận hàng"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời gian muốn nhận hàng
                    </label>
                    <input
                      type="datetime-local"
                      value={deliveryInfo.deliveryTime}
                      onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryTime: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Chọn thời gian bạn muốn nhận hàng (tùy chọn)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú địa chỉ
                    </label>
                    <textarea
                      value={deliveryInfo.deliveryNotes}
                      onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryNotes: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      placeholder="Ví dụ: Chung cư ABC, tầng 5, căn hộ 501, chuông cửa số 501..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Phương thức thanh toán</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`w-full p-4 border-2 rounded-lg transition flex items-center space-x-3 ${
                    paymentMethod === 'CASH'
                      ? 'border-[#c9975b] bg-[#c9975b]/10'
                      : 'border-gray-300 hover:border-[#c9975b]'
                  }`}
                >
                  <Wallet className="w-6 h-6 text-[#c9975b]" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Tiền mặt</div>
                    <div className="text-sm text-gray-600">Thanh toán khi nhận hàng</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`w-full p-4 border-2 rounded-lg transition flex items-center space-x-3 ${
                    paymentMethod === 'ONLINE'
                      ? 'border-[#c9975b] bg-[#c9975b]/10'
                      : 'border-gray-300 hover:border-[#c9975b]'
                  }`}
                >
                  <Smartphone className="w-6 h-6 text-[#c9975b]" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Thanh toán online</div>
                    <div className="text-sm text-gray-600">Quét QR hoặc chuyển khoản</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>

              {/* Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Món #{item.item_id} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {/* Price sẽ được tính từ backend khi tạo order */}
                      ---
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-3 mb-6 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{calculateSubtotal().toLocaleString('vi-VN')}đ</span>
                </div>
                {orderType === 'DELIVERY' && deliveryInfo.deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí giao hàng</span>
                    <span>{deliveryInfo.deliveryFee.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {cart.promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span>-{cart.promoDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                  <span className="text-2xl font-bold text-[#c9975b]">
                    {calculateTotal().toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

