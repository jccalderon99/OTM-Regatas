import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Profile } from '../types';
import { DEMO_USERS } from '../lib/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (userId: string) => void;
  logout: () => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: false, error: null });
  const isDemo = !isSupabaseConfigured();

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      if (isDemo) {
        const found = DEMO_USERS.find(u => u.email === email);
        if (!found) throw new Error('Usuario no encontrado. Usa uno de los correos de demostración.');
        setState({ user: found, loading: false, error: null });
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (pErr) throw pErr;
      setState({ user: profile, loading: false, error: null });
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message || 'Error de autenticación' }));
    }
  }, [isDemo]);

  const loginAsDemo = useCallback((userId: string) => {
    const found = DEMO_USERS.find(u => u.id === userId);
    if (found) setState({ user: found, loading: false, error: null });
  }, []);

  const logout = useCallback(() => {
    if (!isDemo) supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
  }, [isDemo]);

  return (
    <AuthContext.Provider value={{ ...state, login, loginAsDemo, logout, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
