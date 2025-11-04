import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

type Tab = 'orders' | 'tasks';

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  deadline: string;
  status: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  delivery_time: number;
  status: string;
  created_at: string;
}

export default function MyDealsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDeals();
  }, [user]);

  const loadDeals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      open: { label: 'Открыт', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'В работе', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Завершён', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Отменён', className: 'bg-gray-100 text-gray-800' },
      active: { label: 'Активно', className: 'bg-green-100 text-green-800' },
      paused: { label: 'На паузе', className: 'bg-gray-100 text-gray-800' }
    };

    const variant = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background py-8"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Мои сделки</h1>
        </div>

        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'orders'
                ? 'text-[#6FE7C8]'
                : 'text-[#3F7F6E] hover:text-foreground'
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
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'tasks'
                ? 'text-[#6FE7C8]'
                : 'text-[#3F7F6E] hover:text-foreground'
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
          <div className="text-center py-12 text-[#3F7F6E]">Загрузка...</div>
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
                    </div>
                    <p className="text-[#3F7F6E] mb-4 line-clamp-2">{order.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-[#3F7F6E]">
                        Бюджет: <span className="font-medium text-foreground">
                          ${order.budget_min} - ${order.budget_max}
                        </span>
                      </div>
                      <div className="text-[#3F7F6E]">
                        Срок: <span className="font-medium text-foreground">
                          {new Date(order.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
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
                    </div>
                    <p className="text-[#3F7F6E] mb-4 line-clamp-2">{task.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-[#3F7F6E]">
                        Цена: <span className="font-medium text-foreground">${task.price}</span>
                      </div>
                      <div className="text-[#3F7F6E]">
                        Срок выполнения: <span className="font-medium text-foreground">
                          {task.delivery_time} дней
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
