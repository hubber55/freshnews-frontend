'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type UserProfile = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  whatsappNumber: string;
  usernameEditCount: number;
  emailEditCount: number;
  isAdmin: boolean;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.name !== null) {
          setUser(data);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('AuthProvider Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
