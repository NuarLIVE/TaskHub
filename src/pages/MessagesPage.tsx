import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft, MoreVertical, Trash2, Ban, AlertTriangle, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToProfile } from '@/lib/navigation';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  file_url?: string;
  file_name?: string;
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
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChats();
    }

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, [user]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadMessages(selectedChatId);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadMessages(selectedChatId);
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length]);

  const loadChats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: chatsData } = await supabase
        .from('chats')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      setChats(chatsData || []);

      const userIds = new Set<string>();
      (chatsData || []).forEach((chat: Chat) => {
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
    } catch (error) {
      setChats([]);
    } finally {
      setLoading(false);
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
    } catch (error) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || !selectedChatId || !user) return;

    try {
      let fileUrl = null;
      let fileName = null;

      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = selectedFile.name;
        setUploading(false);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChatId,
          sender_id: user.id,
          text: message || '',
          file_url: fileUrl,
          file_name: fileName
        });

      if (error) throw error;

      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedChatId);

      setMessage('');
      setSelectedFile(null);
      await loadMessages(selectedChatId);
      await loadChats();
    } catch (error) {
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
    } catch (error) {
      alert('Ошибка при удалении чата');
    }
  };

  const handleBlockUser = () => {
    alert('Функция блокировки будет реализована в следующей версии');
    setBlockDialogOpen(false);
  };

  const handleReportUser = () => {
    alert('Жалоба отправлена. Мы рассмотрим её в ближайшее время.');
    setReportDialogOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10 МБ');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getOtherParticipant = (chat: Chat): string => {
    if (!user) return '';
    return chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id;
  };

  const getLastSeenText = () => {
    return 'был(а) в сети недавно';
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const otherUserId = getOtherParticipant(chat);
    const profile = profiles[otherUserId];
    return profile?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentChat = chats.find(c => c.id === selectedChatId);
  const currentOtherUserId = currentChat ? getOtherParticipant(currentChat) : null;
  const currentProfile = currentOtherUserId ? profiles[currentOtherUserId] : null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div key="messages" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Сообщения</h1>

        {loading ? (
          <div className="flex justify-center items-center h-[600px]">
            <div className="text-[#3F7F6E]">Загрузка...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[600px]">
            <Card className="overflow-hidden">
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
              <div className="overflow-y-auto h-[calc(100%-73px)]">
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
                            <div className="flex items-center justify-between">
                              <div className="font-semibold truncate">{profile?.name || 'Пользователь'}</div>
                              <span className="text-xs text-[#3F7F6E]">
                                {new Date(chat.updated_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
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
              <Card className="flex flex-col">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-[#3F7F6E] mt-8">
                      Начните разговор
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? 'bg-[#6FE7C8] text-white' : 'bg-gray-100'}`}>
                            {msg.text && <div className="text-sm mb-1">{msg.text}</div>}
                            {msg.file_url && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm underline flex items-center gap-1 ${isOwn ? 'text-white' : 'text-[#6FE7C8]'}`}
                              >
                                <Paperclip className="h-3 w-3" />
                                {msg.file_name || 'Файл'}
                              </a>
                            )}
                            <div className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t">
                  {selectedFile && (
                    <div className="mb-2 flex items-center gap-2 text-sm bg-[#EFFFF8] p-2 rounded">
                      <Paperclip className="h-4 w-4 text-[#3F7F6E]" />
                      <span className="flex-1 truncate">{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="hover:opacity-70">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip className="h-4 w-4" />
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
              <Card className="flex items-center justify-center">
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

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать пользователя?</DialogTitle>
            <DialogDescription>
              Пользователь не сможет отправлять вам сообщения.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockDialogOpen(false)}>Отмена</Button>
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
    </motion.div>
  );
}
