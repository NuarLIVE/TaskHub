import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Ban,
  AlertTriangle,
  Paperclip,
  X,
  Video,
  FileText,
  Clock,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSupabase, resetSupabase } from '@/lib/supabaseClient';
import { useSupabaseKeepAlive } from '@/hooks/useSupabaseKeepAlive';
import { queryWithRetry, subscribeWithMonitoring } from '@/lib/supabase-utils';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToProfile } from '@/lib/navigation';
import { MediaEditor } from '@/components/MediaEditor';
import { ImageViewer } from '@/components/ImageViewer';

const pageVariants = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
const pageTransition = { duration: 0.2 };
const ONLINE_WINDOW_MS = 60_000;

interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  last_message_text?: string;
  unread_count_p1?: number;
  unread_count_p2?: number;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  file_url?: string;
  file_name?: string;
  file_type?: 'image' | 'video' | 'file';
  created_at: string;
  is_read: boolean;
}

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen_at?: string;
}

const isOnlineFresh = (p?: { last_seen_at?: string | null }) => {
  if (!p?.last_seen_at) return false;
  return Date.now() - new Date(p.last_seen_at).getTime() <= ONLINE_WINDOW_MS;
};

export default function MessagesPage() {
  const { user } = useAuth();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [deleteAlsoChat, setDeleteAlsoChat] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMediaEditor, setShowMediaEditor] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<File | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerImages, setImageViewerImages] = useState<Array<{ url: string; name?: string }>>([]);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const shouldScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  // Для UX "Печатает"
  const otherTypingHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const justMarkedReadRef = useRef<Set<string>>(new Set());
  const otherTypingShownAtRef = useRef<number>(0);
  const wasTypingRef = useRef<boolean>(false);
  const prevScrollTopRef = useRef<number>(0);

  // last seen авто-старение
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const smoothScrollTo = (top: number) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top, behavior: 'smooth' });
  };

  const reinitAll = async () => {
    await loadChats(false);
    if (selectedChatId) await loadMessages(selectedChatId);
  };

  useSupabaseKeepAlive({
    onRecover: reinitAll,
    intervalMs: 90_000,
    headTable: 'profiles'
  });

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const initChats = async () => {
      try {
        setError(null);
        await loadChats();
      } catch (error) {
        if (isMounted) {
          setError('Не удалось загрузить чаты. Попробуйте ещё раз.');
          setLoading(false);
        }
      }
    };

    initChats();
    updateOnlineStatus(true);

    const interval = setInterval(() => {
      updateOnlineStatus(true);
    }, 30_000);

    const chatsRefreshInterval = setInterval(() => {
      if (!document.hidden && isMounted) {
        loadChats(false);
      }
    }, 60_000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateOnlineStatus(true);
        loadChats(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let userChatsSubscription: any = null;
    let profilesSubscription: any = null;

    subscribeWithMonitoring('user-chats', {
      table: 'chats',
      event: '*',
      callback: (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedChat = payload.new as Chat;

          if (justMarkedReadRef.current.has(updatedChat.id)) {
            justMarkedReadRef.current.delete(updatedChat.id);
            return;
          }

          setChats((prev) => {
            const existingChat = prev.find((c) => c.id === updatedChat.id);
            if (!existingChat) return prev;

            return prev.map((c) => {
              if (c.id !== updatedChat.id) return c;

              if (updatedChat.id === selectedChatId && user) {
                const isP1 = updatedChat.participant1_id === user.id;
                return {
                  ...updatedChat,
                  unread_count_p1: isP1 ? 0 : updatedChat.unread_count_p1,
                  unread_count_p2: !isP1 ? 0 : updatedChat.unread_count_p2,
                };
              }

              return updatedChat;
            });
          });
        } else {
          loadChats(false);
        }
      },
      onError: () => setTimeout(() => loadChats(false), 2000)
    }).then(sub => { userChatsSubscription = sub; });

    subscribeWithMonitoring('profiles-changes', {
      table: 'profiles',
      event: 'UPDATE',
      callback: (payload) => {
        const updatedProfile = payload.new as Profile;
        setProfiles((prev) => ({
          ...prev,
          [updatedProfile.id]: {
            ...prev[updatedProfile.id],
            is_online: updatedProfile.is_online,
            last_seen_at: updatedProfile.last_seen_at,
            avatar_url: updatedProfile.avatar_url ?? prev[updatedProfile.id]?.avatar_url ?? null,
            name: updatedProfile.name ?? prev[updatedProfile.id]?.name ?? '',
          },
        }));
      }
    }).then(sub => { profilesSubscription = sub; });

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const chatId = params.get('chat');
    if (chatId) setSelectedChatId(chatId);

    const handleBeforeUnload = () => updateOnlineStatus(false);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(chatsRefreshInterval);
      updateOnlineStatus(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      userChatsSubscription?.unsubscribe();
      profilesSubscription?.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChatId || !user) return;

    isInitialLoadRef.current = true;
    shouldScrollRef.current = true;

    let isMounted = true;

    const initMessages = async () => {
      if (!isMounted) return;
      try {
        await loadMessages(selectedChatId);
      } catch (error) {
        if (isMounted) setMessages([]);
      }
    };

    initMessages();

    const handleVisibilityChange = () => {
      if (!document.hidden && selectedChatId) {
        loadMessages(selectedChatId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let messagesSubscription: any = null;

    subscribeWithMonitoring(`messages:${selectedChatId}`, {
      table: 'messages',
      event: 'INSERT',
      filter: `chat_id=eq.${selectedChatId}`,
      callback: async (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.sender_id !== user.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            shouldScrollRef.current = true;
            return [...prev, newMessage];
          });
          await markMessagesAsRead(selectedChatId);
        }
      },
      onError: () => setTimeout(() => loadMessages(selectedChatId), 2000)
    }).then(sub => { messagesSubscription = sub; });

    let messagesUpdateSubscription: any = null;
    subscribeWithMonitoring(`messages-update:${selectedChatId}`, {
      table: 'messages',
      event: 'UPDATE',
      filter: `chat_id=eq.${selectedChatId}`,
      callback: (payload) => {
        const updatedMessage = payload.new as Message;
        if (updatedMessage.sender_id === user.id) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      },
      onError: () => {}
    }).then(sub => { messagesUpdateSubscription = sub; });

    const typingSubscription = getSupabase()
      .channel(`typing:${selectedChatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_indicators', filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          if (!user) return;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const typingData = payload.new as { user_id: string; updated_at: string };
            if (typingData.user_id !== user.id) {
              otherTypingShownAtRef.current = Date.now();
              setIsOtherUserTyping(true);

              if (otherTypingHideTimeoutRef.current) clearTimeout(otherTypingHideTimeoutRef.current);
              // Держим минимум 1 секунду
              otherTypingHideTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 1000);
            }
          } else if (payload.eventType === 'DELETE') {
            const typingData = payload.old as { user_id: string };
            if (typingData.user_id !== user.id) {
              const elapsed = Date.now() - otherTypingShownAtRef.current;
              const remain = Math.max(0, 1000 - elapsed);
              if (otherTypingHideTimeoutRef.current) clearTimeout(otherTypingHideTimeoutRef.current);
              otherTypingHideTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, remain);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      messagesSubscription?.unsubscribe();
      messagesUpdateSubscription?.unsubscribe();
      typingSubscription.unsubscribe();
      setIsOtherUserTyping(false);
      if (otherTypingHideTimeoutRef.current) clearTimeout(otherTypingHideTimeoutRef.current);
    };
  }, [selectedChatId, user]);

  // Скроллим вниз при появлении "Печатает", затем плавно возвращаемся к прошлой позиции
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    if (isOtherUserTyping && !wasTypingRef.current) {
      wasTypingRef.current = true;
      prevScrollTopRef.current = el.scrollTop;
      scrollToBottom('smooth');
    }

    if (!isOtherUserTyping && wasTypingRef.current) {
      wasTypingRef.current = false;
      smoothScrollTo(prevScrollTopRef.current);
    }
  }, [isOtherUserTyping]);

  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesLengthRef.current = 0;
      return;
    }

    if (isInitialLoadRef.current) {
      setTimeout(() => scrollToBottom('auto'), 0);
      isInitialLoadRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    if (shouldScrollRef.current && messages.length > prevMessagesLengthRef.current) {
      setTimeout(() => scrollToBottom('smooth'), 0);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const loadChats = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    try {
      const { data: chatsData, error: chatsError } = await queryWithRetry(
        () => getSupabase()
          .from('chats')
          .select('*')
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
      );

      if (chatsError) throw chatsError;

      setChats(chatsData || []);

      const userIds = new Set<string>();
      (chatsData || []).forEach((chat: Chat) => {
        userIds.add(chat.participant1_id);
        userIds.add(chat.participant2_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await queryWithRetry(
          () => getSupabase()
            .from('profiles')
            .select('id, name, avatar_url, is_online, last_seen_at')
            .in('id', Array.from(userIds))
        );

        if (profilesError) throw profilesError;

        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach((p: Profile) => {
          profilesMap[p.id] = p;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      throw error;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const checkIfUserBlocked = async (chatId: string) => {
    if (!user) return;
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const otherUserId = getOtherParticipant(chat);
    const { data } = await getSupabase()
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', otherUserId)
      .maybeSingle();

    setIsUserBlocked(!!data);
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await queryWithRetry(
        () => getSupabase()
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
      );

      if (error) throw error;

      setMessages(data || []);
      await checkIfUserBlocked(chatId);
      await markMessagesAsRead(chatId);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      throw error;
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    if (!user) return;

    try {
      await getSupabase()
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.chat_id === chatId && msg.sender_id !== user.id ? { ...msg, is_read: true } : msg
        )
      );

      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        const isP1 = chat.participant1_id === user.id;

        justMarkedReadRef.current.add(chatId);

        await getSupabase()
          .from('chats')
          .update({
            unread_count_p1: isP1 ? 0 : chat.unread_count_p1,
            unread_count_p2: !isP1 ? 0 : chat.unread_count_p2,
          })
          .eq('id', chatId);

        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  unread_count_p1: isP1 ? 0 : c.unread_count_p1,
                  unread_count_p2: !isP1 ? 0 : c.unread_count_p2,
                }
              : c
          )
        );
      }
    } catch {
      // no-op
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || !selectedChatId || !user) return;

    const selectedChat = chats.find((c) => c.id === selectedChatId);
    if (!selectedChat) return;

    const otherUserId = getOtherParticipant(selectedChat);
    const { data: isBlockedByOther } = await getSupabase()
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', otherUserId)
      .eq('blocked_id', user.id)
      .maybeSingle();

    if (isBlockedByOther) {
      alert('Невозможно отправить сообщение. Пользователь заблокировал вас.');
      return;
    }

    const messageText = message;
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: Message = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: user.id,
      text: messageText || '',
      created_at: new Date().toISOString(),
      is_read: false,
      file_url: undefined,
      file_name: undefined,
    };

    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage('');
    setSelectedFile(null);
    scrollToBottom('smooth');

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: 'image' | 'video' | 'file' | null = null;

      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await getSupabase()
          .storage
          .from('message-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: pub } = getSupabase().storage.from('message-attachments').getPublicUrl(filePath);
        fileUrl = pub.publicUrl;
        fileName = selectedFile.name;

        if (selectedFile.type.startsWith('image/')) fileType = 'image';
        else if (selectedFile.type.startsWith('video/')) fileType = 'video';
        else fileType = 'file';

        setUploading(false);
      }

      const { error } = await getSupabase().from('messages').insert({
        chat_id: selectedChatId,
        sender_id: user.id,
        text: messageText || '',
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      });

      if (error) throw error;

      shouldScrollRef.current = false;
      loadMessages(selectedChatId);
      loadChats(false);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessage(messageText);
      alert('Ошибка при отправке сообщения');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;

    try {
      const { error } = await getSupabase().from('chats').delete().eq('id', selectedChatId);
      if (error) throw error;

      alert('Чат удален');
      setDeleteDialogOpen(false);
      setSelectedChatId(null);
      await loadChats();
    } catch {
      alert('Ошибка при удалении чата');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedChatId || !user) return;

    const selectedChat = chats.find((c) => c.id === selectedChatId);
    if (!selectedChat) return;

    const otherUserId = getOtherParticipant(selectedChat);

    try {
      const { error } = await getSupabase().from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: otherUserId,
      });

      // @ts-ignore (для уникальных вставок)
      if (error?.code === '23505') {
        alert('Этот пользователь уже заблокирован');
        return;
      } else if (error) {
        throw error;
      }

      if (deleteAlsoChat) {
        await getSupabase().from('chats').delete().eq('id', selectedChatId);
        setSelectedChatId(null);
      }

      alert('Пользователь заблокирован.');
      setBlockDialogOpen(false);
      setDeleteAlsoChat(false);
      await loadChats();
    } catch {
      alert('Ошибка при блокировке пользователя');
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedChatId || !user) return;

    const selectedChat = chats.find((c) => c.id === selectedChatId);
    if (!selectedChat) return;

    const otherUserId = getOtherParticipant(selectedChat);

    try {
      const { error } = await getSupabase()
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherUserId);

      if (error) throw error;

      setIsUserBlocked(false);
    } catch {
      alert('Ошибка при разблокировке пользователя');
    }
  };

  const handleReportUser = () => {
    alert('Жалоба отправлена. Мы рассмотрим её в ближайшее время.');
    setReportDialogOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setFileToEdit(file);
      setShowMediaEditor(true);
    } else {
      setSelectedFile(file);
    }
  };

  const handleMediaSave = (editedFile: File) => {
    setSelectedFile(editedFile);
    setShowMediaEditor(false);
    setFileToEdit(null);
  };

  const handleMediaCancel = () => {
    setShowMediaEditor(false);
    setFileToEdit(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    const chatImages = messages
      .filter((m) => m.file_type === 'image' && m.file_url)
      .map((m) => ({ url: m.file_url!, name: m.file_name }));

    const clickedIndex = chatImages.findIndex((img) => img.url === imageUrl);

    setImageViewerImages(chatImages);
    setImageViewerIndex(clickedIndex >= 0 ? clickedIndex : 0);
    setShowImageViewer(true);
  };

  const getOtherParticipant = (chat: Chat): string => {
    if (!user) return '';
    return chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id;
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      await getSupabase()
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const sendTypingIndicator = async () => {
    if (!selectedChatId || !user) return;

    try {
      await getSupabase()
        .from('typing_indicators')
        .upsert(
          {
            chat_id: selectedChatId,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chat_id,user_id' }
        );

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        await getSupabase()
          .from('typing_indicators')
          .delete()
          .eq('chat_id', selectedChatId)
          .eq('user_id', user.id);
      }, 3000);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  const getLastSeenText = (profile: Profile | undefined): string => {
    if (!profile) return 'был(а) в сети недавно';

    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : null;
    const fresh = lastSeen ? nowTick - lastSeen <= ONLINE_WINDOW_MS : false;

    if (fresh) return 'В сети';
    if (!lastSeen) return 'был(а) в сети недавно';

    const diffMs = nowTick - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `был(а) в сети ${diffMins} мин. назад`;
    if (diffHours < 24) return `был(а) в сети ${diffHours} ч. назад`;
    if (diffDays === 1) return 'был(а) в сети вчера';
    if (diffDays < 7) return `был(а) в сети ${diffDays} дн. назад`;
    return `был(а) в сети ${new Date(lastSeen).toLocaleDateString('ru-RU')}`;
  };

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const otherUserId = getOtherParticipant(chat);
    const profile = profiles[otherUserId];
    return profile?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentChat = chats.find((c) => c.id === selectedChatId);
  const currentOtherUserId = currentChat ? getOtherParticipant(currentChat) : null;
  const currentProfile = currentOtherUserId ? profiles[currentOtherUserId] : null;

  // Кол-во непрочитанных в других чатах (показываем в шапке открытого чата)
  const totalUnreadOtherChats = useMemo(() => {
    if (!user) return 0;
    return chats.reduce((sum, c) => {
      if (c.id === selectedChatId) return sum;
      if (c.participant1_id === user.id) return sum + (c.unread_count_p1 || 0);
      if (c.participant2_id === user.id) return sum + (c.unread_count_p2 || 0);
      return sum;
    }, 0);
  }, [chats, user, selectedChatId]);

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Сообщения</h1>

        {loading ? (
          <div className="flex justify-center items-center h-[600px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6FE7C8] border-r-transparent mb-4"></div>
              <p className="text-[#3F7F6E]">Загрузка сообщений...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-[600px]">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    loadChats();
                  }}
                >
                  Попробовать снова
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Обновить страницу
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h[calc(100vh-200px)] h-[calc(100vh-200px)] max-h-[700px] min-h-0">
            {/* Список чатов */}
            <Card className="overflow-hidden h-full min-h-0 flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск пользователей..."
                    className="pl-9 h-10"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-[#3F7F6E]">
                    {searchQuery ? 'Ничего не найдено' : 'Нет активных чатов'}
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const otherUserId = getOtherParticipant(chat);
                    const profile = profiles[otherUserId];
                    const online = isOnlineFresh(profile);

                    return (
                      <div
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`p-4 border-b cursor-pointer hover:bg-[#EFFFF8] ${
                          selectedChatId === chat.id ? 'bg-[#EFFFF8]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="cursor-pointer relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToProfile(otherUserId, user?.id);
                            }}
                          >
                            {profile?.avatar_url ? (
                              <div className="relative">
                                <img
                                  src={profile.avatar_url}
                                  alt={profile?.name || 'Пользователь'}
                                  className="h-10 w-10 rounded-full object-cover transition-opacity hover:opacity-80"
                                />
                                {online && (
                                  <span
                                    className="absolute block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white pointer-events-none z-10"
                                    style={{ bottom: '2px', right: '2px' }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="relative h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                                <span className="text-sm font-medium">{profile?.name?.charAt(0) ?? 'U'}</span>
                                {online && (
                                  <span
                                    className="absolute block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white pointer-events-none z-10"
                                    style={{ bottom: '2px', right: '2px' }}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold truncate">{profile?.name || 'Пользователь'}</div>
                              <span className="text-xs text-[#3F7F6E]">
                                {chat.last_message_at
                                  ? new Date(chat.last_message_at).toLocaleTimeString('ru-RU', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-sm text-[#3F7F6E] truncate">
                                {chat.last_message_text || 'Нет сообщений'}
                              </div>

                              {((chat.participant1_id === user?.id && (chat.unread_count_p1 || 0) > 0) ||
                                (chat.participant2_id === user?.id && (chat.unread_count_p2 || 0) > 0)) && (
                                <div className="ml-2 h-5 min-w-5 px-1.5 rounded-full bg-[#6FE7C8] text-white text-xs font-semibold flex items-center justify-center pointer-events-none z-10">
                                  {(() => {
                                    const count = chat.participant1_id === user?.id ? (chat.unread_count_p1 || 0) : (chat.unread_count_p2 || 0);
                                    return count > 99 ? '99+' : count;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Окно чата */}
            {selectedChatId && currentProfile ? (
              <Card className="flex flex-col h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
                    onClick={() => navigateToProfile(currentOtherUserId || '', user?.id)}
                  >
                    <div className="relative">
                      {currentProfile.avatar_url ? (
                        <img
                          src={currentProfile.avatar_url}
                          alt={currentProfile.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                          <span className="text-sm font-medium">{currentProfile.name?.charAt(0)}</span>
                        </div>
                      )}
                      {totalUnreadOtherChats > 0 && (
                        <span
                          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[#6FE7C8] text-white text-xs font-semibold flex items-center justify-center pointer-events-none z-10"
                          title="Непрочитанные в других чатах"
                        >
                          {totalUnreadOtherChats}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold">{currentProfile.name}</div>
                      <div className="text-xs text-[#3F7F6E] flex items-center gap-1">
                        {isOtherUserTyping ? (
                          <>
                            <span>Печатает</span>
                            <span className="flex gap-0.5">
                              <span
                                className="w-1 h-1 bg-[#3F7F6E] rounded-full animate-bounce"
                                style={{ animationDelay: '0ms' }}
                              />
                              <span
                                className="w-1 h-1 bg-[#3F7F6E] rounded-full animate-bounce"
                                style={{ animationDelay: '150ms' }}
                              />
                              <span
                                className="w-1 h-1 bg-[#3F7F6E] rounded-full animate-bounce"
                                style={{ animationDelay: '300ms' }}
                              />
                            </span>
                          </>
                        ) : (
                          <>{getLastSeenText(currentProfile)}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[180px]">
                        <button
                          onClick={() => {
                            setDeleteDialogOpen(true);
                            setMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Удалить чат
                        </button>
                        <button
                          onClick={() => {
                            setBlockDialogOpen(true);
                            setMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                          <Ban className="h-4 w-4" />
                          Заблокировать
                        </button>
                        <button
                          onClick={() => {
                            setReportDialogOpen(true);
                            setMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-red-600"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Пожаловаться
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-[#3F7F6E] mt-8">Начните разговор</div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-lg overflow-hidden ${
                              isOwn ? 'bg-[#6FE7C8] text-white' : 'bg-gray-100'
                            }`}
                          >
                            {msg.file_type === 'image' && msg.file_url && (
                              <div onClick={() => handleImageClick(msg.file_url!, msg.file_name)}>
                                <img
                                  src={msg.file_url}
                                  alt={msg.file_name || 'Image'}
                                  className="w-full max-w-sm cursor-pointer hover:opacity-90 transition"
                                />
                              </div>
                            )}

                            {msg.file_type === 'video' && msg.file_url && (
                              <video src={msg.file_url} controls className="w-full max-w-sm" />
                            )}

                            {msg.file_type === 'file' && msg.file_url && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-3 hover:opacity-80 transition ${
                                  isOwn ? 'bg-white/10' : 'bg-[#3F7F6E]/5'
                                }`}
                              >
                                <div className={`p-2 rounded ${isOwn ? 'bg-white/20' : 'bg-[#3F7F6E]/10'}`}>
                                  <FileText
                                    className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-[#3F7F6E]'}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      isOwn ? 'text-white' : 'text-gray-900'
                                    }`}
                                  >
                                    {msg.file_name || 'Файл'}
                                  </p>
                                  <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>
                                    Нажмите для скачивания
                                  </p>
                                </div>
                              </a>
                            )}

                            {msg.text && (
                              <div className="p-3">
                                <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                              </div>
                            )}

                            <div className={`px-3 pb-2 text-xs flex items-center justify-between gap-2 ${isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>
                              <span>{formatTime(msg.created_at)}</span>
                              {isOwn && (
                                <span className="flex items-center">
                                  {msg.is_read ? (
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isOtherUserTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] rounded-lg bg-gray-100 px-4 py-3">
                        <div className="flex gap-1.5">
                          <span
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t">
                  {selectedFile && (
                    <div className="mb-2 p-3 bg-[#EFFFF8] rounded-lg border border-[#3F7F6E]/20">
                      <div className="flex items-start gap-3">
                        {selectedFile.type.startsWith('image/') ? (
                          <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={URL.createObjectURL(selectedFile)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : selectedFile.type.startsWith('video/') ? (
                          <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <Video className="h-8 w-8 text-[#3F7F6E]" />
                          </div>
                        ) : (
                          <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-[#3F7F6E]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-[#3F7F6E] mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={removeSelectedFile} className="flex-shrink-0 hover:opacity-70 transition p-1">
                          <X className="h-5 w-5 text-[#3F7F6E]" />
                        </button>
                      </div>
                    </div>
                  )}

                  {isUserBlocked ? (
                    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Ban className="h-5 w-5 text-[#3F7F6E]" />
                        <span>Вы не можете отправлять сообщения данному пользователю, так как заблокировали его ранее</span>
                      </div>
                      <Button className="bg-[#3F7F6E] hover:bg-[#2d5f52] text-white" onClick={handleUnblockUser}>
                        Разблокировать пользователя
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="hover:bg-[#EFFFF8]"
                      >
                        <Paperclip className="h-4 w-4 text-[#3F7F6E]" />
                      </Button>
                      <Input
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          if (e.target.value.trim()) sendTypingIndicator();
                        }}
                        placeholder="Введите сообщение..."
                        className="h-11"
                        disabled={uploading}
                      />
                      <Button type="submit" disabled={(!message.trim() && !selectedFile) || uploading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-full min-h-0">
                <div className="text-center text-[#3F7F6E] p-8">
                  {filteredChats.length === 0 ? (
                    <div>
                      <p className="mb-2">У вас пока нет чатов</p>
                      <p className="text-sm">Нажмите "Написать" на странице пользователя, чтобы начать разговор</p>
                    </div>
                  ) : (
                    <p>Выберите чат, чтобы начать общение</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </section>

      {/* Диалоги */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить чат?</DialogTitle>
            <DialogDescription>Все сообщения в этом чате будут удалены безвозвратно.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={blockDialogOpen}
        onOpenChange={(open) => {
          setBlockDialogOpen(open);
          if (!open) setDeleteAlsoChat(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать пользователя?</DialogTitle>
            <DialogDescription>Пользователь не сможет отправлять вам сообщения.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAlsoChat}
                onChange={(e) => setDeleteAlsoChat(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#3F7F6E] focus:ring-[#3F7F6E]"
              />
              <span className="text-sm text-gray-700">Также удалить чат с этим пользователем</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBlockDialogOpen(false);
                setDeleteAlsoChat(false);
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleBlockUser}>Заблокировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пожаловаться на пользователя</DialogTitle>
            <DialogDescription>Опишите причину жалобы. Мы рассмотрим её в ближайшее время.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleReportUser}>
              Отправить жалобу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMediaEditor && fileToEdit && (
        <MediaEditor file={fileToEdit} onSave={handleMediaSave} onCancel={handleMediaCancel} />
      )}

      {showImageViewer && imageViewerImages.length > 0 && (
        <ImageViewer images={imageViewerImages} initialIndex={imageViewerIndex} onClose={() => setShowImageViewer(false)} />
      )}
    </motion.div>
  );
}
