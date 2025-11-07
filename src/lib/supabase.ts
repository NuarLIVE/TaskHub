import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

class SupabaseManager {
  private client: SupabaseClient;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isReconnecting = false;
  private lastActivityTime: number = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    this.client = this.createNewClient();
    this.setupKeepAlive();
    this.setupHealthCheck();
    this.setupVisibilityHandler();
    this.setupNetworkMonitoring();
  }

  private createNewClient(): SupabaseClient {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web'
        }
      }
    });
  }

  private setupKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(async () => {
      try {
        const { error } = await this.client
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          console.warn('Keep-alive query failed:', error.message);
          this.handleConnectionError();
        } else {
          this.lastActivityTime = Date.now();
          this.reconnectAttempts = 0;
        }
      } catch (err) {
        console.warn('Keep-alive error:', err);
        this.handleConnectionError();
      }
    }, 30000);
  }

  private setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;

      if (timeSinceLastActivity > 60000) {
        console.log('Connection potentially stale, running health check...');
        await this.checkConnection();
      }
    }, 15000);
  }

  private setupVisibilityHandler() {
    if (typeof document === 'undefined') return;

    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visible, checking connection...');
        this.checkConnection();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('Network online, reconnecting...');
      this.reconnect();
    });

    window.addEventListener('offline', () => {
      console.warn('Network offline');
    });
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const { error } = await Promise.race([
        this.client.from('profiles').select('id').limit(1),
        new Promise<{ error: Error }>((_, reject) =>
          setTimeout(() => reject({ error: new Error('Health check timeout') }), 5000)
        )
      ]);

      if (error) {
        console.warn('Health check failed:', error);
        this.handleConnectionError();
        return false;
      }

      this.lastActivityTime = Date.now();
      this.reconnectAttempts = 0;
      return true;
    } catch (err) {
      console.error('Health check error:', err);
      this.handleConnectionError();
      return false;
    }
  }

  private handleConnectionError() {
    if (this.isReconnecting) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Connection error detected, attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.reconnect();
    } else {
      console.error('Max reconnection attempts reached');
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.reconnect();
      }, 60000);
    }
  }

  private async reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;

    try {
      console.log('Recreating Supabase client...');

      const oldClient = this.client;
      this.client = this.createNewClient();

      await oldClient.removeAllChannels();

      await this.checkConnection();

      this.setupKeepAlive();
      this.setupHealthCheck();

      console.log('✅ Supabase client reconnected successfully');
    } catch (err) {
      console.error('Reconnection failed:', err);
    } finally {
      this.isReconnecting = false;
    }
  }

  public getClient(): SupabaseClient {
    this.lastActivityTime = Date.now();
    return this.client;
  }

  public async forceReconnect() {
    console.log('Force reconnect requested');
    this.reconnectAttempts = 0;
    await this.reconnect();
  }

  public destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    this.client.removeAllChannels();
  }
}

const supabaseManager = new SupabaseManager();

export const supabase = supabaseManager.getClient();

export function getSupabase(): SupabaseClient {
  return supabaseManager.getClient();
}

export function forceReconnect() {
  return supabaseManager.forceReconnect();
}

export interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  is_read: boolean;
}

export async function findOrCreateChat(currentUserSlug: string, otherUserSlug: string): Promise<string | null> {
  try {
    const client = getSupabase();
    const [user1, user2] = [currentUserSlug, otherUserSlug].sort();

    const { data: existingChat, error: findError } = await client
      .from('chats')
      .select('id')
      .eq('participant1_id', user1)
      .eq('participant2_id', user2)
      .maybeSingle();

    if (findError) {
      console.error('Error finding chat:', findError);
      return null;
    }

    if (existingChat) {
      return existingChat.id;
    }

    const { data: newChat, error: createError } = await client
      .from('chats')
      .insert({
        participant1_id: user1,
        participant2_id: user2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return null;
    }

    return newChat.id;
  } catch (error) {
    console.error('Unexpected error in findOrCreateChat:', error);
    return null;
  }
}

export async function getUserChats(userSlug: string) {
  try {
    const client = getSupabase();
    const { data: chats, error } = await client
      .from('chats')
      .select('*')
      .or(`participant1_id.eq.${userSlug},participant2_id.eq.${userSlug}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
      return [];
    }

    return chats || [];
  } catch (error) {
    console.error('Unexpected error in getUserChats:', error);
    return [];
  }
}

export async function getChatMessages(chatId: string) {
  try {
    const client = getSupabase();
    const { data: messages, error } = await client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Unexpected error in getChatMessages:', error);
    return [];
  }
}

export async function sendMessage(chatId: string, senderSlug: string, text: string) {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderSlug,
        text,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    await client
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return data;
  } catch (error) {
    console.error('Unexpected error in sendMessage:', error);
    return null;
  }
}
