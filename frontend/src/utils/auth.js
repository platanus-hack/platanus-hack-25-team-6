// JWT and Authentication utilities
const TOKEN_KEY = 'safeline_auth_token';
const USER_KEY = 'safeline_user';
const ONBOARDING_KEY = 'safeline_onboarding_completed';

export const authUtils = {
  // Generate a simple JWT-like token (client-side only for this implementation)
  // In production, the JWT should be generated and signed by the backend
  generateToken: (phoneNumber) => {
    const payload = {
      phone: phoneNumber,
      iat: Date.now(),
      exp: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
    };

    // Simple base64 encoding (not secure, just for demo - backend should handle this)
    return btoa(JSON.stringify(payload));
  },

  // Decode and validate token
  validateToken: (token) => {
    try {
      const payload = JSON.parse(atob(token));

      // Check if token is expired
      if (payload.exp && payload.exp < Date.now()) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  },

  // Store token in localStorage
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Store user data
  setUser: (userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  },

  // Get user data
  getUser: () => {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Remove user data
  removeUser: () => {
    localStorage.removeItem(USER_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = authUtils.getToken();
    if (!token) return false;

    const payload = authUtils.validateToken(token);
    return payload !== null;
  },

  // Full logout
  logout: () => {
    authUtils.removeToken();
    authUtils.removeUser();
    localStorage.removeItem('safeline_phone'); // Remove old phone storage
  },

  // Onboarding status
  setOnboardingCompleted: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  },

  hasCompletedOnboarding: () => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  },

  resetOnboarding: () => {
    localStorage.removeItem(ONBOARDING_KEY);
  }
};
