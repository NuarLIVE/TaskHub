import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, MessageSquare, MapPin, Eye, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThumbsUp } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function PublicProfile() {
  const { user: currentUser } = useAuth();
  const userId = window.location.hash.split('/').pop() || '';

  const [tab, setTab] = useState('portfolio');
  const [profile, setProfile] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewLikes, setReviewLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(false);

  useEffect(() => {
    if (userId) {
      Promise.all([
        loadProfile(),
        loadPortfolio(),
        loadReviews()
      ]);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === 'market') {
      loadMarketData();
    }
  }, [tab, userId]);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name,
          email: data.email,
          headline: data.headline || 'Фрилансер',
          role: data.role || 'freelancer',
          about: data.about || '',
          bio: data.bio || '',
          skills: data.skills || [],
          rateMin: data.rate_min || 0,
          rateMax: data.rate_max || 0,
          currency: data.currency || 'USD',
          location: data.location || '',
          contactEmail: data.email,
          contactTelegram: data.contact_telegram || '',
          avatar: data.avatar_url || 'https://i.pravatar.cc/150?img=49'
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolioProjects(data || []);
    } catch (error) {
      setPortfolioProjects([]);
    }
  };

  const loadMarketData = async () => {
    setLoadingMarket(true);
    try {
      const [ordersRes, tasksRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setUserOrders(ordersRes.data || []);
      setUserTasks(tasksRes.data || []);
    } catch (error) {
      setUserOrders([]);
      setUserTasks([]);
    } finally {
      setLoadingMarket(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);

      if (currentUser && data && data.length > 0) {
        const reviewIds = data.map((r: any) => r.id);
        const { data: votesData } = await supabase
          .from('review_helpful_votes')
          .select('review_id')
          .in('review_id', reviewIds)
          .eq('user_id', currentUser.id);

        const likesMap: Record<string, boolean> = {};
        (votesData || []).forEach((vote: any) => {
          likesMap[vote.review_id] = true;
        });
        setReviewLikes(likesMap);
      }
    } catch (error) {
      setReviews([]);
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      alert('Войдите, чтобы отправить сообщение');
      window.location.hash = '/login';
      return;
    }

    try {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(participant1_id.eq.${currentUser.id},participant2_id.eq.${userId}),and(participant1_id.eq.${userId},participant2_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (existingChat) {
        window.location.hash = `/messages?chat=${existingChat.id}`;
      } else {
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            participant1_id: currentUser.id,
            participant2_id: userId
          })
          .select()
          .single();

        if (error) throw error;
        window.location.hash = `/messages?chat=${newChat.id}`;
      }
    } catch (error) {
      alert('Ошибка при создании чата');
    }
  };

  const handleReviewLike = async (reviewId: string) => {
    if (!currentUser) {
      alert('Войдите, чтобы поставить лайк');
      window.location.hash = '/login';
      return;
    }

    const isLiked = reviewLikes[reviewId];

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setReviewLikes(prev => {
          const newLikes = { ...prev };
          delete newLikes[reviewId];
          return newLikes;
        });

        setReviews(prev => prev.map(r =>
          r.id === reviewId ? { ...r, likes_count: r.likes_count - 1 } : r
        ));
      } else {
        const { error } = await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: currentUser.id
          });

        if (error) throw error;

        setReviewLikes(prev => ({ ...prev, [reviewId]: true }));

        setReviews(prev => prev.map(r =>
          r.id === reviewId ? { ...r, likes_count: r.likes_count + 1 } : r
        ));
      }
    } catch (error) {
      alert('Ошибка при добавлении лайка');
    }
  };

  if (loading) {
    return (
      <motion.div
        key="public-profile-loading"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#6FE7C8] mx-auto mb-4" />
          <p className="text-[#3F7F6E]">Загрузка профиля...</p>
        </div>
      </motion.div>
    );
  }

  if (!profile) {
    return (
      <motion.div
        key="public-profile-not-found"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Профиль не найден</p>
          <p className="text-[#3F7F6E] mb-4">Пользователь с таким ID не существует</p>
          <Button onClick={() => window.location.hash = '/market'}>
            Вернуться на биржу
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="public-profile"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <div className="grid gap-6 sticky top-24 self-start">
            <Card>
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
                    <div className="font-semibold">{portfolioProjects.length}</div>
                  </div>
                  <div className="rounded-xl border p-2">
                    <div className="text-xs text-[#3F7F6E]">Онлайн</div>
                    <div className="font-semibold text-emerald-600">сейчас</div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Button onClick={handleMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Написать
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#EFFFF8] to-white border-[#6FE7C8]/30">
              <CardContent className="p-6 grid gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-[#6FE7C8] flex items-center justify-center">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">Советы фрилансеру</h3>
                </div>

                <div className="grid gap-3">
                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-[#6FE7C8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-[#3F7F6E]">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-700">
                        <span className="font-medium">Пополните портфолио</span> — добавьте минимум 3 проекта, чтобы увеличить доверие клиентов
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-[#6FE7C8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-[#3F7F6E]">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-700">
                        <span className="font-medium">Быстро отвечайте</span> — ответ в течение часа повышает шансы получить заказ на 40%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-[#6FE7C8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-[#3F7F6E]">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-700">
                        <span className="font-medium">Обновляйте профиль</span> — детальное описание и актуальные навыки привлекают больше клиентов
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-[#6FE7C8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-[#3F7F6E]">4</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-700">
                        <span className="font-medium">Собирайте отзывы</span> — попросите клиентов оставить отзыв после завершения проекта
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-3 border-t border-[#6FE7C8]/20">
                  <p className="text-xs text-[#3F7F6E] text-center">
                    Следуйте этим советам, чтобы получать больше заказов
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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
                </div>
                {portfolioProjects.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-[#3F7F6E] mb-4">У пользователя пока нет проектов в портфолио</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {portfolioProjects.map((project) => (
                      <Card
                        key={project.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        {project.image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                          <p className="text-sm text-[#3F7F6E] mb-3 line-clamp-2">{project.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(project.tags || []).slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
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
                  <h2 className="text-2xl font-bold mb-4">Заказы пользователя</h2>
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
                        Пользователь ещё не создал ни одного заказа
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {userOrders.map((order) => (
                        <Card key={order.id} className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all">
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
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Объявления пользователя</h2>
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
                        Пользователь ещё не создал ни одного объявления
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {userTasks.map((task) => (
                        <Card key={task.id} className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg mb-2">{task.title}</h4>
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge variant="secondary">{task.category}</Badge>
                                  <Badge variant="outline">{task.status}</Badge>
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
                      <p className="text-[#3F7F6E] leading-relaxed mb-4 whitespace-pre-wrap">{profile.bio || profile.about || 'Информация о пользователе не указана'}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {profile.role && (
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Специальность</div>
                          <div className="font-semibold">{profile.role}</div>
                        </div>
                      )}
                      {profile.location && (
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Локация</div>
                          <div className="font-semibold">{profile.location}</div>
                        </div>
                      )}
                      {profile.rateMin > 0 && profile.rateMax > 0 && (
                        <div className="rounded-xl border p-4 bg-gradient-to-br from-[#EFFFF8] to-white">
                          <div className="text-sm text-[#3F7F6E] mb-1">Ставка</div>
                          <div className="font-semibold">{profile.currency} {profile.rateMin}–{profile.rateMax}/час</div>
                        </div>
                      )}
                    </div>

                    {profile.skills && profile.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Навыки</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(profile.contactEmail || profile.contactTelegram) && (
                      <div>
                        <h4 className="font-semibold mb-3">Контакты</h4>
                        <div className="grid gap-2 text-sm">
                          {profile.contactEmail && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#3F7F6E]">Email:</span>
                              <a href={`mailto:${profile.contactEmail}`} className="text-[#6FE7C8] hover:underline">{profile.contactEmail}</a>
                            </div>
                          )}
                          {profile.contactTelegram && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#3F7F6E]">Telegram:</span>
                              <a href={`https://t.me/${profile.contactTelegram}`} target="_blank" rel="noopener noreferrer" className="text-[#6FE7C8] hover:underline">@{profile.contactTelegram}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="grid gap-6">
                <h2 className="text-2xl font-bold">Отзывы клиентов</h2>
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-[#3F7F6E]">У пользователя пока нет отзывов</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((review) => {
                      const isLiked = reviewLikes[review.id];
                      const timeAgo = new Date(review.created_at).toLocaleDateString('ru-RU');
                      return (
                        <Card key={review.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6 grid gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                                <span className="text-sm font-medium">👤</span>
                              </div>
                              <div>
                                <div className="font-medium">Заказчик</div>
                                <div className="text-xs text-[#3F7F6E]">{timeAgo}</div>
                              </div>
                              <div className="ml-auto flex items-center gap-1 text-emerald-600">
                                <Star className="h-4 w-4 fill-emerald-600" />
                                <span className="font-semibold">{review.rating}.0</span>
                              </div>
                            </div>
                            <p className="text-sm text-[#3F7F6E] whitespace-pre-wrap">{review.comment}</p>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReviewLike(review.id)}
                                className={`h-8 px-3 ${isLiked ? 'text-[#6FE7C8]' : 'text-[#3F7F6E]'}`}
                              >
                                <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                                Полезно ({review.likes_count})
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
