import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
