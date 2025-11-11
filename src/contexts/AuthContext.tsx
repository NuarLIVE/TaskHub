import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log('[AUTH] Initializing...');

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
      console.log('[AUTH] Session loaded, user:', data.session?.user?.email || 'none');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] State change:', event, session?.user?.email || 'none');
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Login attempt:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[AUTH] Login error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Ошибка входа' };
      }

      console.log('[AUTH] Login success:', data.user.email);
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Login exception:', error);
      return { success: false, error: error.message || 'Ошибка подключения' };
    }
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    try {
      console.log('[AUTH] Register attempt:', data.email);
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role || 'FREELANCER',
          }
        }
      });

      if (error) {
        console.error('[AUTH] Register error:', error.message);
        return { success: false, error: error.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Ошибка регистрации' };
      }

      console.log('[AUTH] Register success:', authData.user.email);
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Register exception:', error);
      return { success: false, error: error.message || 'Ошибка подключения' };
    }
  };

  const logout = async () => {
    console.log('[AUTH] Logout');
    await supabase.auth.signOut();
    window.location.hash = '/';
  };

  const value: AuthContextType = {
    user,
    ready,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
