import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Paperclip, Briefcase, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsCreate() {
  const { user } = useAuth();
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const type = params.get('type') || 'order';
  const id = params.get('id') || '1';

  useEffect(() => {
    if (!user) {
      window.location.hash = '/login';
    }
  }, [user]);

  const orderData = {
    id: id,
    title: type === 'order' ? 'Лендинг на React для стартапа' : 'Unity прототип',
    description: type === 'order'
      ? 'Нужен современный лендинг на React с адаптивной вёрсткой и интеграцией с API. Дизайн готов.'
      : 'Создание игрового прототипа на Unity. Требуется опыт разработки 2D/3D игр.',
    budget: type === 'order' ? '$600-800' : '$1000',
    tags: type === 'order' ? ['React', 'Landing', 'Responsive'] : ['Unity', 'Game Dev', 'Prototype'],
    author: { name: 'NovaTech', avatar: 'https://i.pravatar.cc/64?img=12' }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Proposal submitted:', { type, id, price, days, message, attachment });
    alert('Отклик отправлен (демо)');
    window.location.hash = '/';
  };

  const handleCancel = () => {
    window.location.hash = type === 'order' ? `/orders/${id}` : `/tasks/${id}`;
  };

  return (
    <motion.div
      key="proposals-create"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-10 py-10">
        <h1 className="text-2xl font-bold mb-6">
          Отправить отклик на {type === 'order' ? 'заказ' : 'объявление'}
        </h1>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {type === 'order' ? <Briefcase className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                  {orderData.title}
                </CardTitle>
                <p className="text-sm text-[#3F7F6E] mt-2">{orderData.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href={`#/u/${orderData.author.name.toLowerCase()}`} className="flex items-center gap-2 hover:opacity-80 transition">
                  <img src={orderData.author.avatar} alt={orderData.author.name} className="h-8 w-8 rounded-full" />
                  <span className="text-sm font-medium">{orderData.author.name}</span>
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{orderData.budget}</span>
                {orderData.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 p-4 rounded-lg bg-[#EFFFF8] border border-[#6FE7C8]/20">
          <p className="text-sm text-[#3F7F6E]">
            После отправки отклика {type === 'order' ? 'заказчик' : 'автор объявления'} получит уведомление и сможет просмотреть ваше предложение.
            Если ваш отклик подойдёт, {type === 'order' ? 'заказчик' : 'автор'} сможет принять его и начать сделку.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ваше предложение</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Ваша ставка (USD)</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="650"
                    required
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Срок выполнения (дней)</label>
                  <Input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    placeholder="10"
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Сообщение</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Опишите ваш опыт, подход к задаче и почему вы подходите для этого проекта..."
                  className="w-full rounded-md border px-3 py-2 bg-background"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Вложение (необязательно)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="h-11"
                  />
                  {attachment && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachment(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[#3F7F6E] mt-1">
                  Поддерживаются: PDF, DOC, DOCX, изображения (макс. 10 МБ)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Отправить отклик
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
}
