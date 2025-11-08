import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BoostBadge } from '@/components/ui/BoostBadge';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToProfile } from '@/lib/navigation';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

const ITEMS_PER_PAGE = 20;

export default function MarketPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('');
  const [engagement, setEngagement] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sort, setSort] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'order' | 'task'>('order');
  const [orders, setOrders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setCategory(categoryParam);
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, q, category, currency, engagement, min, max, sort]);

  const loadData = async () => {
    setLoading(true);

    try {
      let ordersQuery = getSupabase()
        .from('orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(100);

      let tasksQuery = getSupabase()
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      const [ordersRes, tasksRes] = await Promise.all([ordersQuery, tasksQuery]);

      const ordersData = ordersRes.data || [];
      const tasksData = tasksRes.data || [];

      setOrders(ordersData);
      setTasks(tasksData);

      const allUserIds = new Set<string>();
      ordersData.forEach((o: any) => allUserIds.add(o.user_id));
      tasksData.forEach((t: any) => allUserIds.add(t.user_id));

      if (allUserIds.size > 0) {
        const { data: profilesData } = await getSupabase()
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', Array.from(allUserIds));

        const profilesMap: Record<string, any> = {};
        (profilesData || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      setOrders([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (arr: any[]) => {
    let res = [...arr];
    if (q) {
      const s = q.toLowerCase();
      res = res.filter(o => o.title.toLowerCase().includes(s) || (o.tags || []).some((t: string) => t.toLowerCase().includes(s)));
    }
    if (category) res = res.filter(o => o.category === category);
    if (currency) res = res.filter(o => o.currency === currency);
    if (activeTab === 'orders' && engagement) res = res.filter(o => o.engagement === engagement);
    const nMin = Number(min);
    const nMax = Number(max);
    if (activeTab === 'orders') {
      if (!Number.isNaN(nMin) && min !== '') res = res.filter(o => (o.price_max || 0) >= nMin);
      if (!Number.isNaN(nMax) && max !== '') res = res.filter(o => (o.price_min || 0) <= nMax);
    } else {
      if (!Number.isNaN(nMin) && min !== '') res = res.filter(o => (o.price || 0) >= nMin);
      if (!Number.isNaN(nMax) && max !== '') res = res.filter(o => (o.price || 0) <= nMax);
    }

    const boosted = res.filter(o => o.is_boosted);
    const regular = res.filter(o => !o.is_boosted);

    const sortItems = (items: any[]) => {
      if (sort === 'priceUp') return items.sort((a, b) => ((a.price_min ?? a.price) - (b.price_min ?? b.price)));
      else if (sort === 'priceDown') return items.sort((a, b) => ((b.price_max ?? b.price) - (a.price_max ?? a.price)));
      else if (sort === 'new') return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items;
    };

    return [...sortItems(boosted), ...sortItems(regular)];
  };

  const allData = useMemo(() => {
    return activeTab === 'orders' ? applyFilters(orders) : applyFilters(tasks);
  }, [activeTab, orders, tasks, q, category, currency, engagement, min, max, sort]);

  const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);

  const data = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return allData.slice(startIndex, endIndex);
  }, [allData, currentPage]);

  const reset = () => {
    setQ('');
    setCategory('');
    setCurrency('');
    setEngagement('');
    setMin('');
    setMax('');
    setSort('new');
    setCurrentPage(1);
  };

  const openPreview = (item: any, type: 'order' | 'task') => {
    setPreviewItem(item);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProposalClick = () => {
    if (!user) {
      window.location.hash = '/login';
      return;
    }
    window.location.hash = `/proposals/create?type=${previewType}&id=${previewItem.id}`;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="market"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background"
      >
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Биржа</h1>
            <div className="flex gap-2">
              <Button variant={activeTab === 'orders' ? 'default' : 'ghost'} onClick={() => setActiveTab('orders')}>Заказы</Button>
              <Button variant={activeTab === 'tasks' ? 'default' : 'ghost'} onClick={() => setActiveTab('tasks')}>Tasks</Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по названию или тегам" className="pl-9 h-11" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <select value={category} onChange={e => setCategory(e.target.value)} className="h-10 rounded-md border px-3 bg-background text-sm">
                    <option value="">Все категории</option>
                    <option>Разработка</option>
                    <option>Дизайн</option>
                    <option>Маркетинг</option>
                    <option>Локализация</option>
                    <option>Копирайт</option>
                    <option>QA / Безопасность</option>
                  </select>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="h-10 rounded-md border px-3 bg-background text-sm">
                    <option value="">Валюта</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>KZT</option>
                    <option>RUB</option>
                    <option>PLN</option>
                  </select>
                  {activeTab === 'orders' && (
                    <select value={engagement} onChange={e => setEngagement(e.target.value)} className="h-10 rounded-md border px-3 bg-background text-sm">
                      <option value="">Тип занятости</option>
                      <option>Фикс-прайс</option>
                      <option>Почасовая</option>
                    </select>
                  )}
                  <Input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder="Мин. цена" className="h-10" />
                  <Input type="number" value={max} onChange={e => setMax(e.target.value)} placeholder="Макс. цена" className="h-10" />
                  <select value={sort} onChange={e => setSort(e.target.value)} className="h-10 rounded-md border px-3 bg-background text-sm">
                    <option value="new">Новые</option>
                    <option value="priceUp">Цена ↑</option>
                    <option value="priceDown">Цена ↓</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#3F7F6E]">
                    Найдено: {allData.length} | Страница {currentPage} из {totalPages || 1}
                  </div>
                  <Button variant="ghost" size="default" onClick={reset} className="h-9">
                    <X className="h-4 w-4 mr-1" /> Сбросить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#6FE7C8] mx-auto mb-3" />
                <p className="text-[#3F7F6E]">Загрузка...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {data.map((item: any) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer relative" onClick={() => openPreview(item, activeTab as 'order' | 'task')}>
                    {item.is_boosted && (
                      <BoostBadge isBoosted className="absolute top-3 right-3 z-10" />
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base leading-6 pr-32">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{item.category}</Badge>
                        {activeTab === 'orders' && item.engagement && <Badge variant="outline">{item.engagement}</Badge>}
                        {activeTab === 'tasks' && item.delivery_days && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {item.delivery_days}д
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 px-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(item.tags || []).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                      <div className="text-sm text-[#3F7F6E] line-clamp-2">{item.description}</div>
                    </CardContent>
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <div
                        className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToProfile(item.user_id, user?.id);
                        }}
                      >
                        {profiles[item.user_id]?.avatar_url ? (
                          <img src={profiles[item.user_id].avatar_url} alt={profiles[item.user_id].name} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-[#EFFFF8] flex items-center justify-center text-sm font-medium">
                            {profiles[item.user_id]?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <span className="text-sm font-medium">{profiles[item.user_id]?.name || 'Пользователь'}</span>
                      </div>
                      <div className="font-semibold">
                        {activeTab === 'orders'
                          ? (item.price_min && item.price_max ? `${item.price_min}–${item.price_max} ${item.currency}` : `${item.currency}`)
                          : (item.price ? `${item.price} ${item.currency}` : `${item.currency}`)}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && data.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#3F7F6E]">Ничего не найдено. Попробуйте изменить фильтры.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="default"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="default"
                      onClick={() => goToPage(page)}
                      className="h-10 w-10"
                    >
                      {page}
                    </Button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2">...</span>;
                }
                return null;
              })}

              <Button
                variant="outline"
                size="default"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
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
                    <p className="text-sm text-[#3F7F6E]">{previewItem.description}</p>
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
                        {previewItem.features.map((f: string) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3">
                      {profiles[previewItem.user_id]?.avatar_url ? (
                        <img src={profiles[previewItem.user_id].avatar_url} alt={profiles[previewItem.user_id].name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center font-medium">
                          {profiles[previewItem.user_id]?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{profiles[previewItem.user_id]?.name || 'Пользователь'}</div>
                        <div className="text-xs text-[#3F7F6E]">Опубликовано: {new Date(previewItem.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-xl font-semibold">
                      {previewType === 'order'
                        ? (previewItem.price_min && previewItem.price_max
                            ? `${previewItem.price_min}–${previewItem.price_max} ${previewItem.currency}`
                            : previewItem.currency)
                        : (previewItem.price
                            ? `${previewItem.price} ${previewItem.currency}`
                            : previewItem.currency)}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Закрыть</Button>
                  <Button onClick={handleProposalClick}>
                    Откликнуться
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
}
