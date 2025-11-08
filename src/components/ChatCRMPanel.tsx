import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/lib/supabaseClient';

interface Task {
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
}

interface CRMContext {
  id: string;
  chat_id: string;
  client_id?: string;
  executor_id?: string;
  order_title: string;
  agreed_price?: number;
  currency: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  tasks: Task[];
  notes: string;
  last_updated_at: string;
}

interface ChatCRMPanelProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function ChatCRMPanel({ chatId, isOpen, onClose, currentUserId, triggerRef }: ChatCRMPanelProps) {
  const [crmData, setCrmData] = useState<CRMContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newTask, setNewTask] = useState('');
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      loadCRMData();

      // Subscribe to realtime updates
      const channel = getSupabase()
        .channel(`crm-${chatId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_crm_context',
            filter: `chat_id=eq.${chatId}`,
          },
          () => {
            loadCRMData();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isOpen, chatId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickOnPanel = panelRef.current && panelRef.current.contains(target);
      const isClickOnTrigger = triggerRef?.current && triggerRef.current.contains(target);

      if (isOpen && !isClickOnPanel && !isClickOnTrigger) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  const loadCRMData = async () => {
    setLoading(true);
    try {
      const { data, error } = await getSupabase()
        .from('chat_crm_context')
        .select('*')
        .eq('chat_id', chatId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial CRM context
        const { data: newData, error: insertError } = await getSupabase()
          .from('chat_crm_context')
          .insert({
            chat_id: chatId,
            order_title: '',
            currency: 'USD',
            priority: 'medium',
            tasks: [],
            notes: '',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setCrmData(newData);
      } else {
        setCrmData(data);
      }
    } catch (error) {
      console.error('Error loading CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCRMData = async (updates: Partial<CRMContext>) => {
    if (!crmData) return;

    try {
      const { error } = await getSupabase()
        .from('chat_crm_context')
        .update(updates)
        .eq('chat_id', chatId);

      if (error) throw error;
      await loadCRMData();
    } catch (error) {
      console.error('Error updating CRM data:', error);
      alert('Ошибка при обновлении данных');
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || !crmData) return;

    const updatedTasks = [
      ...crmData.tasks,
      { title: newTask.trim(), status: 'pending' as const, description: '' },
    ];

    await updateCRMData({ tasks: updatedTasks });
    setNewTask('');
  };

  const updateTaskStatus = async (index: number, status: Task['status']) => {
    if (!crmData) return;

    const updatedTasks = [...crmData.tasks];
    updatedTasks[index] = { ...updatedTasks[index], status };

    await updateCRMData({ tasks: updatedTasks });
  };

  const deleteTask = async (index: number) => {
    if (!crmData) return;

    const updatedTasks = crmData.tasks.filter((_, i) => i !== index);
    await updateCRMData({ tasks: updatedTasks });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between bg-[#EFFFF8]">
              <h2 className="text-xl font-bold text-[#3F7F6E]">CRM Чата</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6FE7C8] border-r-transparent mb-3"></div>
                  <p className="text-[#3F7F6E]">Загрузка...</p>
                </div>
              </div>
            ) : crmData ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Order Title */}
                <Card className="p-4">
                  <label className="text-sm font-medium text-[#3F7F6E] mb-2 block">
                    Название заказа
                  </label>
                  {editing ? (
                    <Input
                      value={crmData.order_title}
                      onChange={(e) => setCrmData({ ...crmData, order_title: e.target.value })}
                      placeholder="Введите название заказа"
                      className="mb-2"
                    />
                  ) : (
                    <p className="text-base font-medium mb-2">
                      {crmData.order_title || 'Не указано'}
                    </p>
                  )}
                </Card>

                {/* Price & Currency */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-[#3F7F6E]" />
                    <label className="text-sm font-medium text-[#3F7F6E]">
                      Согласованная цена
                    </label>
                  </div>
                  {editing ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={crmData.agreed_price || ''}
                        onChange={(e) =>
                          setCrmData({ ...crmData, agreed_price: parseFloat(e.target.value) })
                        }
                        placeholder="0"
                        className="flex-1"
                      />
                      <select
                        value={crmData.currency}
                        onChange={(e) => setCrmData({ ...crmData, currency: e.target.value })}
                        className="rounded-md border px-3 bg-background"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="RUB">RUB</option>
                        <option value="KZT">KZT</option>
                        <option value="PLN">PLN</option>
                      </select>
                    </div>
                  ) : (
                    <p className="text-lg font-semibold">
                      {crmData.agreed_price
                        ? `${crmData.currency} ${crmData.agreed_price.toFixed(2)}`
                        : 'Не указано'}
                    </p>
                  )}
                </Card>

                {/* Deadline */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-[#3F7F6E]" />
                    <label className="text-sm font-medium text-[#3F7F6E]">Срок сдачи</label>
                  </div>
                  {editing ? (
                    <Input
                      type="date"
                      value={crmData.deadline ? crmData.deadline.split('T')[0] : ''}
                      onChange={(e) => setCrmData({ ...crmData, deadline: e.target.value })}
                    />
                  ) : (
                    <p className="text-base">
                      {crmData.deadline
                        ? new Date(crmData.deadline).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Не указано'}
                    </p>
                  )}
                </Card>

                {/* Priority */}
                <Card className="p-4">
                  <label className="text-sm font-medium text-[#3F7F6E] mb-2 block">
                    Приоритет
                  </label>
                  {editing ? (
                    <select
                      value={crmData.priority}
                      onChange={(e) =>
                        setCrmData({ ...crmData, priority: e.target.value as any })
                      }
                      className="w-full rounded-md border px-3 py-2 bg-background"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  ) : (
                    <Badge className={getPriorityColor(crmData.priority)}>
                      {crmData.priority === 'high'
                        ? 'Высокий'
                        : crmData.priority === 'low'
                        ? 'Низкий'
                        : 'Средний'}
                    </Badge>
                  )}
                </Card>

                {/* Tasks */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-[#3F7F6E]">Задачи</label>
                    <Badge variant="outline">{crmData.tasks.length}</Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    {crmData.tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <button
                          onClick={() => {
                            const statuses: Task['status'][] = ['pending', 'in_progress', 'completed'];
                            const currentIndex = statuses.indexOf(task.status);
                            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                            updateTaskStatus(index, nextStatus);
                          }}
                          className="mt-0.5"
                        >
                          {getStatusIcon(task.status)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              task.status === 'completed'
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                        {editing && (
                          <button
                            onClick={() => deleteTask(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {editing && (
                    <div className="flex gap-2">
                      <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Новая задача..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTask();
                          }
                        }}
                      />
                      <Button onClick={addTask} size="icon" disabled={!newTask.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Notes */}
                {crmData.notes && (
                  <Card className="p-4">
                    <label className="text-sm font-medium text-[#3F7F6E] mb-2 block">
                      Заметки ИИ
                    </label>
                    <div className="text-xs text-gray-600 whitespace-pre-line max-h-40 overflow-y-auto">
                      {crmData.notes}
                    </div>
                  </Card>
                )}

                {/* Last Updated */}
                <div className="text-xs text-gray-500 text-center">
                  Обновлено:{' '}
                  {new Date(crmData.last_updated_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#3F7F6E]">Нет данных</p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 border-t bg-white flex gap-2">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      loadCRMData();
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 bg-[#3F7F6E] hover:bg-[#2d5f52]"
                    onClick={() => {
                      updateCRMData({
                        order_title: crmData?.order_title,
                        agreed_price: crmData?.agreed_price,
                        currency: crmData?.currency,
                        deadline: crmData?.deadline,
                        priority: crmData?.priority,
                      });
                      setEditing(false);
                    }}
                  >
                    Сохранить
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full bg-[#3F7F6E] hover:bg-[#2d5f52]"
                  onClick={() => setEditing(true)}
                >
                  Редактировать
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
