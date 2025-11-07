import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing',
    allEnv: import.meta.env
  });
  throw new Error(
    'Missing Supabase environment variables. ' +
    `URL: ${supabaseUrl ? '✓' : '✗'}, Key: ${supabaseAnonKey ? '✓' : '✗'}. ` +
    'Please check your .env file and restart the dev server.'
  );
}

class SupabaseManager {
  private client: SupabaseClient;
  private keepAliveInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private isReconnecting = false;
  private readonly KEEP_ALIVE_INTERVAL = 30000; // 30 секунд
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 минута
  private readonly RECONNECT_DELAY = 5000; // 5 секунд
  private lastActivity = Date.now();

  constructor() {
    this.client = this.createClient();
    this.startKeepAlive();
    this.startHeartbeat();
    this.setupVisibilityListener();
  }

  private createClient(): SupabaseClient {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-web',
        },
      },
    });
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    console.warn('🔄 Reconnecting Supabase client...');

    try {
      // Очистка старого клиента
      await this.client.removeAllChannels();

      // Создание нового клиента
      this.client = this.createClient();

      // Проверка нового соединения
      const isConnected = await this.checkConnection();

      if (isConnected) {
        console.log('✅ Supabase client reconnected successfully');
        this.lastActivity = Date.now();
      } else {
        console.error('❌ Reconnection failed, will retry...');
        this.scheduleReconnect();
      }
    } catch (error) {
      console.error('❌ Error during reconnection:', error);
      this.scheduleReconnect();
    } finally {
      this.isReconnecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnect();
    }, this.RECONNECT_DELAY);
  }

  private startKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = window.setInterval(async () => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;

      // Если прошло больше 2 минут с последней активности, проверяем соединение
      if (timeSinceLastActivity > 120000) {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          await this.reconnect();
        } else {
          this.lastActivity = Date.now();
        }
      }
    }, this.KEEP_ALIVE_INTERVAL);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = window.setInterval(async () => {
      const isConnected = await this.checkConnection();

      if (!isConnected) {
        console.warn('⚠️ Heartbeat check failed, reconnecting...');
        await this.reconnect();
      } else {
        this.lastActivity = Date.now();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        // Окно стало видимым - проверяем соединение
        const timeSinceLastActivity = Date.now() - this.lastActivity;

        if (timeSinceLastActivity > 60000) {
          const isConnected = await this.checkConnection();
          if (!isConnected) {
            await this.reconnect();
          } else {
            this.lastActivity = Date.now();
          }
        }
      }
    });
  }

  getClient(): SupabaseClient {
    this.lastActivity = Date.now();
    return this.client;
  }

  async executeQuery<T>(queryFn: (client: SupabaseClient) => Promise<T>): Promise<T> {
    this.lastActivity = Date.now();

    try {
      return await queryFn(this.client);
    } catch (error: any) {
      // Если ошибка связана с соединением, пытаемся переподключиться
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('timeout')) {
        await this.reconnect();
        // Повторная попытка
        return await queryFn(this.client);
      }
      throw error;
    }
  }

  cleanup() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

const supabaseManager = new SupabaseManager();

export const supabase = supabaseManager.getClient();
export const getSupabase = () => supabaseManager.getClient();
export const executeQuery = <T>(queryFn: (client: SupabaseClient) => Promise<T>) =>
  supabaseManager.executeQuery(queryFn);

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
    const [user1, user2] = [currentUserSlug, otherUserSlug].sort();

    const { data: existingChat, error: findError } = await supabase
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

    const { data: newChat, error: createError } = await supabase
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
    const { data: chats, error } = await supabase
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
    const { data: messages, error } = await supabase
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
    const { data, error } = await supabase
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

    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return data;
  } catch (error) {
    console.error('Unexpected error in sendMessage:', error);
    return null;
  }
}
