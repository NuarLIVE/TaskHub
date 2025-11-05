import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, MessageSquare, MapPin, AtSign, Link as LinkIcon, Clock, Image as ImageIcon, ExternalLink, Loader2, Eye, Calendar, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<number>>(new Set());
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'order' | 'task' | 'portfolio'>('order');
  const [portfolioPreviewOpen, setPortfolioPreviewOpen] = useState(false);
  const [selectedPortfolioProject, setSelectedPortfolioProject] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('fh_profile');
    return raw ? JSON.parse(raw) : {
      name: 'Mickey',
      headline: 'Web/Unity',
      role: 'Full‑stack / Game Dev',
      about: 'Full‑stack разработчик и Unity‑инженер. Люблю аккуратные интерфейсы и предсказуемый неткод.',
      bio: 'Занимаюсь разработкой уже более 5 лет. Специализируюсь на создании веб-приложений и игр. Работал над множеством проектов от стартапов до крупных корпораций. Всегда открыт к новым вызовам и интересным задачам. Предпочитаю чистый код и современные технологии.',
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
    if (user) {
      if (tab === 'market') {
        loadUserMarketItems();
      } else if (tab === 'portfolio') {
        loadPortfolioProjects();
      }
    }
  }, [user, tab]);

  const loadUserMarketItems = async () => {
    if (!user) return;

    setLoadingMarket(true);
    try {
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
    } finally {
      setLoadingMarket(false);
    }
  };

  const loadPortfolioProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setPortfolioProjects(data || []);
  };

  const handlePortfolioProjectClick = (project: any) => {
    setSelectedPortfolioProject(project);
    setPortfolioPreviewOpen(true);
  };

  const toggleHelpful = async (reviewId: number) => {
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }

    const newVotes = new Set(helpfulVotes);
    if (newVotes.has(reviewId)) {
      newVotes.delete(reviewId);
      await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);
    } else {
      newVotes.add(reviewId);
      await supabase
        .from('review_helpful_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id
        });
    }
    setHelpfulVotes(newVotes);
  };

  const openPreview = (item: any, type: 'order' | 'task') => {
    setPreviewItem(item);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const saveProfile = (p: typeof profile) => {
    setProfile(p);
    if (typeof window !== 'undefined') localStorage.setItem('fh_profile', JSON.stringify(p));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5 МБ');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const onEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const bioText = String(fd.get('bio') || '');
    if (bioText.length > 700) {
      alert('Текст "О себе" не должен превышать 700 символов');
      return;
    }

    let uploadedAvatarUrl = String(fd.get('avatar') || '');

    if (avatarFile && user) {
      try {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert(`Ошибка при загрузке аватара: ${uploadError.message}`);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(filePath);

        uploadedAvatarUrl = publicUrl;
        setAvatarFile(null);
        setAvatarPreview('');
      } catch (error: any) {
        console.error('Avatar upload error:', error);
        alert(`Ошибка при загрузке аватара: ${error.message}`);
        return;
      }
    }

    const next = {
      name: String(fd.get('name') || ''),
      headline: String(fd.get('headline') || ''),
      role: String(fd.get('role') || ''),
      about: String(fd.get('about') || ''),
      bio: bioText,
      skills: String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean),
      rateMin: Number(fd.get('rateMin') || 0),
      rateMax: Number(fd.get('rateMax') || 0),
      currency: String(fd.get('currency') || 'USD'),
      location: String(fd.get('location') || ''),
      contactEmail: String(fd.get('contactEmail') || ''),
      contactTelegram: String(fd.get('contactTelegram') || ''),
      avatar: uploadedAvatarUrl
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
                  {[{ id: 'portfolio', label: 'Портфолио' }, { id: 'market', label: 'Биржа' }, { id: 'about', label: 'О себе' }, { id: 'reviews', label: 'Отзывы' }].map(t => (
                    <Button key={t.id} variant={tab === t.id ? 'default' : 'ghost'} onClick={() => setTab(t.id)} className="h-9 px-4">{t.label}</Button>
                  ))}
                </CardContent>
              </Card>

              {tab === 'portfolio' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Портфолио</h2>
                    <Button asChild>
                      <a href="#/me/portfolio/add">+ Добавить проект</a>
                    </Button>
                  </div>
                  {portfolioProjects.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-[#3F7F6E] mb-4">У вас пока нет проектов в портфолио</p>
                        <Button asChild>
                          <a href="#/me/portfolio/add">Добавить первый проект</a>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {portfolioProjects.map((project) => (
                        <Card
                          key={project.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => handlePortfolioProjectClick(project)}
                        >
                          {project.image_url ? (
                            <img src={project.image_url} alt={project.title} className="aspect-[16/10] object-cover" />
                          ) : (
                            <div className="aspect-[16/10] bg-gradient-to-br from-[#EFFFF8] to-[#6FE7C8]/20 flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-[#3F7F6E]/30" />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="font-medium mb-1">{project.title}</div>
                            <p className="text-sm text-[#3F7F6E] mb-3 line-clamp-2">{project.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {project.tags?.slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                              {project.tags?.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{project.tags.length - 3}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'market' && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Мои заказы</h2>
                    {loadingMarket ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-[#6FE7C8] mx-auto mb-3" />
                          <p className="text-[#3F7F6E]">Загрузка...</p>
                        </CardContent>
                      </Card>
                    ) : userOrders.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center text-[#3F7F6E]">
                          Вы ещё не создали ни одного заказа
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {userOrders.map((order) => (
                          <Card key={order.id} className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all" onClick={() => openPreview(order, 'order')}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-2">{order.title}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary">{order.category}</Badge>
                                    <Badge variant="outline">{order.status}</Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {(order.tags || []).map((t: string) => (
                                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                    ))}
                                  </div>
                                  <p className="text-sm text-[#3F7F6E] mb-3 line-clamp-2">{order.description}</p>
                                  <div className="font-semibold text-[#6FE7C8]">
                                    {order.currency} {order.price_min}–{order.price_max}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-sm text-[#3F7F6E] min-w-[140px]">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="h-4 w-4" />
                                    <span>{order.views_count || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Heart className="h-4 w-4" />
                                    <span>{order.likes_count || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Мои объявления</h2>
                    {loadingMarket ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-[#6FE7C8] mx-auto mb-3" />
                          <p className="text-[#3F7F6E]">Загрузка...</p>
                        </CardContent>
                      </Card>
                    ) : userTasks.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center text-[#3F7F6E]">
                          Вы ещё не создали ни одного объявления
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {userTasks.map((task) => (
                          <Card key={task.id} className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all" onClick={() => openPreview(task, 'task')}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-2">{task.title}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary">{task.category}</Badge>
                                    <Badge variant="outline">{task.status}</Badge>
                                    {task.delivery_days && (
                                      <Badge variant="outline" className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {task.delivery_days}д
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {(task.tags || []).map((t: string) => (
                                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                    ))}
                                  </div>
                                  <p className="text-sm text-[#3F7F6E] mb-3 line-clamp-2">{task.description}</p>
                                  <div className="font-semibold text-[#6FE7C8]">
                                    {task.currency} {task.price}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-sm text-[#3F7F6E] min-w-[140px]">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="h-4 w-4" />
                                    <span>{task.views_count || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Heart className="h-4 w-4" />
                                    <span>{task.likes_count || 0}</span>
                                  </div>
                                </div>
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
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">О фрилансере</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 grid gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{profile.headline}</h3>
                        <p className="text-[#3F7F6E] leading-relaxed mb-4">{profile.about}</p>
                        {profile.bio && (
                          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#EFFFF8] to-white border">
                            <h4 className="font-medium mb-2 text-sm text-[#3F7F6E]">Подробнее обо мне</h4>
                            <p className="text-sm leading-relaxed">{profile.bio}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Специальность</div>
                          <div className="font-semibold">{profile.role}</div>
                        </div>
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Опыт работы</div>
                          <div className="font-semibold">5+ лет</div>
                        </div>
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Возраст</div>
                          <div className="font-semibold">28 лет</div>
                        </div>
                      </div>

                      <div className="rounded-xl border p-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Star className="h-5 w-5 text-[#6FE7C8]" />
                          Рейтинг и статистика
                        </h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-[#3F7F6E]">Общий рейтинг</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-2xl font-bold text-[#6FE7C8]">4.9</div>
                              <div className="flex">
                                {[1,2,3,4,5].map(i => (
                                  <Star key={i} className="h-4 w-4 fill-[#6FE7C8] text-[#6FE7C8]" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-[#3F7F6E]">Завершено проектов</div>
                            <div className="text-2xl font-bold mt-1">27</div>
                          </div>
                          <div>
                            <div className="text-sm text-[#3F7F6E]">Среднее время отклика</div>
                            <div className="text-2xl font-bold mt-1 text-emerald-600">2ч</div>
                          </div>
                          <div>
                            <div className="text-sm text-[#3F7F6E]">Повторных заказов</div>
                            <div className="text-2xl font-bold mt-1">18</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border p-6">
                        <h4 className="font-semibold mb-3">Стоимость работ</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-[#6FE7C8]">${profile.rateMin}–${profile.rateMax}</span>
                          <span className="text-[#3F7F6E]">/ час</span>
                        </div>
                        <p className="text-sm text-[#3F7F6E] mt-2">Итоговая стоимость зависит от сложности и объёма проекта</p>
                      </div>

                      <div className="rounded-xl border p-6">
                        <h4 className="font-semibold mb-4">Навыки и технологии</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((s) => (
                            <Badge key={s} variant="secondary" className="px-3 py-1.5 text-sm">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border p-6">
                        <h4 className="font-semibold mb-4">Контактная информация</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-[#6FE7C8]" />
                            </div>
                            <div>
                              <div className="text-xs text-[#3F7F6E]">Локация</div>
                              <div className="font-medium">{profile.location}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                              <AtSign className="h-5 w-5 text-[#6FE7C8]" />
                            </div>
                            <div>
                              <div className="text-xs text-[#3F7F6E]">Telegram</div>
                              <div className="font-medium">{profile.contactTelegram}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                              <LinkIcon className="h-5 w-5 text-[#6FE7C8]" />
                            </div>
                            <div>
                              <div className="text-xs text-[#3F7F6E]">Email</div>
                              <div className="font-medium">{profile.contactEmail}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="grid gap-6">
                  <h2 className="text-2xl font-bold">Отзывы клиентов</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6 grid gap-3">
                          <div className="flex items-center gap-3">
                            <img src={`https://i.pravatar.cc/64?img=${10 + i}`} className="h-10 w-10 rounded-full object-cover" alt={`Заказчик ${i}`} />
                            <div>
                              <div className="font-medium">Заказчик #{i}</div>
                              <div className="text-xs text-[#3F7F6E]">2 недели назад</div>
                            </div>
                            <div className="ml-auto flex items-center gap-1 text-emerald-600">
                              <Star className="h-4 w-4 fill-emerald-600" />
                              <span className="font-semibold">5.0</span>
                            </div>
                          </div>
                          <p className="text-sm text-[#3F7F6E] leading-relaxed">
                            Отличная коммуникация, аккуратные коммиты, демо вовремя. Рекомендую!
                          </p>
                          <div className="flex items-center gap-4 pt-2 border-t">
                            <button
                              onClick={() => toggleHelpful(i)}
                              className={`flex items-center gap-1.5 text-sm transition-colors ${
                                helpfulVotes.has(i)
                                  ? 'text-[#6FE7C8] font-medium'
                                  : 'text-[#3F7F6E] hover:text-[#6FE7C8]'
                              }`}
                            >
                              <Heart
                                className={`h-4 w-4 transition-all ${
                                  helpfulVotes.has(i) ? 'fill-[#6FE7C8]' : ''
                                }`}
                              />
                              <span>Полезно</span>
                              {helpfulVotes.has(i) && <span className="text-xs">(1)</span>}
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'edit' && (
                <Card>
                  <CardContent className="p-6">
                    <form className="grid gap-4" onSubmit={onEditSubmit}>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Фото профиля</label>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        {!avatarPreview ? (
                          <div className="flex items-center gap-4">
                            {profile.avatar && (
                              <img
                                src={profile.avatar}
                                alt="Current avatar"
                                className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => avatarInputRef.current?.click()}
                              className="flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Загрузить новое фото
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="h-24 w-24 rounded-full object-cover border-2 border-[#6FE7C8]"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => avatarInputRef.current?.click()}
                              >
                                Изменить
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={handleRemoveAvatar}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-[#3F7F6E] mt-2">
                          PNG, JPG, GIF до 5 МБ. Рекомендуемый размер: 400x400 пикселей
                        </p>
                      </div>

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
                          <Input name="avatar" defaultValue={profile.avatar} className="h-11" placeholder="Или укажите URL изображения" />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">О себе (краткое описание)</span>
                        <textarea name="about" defaultValue={profile.about} rows={3} className="rounded-md border px-3 py-2 bg-background" />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Подробнее обо мне (до 700 символов)</span>
                        <textarea
                          name="bio"
                          defaultValue={profile.bio || ''}
                          rows={6}
                          maxLength={700}
                          className="rounded-md border px-3 py-2 bg-background"
                          placeholder="Расскажите подробнее о своём опыте, навыках и интересах..."
                        />
                        <div className="text-xs text-[#3F7F6E] text-right">
                          {profile.bio?.length || 0} / 700
                        </div>
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

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            {previewItem && (
              <>
                <DialogHeader>
                  <DialogTitle>{previewItem.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{previewItem.category}</Badge>
                    {previewType === 'order' && previewItem.engagement && <Badge variant="outline">{previewItem.engagement}</Badge>}
                    {previewType === 'task' && previewItem.delivery_days && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {previewItem.delivery_days} дней
                      </Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Описание</div>
                    <p className="text-sm text-[#3F7F6E] leading-relaxed whitespace-pre-wrap">{previewItem.description}</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Теги</div>
                    <div className="flex flex-wrap gap-2">
                      {(previewItem.tags || []).map((t: string) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  {previewType === 'task' && previewItem.features && (
                    <div>
                      <div className="text-sm font-medium mb-2">Что входит</div>
                      <ul className="list-disc list-inside text-sm text-[#3F7F6E]">
                        {previewItem.features.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center font-medium">
                          {profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{profile?.name || 'Пользователь'}</div>
                        <div className="text-xs text-[#3F7F6E]">Опубликовано: {new Date(previewItem.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-[#6FE7C8]">
                      {previewType === 'order' ? `${previewItem.currency} ${previewItem.price_min}–${previewItem.price_max}` : `${previewItem.currency} ${previewItem.price}`}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setPreviewOpen(false)}>Закрыть</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Portfolio Preview Dialog */}
        <Dialog open={portfolioPreviewOpen} onOpenChange={setPortfolioPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedPortfolioProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedPortfolioProject.title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6">
                  {selectedPortfolioProject.image_url && (
                    <div className="relative w-full overflow-hidden rounded-lg">
                      <img
                        src={selectedPortfolioProject.image_url}
                        alt={selectedPortfolioProject.title}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  <div className="grid gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Описание проекта</h3>
                      <p className="text-[#3F7F6E] whitespace-pre-wrap">{selectedPortfolioProject.description}</p>
                    </div>

                    {selectedPortfolioProject.tags && selectedPortfolioProject.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Технологии</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedPortfolioProject.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPortfolioProject.project_url && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Ссылка на проект</h3>
                        <a
                          href={selectedPortfolioProject.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#6FE7C8] hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {selectedPortfolioProject.project_url}
                        </a>
                      </div>
                    )}

                    {selectedPortfolioProject.created_at && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Дата добавления</h3>
                        <div className="flex items-center gap-2 text-[#3F7F6E]">
                          <Calendar className="h-4 w-4" />
                          {new Date(selectedPortfolioProject.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setPortfolioPreviewOpen(false)}>Закрыть</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
}
