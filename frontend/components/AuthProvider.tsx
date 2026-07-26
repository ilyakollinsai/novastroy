'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiGet, apiSend, setToken, getToken } from '@/lib/api';
import { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    companyName: string;
    inn: string;
    specialization?: string;
    phone?: string;
    contactPerson?: string;
  }) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet('/api/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiSend('POST', '/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user as User;
  }, []);

  const register = useCallback(async (payload: Parameters<AuthContextValue['register']>[0]) => {
    const data = await apiSend('POST', '/api/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user as User;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
