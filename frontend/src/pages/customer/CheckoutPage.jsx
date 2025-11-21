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
    deliveryAddress: '',  // Địa chỉ giao hàng
    deliveryPhone: '',   // Số điện thoại người nhận
    deliveryTime: '',     // Thời gian muốn nhận hàng
    deliveryNotes: '',    // Ghi chú địa chỉ
    latitude: null,       // Vĩ độ
    longitude: null,      // Kinh độ
    distance: null,       // Khoảng cách từ quán (km)
    deliveryFee: 0        // Phí giao hàng
  });
  
  // Store location (gần Đại học Cần Thơ)
  const STORE_LOCATION = {
    lat: 10.0310,
    lng: 105.7690,
    address: 'Đường 3/2, Ninh Kiều, Cần Thơ' // Gần Đại học Cần Thơ
  };
  
  const MAX_DELIVERY_DISTANCE = 2; // 2km
  const DELIVERY_FEE = 8000; // Phí giao hàng cố định
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, ONLINE, CARD

  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadCart();
    if (isCustomerLoggedIn()) {
      loadCustomerInfo();
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    if (circleRef.current) {
      mapInstanceRef.current?.removeLayer(circleRef.current);
      circleRef.current = null;
    }
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
      const map = L.map(mapRef.current).setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 15);

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

      // Add delivery radius circle (2km)
      circleRef.current = L.circle([STORE_LOCATION.lat, STORE_LOCATION.lng], {
        color: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        radius: MAX_DELIVERY_DISTANCE * 1000 // Convert km to meters
      }).addTo(map);

      // Add click listener to map for selecting location
      map.on('click', async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const distance = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);

        if (distance > MAX_DELIVERY_DISTANCE) {
          toast.error(`Vị trí này cách quán ${distance.toFixed(2)}km, vượt quá bán kính giao hàng ${MAX_DELIVERY_DISTANCE}km. Vui lòng chọn vị trí gần hơn.`);
          return;
        }

        // Reverse geocoding using Nominatim (free, no API key needed)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`
          );
          const data = await response.json();

          if (data && data.display_name) {
            const address = data.display_name;
            const deliveryFee = DELIVERY_FEE;

            // Update delivery info
            setDeliveryInfo(prev => ({
              ...prev,
              deliveryAddress: address,
              latitude: lat,
              longitude: lng,
              distance: distance,
              deliveryFee: deliveryFee
            }));

            // Update search input
            setSearchQuery(address);
            setSearchResults([]);

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
              .bindPopup('Địa chỉ giao hàng');

            map.setView([lat, lng], 16);

            toast.success(`Đã chọn vị trí! Cách quán ${distance.toFixed(2)}km - Phí ship: ${DELIVERY_FEE.toLocaleString()}đ`);
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

  // Search address using Nominatim (free geocoding service)
  const searchAddress = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi`
      );
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('Không thể tìm kiếm địa chỉ. Vui lòng thử lại.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle address selection from search results
  const handleAddressSelect = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const distance = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng);

    if (distance > MAX_DELIVERY_DISTANCE) {
      toast.error(`Địa chỉ này cách quán ${distance.toFixed(2)}km, vượt quá bán kính giao hàng ${MAX_DELIVERY_DISTANCE}km. Vui lòng chọn địa chỉ gần hơn.`);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const address = result.display_name;
    const deliveryFee = DELIVERY_FEE;

    // Update delivery info
    setDeliveryInfo(prev => ({
      ...prev,
      deliveryAddress: address,
      latitude: lat,
      longitude: lng,
      distance: distance,
      deliveryFee: deliveryFee
    }));

    // Update search input
    setSearchQuery(address);
    setSearchResults([]);

    // Add/update marker
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }
    if (mapInstanceRef.current) {
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
        .bindPopup('Địa chỉ giao hàng');

      mapInstanceRef.current.setView([lat, lng], 16);
    }

    toast.success(`Địa chỉ hợp lệ! Cách quán ${distance.toFixed(2)}km - Phí ship: ${DELIVERY_FEE.toLocaleString()}đ`);
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getCart();
      setCart(data);
      
      if (data.items.length === 0) {
        toast.warning('Giỏ hàng trống');
        navigate('/customer/cart');
      }
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
      if (!deliveryInfo.deliveryAddress.trim()) {
        toast.warning('Vui lòng chọn địa chỉ giao hàng');
        return;
      }
      if (!deliveryInfo.latitude || !deliveryInfo.longitude) {
        toast.warning('Vui lòng chọn địa chỉ từ bản đồ');
        return;
      }
      if (deliveryInfo.distance > MAX_DELIVERY_DISTANCE) {
        toast.error(`Địa chỉ này vượt quá bán kính giao hàng ${MAX_DELIVERY_DISTANCE}km`);
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
                      <p className="text-xs text-blue-600 mt-1">Bán kính giao hàng: {MAX_DELIVERY_DISTANCE}km</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn địa chỉ giao hàng trên bản đồ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={autocompleteRef}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchAddress(e.target.value);
                        }}
                        onFocus={() => {
                          if (searchQuery.length >= 3) {
                            searchAddress(searchQuery);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                        placeholder="Nhập địa chỉ hoặc click trên bản đồ..."
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((result, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleAddressSelect(result)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-[#c9975b] flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{result.display_name}</p>
                                  {result.address && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {result.address.road && `${result.address.road}, `}
                                      {result.address.ward && `${result.address.ward}, `}
                                      {result.address.district && `${result.address.district}, `}
                                      {result.address.city && result.address.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {deliveryInfo.deliveryAddress && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">{deliveryInfo.deliveryAddress}</span>
                        </div>
                        {deliveryInfo.distance !== null && (
                          <p className="text-xs mt-1">
                            Khoảng cách: <strong>{deliveryInfo.distance.toFixed(2)}km</strong> từ quán
                            {deliveryInfo.deliveryFee > 0 && (
                              <> • Phí ship: <strong>{deliveryInfo.deliveryFee.toLocaleString('vi-VN')}đ</strong></>
                            )}
                          </p>
                        )}
                        {deliveryInfo.distance === null && deliveryInfo.deliveryAddress && (
                          <p className="text-xs mt-1 text-yellow-600">
                            ⚠️ Vui lòng chọn địa chỉ từ danh sách gợi ý hoặc click trên bản đồ
                          </p>
                        )}
                      </div>
                    )}
                    {deliveryInfo.distance !== null && deliveryInfo.distance > MAX_DELIVERY_DISTANCE && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Địa chỉ này vượt quá bán kính giao hàng {MAX_DELIVERY_DISTANCE}km</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Leaflet Map (OpenStreetMap - Free, no API key needed) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bản đồ
                    </label>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                      <div 
                        ref={mapRef}
                        className="w-full h-80"
                        style={{ 
                          minHeight: '320px',
                          position: 'relative',
                          zIndex: 1
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Click trên bản đồ hoặc nhập địa chỉ để chọn vị trí giao hàng (trong bán kính 2km)
                    </p>
                  </div>
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

