import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package, ListTodo, Eye, MessageSquare, Edit, Trash2, Pause, Play, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/currency';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

type Tab = 'orders' | 'tasks';

interface Proposal {
  id: string;
  user_id: string;
  message: string;
  price: number;
  currency: string;
  delivery_days: number;
  status: string;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  price_min: number;
  price_max: number;
  currency: string;
  deadline: string;
  status: string;
  views_count: number;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  delivery_days: number;
  status: string;
  views_count: number;
  created_at: string;
}

export default function MyDealsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Record<string, Proposal[]>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDeals();
  }, [user]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async (itemId: string, type: 'order' | 'task') => {
    try {
      const column = type === 'order' ? 'order_id' : 'task_id';
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*')
        .eq(column, itemId)
        .order('created_at', { ascending: false });

      if (proposalsData) {
        const userIds = proposalsData.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const enrichedProposals = proposalsData.map(p => ({
          ...p,
          profile: profilesMap.get(p.user_id)
        }));

        setProposals(prev => ({ ...prev, [itemId]: enrichedProposals }));
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const toggleExpand = async (itemId: string, type: 'order' | 'task') => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
      if (!proposals[itemId]) {
        await loadProposals(itemId, type);
      }
    }
  };

  const handlePauseResume = async (itemId: string, currentStatus: string, type: 'order' | 'task') => {
    const isPausing = currentStatus === 'open' || currentStatus === 'active';

    const newStatus = isPausing
      ? 'paused'
      : type === 'order' ? 'open' : 'active';

    const table = type === 'order' ? 'orders' : 'tasks';
    const { error } = await supabase
      .from(table)
      .update({ status: newStatus })
      .eq('id', itemId);

    if (!error) {
      loadDeals();
    }
  };

  const handleDelete = async (itemId: string, type: 'order' | 'task') => {
    if (!confirm(`Вы уверены, что хотите удалить это ${type === 'order' ? 'заказ' : 'объявление'}?`)) {
      return;
    }

    const table = type === 'order' ? 'orders' : 'tasks';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', itemId);

    if (!error) {
      loadDeals();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'warning' }> = {
      open: { label: 'Открыт', variant: 'default' },
      active: { label: 'Активно', variant: 'default' },
      paused: { label: 'Приостановлено', variant: 'warning' },
      closed: { label: 'Закрыт', variant: 'outline' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold mb-6">Мои сделки</h1>

        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative px-6 py-3 font-medium transition-colors ${
              activeTab === 'orders' ? 'text-[#6FE7C8]' : 'text-[#3F7F6E] hover:text-[#6FE7C8]'
            }`}
          >
            <Package className="inline-block h-4 w-4 mr-2" />
            Мои заказы ({orders.length})
            {activeTab === 'orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6FE7C8]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`relative px-6 py-3 font-medium transition-colors ${
              activeTab === 'tasks' ? 'text-[#6FE7C8]' : 'text-[#3F7F6E] hover:text-[#6FE7C8]'
            }`}
          >
            <ListTodo className="inline-block h-4 w-4 mr-2" />
            Мои объявления ({tasks.length})
            {activeTab === 'tasks' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6FE7C8]" />
            )}
          </button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#6FE7C8] mx-auto mb-3" />
              <p className="text-[#3F7F6E]">Загрузка...</p>
            </CardContent>
          </Card>
        ) : activeTab === 'orders' ? (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button asChild>
                <a href="#/order/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать заказ
                </a>
              </Button>
            </div>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-[#3F7F6E]" />
                  <p className="text-[#3F7F6E] mb-4">У вас пока нет заказов</p>
                  <Button asChild>
                    <a href="#/order/new">Создать первый заказ</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <a
                          href={`#/order/${order.id}`}
                          className="text-lg font-semibold hover:text-[#6FE7C8] transition-colors"
                        >
                          {order.title}
                        </a>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{order.category}</Badge>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`#/order/${order.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume(order.id, order.status, 'order')}
                        >
                          {order.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id, 'order')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[#3F7F6E] mb-4 line-clamp-2">{order.description}</p>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-[#3F7F6E]">
                          <Eye className="h-4 w-4" />
                          <span>{order.views_count || 0} просмотров</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#3F7F6E]">
                          <MessageSquare className="h-4 w-4" />
                          <span>{proposals[order.id]?.length || 0} откликов</span>
                        </div>
                      </div>
                      <div className="text-[#3F7F6E]">
                        Бюджет: <span className="font-medium text-foreground">
                          {formatPrice(order.price_min, order.currency)} - {formatPrice(order.price_max, order.currency)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(order.id, 'order')}
                      className="w-full"
                    >
                      {expandedItem === order.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Скрыть отклики
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Показать отклики ({proposals[order.id]?.length || 0})
                        </>
                      )}
                    </Button>
                    {expandedItem === order.id && proposals[order.id] && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {proposals[order.id].length === 0 ? (
                          <p className="text-sm text-[#3F7F6E] text-center">Откликов пока нет</p>
                        ) : (
                          proposals[order.id].map((proposal) => (
                            <Card key={proposal.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{proposal.profile?.name || 'Пользователь'}</div>
                                    <Badge variant="outline">{formatPrice(proposal.price, proposal.currency)}</Badge>
                                    <Badge variant="outline">{proposal.delivery_days} дней</Badge>
                                  </div>
                                  <div className="text-xs text-[#3F7F6E]">
                                    {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                                <p className="text-sm text-[#3F7F6E]">{proposal.message}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button asChild>
                <a href="#/task/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать объявление
                </a>
              </Button>
            </div>
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 text-[#3F7F6E]" />
                  <p className="text-[#3F7F6E] mb-4">У вас пока нет объявлений</p>
                  <Button asChild>
                    <a href="#/task/new">Создать первое объявление</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <a
                          href={`#/task/${task.id}`}
                          className="text-lg font-semibold hover:text-[#6FE7C8] transition-colors"
                        >
                          {task.title}
                        </a>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{task.category}</Badge>
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`#/task/${task.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume(task.id, task.status, 'task')}
                        >
                          {task.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(task.id, 'task')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[#3F7F6E] mb-4 line-clamp-2">{task.description}</p>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-[#3F7F6E]">
                          <Eye className="h-4 w-4" />
                          <span>{task.views_count || 0} просмотров</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#3F7F6E]">
                          <MessageSquare className="h-4 w-4" />
                          <span>{proposals[task.id]?.length || 0} заказов</span>
                        </div>
                      </div>
                      <div className="text-[#3F7F6E]">
                        Цена: <span className="font-medium text-foreground">
                          {formatPrice(task.price, task.currency)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(task.id, 'task')}
                      className="w-full"
                    >
                      {expandedItem === task.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Скрыть заказы
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Показать заказы ({proposals[task.id]?.length || 0})
                        </>
                      )}
                    </Button>
                    {expandedItem === task.id && proposals[task.id] && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {proposals[task.id].length === 0 ? (
                          <p className="text-sm text-[#3F7F6E] text-center">Заказов пока нет</p>
                        ) : (
                          proposals[task.id].map((proposal) => (
                            <Card key={proposal.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{proposal.profile?.name || 'Пользователь'}</div>
                                    <Badge variant="outline">{formatPrice(proposal.price, proposal.currency)}</Badge>
                                    <Badge variant="outline">{proposal.delivery_days} дней</Badge>
                                  </div>
                                  <div className="text-xs text-[#3F7F6E]">
                                    {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                                <p className="text-sm text-[#3F7F6E]">{proposal.message}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}
