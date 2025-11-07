import { getSupabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: string;
  profile: {
    id: string;
    slug: string;
    name: string;
    bio?: string;
    skills: string[];
    avatarUrl?: string;
    location?: string;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  private async initializeAuth() {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await this.loadUserProfile(session.user.id, session.user.email || '');
    }

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          this.authState = {
            user: null,
            accessToken: null,
            refreshToken: null,
          };
          this.notify();
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed automatically');
        }
      })();
    });
  }

  private async loadUserProfile(userId: string, email: string) {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        this.authState = {
          user: null,
          accessToken: null,
          refreshToken: null,
        };
        this.notify();
        return;
      }

      this.authState = {
        user: {
          id: userId,
          email: email,
          role: 'FREELANCER',
          profile: {
            id: userId,
            slug: email.split('@')[0],
            name: email.split('@')[0],
            skills: [],
          }
        },
        accessToken: session.access_token,
        refreshToken: session.refresh_token || null,
      };

      this.notify();
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  getState(): AuthState {
    return this.authState;
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    role: 'CLIENT' | 'FREELANCER';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          }
        }
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Ошибка регистрации' };
      }

      await this.loadUserProfile(authData.user.id, authData.user.email || '');

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { success: false, error: signInError.message };
      }

      if (!data.user) {
        return { success: false, error: 'Ошибка входа' };
      }

      await this.loadUserProfile(data.user.id, data.user.email || '');

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  }

  async logout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();

    this.authState = {
      user: null,
      accessToken: null,
      refreshToken: null,
    };

    this.notify();

    window.location.hash = '/';
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        return false;
      }

      this.authState.accessToken = data.session.access_token;
      this.authState.refreshToken = data.session.refresh_token || null;
      this.notify();

      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
    };

    return fetch(url, { ...options, headers });
  }

  isAuthenticated(): boolean {
    return !!this.authState.user && !!this.authState.accessToken;
  }

  getUser(): User | null {
    return this.authState.user;
  }
}

export const authService = AuthService.getInstance();
