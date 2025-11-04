import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, MessageSquare, MapPin, AtSign, Link as LinkIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('portfolio');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('fh_profile');
    return raw ? JSON.parse(raw) : {
      name: 'Mickey',
      headline: 'Web/Unity',
      role: 'Full‑stack / Game Dev',
      about: 'Full‑stack разработчик и Unity‑инженер. Люблю аккуратные интерфейсы и предсказуемый неткод.',
      skills: ['React', 'Tailwind', 'Node', 'PostgreSQL', 'Unity', 'Photon'],
      rateMin: 20,
      rateMax: 35,
      currency: 'USD',
      location: 'Есик / Алматы',
      contactEmail: 'you@example.com',
      contactTelegram: '@mickey',
      avatar: 'https://i.pravatar.cc/120?img=49'
    };
  });

  useEffect(() => {
    if (user && tab === 'market') {
      loadUserMarketItems();
    }
  }, [user, tab]);

  const loadUserMarketItems = async () => {
    if (!user) return;

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setUserOrders(ordersData || []);
    setUserTasks(tasksData || []);
  };

  const saveProfile = (p: typeof profile) => {
    setProfile(p);
    if (typeof window !== 'undefined') localStorage.setItem('fh_profile', JSON.stringify(p));
  };

  const onEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = {
      name: String(fd.get('name') || ''),
      headline: String(fd.get('headline') || ''),
      role: String(fd.get('role') || ''),
      about: String(fd.get('about') || ''),
      skills: String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean),
      rateMin: Number(fd.get('rateMin') || 0),
      rateMax: Number(fd.get('rateMax') || 0),
      currency: String(fd.get('currency') || 'USD'),
      location: String(fd.get('location') || ''),
      contactEmail: String(fd.get('contactEmail') || ''),
      contactTelegram: String(fd.get('contactTelegram') || ''),
      avatar: String(fd.get('avatar') || '')
    };
    saveProfile(next);
    alert('Профиль обновлён');
    setTab('about');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="profile"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background"
      >
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            <Card className="sticky top-24 self-start">
              <CardContent className="p-6 grid gap-4">
                <div className="flex items-center gap-4">
                  <img src={profile.avatar} alt="avatar" className="h-16 w-16 rounded-2xl object-cover" />
                  <div>
                    <div className="font-semibold">{profile.name} • {profile.headline}</div>
                    <div className="text-sm text-[#3F7F6E]">{profile.role}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border p-2">
                    <div className="text-xs text-[#3F7F6E]">Рейтинг</div>
                    <div className="font-semibold flex items-center justify-center gap-1"><Star className="h-4 w-4" />4.9</div>
                  </div>
                  <div className="rounded-xl border p-2">
                    <div className="text-xs text-[#3F7F6E]">Проекты</div>
                    <div className="font-semibold">27</div>
                  </div>
                  <div className="rounded-xl border p-2">
                    <div className="text-xs text-[#3F7F6E]">Онлайн</div>
                    <div className="font-semibold text-emerald-600">сейчас</div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Button asChild><a href="#/task/new">Создать Task</a></Button>
                  <Button asChild variant="secondary"><a href="#/order/new">Создать заказ</a></Button>
                </div>
                <div className="flex items-center justify-between text-sm text-[#3F7F6E]">
                  <a className="underline" href="#">Поделиться профилем</a>
                  <button className="underline" onClick={() => setTab('edit')}>Редактировать</button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardContent className="p-6 flex flex-wrap items-center gap-3">
                  {[{ id: 'portfolio', label: 'Портфолио' }, { id: 'market', label: 'Биржа' }, { id: 'about', label: 'О себе' }, { id: 'reviews', label: 'Отзывы' }, { id: 'edit', label: 'Редактировать' }].map(t => (
                    <Button key={t.id} variant={tab === t.id ? 'default' : 'ghost'} onClick={() => setTab(t.id)} className="h-9 px-4">{t.label}</Button>
                  ))}
                </CardContent>
              </Card>

              {tab === 'portfolio' && (
                <>
                  <div className="flex justify-end mb-4">
                    <Button asChild>
                      <a href="#/me/portfolio/add">+ Добавить проект</a>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="overflow-hidden">
                        <div className="aspect-[16/10] bg-[#EFFFF8]" />
                        <CardContent className="p-4">
                          <div className="font-medium">Проект #{i}</div>
                          <div className="text-sm text-[#3F7F6E]">React · Node · PostgreSQL</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {tab === 'market' && (
                <>
                  <div>
                    <h3 className="text-xl font-bold mb-4">Мои заказы</h3>
                    {userOrders.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center text-[#3F7F6E]">
                          Вы ещё не создали ни одного заказа
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userOrders.map((order) => (
                          <Card key={order.id}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">{order.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">{order.category}</Badge>
                                <Badge variant="outline">{order.status}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="px-6">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(order.tags || []).map((t: string) => (
                                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                ))}
                              </div>
                              <div className="text-sm text-[#3F7F6E] line-clamp-2">{order.description}</div>
                              <div className="mt-3 font-semibold">
                                {order.currency} {order.price_min}–{order.price_max}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-4">Мои объявления</h3>
                    {userTasks.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center text-[#3F7F6E]">
                          Вы ещё не создали ни одного объявления
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userTasks.map((task) => (
                          <Card key={task.id}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">{task.category}</Badge>
                                <Badge variant="outline">{task.status}</Badge>
                                {task.delivery_days && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {task.delivery_days}д
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="px-6">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(task.tags || []).map((t: string) => (
                                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                ))}
                              </div>
                              <div className="text-sm text-[#3F7F6E] line-clamp-2">{task.description}</div>
                              <div className="mt-3 font-semibold">
                                {task.currency} {task.price}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {tab === 'about' && (
                <Card>
                  <CardContent className="p-6 grid gap-4">
                    <div>
                      <div className="font-semibold">{profile.headline}</div>
                      <div className="text-[#3F7F6E]">{profile.about}</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-sm font-medium mb-2">Навыки</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4 grid gap-2">
                        <div className="text-sm font-medium">Ставка</div>
                        <div className="text-[#3F7F6E]">{`$${profile.rateMin}–${profile.rateMax}/час`}</div>
                        <div className="flex items-center gap-2 text-sm text-[#3F7F6E]"><MapPin className="h-4 w-4" />{profile.location}</div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-2 text-[#3F7F6E]"><AtSign className="h-4 w-4" />{profile.contactTelegram}</span>
                          <span className="flex items-center gap-2 text-[#3F7F6E]"><LinkIcon className="h-4 w-4" />{profile.contactEmail}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tab === 'reviews' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6 grid gap-3">
                        <div className="flex items-center gap-3">
                          <img src={`https://i.pravatar.cc/64?img=${10 + i}`} className="h-9 w-9 rounded-full" />
                          <div className="font-medium">Заказчик #{i}</div>
                          <div className="ml-auto flex items-center gap-1 text-emerald-600"><Star className="h-4 w-4" />5.0</div>
                        </div>
                        <p className="text-sm text-[#3F7F6E]">Отличная коммуникация, аккуратные коммиты, демо вовремя. Рекомендую!</p>
                        <div className="flex items-center gap-4 text-sm text-[#3F7F6E]">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4" />Полезно</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />Ответить</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {tab === 'edit' && (
                <Card>
                  <CardContent className="p-6">
                    <form className="grid gap-4" onSubmit={onEditSubmit}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Имя</span>
                          <Input name="name" defaultValue={profile.name} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Заголовок</span>
                          <Input name="headline" defaultValue={profile.headline} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Роль</span>
                          <Input name="role" defaultValue={profile.role} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Аватар (URL)</span>
                          <Input name="avatar" defaultValue={profile.avatar} className="h-11" />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">О себе</span>
                        <textarea name="about" defaultValue={profile.about} rows={5} className="rounded-md border px-3 py-2 bg-background" />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Навыки (через запятую)</span>
                        <Input name="skills" defaultValue={profile.skills.join(', ')} className="h-11" />
                      </label>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Ставка min</span>
                          <Input type="number" name="rateMin" defaultValue={profile.rateMin} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Ставка max</span>
                          <Input type="number" name="rateMax" defaultValue={profile.rateMax} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Валюта</span>
                          <select name="currency" defaultValue={profile.currency} className="h-11 rounded-md border px-3 bg-background">
                            <option>USD</option>
                            <option>EUR</option>
                            <option>KZT</option>
                            <option>RUB</option>
                            <option>PLN</option>
                          </select>
                        </label>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Локация</span>
                          <Input name="location" defaultValue={profile.location} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Email</span>
                          <Input name="contactEmail" type="email" defaultValue={profile.contactEmail} className="h-11" />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Telegram</span>
                          <Input name="contactTelegram" defaultValue={profile.contactTelegram} className="h-11" />
                        </label>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setTab('about')}>Отмена</Button>
                        <Button type="submit">Сохранить</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </motion.div>
    </AnimatePresence>
  );
}
