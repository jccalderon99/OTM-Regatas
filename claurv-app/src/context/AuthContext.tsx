import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tecnico' | 'solicitante';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from parent application login if token/user exists in localStorage,
    // otherwise fallback to a generic admin user for standalone mode
    const parentAuth = localStorage.getItem('crl_auth_user') || localStorage.getItem('otm_user');
    if (parentAuth) {
      try {
        const parsed = JSON.parse(parentAuth);
        setUser(parsed);
      } catch {
        setUser({ id: 'admin-1', email: 'admin@regatas.pe', name: 'Administrador ClauRV', role: 'admin' });
      }
    } else {
      // Default to admin so they can edit standalone
      setUser({ id: 'admin-1', email: 'admin@regatas.pe', name: 'Administrador ClauRV', role: 'admin' });
    }
    setLoading(false);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
