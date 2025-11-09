import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Paperclip, Briefcase, Tag, Upload, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabaseClient';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsCreate() {
  const { user } = useAuth();
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderOrTaskData, setOrderOrTaskData] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');

  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const type = params.get('type') || 'order';
  const id = params.get('id') || '1';

  useEffect(() => {
    if (!user) {
      window.location.hash = '/login';
    } else {
      loadPortfolio();
      loadOrderOrTask();
    }
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getSupabase()
        .from('portfolio_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderOrTask = async () => {
    try {
      if (type === 'order') {
        const { data } = await getSupabase()
          .from('orders')
          .select('*, profiles(name, avatar_url)')
          .eq('id', id)
          .single();

        if (data && data.user_id === user?.id) {
          alert('Вы не можете отправить отклик на свой собственный заказ');
          window.location.hash = `/orders/${id}`;
          return;
        }

        setOrderOrTaskData(data);
        if (data?.currency) setCurrency(data.currency);
      } else {
        const { data } = await getSupabase()
          .from('tasks')
          .select('*, profiles(name, avatar_url)')
          .eq('id', id)
          .single();

        if (data && data.user_id === user?.id) {
          alert('Вы не можете отправить отклик на своё собственное объявление');
          window.location.hash = `/tasks/${id}`;
          return;
        }

        setOrderOrTaskData(data);
        if (data?.currency) setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error loading order/task:', error);
    }
  };

  const togglePortfolioItem = (id: string) => {
    setSelectedPortfolio(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const orderData = orderOrTaskData ? {
    id: orderOrTaskData.id,
    title: orderOrTaskData.title,
    description: orderOrTaskData.description,
    budget: type === 'order' ? `${orderOrTaskData.price_min}-${orderOrTaskData.price_max} ${orderOrTaskData.currency}` : `${orderOrTaskData.price} ${orderOrTaskData.currency}`,
    tags: orderOrTaskData.tags || [],
    author: { name: orderOrTaskData.profiles?.name || 'User', avatar: orderOrTaskData.profiles?.avatar_url }
  } : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Войдите в систему');
      return;
    }

    if (!price || !days || !message) {
      alert('Заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      const proposalData: any = {
        user_id: user.id,
        message,
        price: Number(price),
        currency,
        delivery_days: Number(days),
        status: 'pending'
      };

      if (type === 'order') {
        proposalData.order_id = id;
      } else {
        proposalData.task_id = id;
      }

      const { error } = await getSupabase()
        .from('proposals')
        .insert(proposalData);

      if (error) {
        console.error('Error creating proposal:', error);
        alert('Ошибка при отправке отклика: ' + error.message);
        return;
      }

      alert('Отклик успешно отправлен!');
      window.location.hash = '/proposals';
    } catch (error) {
      console.error('Error:', error);
      alert('Произошла ошибка');
    } finally {
      setLoading(false);
    }
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

        {!orderData ? (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p>Загрузка...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardHeader className="pb-3 px-6">
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

          {/* Плашка профиля — добавлен нижний отступ */}
          <CardContent className="px-6 pt-4 pb-6">
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
        )}

        <div className="mb-4 px-5 py-4 rounded-lg bg-[#EFFFF8] border border-[#6FE7C8]/20">
          <p className="text-sm text-[#3F7F6E]">
            После отправки отклика {type === 'order' ? 'заказчик' : 'автор объявления'} получит уведомление и сможет просмотреть ваше предложение.
            Если ваш отклик подойдёт, {type === 'order' ? 'заказчик' : 'автор'} сможет принять его и начать сделку.
          </p>
        </div>

        <Card>
          <CardHeader className="px-6">
            <CardTitle>Ваше предложение</CardTitle>
          </CardHeader>

          {/* Добавлен нижний отступ под формой */}
          <CardContent className="px-6 pb-8">
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
                <label className="text-sm font-medium mb-2 block">Вложение (необязательно)</label>
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 h-11 px-4 rounded-md border-2 border-dashed border-[#6FE7C8]/30 hover:border-[#6FE7C8] bg-[#EFFFF8]/30 hover:bg-[#EFFFF8]/50 transition cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-[#3F7F6E]" />
                    <span className="text-sm text-[#3F7F6E]">
                      {attachment ? attachment.name : 'Выберите файл или перетащите сюда'}
                    </span>
                  </label>
                  {attachment && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachment(null)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[#3F7F6E] mt-1">
                  Поддерживаются: PDF, DOC, DOCX, изображения (макс. 10 МБ)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Примеры работ из портфолио</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.hash = '/me/portfolio/add'}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Добавить в портфолио
                  </Button>
                </div>
                {loading ? (
                  <div className="text-sm text-[#3F7F6E] py-4 text-center">Загрузка...</div>
                ) : portfolioItems.length === 0 ? (
                  <div className="text-sm text-[#3F7F6E] py-4 text-center border border-dashed rounded-md">
                    У вас пока нет проектов в портфолио
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                    {portfolioItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => togglePortfolioItem(item.id)}
                        className={`relative cursor-pointer rounded-lg border-2 transition overflow-hidden ${
                          selectedPortfolio.includes(item.id)
                            ? 'border-[#6FE7C8] bg-[#EFFFF8]/50'
                            : 'border-transparent hover:border-[#6FE7C8]/30'
                        }`}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 bg-[#EFFFF8] flex items-center justify-center">
                            <Briefcase className="h-8 w-8 text-[#3F7F6E]/30" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                          {item.project_url && (
                            <ExternalLink className="h-3 w-3 text-[#3F7F6E] mt-1" />
                          )}
                        </div>
                        {selectedPortfolio.includes(item.id) && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#6FE7C8] flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#3F7F6E] mt-2">
                  Выберите до 5 релевантных проектов для демонстрации вашего опыта
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Отправка...' : 'Отправить отклик'}
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
