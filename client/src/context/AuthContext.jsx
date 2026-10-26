import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(3600); // 1 hour default

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error', e);
    }
    setUser(null);
    setAuthToken(null);
    setSessionExpiryWarning(false);
  }, []);

  const loadUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Failed to load user info:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadUser();

    // Listen for custom session expired events
    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [loadUser, logout]);

  // Periodic Session Verification & Idle Tracker
  useEffect(() => {
    if (!user) return;

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      try {
        const res = await api.verifySession();
        if (!res.sessionValid) {
          logout();
        }
      } catch (err) {
        // Session invalid
        logout();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.googleLogin(credential);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Google login failed');
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee' || user?.role === 'user';

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isManager,
    isEmployee,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser: loadUser,
    sessionExpiryWarning,
    setSessionExpiryWarning,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
