// Customer Service - Business logic for customer portal
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import customerRepository from '../repositories/customerRepository.js';
import promotionRepository from '../repositories/promotionRepository.js';
import { BadRequest, Unauthorized, NotFound } from '../utils/httpErrors.js';

// JWT secret for customer tokens (separate from staff)
const JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET || 'customer-secret-key';
const JWT_EXPIRES = process.env.CUSTOMER_JWT_EXPIRES || '30d';

export default {
  // ==================== AUTHENTICATION ====================

  /**
   * Register new customer account
   */
  async register({ phone, email, password, fullName }) {
    // Validate input
    if (!phone || !password || !fullName) {
      throw new BadRequest('Phone, password, và tên đầy đủ là bắt buộc');
    }

    // Check if phone already exists
    const existingPhone = await customerRepository.findByPhone(phone);
    if (existingPhone) {
      throw new BadRequest('Số điện thoại đã được đăng ký');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await customerRepository.findByEmail(email);
      if (existingEmail) {
        throw new BadRequest('Email đã được đăng ký');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create account
    const account = await customerRepository.createAccount({
      phone,
      email: email || null,
      passwordHash,
      fullName
    });

    // Generate token
    const token = jwt.sign(
      { 
        customerId: account.id, 
        phone: account.phone,
        type: 'customer' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      account: {
        id: account.id,
        phone: account.phone,
        email: account.email,
        fullName: account.full_name,
        loyaltyPoints: account.loyalty_points
      },
      token
    };
  },

  /**
   * Login customer
   */
  async login({ phoneOrEmail, password }) {
    // Find account by phone or email
    let account;
    if (phoneOrEmail.includes('@')) {
      account = await customerRepository.findByEmail(phoneOrEmail);
    } else {
      account = await customerRepository.findByPhone(phoneOrEmail);
    }

    if (!account) {
      throw new Unauthorized('Số điện thoại/Email hoặc mật khẩu không đúng');
    }

    if (!account.is_active) {
      throw new Unauthorized('Tài khoản đã bị khóa');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, account.password_hash);
    if (!validPassword) {
      throw new Unauthorized('Số điện thoại/Email hoặc mật khẩu không đúng');
    }

    // Generate token
    const token = jwt.sign(
      { 
        customerId: account.id, 
        phone: account.phone,
        type: 'customer' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      account: {
        id: account.id,
        phone: account.phone,
        email: account.email,
        fullName: account.full_name,
        loyaltyPoints: account.loyalty_points
      },
      token
    };
  },

  /**
   * Get customer profile
   */
  async getProfile(customerId) {
    const account = await customerRepository.findById(customerId);
    if (!account) {
      throw new NotFound('Tài khoản không tồn tại');
    }

    return {
      id: account.id,
      phone: account.phone,
      email: account.email,
      fullName: account.full_name,
      dateOfBirth: account.date_of_birth,
      gender: account.gender,
      address: account.address,
      loyaltyPoints: account.loyalty_points,
      emailVerified: account.email_verified,
      phoneVerified: account.phone_verified,
      createdAt: account.created_at
    };
  },

  /**
   * Update customer profile
   */
  async updateProfile(customerId, updates) {
    // If updating email, check uniqueness
    if (updates.email) {
      const existing = await customerRepository.findByEmail(updates.email);
      if (existing && existing.id !== customerId) {
        throw new BadRequest('Email đã được sử dụng');
      }
    }

    // If updating password, hash it
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const updated = await customerRepository.updateAccount(customerId, updates);
    if (!updated) {
      throw new NotFound('Tài khoản không tồn tại');
    }

    return {
      id: updated.id,
      phone: updated.phone,
      email: updated.email,
      fullName: updated.full_name,
      dateOfBirth: updated.date_of_birth,
      gender: updated.gender,
      address: updated.address,
      loyaltyPoints: updated.loyalty_points
    };
  },

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'customer') {
        throw new Unauthorized('Token không hợp lệ');
      }
      return decoded;
    } catch (error) {
      throw new Unauthorized('Token không hợp lệ hoặc đã hết hạn');
    }
  },

  // ==================== CART ====================

  /**
   * Get or create cart
   */
  async getOrCreateCart({ customerId, sessionId }) {
    let cart;

    if (customerId) {
      cart = await customerRepository.getCartByCustomerId(customerId);
    } else if (sessionId) {
      cart = await customerRepository.getCartBySessionId(sessionId);
    } else {
      throw new BadRequest('Cần customerId hoặc sessionId');
    }

    // Create new cart if not exists
    if (!cart) {
      cart = await customerRepository.createCart({
        customerId: customerId || null,
        sessionId: sessionId || null,
        items: []
      });
    }

    return {
      id: cart.id,
      items: cart.items || [],
      promoCode: cart.promo_code,
      promoDiscount: cart.promo_discount || 0,
      expiresAt: cart.expires_at
    };
  },

  /**
   * Add item to cart
   */
  async addToCart({ customerId, sessionId, item }) {
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    const items = cart.items || [];

    // Check if item already exists (same item_id, variant_id, options)
    const existingIndex = items.findIndex(cartItem => 
      cartItem.item_id === item.item_id &&
      cartItem.variant_id === item.variant_id &&
      JSON.stringify(cartItem.options || {}) === JSON.stringify(item.options || {})
    );

    if (existingIndex >= 0) {
      // Update quantity
      items[existingIndex].quantity += item.quantity;
    } else {
      // Add new item
      items.push({
        item_id: item.item_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        options: item.options || {},
        toppings: item.toppings || {},
        notes: item.notes || ''
      });
    }

    const updated = await customerRepository.updateCartItems(cart.id, items);
    return {
      id: updated.id,
      items: updated.items,
      promoCode: updated.promo_code,
      promoDiscount: updated.promo_discount || 0
    };
  },

  /**
   * Update cart item quantity
   */
  async updateCartItem({ customerId, sessionId, itemIndex, quantity }) {
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    const items = cart.items || [];

    if (itemIndex < 0 || itemIndex >= items.length) {
      throw new BadRequest('Item không tồn tại trong giỏ hàng');
    }

    if (quantity <= 0) {
      // Remove item
      items.splice(itemIndex, 1);
    } else {
      // Update quantity
      items[itemIndex].quantity = quantity;
    }

    const updated = await customerRepository.updateCartItems(cart.id, items);
    return {
      id: updated.id,
      items: updated.items,
      promoCode: updated.promo_code,
      promoDiscount: updated.promo_discount || 0
    };
  },

  /**
   * Remove item from cart
   */
  async removeFromCart({ customerId, sessionId, itemIndex }) {
    return this.updateCartItem({ customerId, sessionId, itemIndex, quantity: 0 });
  },

  /**
   * Clear cart
   */
  async clearCart({ customerId, sessionId }) {
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    const updated = await customerRepository.updateCartItems(cart.id, []);
    // Clear promo when clearing cart
    await customerRepository.clearPromoCode(cart.id);
    return {
      id: updated.id,
      items: [],
      promoCode: null,
      promoDiscount: 0
    };
  },

  /**
   * Apply promo code to cart
   */
  async applyPromoCodeToCart({ customerId, sessionId, promoCode }) {
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    
    if (!promoCode || !promoCode.trim()) {
      throw new BadRequest('Vui lòng nhập mã khuyến mãi');
    }

    // Find promotion by code
    const promotion = await promotionRepository.getByCode(promoCode.trim().toUpperCase());
    
    if (!promotion) {
      throw new BadRequest('Mã khuyến mãi không tồn tại');
    }

    // Check if promotion is active
    if (!promotion.active) {
      throw new BadRequest('Mã khuyến mãi không còn hiệu lực');
    }

    // Check date validity
    const now = new Date();
    if (promotion.bat_dau && new Date(promotion.bat_dau) > now) {
      throw new BadRequest('Mã khuyến mãi chưa có hiệu lực');
    }
    if (promotion.ket_thuc && new Date(promotion.ket_thuc) < now) {
      throw new BadRequest('Mã khuyến mãi đã hết hạn');
    }

    // Calculate cart subtotal from items
    const items = cart.items || [];
    let subtotal = 0;
    
    for (const item of items) {
      // Get item price from variant
      if (item.variant_id) {
        const variant = await customerRepository.getVariantById(item.variant_id);
        if (variant) {
          subtotal += (variant.gia || 0) * (item.quantity || 0);
        }
      } else if (item.price) {
        // Fallback to item price if available
        subtotal += (item.price || 0) * (item.quantity || 0);
      }
    }

    // Check minimum order value if specified
    if (promotion.don_hang_toi_thieu && subtotal < promotion.don_hang_toi_thieu) {
      throw new BadRequest(`Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(promotion.don_hang_toi_thieu)} đ để sử dụng mã này`);
    }

    // Calculate discount based on promotion type
    let discount = 0;
    if (promotion.loai === 'PERCENT') {
      // Percentage discount
      const percent = promotion.gia_tri || 0;
      discount = Math.floor(subtotal * percent / 100);
      if (promotion.gia_tri_toi_da) {
        discount = Math.min(discount, promotion.gia_tri_toi_da);
      }
    } else if (promotion.loai === 'FIXED') {
      // Fixed amount discount
      discount = promotion.gia_tri || 0;
      if (discount > subtotal) {
        discount = subtotal; // Don't discount more than subtotal
      }
    }

    // Apply promo code to cart
    const updated = await customerRepository.applyPromoCode(
      cart.id,
      promotion.ma,
      discount
    );

    return {
      id: updated.id,
      items: cart.items,
      promoCode: updated.promo_code,
      promoDiscount: updated.promo_discount || 0
    };
  },

  /**
   * Clear promo code from cart
   */
  async clearPromoCodeFromCart({ customerId, sessionId }) {
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    const updated = await customerRepository.clearPromoCode(cart.id);
    return {
      id: updated.id,
      items: cart.items,
      promoCode: null,
      promoDiscount: 0
    };
  },

  // ==================== PUBLIC MENU ====================

  /**
   * Get menu categories
   */
  async getCategories() {
    try {
      console.log('📋 Service: Getting categories...');
      const categories = await customerRepository.getActiveCategories();
      console.log('✅ Service: Categories loaded:', categories?.length || 0);
      return categories;
    } catch (error) {
      console.error('❌ Service: Error getting categories:', error);
      throw error;
    }
  },

  /**
   * Get menu items
   */
  async getMenuItems(categoryId = null) {
    return await customerRepository.getMenuItems(categoryId);
  },

  /**
   * Get item detail with variants and options
   */
  async getItemDetail(itemId) {
    const item = await customerRepository.getItemDetail(itemId);
    if (!item) {
      throw new NotFound('Sản phẩm không tồn tại');
    }

    const variants = await customerRepository.getItemVariants(itemId);
    const options = await customerRepository.getItemOptions(itemId);

    return {
      ...item,
      variants,
      options
    };
  },

  /**
   * Search items
   */
  async searchItems(keyword) {
    if (!keyword || keyword.length < 2) {
      throw new BadRequest('Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
    }
    return await customerRepository.searchItems(keyword);
  },

  // ==================== ORDERS ====================

  /**
   * Get customer orders
   */
  async getOrders(customerId, { limit = 20, offset = 0 } = {}) {
    return await customerRepository.getCustomerOrders(customerId, { limit, offset });
  },

  /**
   * Get order detail
   */
  async getOrderDetail(orderId, customerId) {
    const order = await customerRepository.getOrderDetail(orderId, customerId);
    if (!order) {
      throw new NotFound('Đơn hàng không tồn tại');
    }

    const items = await customerRepository.getOrderItems(orderId);
    return {
      ...order,
      items
    };
  },

  // ==================== RESERVATIONS ====================

  /**
   * Get customer reservations
   */
  async getReservations(customerId, { limit = 20, offset = 0 } = {}) {
    return await customerRepository.getCustomerReservations(customerId, { limit, offset });
  },

  /**
   * Get reservation detail
   */
  async getReservationDetail(reservationId, customerId) {
    const reservation = await customerRepository.getReservationDetail(reservationId, customerId);
    if (!reservation) {
      throw new NotFound('Đặt bàn không tồn tại');
    }
    return reservation;
  },

  /**
   * Get available tables (public, no auth required)
   */
  async getAvailableTables({ areaId = null, minCapacity = null } = {}) {
    return await customerRepository.getAvailableTables({ areaId, minCapacity });
  },

  // ==================== ORDERS ====================

  /**
   * Create order from cart
   */
  async createOrderFromCart({ customerId, sessionId, orderType, customerInfo, cartItems, deliveryInfo = null }) {
    // Get cart
    const cart = await this.getOrCreateCart({ customerId, sessionId });
    
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequest('Giỏ hàng trống');
    }

    // Validate order type
    if (!['TAKEAWAY', 'DELIVERY'].includes(orderType)) {
      throw new BadRequest('Loại đơn hàng không hợp lệ');
    }

    // Validate customer info
    if (!customerInfo || !customerInfo.fullName || !customerInfo.phone) {
      throw new BadRequest('Vui lòng nhập đầy đủ thông tin khách hàng');
    }

    // Validate delivery info if DELIVERY
    if (orderType === 'DELIVERY') {
      if (!deliveryInfo || !deliveryInfo.deliveryAddress) {
        throw new BadRequest('Vui lòng nhập địa chỉ giao hàng');
      }
    }

    // Create order
    const order = await customerRepository.createOrderFromCart({
      customerId,
      orderType,
      customerInfo
    });

    // Add items from cart to order
    for (const item of cartItems) {
      // Convert cart item format to order item format
      const cups = item.cups || [];
      
      await customerRepository.addItemToOrder({
        orderId: order.id,
        monId: item.item_id,
        bienTheId: item.variant_id || null,
        soLuong: item.quantity,
        donGia: item.price,
        giamGia: item.discount || 0,
        ghiChu: item.notes || null,
        cups: cups.length > 0 ? cups : null
      });
    }

    // Save delivery info if DELIVERY
    if (orderType === 'DELIVERY' && deliveryInfo) {
      // Đảm bảo phí giao hàng là 8000đ (cố định)
      const deliveryInfoWithFee = {
        ...deliveryInfo,
        deliveryFee: 8000
      };
      await customerRepository.saveDeliveryInfo(order.id, deliveryInfoWithFee);
    }

    // Clear cart after order created
    await customerRepository.clearCart(cart.id);

    // Emit SSE event để thu ngân biết có đơn mới từ Customer Portal
    try {
      const { emitEvent } = await import('../utils/sse.js');
      emitEvent('order.created', { 
        orderId: order.id, 
        orderType: order.order_type,
        source: 'customer_portal',
        ca_lam_id: order.ca_lam_id 
      });
      emitEvent('order.updated', { orderId: order.id });
    } catch (error) {
      console.error('Error emitting SSE event:', error);
      // Không throw error, chỉ log
    }

    return order;
  }
};

