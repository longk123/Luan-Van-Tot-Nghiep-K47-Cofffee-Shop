// src/auth.js
export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔍 Auth - Decoded token payload:', payload);
    console.log('🔍 Auth - Token roles:', payload.roles);
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}