// Customer API Client
import { getCustomerToken, clearCustomerToken, getOrCreateSessionId } from '../auth/customerAuth.js';

const API_BASE = '/api/v1/customer';

async function request(method, path, body = null, includeAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Add customer token if needed
  if (includeAuth) {
    const token = getCustomerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  // Add session ID for guests
  const sessionId = getOrCreateSessionId();
  headers['X-Session-ID'] = sessionId;
  
  const url = `${API_BASE}${path}`;
  console.log(`🌐 Customer API: ${method} ${url}`);
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  console.log(`📡 Response: ${res.status} ${res.statusText}`);
  
  if (res.status === 401) {
    clearCustomerToken();
    // Optionally redirect to login
    // window.location.href = '/customer/login';
    throw new Error('Phiên đăng nhập đã hết hạn');
  }
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    console.error('❌ API Error:', data);
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  
  console.log('✅ API Success:', data);
  return data;
}

export const customerApi = {
  // ==================== AUTH ====================
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  getProfile: () => request('GET', '/auth/me', null, true),
  updateProfile: (data) => request('PATCH', '/auth/me', data, true),
  logout: () => request('POST', '/auth/logout', null, true),

  // ==================== MENU ====================
  getCategories: () => request('GET', '/menu/categories'),
  getMenuItems: (categoryId = null) => {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return request('GET', `/menu/items${query}`);
  },
  getItemDetail: (itemId) => request('GET', `/menu/items/${itemId}`),
  getItemToppings: (itemId, variantId = null) => {
    const query = variantId ? `?bien_the_id=${variantId}` : '';
    return request('GET', `/menu/items/${itemId}/toppings${query}`);
  },
  searchItems: (keyword) => request('GET', `/menu/search?keyword=${encodeURIComponent(keyword)}`),

  // ==================== CART ====================
  getCart: () => request('GET', '/cart', null, false),
  addToCart: (item) => request('POST', '/cart/items', item, false),
  updateCartItem: (index, quantity) => request('PATCH', `/cart/items/${index}`, { quantity }, false),
  removeFromCart: (index) => request('DELETE', `/cart/items/${index}`, null, false),
  clearCart: () => request('DELETE', '/cart', null, false),
  applyPromoCode: (promoCode) => request('POST', '/cart/apply-promo', { promoCode }, false),
  clearPromoCode: () => request('DELETE', '/cart/promo', null, false),

  // ==================== ORDERS ====================
  createOrder: (data) => request('POST', '/orders', data, false), // Optional auth - works for guests
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/orders${query ? `?${query}` : ''}`, null, true);
  },
  getOrderDetail: (orderId) => request('GET', `/orders/${orderId}`, null, true),

  // ==================== RESERVATIONS ====================
  getReservations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/reservations${query ? `?${query}` : ''}`, null, true);
  },
  getReservationDetail: (reservationId) => request('GET', `/reservations/${reservationId}`, null, true),

  // ==================== TABLES ====================
  getAvailableTables: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/tables/available${query ? `?${query}` : ''}`, null, false);
  },

  // ==================== CHATBOT ====================
  chat: (message) => request('POST', '/chatbot/chat', { message }, false), // Optional auth
  getActiveConversation: () => request('GET', '/chatbot/conversation/active', null, false), // Optional auth
  getConversations: () => request('GET', '/chatbot/conversations', null, true), // Require auth
  getMessages: (conversationId) => request('GET', `/chatbot/conversations/${conversationId}/messages`, null, true), // Require auth
};

