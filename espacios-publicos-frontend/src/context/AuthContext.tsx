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

function loadSavedUser(): User | null {
  if (!import.meta.env.DEV) {
    localStorage.removeItem('mock_user');
    return null;
  }

  const saved = localStorage.getItem('mock_user');

  if (!saved) {
    return null;
  }

  try {
    const user = JSON.parse(saved) as Partial<User>;
    const hasValidIdentity =
      typeof user.id === 'string' &&
      typeof user.name === 'string' &&
      typeof user.email === 'string' &&
      isStoredEmailValid(user.email) &&
      (user.role === 'citizen' || user.role === 'municipal_admin');

    if (hasValidIdentity) {
      return user as User;
    }
  } catch {
    // La sesion local corrupta o de una version anterior se descarta abajo.
  }

  localStorage.removeItem('mock_user');
  return null;
}

function isStoredEmailValid(email: string): boolean {
  const parts = email.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  const domainParts = parts[1].split('.');
  return domainParts.length > 1 && domainParts.every(Boolean) && !Array.from(email).some((character) => character.trim() === '');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSavedUser);

  const login = async (email: string, password: string) => {
    if (!import.meta.env.DEV) {
      throw new Error('El acceso simulado no está disponible en producción.');
    }

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
    if (!import.meta.env.DEV) {
      return;
    }

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
