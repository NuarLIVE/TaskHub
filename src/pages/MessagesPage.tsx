import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft, MoreVertical, Trash2, Ban, AlertTriangle, Paperclip, X, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToProfile } from '@/lib/navigation';
import { MediaEditor } from '@/components/MediaEditor';
import { ImageViewer } from '@/components/ImageViewer';

const pageVariants = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
const pageTransition = { duration: 0.2 };

interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  // опциональные поля, если есть в представлении
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
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const shouldScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (user) {
      loadChats();

      // Subscribe to chat list updates for current user
      const userChatsSubscription = supabase
        .channel('user-chats')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chats',
          },
          () => {
            loadChats(false);
          }
        )
        .subscribe();

      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const chatId = params.get('chat');
      if (chatId) {
        setSelectedChatId(chatId);
      }

      return () => {
        userChatsSubscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedChatId) {
      isInitialLoadRef.current = true;
      shouldScrollRef.current = true;
      loadMessages(selectedChatId);

      // Subscribe to real-time updates for messages in this chat
      const messagesSubscription = supabase
        .channel(`messages:${selectedChatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${selectedChatId}`
          },
          (payload) => {
            const newMessage = payload.new as Message;

            // Only add if it's not from current user (to avoid duplication with optimistic update)
            if (newMessage.sender_id !== user?.id) {
              setMessages(prev => {
                // Check if message already exists
                if (prev.some(m => m.id === newMessage.id)) {
                  return prev;
                }
                shouldScrollRef.current = true;
                return [...prev, newMessage];
              });

              // Mark as read and update chat
              markMessagesAsRead(selectedChatId);
            }
          }
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
      };
    }
  }, [selectedChatId, user]);

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
      const { data: chatsData } = await supabase
        .from('chats')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const blockedIds = new Set((blockedData || []).map(b => b.blocked_id));

      const filteredChats = (chatsData || []).filter((chat: Chat) => {
        const otherUserId = chat.participant1_id === user.id
          ? chat.participant2_id
          : chat.participant1_id;
        return !blockedIds.has(otherUserId);
      });

      setChats(filteredChats);

      const userIds = new Set<string>();
      filteredChats.forEach((chat: Chat) => {
        userIds.add(chat.participant1_id);
        userIds.add(chat.participant2_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', Array.from(userIds));

        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach((p: Profile) => {
          profilesMap[p.id] = p;
        });
        setProfiles(profilesMap);
      }
    } catch {
      setChats([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      setMessages(data || []);

      if (user) {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          const isParticipant1 = chat.participant1_id === user.id;
          await supabase
            .from('chats')
            .update({
              unread_count_p1: isParticipant1 ? 0 : chat.unread_count_p1,
              unread_count_p2: !isParticipant1 ? 0 : chat.unread_count_p2
            })
            .eq('id', chatId);
        }
      }
    } catch {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || !selectedChatId || !user) return;

    const selectedChat = chats.find(c => c.id === selectedChatId);
    if (!selectedChat) return;

    const otherUserId = getOtherParticipant(selectedChat);

    const { data: isBlocked } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (isBlocked) {
      alert('Невозможно отправить сообщение. Один из пользователей заблокирован.');
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
      file_name: undefined
    };

    shouldScrollRef.current = true;
    setMessages(prev => [...prev, optimisticMessage]);
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

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = selectedFile.name;

        if (selectedFile.type.startsWith('image/')) {
          fileType = 'image';
        } else if (selectedFile.type.startsWith('video/')) {
          fileType = 'video';
        } else {
          fileType = 'file';
        }

        setUploading(false);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChatId,
          sender_id: user.id,
          text: messageText || '',
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType
        });

      if (error) throw error;

      shouldScrollRef.current = false;
      loadMessages(selectedChatId);
      loadChats(false);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessage(messageText);
      alert('Ошибка при отправке сообщения');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', selectedChatId);

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

    const selectedChat = chats.find(c => c.id === selectedChatId);
    if (!selectedChat) return;

    const otherUserId = getOtherParticipant(selectedChat);

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: otherUserId
        });

      if (error) {
        if (error.code === '23505') {
          alert('Этот пользователь уже заблокирован');
        } else {
          throw error;
        }
        return;
      }

      if (deleteAlsoChat) {
        await supabase
          .from('chats')
          .delete()
          .eq('id', selectedChatId);
      }

      alert('Пользователь заблокирован. Вы больше не будете получать сообщения от него.');
      setBlockDialogOpen(false);
      setDeleteAlsoChat(false);
      setSelectedChatId(null);
      await loadChats();
    } catch {
      alert('Ошибка при блокировке пользователя');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    const chatImages = messages
      .filter(m => m.file_type === 'image' && m.file_url)
      .map(m => ({ url: m.file_url!, name: m.file_name }));

    const clickedIndex = chatImages.findIndex(img => img.url === imageUrl);

    setImageViewerImages(chatImages);
    setImageViewerIndex(clickedIndex >= 0 ? clickedIndex : 0);
    setShowImageViewer(true);
  };

  const getOtherParticipant = (chat: Chat): string => {
    if (!user) return '';
    return chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id;
  };

  const getLastSeenText = () => 'был(а) в сети недавно';

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const otherUserId = getOtherParticipant(chat);
    const profile = profiles[otherUserId];
    return profile?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentChat = chats.find(c => c.id === selectedChatId);
  const currentOtherUserId = currentChat ? getOtherParticipant(currentChat) : null;
  const currentProfile = currentOtherUserId ? profiles[currentOtherUserId] : null;

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
            <div className="text-[#3F7F6E]">Загрузка...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h[calc(100vh-200px)] h-[calc(100vh-200px)] max-h-[700px] min-h-0">
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
                    return (
                      <div
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`p-4 border-b cursor-pointer hover:bg-[#EFFFF8] ${selectedChatId === chat.id ? 'bg-[#EFFFF8]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToProfile(otherUserId, user?.id);
                            }}
                          >
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.name} className="h-10 w-10 rounded-full object-cover hover:opacity-80 transition" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center hover:opacity-80 transition">
                                <span className="text-sm font-medium">{profile?.name?.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold truncate">{profile?.name || 'Пользователь'}</div>
                              <span className="text-xs text-[#3F7F6E]">
                                {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-[#3F7F6E] truncate">
                                {chat.last_message_text || 'Нет сообщений'}
                              </div>
                              {((chat.participant1_id === user?.id && (chat.unread_count_p1 || 0) > 0) ||
                                (chat.participant2_id === user?.id && (chat.unread_count_p2 || 0) > 0)) && (
                                <div className="ml-2 h-5 min-w-5 px-1.5 rounded-full bg-[#6FE7C8] text-white text-xs font-semibold flex items-center justify-center">
                                  {chat.participant1_id === user?.id ? chat.unread_count_p1 : chat.unread_count_p2}
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

            {selectedChatId && currentProfile ? (
              <Card className="flex flex-col h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChatId(null)}
                      className="lg:hidden hover:opacity-70 transition"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div
                      className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
                      onClick={() => navigateToProfile(currentOtherUserId || '', user?.id)}
                    >
                      {currentProfile.avatar_url ? (
                        <img src={currentProfile.avatar_url} alt={currentProfile.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                          <span className="text-sm font-medium">{currentProfile.name?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{currentProfile.name}</div>
                        <div className="text-xs text-[#3F7F6E]">{getLastSeenText()}</div>
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
                          onClick={() => { setDeleteDialogOpen(true); setMenuOpen(false); }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Удалить чат
                        </button>
                        <button
                          onClick={() => { setBlockDialogOpen(true); setMenuOpen(false); }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                          <Ban className="h-4 w-4" />
                          Заблокировать
                        </button>
                        <button
                          onClick={() => { setReportDialogOpen(true); setMenuOpen(false); }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-red-600"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Пожаловаться
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-[#3F7F6E] mt-8">
                      Начните разговор
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg overflow-hidden ${isOwn ? 'bg-[#6FE7C8] text-white' : 'bg-gray-100'}`}>
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
                              <video
                                src={msg.file_url}
                                controls
                                className="w-full max-w-sm"
                              />
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
                                  <FileText className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-[#3F7F6E]'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
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
                            <div className={`px-3 pb-2 text-xs ${isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                          <p className="text-xs text-[#3F7F6E] mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={removeSelectedFile}
                          className="flex-shrink-0 hover:opacity-70 transition p-1"
                        >
                          <X className="h-5 w-5 text-[#3F7F6E]" />
                        </button>
                      </div>
                    </div>
                  )}
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
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="h-11"
                      disabled={uploading}
                    />
                    <Button type="submit" disabled={(!message.trim() && !selectedFile) || uploading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить чат?</DialogTitle>
            <DialogDescription>
              Все сообщения в этом чате будут удалены безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteChat}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockDialogOpen} onOpenChange={(open) => {
        setBlockDialogOpen(open);
        if (!open) setDeleteAlsoChat(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать пользователя?</DialogTitle>
            <DialogDescription>
              Пользователь не сможет отправлять вам сообщения.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAlsoChat}
                onChange={(e) => setDeleteAlsoChat(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#3F7F6E] focus:ring-[#3F7F6E]"
              />
              <span className="text-sm text-gray-700">
                Также удалить чат с этим пользователем
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setBlockDialogOpen(false);
              setDeleteAlsoChat(false);
            }}>
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
            <DialogDescription>
              Опишите причину жалобы. Мы рассмотрим её в ближайшее время.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleReportUser}>Отправить жалобу</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMediaEditor && fileToEdit && (
        <MediaEditor
          file={fileToEdit}
          onSave={handleMediaSave}
          onCancel={handleMediaCancel}
        />
      )}

      {showImageViewer && imageViewerImages.length > 0 && (
        <ImageViewer
          images={imageViewerImages}
          initialIndex={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </motion.div>
  );
}
