// Customer Authentication Helpers
// Separate from staff auth

const CUSTOMER_TOKEN_KEY = 'customer_token';
const CUSTOMER_INFO_KEY = 'customer_info';

export function setCustomerToken(token) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_INFO_KEY);
}

export function setCustomerInfo(info) {
  localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(info));
}

export function getCustomerInfo() {
  try {
    const info = localStorage.getItem(CUSTOMER_INFO_KEY);
    return info ? JSON.parse(info) : null;
  } catch (error) {
    console.error('Error parsing customer info:', error);
    return null;
  }
}

export function isCustomerLoggedIn() {
  return !!getCustomerToken();
}

// Generate or get session ID for guests
const SESSION_ID_KEY = 'guest_session_id';

export function getOrCreateSessionId() {
  try {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error('Error with session ID:', error);
    // Fallback to in-memory session ID if localStorage fails
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_ID_KEY);
}

