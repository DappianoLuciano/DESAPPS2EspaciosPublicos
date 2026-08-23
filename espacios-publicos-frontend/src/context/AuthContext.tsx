import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type UserRole = 'user' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role: UserRole) => void;
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

  const login = (email: string, role: UserRole) => {
    const mockUser: User = {
      id: '1',
      name: email.split('@')[0],
      email,
      role,
    };
    setUser(mockUser);
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
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
