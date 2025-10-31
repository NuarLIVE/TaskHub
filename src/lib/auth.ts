const API_URL = 'http://localhost:8080/api/v1';

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

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
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
    this.loadFromStorage();
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

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        this.authState = JSON.parse(stored);
        this.notify();
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('auth', JSON.stringify(this.authState));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
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
      const slug = data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role,
          slug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Ошибка регистрации' };
      }

      const result: AuthResponse = await response.json();

      this.authState = {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };

      this.saveToStorage();
      this.notify();

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Неверный email или пароль' };
      }

      const result: AuthResponse = await response.json();

      this.authState = {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };

      this.saveToStorage();
      this.notify();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  }

  async logout() {
    this.authState = {
      user: null,
      accessToken: null,
      refreshToken: null,
    };

    localStorage.removeItem('auth');
    this.notify();

    window.location.hash = '/';
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.authState.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.authState.refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const result = await response.json();

      this.authState.accessToken = result.accessToken;
      this.saveToStorage();
      this.notify();

      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.logout();
      return false;
    }
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.authState.accessToken) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.authState.accessToken}`,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.authState.accessToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  isAuthenticated(): boolean {
    return !!this.authState.accessToken && !!this.authState.user;
  }

  getUser(): User | null {
    return this.authState.user;
  }
}

export const authService = AuthService.getInstance();
