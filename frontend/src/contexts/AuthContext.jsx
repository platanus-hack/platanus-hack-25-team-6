import { createContext, useContext, useState, useEffect } from 'react';
import { authUtils } from '../utils/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = authUtils.getToken();
      const userData = authUtils.getUser();

      if (token && authUtils.validateToken(token)) {
        setUser(userData);
        setIsAuthenticated(true);

        // Check if onboarding is needed
        // Check both localStorage flag AND user data
        const onboardingCompleted = authUtils.hasCompletedOnboarding() ||
                                   (userData && userData.onboarding_completed);

        if (!onboardingCompleted) {
          setShowOnboarding(true);
        }
      } else {
        // Clean up invalid tokens
        authUtils.logout();
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (authResponse) => {
    // authResponse comes from backend's /auth/verify-otp endpoint
    // Contains: { access_token, user_id, phone, onboarding_completed, ... }

    const token = authResponse.access_token;
    const userData = {
      user_id: authResponse.user_id,
      phone: authResponse.phone,
      createdAt: new Date().toISOString(),
      onboarding_completed: authResponse.onboarding_completed || false
    };

    // Store token and user data
    authUtils.setToken(token);
    authUtils.setUser(userData);

    setUser(userData);
    setIsAuthenticated(true);

    // Show onboarding if not completed
    if (!authResponse.onboarding_completed) {
      setShowOnboarding(true);
    } else {
      authUtils.setOnboardingCompleted();
    }

    return { token, user: userData };
  };

  const logout = () => {
    authUtils.logout();
    setUser(null);
    setIsAuthenticated(false);
    setShowOnboarding(false);
  };

  const completeOnboarding = () => {
    authUtils.setOnboardingCompleted();
    setShowOnboarding(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    showOnboarding,
    login,
    logout,
    completeOnboarding
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
