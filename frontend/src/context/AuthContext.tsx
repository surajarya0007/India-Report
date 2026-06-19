'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  email: string;
  displayName: string;
  avatarInitial: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => { success: boolean; message: string };
  signup: (name: string, email: string, password: string) => { success: boolean; message: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  login: () => ({ success: false, message: '' }),
  signup: () => ({ success: false, message: '' }),
  logout: () => {},
});

const STORAGE_KEY = 'ir-auth-user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
    setMounted(true);
  }, []);

  const persistUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    if (!email || !password) {
      return { success: false, message: 'Please fill in all fields.' };
    }
    if (password.length < 4) {
      return { success: false, message: 'Invalid credentials.' };
    }

    // Mock authentication — any valid email/password works
    const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const avatarInitial = displayName[0]?.toUpperCase() || 'U';
    persistUser({ email, displayName, avatarInitial });
    return { success: true, message: 'Welcome back!' };
  }, [persistUser]);

  const signup = useCallback((name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      return { success: false, message: 'Please fill in all fields.' };
    }
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
    if (!email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const avatarInitial = name[0]?.toUpperCase() || 'U';
    persistUser({ email, displayName: name, avatarInitial });
    return { success: true, message: 'Account created successfully!' };
  }, [persistUser]);

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
