import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{left}{right}</div>
  );
}

export default function TaskCreatePage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('Войдите в систему для создания объявления');
      window.location.hash = '#/login';
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const tags = String(fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean);
    const features = [];
    for (let i = 0; i < 6; i++) {
      if (fd.get(`feature_${i}`) === 'on') {
        const featureNames = [
          'Дизайн по референсам',
          'Адаптивная вёрстка',
          'Интеграция с API',
          'Анимации (Framer Motion)',
          'Базовое SEO',
          'Настройка деплоя'
        ];
        features.push(featureNames[i]);
      }
    }

    const { data: { user: authUser } } = await getSupabase().auth.getUser();
    if (!authUser) {
      alert('Ошибка аутентификации');
      window.location.hash = '#/login';
      return;
    }

    const { data, error } = await getSupabase()
      .from('tasks')
      .insert({
        user_id: authUser.id,
        title: String(fd.get('title')),
        description: String(fd.get('description') || ''),
        category: String(fd.get('category')),
        price: Number(fd.get('price')),
        currency: String(fd.get('currency')),
        delivery_days: Number(fd.get('delivery_days')),
        tags,
        features,
        status: 'active'
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании объявления: ' + error.message);
      return;
    }

    alert('Объявление успешно опубликовано!');
    window.location.hash = '#/market';
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key="task-new" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Новый Task (предложение фрилансера)</h1>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <Card>
              <CardContent className="p-6 grid gap-4">
                <Field label="Название">
                  <Input name="title" placeholder="Сделаю адаптивный лендинг на React / Next" required className="h-11" />
                </Field>
                <TwoCol
                  left={
                    <Field label="Категория">
                      <select name="category" className="h-11 rounded-md border px-3 bg-background">
                        <option>Разработка</option>
                        <option>Дизайн</option>
                        <option>Маркетинг</option>
                        <option>Локализация</option>
                        <option>Копирайт</option>
                        <option>QA / Безопасность</option>
                      </select>
                    </Field>
                  }
                  right={
                    <Field label="Срок выполнения">
                      <div className="relative">
                        <Input name="delivery_days" type="number" placeholder="7" className="h-11 pr-10" />
                        <Clock className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#3F7F6E]" />
                      </div>
                    </Field>
                  }
                />
                <TwoCol
                  left={
                    <Field label="Цена">
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2 border rounded-md"><DollarSign className="h-4 w-4" /></span>
                        <Input name="price" type="number" placeholder="300" className="h-11" />
                      </div>
                    </Field>
                  }
                  right={
                    <Field label="Валюта">
                      <select name="currency" className="h-11 rounded-md border px-3 bg-background">
                        <option>USD</option>
                        <option>EUR</option>
                        <option>KZT</option>
                        <option>RUB</option>
                        <option>PLN</option>
                      </select>
                    </Field>
                  }
                />
                <Field label="Что входит">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      'Дизайн по референсам',
                      'Адаптивная вёрстка',
                      'Интеграция с API',
                      'Анимации (Framer Motion)',
                      'Базовое SEO',
                      'Настройка деплоя'
                    ].map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={`feature_${i}`} className="h-4 w-4" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Описание">
                  <textarea name="description" rows={6} placeholder="Опишите опыт, стек, процесс и критерии качества" className="rounded-md border px-3 py-2 bg-background" />
                </Field>
                <Field label="Теги (через запятую)">
                  <Input name="tags" placeholder="React, Tailwind, SSR" className="h-11" />
                </Field>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-[#3F7F6E]">Черновик автоматически сохраняется (демо)</div>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" asChild><a href="#/">Отменить</a></Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Публикация...' : 'Опубликовать'}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </section>
      </motion.div>
    </AnimatePresence>
  );
}
