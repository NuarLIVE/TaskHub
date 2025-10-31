import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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

export default function OrderCreatePage() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    console.log('create-order', payload);
    alert('Заказ сохранён (демо). См. console.log()');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key="order-new" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Новый заказ</h1>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <Card>
              <CardContent className="grid gap-4">
                <Field label="Заголовок">
                  <Input name="title" placeholder="Напр.: Нужен сайт‑лендинг на React" required className="h-11" />
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
                    <Field label="Дедлайн">
                      <div className="relative">
                        <Input name="deadline" type="date" className="h-11 pr-10" />
                        <Calendar className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#3F7F6E]" />
                      </div>
                    </Field>
                  }
                />
                <TwoCol
                  left={
                    <Field label="Бюджет (мин)">
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2 border rounded-md"><DollarSign className="h-4 w-4" /></span>
                        <Input name="budget_min" type="number" placeholder="300" className="h-11" />
                      </div>
                    </Field>
                  }
                  right={
                    <Field label="Бюджет (макс)">
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2 border rounded-md"><DollarSign className="h-4 w-4" /></span>
                        <Input name="budget_max" type="number" placeholder="600" className="h-11" />
                      </div>
                    </Field>
                  }
                />
                <TwoCol
                  left={
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
                  right={
                    <Field label="Тип занятости">
                      <select name="engagement" className="h-11 rounded-md border px-3 bg-background">
                        <option>Фикс‑прайс</option>
                        <option>Почасовая</option>
                      </select>
                    </Field>
                  }
                />
                <Field label="Описание">
                  <textarea name="description" rows={6} placeholder="Опишите задачи, критерии приёмки, ссылки на референсы" className="rounded-md border px-3 py-2 bg-background" />
                </Field>
                <Field label="Теги (через запятую)">
                  <Input name="tags" placeholder="React, Tailwind, API" className="h-11" />
                </Field>
                <div className="flex items-center gap-2">
                  <input id="escrow" name="escrow" type="checkbox" className="h-4 w-4" defaultChecked />
                  <label htmlFor="escrow" className="text-sm">Использовать эскроу</label>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-[#3F7F6E]">Черновик автоматически сохраняется (демо)</div>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" asChild><a href="#/">Отменить</a></Button>
                    <Button type="submit">Опубликовать</Button>
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
