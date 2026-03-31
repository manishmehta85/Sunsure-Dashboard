import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (error) return 'viewer';
      return data?.role || 'viewer';
    } catch { return 'viewer'; }
  };

  useEffect(() => {
    let mounted = true;

    // Listen to auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          const r = await fetchRole(session.user.id);
          if (mounted) setRole(r);
        } else {
          setUser(null);
          setRole(null);
        }
        if (mounted) setLoading(false);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Session error:', error.message);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole(session.user.id);
        if (mounted) setRole(r);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
