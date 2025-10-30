import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Star, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function TaskDetailPage() {
  const task = {
    id: 101,
    title: 'Сделаю адаптивный лендинг (Next/React)',
    category: 'Разработка',
    price: 450,
    currency: 'USD',
    deliveryDays: 7,
    tags: ['React', 'Next', 'SEO'],
    author: { name: 'Mickey', avatar: 'https://i.pravatar.cc/64?img=49', rating: 4.9, completedJobs: 27 },
    createdAt: '2025-10-22',
    features: ['Дизайн по референсам', 'Интеграция с API', 'Анимации', 'Адаптивная верстка', 'Базовое SEO', 'Настройка деплоя'],
    description: 'От прототипа до деплоя, аккуратный UI, Lighthouse 90+. Работаю с современным стеком: Next.js 14, React, TypeScript, Tailwind CSS. Включаю базовую оптимизацию и SEO.'
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="task-detail"
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
                  <CardTitle className="text-2xl mb-3">{task.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{task.category}</Badge>
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Описание</h3>
                    <p className="text-[#3F7F6E]">{task.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Что входит в услугу</h3>
                    <div className="grid gap-2">
                      {task.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-[#3F7F6E]">
                          <CheckCircle className="h-4 w-4 text-[#6FE7C8]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-lg bg-[#EFFFF8]">
                    <div>
                      <div className="text-sm text-[#3F7F6E] mb-1">Цена</div>
                      <div className="text-xl font-bold">${task.price}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#3F7F6E] mb-1">Срок</div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">{task.deliveryDays} дней</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#3F7F6E] mb-1">Валюта</div>
                      <div className="font-semibold">{task.currency}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 self-start sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Исполнитель</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <img src={task.author.avatar} alt={task.author.name} className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold">{task.author.name}</div>
                      <div className="text-sm text-[#3F7F6E] flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {task.author.rating}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="rounded-lg border p-2">
                      <div className="text-[#3F7F6E]">Проектов</div>
                      <div className="font-semibold">{task.author.completedJobs}</div>
                    </div>
                    <div className="rounded-lg border p-2">
                      <div className="text-[#3F7F6E]">Рейтинг</div>
                      <div className="font-semibold">{task.author.rating}</div>
                    </div>
                  </div>
                  <Button className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Заказать услугу
                  </Button>
                  <Button variant="secondary" className="w-full">Написать сообщение</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </motion.div>
    </AnimatePresence>
  );
}
