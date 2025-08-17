import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService, AuthUser } from '../services/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    setLoading(true);
    try {
      let emailToUse = emailOrUsername;
      // Si no es un email, buscar el email por username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let username: string | undefined = undefined;
      if (!emailRegex.test(emailOrUsername)) {
        // Buscar en Firestore el usuario con ese username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', emailOrUsername));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          emailToUse = userDoc.data().email;
        } else {
          setLoading(false);
          throw { code: 'auth/user-not-found' };
        }
      }
      await AuthService.login(emailToUse, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      await AuthService.register(email, password, username);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
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