import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);
const SESSION_KEY = 'sunsure_user';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Instantly load from localStorage — no network, no spinning
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.expires > Date.now()) {
          setUser({ email: parsed.email });
          setRole(parsed.role);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    // Look up user in Supabase user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, email, role, password')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) throw new Error('Invalid email or password.');
    if (data.password !== password) throw new Error('Invalid email or password.');

    const session = {
      email: data.email,
      role: data.role,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser({ email: data.email });
    setRole(data.role);
  };

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRole(null);
  };

  const can = {
    admin:      role === 'admin',
    edit:       role === 'admin' || role === 'editor',
    view:       !!role,
    addUpdates: !!role,
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
