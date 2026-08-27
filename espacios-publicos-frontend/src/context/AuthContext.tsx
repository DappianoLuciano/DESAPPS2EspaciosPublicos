import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { mockLogin } from '../lib/api';
import type { User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Intentar cargar usuario guardado (solo para simular persistencia)
  useEffect(() => {
    const saved = localStorage.getItem('mock_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await mockLogin({ email, password });
    setUser(response.user);
    localStorage.setItem('mock_user', JSON.stringify(response.user));
    return response.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mock_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
