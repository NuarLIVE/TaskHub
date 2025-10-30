import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, DollarSign, Calendar, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function OrderDetailPage() {
  const [proposalText, setProposalText] = useState('');
  const [proposalPrice, setProposalPrice] = useState('');

  const order = {
    id: 1,
    title: 'Лендинг на React для стартапа',
    category: 'Разработка',
    priceMin: 500,
    priceMax: 900,
    currency: 'USD',
    engagement: 'Фикс-прайс',
    deadline: '2025-11-15',
    tags: ['React', 'Tailwind', 'Framer'],
    author: { name: 'NovaTech', avatar: 'https://i.pravatar.cc/64?img=12', location: 'Алматы, Казахстан' },
    createdAt: '2025-10-21',
    description: 'Нужен лендинг из 3 экранов с интеграцией форм и анимациями. Дизайн уже готов в Figma. Требуется адаптивная верстка, интеграция с API для форм обратной связи, анимации при скролле. Хостинг на Vercel.',
    proposals: 12,
    views: 245
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Proposal submitted:', { proposalText, proposalPrice });
    alert('Отклик отправлен (демо)');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="order-detail"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background"
      >
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-3">{order.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{order.category}</Badge>
                        <Badge variant="outline">{order.engagement}</Badge>
                        {order.tags.map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Описание</h3>
                    <p className="text-[#3F7F6E]">{order.description}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-[#3F7F6E]">
                      <DollarSign className="h-4 w-4" />
                      <span>Бюджет: ${order.priceMin}–${order.priceMax}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#3F7F6E]">
                      <Calendar className="h-4 w-4" />
                      <span>Дедлайн: {order.deadline}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#3F7F6E]">
                      <Clock className="h-4 w-4" />
                      <span>{order.proposals} откликов</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#3F7F6E]">
                      <span>{order.views} просмотров</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Отправить отклик</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitProposal} className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ваше предложение</label>
                      <textarea
                        value={proposalText}
                        onChange={(e) => setProposalText(e.target.value)}
                        rows={6}
                        placeholder="Опишите ваш опыт, подход к задаче и сроки"
                        className="w-full rounded-md border px-3 py-2 bg-background"
                        required
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Ваша цена (USD)</label>
                        <Input
                          type="number"
                          value={proposalPrice}
                          onChange={(e) => setProposalPrice(e.target.value)}
                          placeholder="650"
                          required
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Срок выполнения (дней)</label>
                        <Input
                          type="number"
                          placeholder="10"
                          required
                          className="h-11"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Отправить отклик
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 self-start sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Заказчик</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <img src={order.author.avatar} alt={order.author.name} className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold">{order.author.name}</div>
                      <div className="text-sm text-[#3F7F6E] flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {order.author.location}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="rounded-lg border p-2">
                      <div className="text-[#3F7F6E]">Проектов</div>
                      <div className="font-semibold">24</div>
                    </div>
                    <div className="rounded-lg border p-2">
                      <div className="text-[#3F7F6E]">Рейтинг</div>
                      <div className="font-semibold">4.8</div>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full">Написать сообщение</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Информация</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3F7F6E]">Опубликовано</span>
                    <span className="font-medium">{order.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F7F6E]">ID заказа</span>
                    <span className="font-medium">#{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F7F6E]">Статус</span>
                    <Badge variant="secondary">Открыт</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </motion.div>
    </AnimatePresence>
  );
}
