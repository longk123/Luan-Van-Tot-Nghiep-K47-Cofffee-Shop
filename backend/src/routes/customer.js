// Customer Portal Routes
import { Router } from 'express';
import customerController from '../controllers/customerController.js';
import { customerAuth, optionalCustomerAuth } from '../middleware/customerAuth.js';

const router = Router();

// ==================== AUTHENTICATION ====================
// Public routes
router.post('/customer/auth/register', customerController.register);
router.post('/customer/auth/login', customerController.login);

// Protected routes (require authentication)
router.get('/customer/auth/me', customerAuth, customerController.getProfile);
router.patch('/customer/auth/me', customerAuth, customerController.updateProfile);
router.post('/customer/auth/logout', customerAuth, customerController.logout);

// ==================== PUBLIC MENU ====================
// No authentication required
router.get('/customer/menu/categories', customerController.getCategories);
router.get('/customer/menu/items', customerController.getMenuItems);
router.get('/customer/menu/items/:id', customerController.getItemDetail);
router.get('/customer/menu/items/:id/toppings', customerController.getItemToppings);
router.get('/customer/menu/search', customerController.searchItems);

// ==================== PUBLIC TABLES ====================
// No authentication required
router.get('/customer/tables/available', customerController.getAvailableTables);

// ==================== CART ====================
// Optional authentication (works with session or customer account)
router.get('/customer/cart', optionalCustomerAuth, customerController.getCart);
router.post('/customer/cart/items', optionalCustomerAuth, customerController.addToCart);
router.patch('/customer/cart/items/:index', optionalCustomerAuth, customerController.updateCartItem);
router.delete('/customer/cart/items/:index', optionalCustomerAuth, customerController.removeFromCart);
router.delete('/customer/cart', optionalCustomerAuth, customerController.clearCart);
router.post('/customer/cart/apply-promo', optionalCustomerAuth, customerController.applyPromoCode);
router.delete('/customer/cart/promo', optionalCustomerAuth, customerController.clearPromoCode);

// ==================== ORDERS ====================
// Create order (optional auth - works for guests)
router.post('/customer/orders', optionalCustomerAuth, customerController.createOrder);
// Get orders (require authentication)
router.get('/customer/orders', customerAuth, customerController.getOrders);
router.get('/customer/orders/:id', customerAuth, customerController.getOrderDetail);

// ==================== RESERVATIONS ====================
// Require authentication
router.get('/customer/reservations', customerAuth, customerController.getReservations);
router.get('/customer/reservations/:id', customerAuth, customerController.getReservationDetail);

// ==================== CHATBOT ====================
import chatbotController from '../controllers/chatbotController.js';

// Chat (optional auth - works for guests too)
router.post('/customer/chatbot/chat', optionalCustomerAuth, chatbotController.chat);
router.get('/customer/chatbot/conversation/active', optionalCustomerAuth, chatbotController.getActiveConversation);

// Conversations (require authentication)
router.get('/customer/chatbot/conversations', customerAuth, chatbotController.getConversations);
router.get('/customer/chatbot/conversations/:id/messages', customerAuth, chatbotController.getMessages);

export default router;

