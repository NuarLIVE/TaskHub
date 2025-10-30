import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function MessagesPage() {
  const [selectedThread, setSelectedThread] = useState(1);
  const [message, setMessage] = useState('');

  const threads = [
    { id: 1, user: 'NovaTech', avatar: 'https://i.pravatar.cc/64?img=12', lastMessage: 'Когда сможете начать?', time: '10:30', unread: 2 },
    { id: 2, user: 'AppNest', avatar: 'https://i.pravatar.cc/64?img=22', lastMessage: 'Спасибо за работу!', time: 'Вчера', unread: 0 }
  ];

  const messages = [
    { id: 1, sender: 'NovaTech', text: 'Здравствуйте! Интересует ваше предложение по React лендингу', time: '10:00', isOwn: false },
    { id: 2, sender: 'Вы', text: 'Здравствуйте! Я готов начать в ближайшие дни. У вас есть готовый дизайн?', time: '10:15', isOwn: true },
    { id: 3, sender: 'NovaTech', text: 'Да, дизайн в Figma готов. Когда сможете начать?', time: '10:30', isOwn: false }
  ];

  return (
    <motion.div key="messages" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Сообщения</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[600px]">
          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                <Input placeholder="Поиск..." className="pl-9 h-10" />
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100%-73px)]">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-[#EFFFF8] ${selectedThread === thread.id ? 'bg-[#EFFFF8]' : ''}`}
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
              ))}
            </div>
          </Card>

          <Card className="flex flex-col">
            <div className="p-4 border-b flex items-center gap-3">
              <img src={threads.find(t => t.id === selectedThread)?.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div className="font-semibold">{threads.find(t => t.id === selectedThread)?.user}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.isOwn ? 'bg-[#6FE7C8] text-white' : 'bg-gray-100'}`}>
                    <div className="text-sm">{msg.text}</div>
                    <div className={`text-xs mt-1 ${msg.isOwn ? 'text-white/70' : 'text-[#3F7F6E]'}`}>{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <form onSubmit={(e) => { e.preventDefault(); setMessage(''); }} className="flex gap-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Введите сообщение..." className="h-11" />
                <Button type="submit"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </Card>
        </div>
      </section>
    </motion.div>
  );
}
