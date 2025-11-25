// Customer Controller - Handle HTTP requests for customer portal
import customerService from '../services/customerService.js';
import { asyncHandler } from '../middleware/error.js';

export default {
  // ==================== AUTHENTICATION ====================

  /**
   * POST /api/v1/customer/auth/register
   * Register new customer account
   */
  register: asyncHandler(async (req, res) => {
    const { phone, email, password, fullName } = req.body;

    const result = await customerService.register({
      phone,
      email,
      password,
      fullName
    });

    res.status(201).json({
      success: true,
      data: result
    });
  }),

  /**
   * POST /api/v1/customer/auth/login
   * Login customer
   */
  login: asyncHandler(async (req, res) => {
    const { phoneOrEmail, password } = req.body;

    const result = await customerService.login({
      phoneOrEmail,
      password
    });

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * GET /api/v1/customer/auth/me
   * Get current customer profile
   */
  getProfile: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;

    const profile = await customerService.getProfile(customerId);

    res.json({
      success: true,
      data: profile
    });
  }),

  /**
   * PATCH /api/v1/customer/auth/me
   * Update customer profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;
    const updates = req.body;

    const updated = await customerService.updateProfile(customerId, updates);

    res.json({
      success: true,
      data: updated
    });
  }),

  /**
   * POST /api/v1/customer/auth/logout
   * Logout (client-side only, just return success)
   */
  logout: asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  }),

  // ==================== CART ====================

  /**
   * GET /api/v1/customer/cart
   * Get cart
   */
  getCart: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;

    const cart = await customerService.getOrCreateCart({
      customerId,
      sessionId
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * POST /api/v1/customer/cart/items
   * Add item to cart
   */
  addToCart: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;
    const item = req.body;

    const cart = await customerService.addToCart({
      customerId,
      sessionId,
      item
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * PATCH /api/v1/customer/cart/items/:index
   * Update cart item quantity
   */
  updateCartItem: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;
    const itemIndex = parseInt(req.params.index);
    const { quantity } = req.body;

    const cart = await customerService.updateCartItem({
      customerId,
      sessionId,
      itemIndex,
      quantity
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * DELETE /api/v1/customer/cart/items/:index
   * Remove item from cart
   */
  removeFromCart: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;
    const itemIndex = parseInt(req.params.index);

    const cart = await customerService.removeFromCart({
      customerId,
      sessionId,
      itemIndex
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * DELETE /api/v1/customer/cart
   * Clear cart
   */
  clearCart: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;

    const cart = await customerService.clearCart({
      customerId,
      sessionId
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * POST /api/v1/customer/cart/apply-promo
   * Apply promo code to cart
   */
  applyPromoCode: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;
    const { promoCode } = req.body;

    const cart = await customerService.applyPromoCodeToCart({
      customerId,
      sessionId,
      promoCode
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  /**
   * DELETE /api/v1/customer/cart/promo
   * Clear promo code from cart
   */
  clearPromoCode: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;

    const cart = await customerService.clearPromoCodeFromCart({
      customerId,
      sessionId
    });

    res.json({
      success: true,
      data: cart
    });
  }),

  // ==================== PUBLIC MENU ====================

  /**
   * GET /api/v1/customer/menu/categories
   * Get menu categories
   */
  getCategories: asyncHandler(async (req, res) => {
    try {
      console.log('📋 Getting categories...');
      const categories = await customerService.getCategories();
      console.log('✅ Categories loaded:', categories?.length || 0);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('❌ Error in getCategories:', error);
      throw error;
    }
  }),

  /**
   * GET /api/v1/customer/menu/items
   * Get menu items (all or by category)
   */
  getMenuItems: asyncHandler(async (req, res) => {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;

    const items = await customerService.getMenuItems(categoryId);

    res.json({
      success: true,
      data: items
    });
  }),

  /**
   * GET /api/v1/customer/menu/items/:id
   * Get item detail
   */
  getItemDetail: asyncHandler(async (req, res) => {
    const itemId = parseInt(req.params.id);

    const item = await customerService.getItemDetail(itemId);

    res.json({
      success: true,
      data: item
    });
  }),

  /**
   * GET /api/v1/customer/menu/items/:id/toppings
   * Get toppings for an item (optional variant_id)
   */
  getItemToppings: asyncHandler(async (req, res) => {
    const itemId = parseInt(req.params.id);
    const variantId = req.query.bien_the_id ? parseInt(req.query.bien_the_id) : null;

    const toppings = await customerService.getItemToppings(itemId, variantId);

    res.json({
      success: true,
      data: toppings
    });
  }),

  /**
   * GET /api/v1/customer/menu/search
   * Search items
   */
  searchItems: asyncHandler(async (req, res) => {
    const keyword = req.query.keyword || '';

    const items = await customerService.searchItems(keyword);

    res.json({
      success: true,
      data: items
    });
  }),

  // ==================== ORDERS ====================

  /**
   * GET /api/v1/customer/orders
   * Get customer orders
   */
  getOrders: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const orders = await customerService.getOrders(customerId, { limit, offset });

    res.json({
      success: true,
      data: orders
    });
  }),

  /**
   * GET /api/v1/customer/orders/:id
   * Get order detail
   */
  getOrderDetail: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;
    const orderId = parseInt(req.params.id);

    const order = await customerService.getOrderDetail(orderId, customerId);

    res.json({
      success: true,
      data: order
    });
  }),

  // ==================== RESERVATIONS ====================

  /**
   * GET /api/v1/customer/reservations
   * Get customer reservations
   */
  getReservations: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const reservations = await customerService.getReservations(customerId, { limit, offset });

    res.json({
      success: true,
      data: reservations
    });
  }),

  /**
   * GET /api/v1/customer/reservations/:id
   * Get reservation detail
   */
  getReservationDetail: asyncHandler(async (req, res) => {
    const customerId = req.customer.customerId;
    const reservationId = parseInt(req.params.id);

    const reservation = await customerService.getReservationDetail(reservationId, customerId);

    res.json({
      success: true,
      data: reservation
    });
  }),

  /**
   * GET /api/v1/customer/tables/available
   * Get available tables (public, no auth required)
   */
  getAvailableTables: asyncHandler(async (req, res) => {
    const areaId = req.query.area_id ? parseInt(req.query.area_id) : null;
    const minCapacity = req.query.min_capacity ? parseInt(req.query.min_capacity) : null;

    const tables = await customerService.getAvailableTables({ areaId, minCapacity });

    res.json({
      success: true,
      data: tables
    });
  }),

  /**
   * POST /api/v1/customer/orders
   * Create order from cart (optional auth - works for guests)
   */
  createOrder: asyncHandler(async (req, res) => {
    const customerId = req.customer?.customerId || null;
    const sessionId = req.headers['x-session-id'] || null;
    const { orderType, customerInfo, deliveryInfo } = req.body;

    // Get cart
    const cart = await customerService.getOrCreateCart({ customerId, sessionId });

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }

    // Create order
    const order = await customerService.createOrderFromCart({
      customerId,
      sessionId,
      orderType,
      customerInfo,
      cartItems: cart.items,
      deliveryInfo
    });

    res.status(201).json({
      success: true,
      data: order
    });
  })
};

