import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { mockLogin } from '../lib/api';
import type { User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email'>>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mock_user');
    return saved ? JSON.parse(saved) as User : null;
  });

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

  const updateUser = (updates: Partial<Pick<User, 'name' | 'email'>>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('mock_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout }}>
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
