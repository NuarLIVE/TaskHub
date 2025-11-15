import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Lesson {
  id: number;
  title: string;
  content: string;
}

const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Старт для фрилансеров',
    content: `Добро пожаловать!
Фриланс — это не только про "делать задачи", это про навык: как вести себя в сети, как не сгореть, как держать качество.

Начни с трёх простых шагов:

Оформи профиль: аватар, описание, навыки, примеры работ.

Выбери 1–2 сильных направления — лучше два мощных, чем шесть слабых.

Настрой цены — ориентируйся на рынок, но ставь чуть ниже, чтобы быстро собрать первые отзывы.

Фриланс — это марафон, а не спринт. И ты уже на старте.`
  },
  {
    id: 2,
    title: 'Как получить первый заказ',
    content: `Первый заказ — самый сложный.
Но есть рабочая схема:

Ставь цену ниже рынка на 20–30% — только на старте.

Пиши кастомные предложения, не шаблон — клиент видит фальшь.

Предлагай мини-бонус: "Сделаю правки бесплатно", "Небольшое улучшение — в подарок".

Делай максимально быстрый отклик — скорость решает половину побед.

И да — первые заказы всегда самые сложные, но потом пойдёт стабильно.`
  },
  {
    id: 3,
    title: 'Как общаться с клиентами',
    content: `Работа с клиентом — это 50% успеха.

Пиши коротко, чётко, без воды.

Задавай уточняющие вопросы — это создаёт доверие.

Держи дружелюбный тон.

Всегда подтверждай сроки:
«Задачу понял. Срок — 2 дня. Завтра скину промежуточный вариант.»

И золотое правило:
Если не уверен — уточни, а не угадывай.`
  },
  {
    id: 4,
    title: 'Как оформлять услугу',
    content: `Хорошее оформление = больше продаж.

В карточке услуги должно быть:

Простое название: «Сделаю сайт на React», «Смонтирую TikTok/Reels».

Короткое описание: 3–5 предложений, что ты делаешь.

Преимущества: скорость, качество, опыт, гарантия.

Уровни пакетов:

Базовый — дёшево

Стандарт — лучше

Премиум — всё включено

Человек должен понять услугу за 5 секунд.`
  },
  {
    id: 5,
    title: 'Как сделать крутое портфолио',
    content: `Портфолио = твоя сила.

Добавь:

3–6 работ максимум

красивые скриншоты

короткое описание задачи

результат: "увеличил конверсию", "улучшил дизайн", "ускорил сайт"

И главное:
Не врать.
Если нет реальных работ — сделай 2–3 учебных проекта и напиши честно:
«Учебная работа для демонстрации навыков.»`
  },
  {
    id: 6,
    title: 'Как устроить цены',
    content: `Цена = баланс опыта, спроса и рынка.

Правила:

Новичок → ниже рынка

Средний уровень → среднерыночные

Профи → выше рынка

И делай цены понятными, без хитростей:

10$ — мини-задача

30–50$ — средняя

100+ — крупная

Лучше добавить апселлы:
— «Срочно»
— «Дизайн + вёрстка»
— «Полный пакет»`
  },
  {
    id: 7,
    title: 'Как работать через TaskHub',
    content: `Это про твою биржу:

Как запускать задания

Как принимать оплату

Что такое безопасная сделка

Что такое внутренняя валюта

Как писать в чат, как прикреплять файлы

Как открывать спор

Все инструменты биржи созданы для твоей безопасности и удобства.
Используй их правильно — и фриланс станет комфортным.`
  },
  {
    id: 8,
    title: 'Как не попадать на мошенников',
    content: `Простые правила безопасности:

Не выходи из платформы

Не отправляй работу без оплаты

Не переходи по странным ссылкам

Не принимай оплату "напрямую" вне биржи

Не отправляй свои данные

И да — если клиент агрессивный, давит или оскорбляет — легче отказать сразу, чем вытаскивать нервы потом.`
  },
  {
    id: 9,
    title: 'Как выполнять работу быстро и качественно',
    content: `Секреты продуктивности:

Делай через макет → сначала черновик, потом финал

Делай ежедневные мини-отчёты

Не начинай работу, пока не всё уточнено

Работай в промежутках 40–60 минут (помидоро)

Держи чистый код/дизайн/структуру

И помни:
Люди возвращаются за качеством → а качество = внимание к мелочам.`
  },
  {
    id: 10,
    title: 'Как получить постоянных клиентов',
    content: `Самое сладкое — постоянные клиенты.
Они дают стабильность.

Как их удержать:

Держи слово

Делаешь чуть больше, чем обещал

Отвечай быстро

Пиши вежливо

Делай скидки старым клиентам

Предлагай идеи, а не только выполняй

Фрилансер, который "думает", а не просто делает — всегда ценный.`
  }
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function LearningPage() {
  const [currentLessonId, setCurrentLessonId] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId);

  const goToLesson = (lessonId: number) => {
    setCurrentLessonId(lessonId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      goToLesson(lessons[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentIndex < lessons.length - 1) {
      if (!completedLessons.includes(currentLessonId)) {
        setCompletedLessons([...completedLessons, currentLessonId]);
      }
      goToLesson(lessons[currentIndex + 1].id);
    }
  };

  const markAsCompleted = () => {
    if (!completedLessons.includes(currentLessonId)) {
      setCompletedLessons([...completedLessons, currentLessonId]);
    }
  };

  return (
    <motion.div
      key="learning"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Обучение</h1>
          <p className="text-muted-foreground">Пройди уроки и стань успешным фрилансером</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  <BookOpen className="h-5 w-5 text-[#3F7F6E]" />
                  <h2 className="font-semibold">Уроки</h2>
                </div>
                <div className="space-y-1">
                  {lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId;
                    const isCompleted = completedLessons.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => goToLesson(lesson.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'bg-[#3F7F6E] text-white'
                            : isCompleted
                            ? 'bg-[#EFFFF8] text-[#3F7F6E] hover:bg-[#E0F9F0]'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${
                          isActive
                            ? 'border-white'
                            : isCompleted
                            ? 'border-[#3F7F6E] bg-[#3F7F6E] text-white'
                            : 'border-gray-300'
                        }">
                          {isCompleted ? <Check className="h-4 w-4" /> : lesson.id}
                        </div>
                        <span className="text-sm flex-1 line-clamp-2">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
                  Пройдено: {completedLessons.length} из {lessons.length}
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <div className="text-sm text-[#3F7F6E] font-medium mb-2">
                      Урок {currentLesson.id} из {lessons.length}
                    </div>
                    <h2 className="text-2xl font-bold mb-4">{currentLesson.title}</h2>
                  </div>
                  {!completedLessons.includes(currentLessonId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAsCompleted}
                      className="flex-shrink-0"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Завершить
                    </Button>
                  )}
                </div>

                <div className="prose prose-slate max-w-none">
                  {currentLesson.content.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-base leading-relaxed mb-4 whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentIndex + 1} / {lessons.length}
                  </div>

                  <Button
                    onClick={goToNext}
                    disabled={currentIndex === lessons.length - 1}
                    className="gap-2 bg-[#3F7F6E] hover:bg-[#2F6F5E]"
                  >
                    Далее
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
