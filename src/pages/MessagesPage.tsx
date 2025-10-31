import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getUserChats, getChatMessages, sendMessage, type Chat, type Message } from '@/lib/supabase';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

interface ThreadData {
  id: string;
  user: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export default function MessagesPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserSlug = 'me';

  useEffect(() => {
    loadChats();

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId]);

  const loadChats = async () => {
    setLoading(true);
    const data = await getUserChats(currentUserSlug);
    setChats(data);
    setLoading(false);
  };

  const loadMessages = async (chatId: string) => {
    const data = await getChatMessages(chatId);
    setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;

    const sent = await sendMessage(selectedChatId, currentUserSlug, message);
    if (sent) {
      setMessage('');
      await loadMessages(selectedChatId);
      await loadChats();
    }
  };

  const getOtherParticipant = (chat: Chat): string => {
    return chat.participant1_id === currentUserSlug ? chat.participant2_id : chat.participant1_id;
  };

  const threads: ThreadData[] = chats.map(chat => {
    const otherUser = getOtherParticipant(chat);
    return {
      id: chat.id,
      user: otherUser,
      avatar: `https://i.pravatar.cc/64?u=${otherUser}`,
      lastMessage: 'Новый чат',
      time: new Date(chat.updated_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: 0
    };
  });

  const currentChat = chats.find(c => c.id === selectedChatId);
  const currentThread = currentChat ? {
    user: getOtherParticipant(currentChat),
    avatar: `https://i.pravatar.cc/64?u=${getOtherParticipant(currentChat)}`
  } : null;

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
                  <Input placeholder="Поиск..." className="pl-9 h-10" />
                </div>
              </div>
              <div className="overflow-y-auto h-[calc(100%-73px)]">
                {threads.length === 0 ? (
                  <div className="p-4 text-center text-[#3F7F6E]">
                    Нет активных чатов
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedChatId(thread.id)}
                      className={`p-4 border-b cursor-pointer hover:bg-[#EFFFF8] ${selectedChatId === thread.id ? 'bg-[#EFFFF8]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={thread.avatar} alt={thread.user} className="h-10 w-10 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold truncate">{thread.user}</div>
                            <span className="text-xs text-[#3F7F6E]">{thread.time}</span>
                          </div>
                          <div className="text-sm text-[#3F7F6E] truncate">{thread.lastMessage}</div>
                        </div>
                        {thread.unread > 0 && (
                          <div className="h-5 w-5 rounded-full bg-[#6FE7C8] text-white text-xs flex items-center justify-center">{thread.unread}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {selectedChatId && currentThread ? (
              <Card className="flex flex-col">
                <div className="p-4 border-b flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChatId(null)}
                    className="lg:hidden hover:opacity-70 transition"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <a href={`#/u/${currentThread.user}`} className="flex items-center gap-3 hover:opacity-80 transition">
                    <img src={currentThread.avatar} alt={currentThread.user} className="h-10 w-10 rounded-full object-cover" />
                    <div className="font-semibold">{currentThread.user}</div>
                  </a>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-[#3F7F6E] mt-8">
                      Начните разговор
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUserSlug;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? 'bg-[#6FE7C8] text-white' : 'bg-gray-100'}`}>
                            <div className="text-sm">{msg.text}</div>
                            <div className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="h-11"
                    />
                    <Button type="submit" disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="flex items-center justify-center">
                <div className="text-center text-[#3F7F6E] p-8">
                  {threads.length === 0 ? (
                    <div>
                      <p className="mb-2">У вас пока нет чатов</p>
                      <p className="text-sm">Нажмите "Написать" на странице пользователя, чтобы начать разговор</p>
                    </div>
                  ) : (
                    'Выберите чат для начала разговора'
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}
