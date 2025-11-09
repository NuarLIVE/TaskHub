import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, X, FileText, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToProfile } from '@/lib/navigation';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [sentProposals, setSentProposals] = useState<any[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [tasks, setTasks] = useState<Record<string, any>>({});

  useEffect(() => {
    loadProposals();

    if (!user) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel('proposals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProposal = payload.new as any;

            if (newProposal.user_id === user.id) {
              setSentProposals(prev => [newProposal, ...prev]);
            }

            const orderIds = await getUserOrderIds();
            const taskIds = await getUserTaskIds();
            const isForMyOrder = newProposal.order_id && orderIds.includes(newProposal.order_id);
            const isForMyTask = newProposal.task_id && taskIds.includes(newProposal.task_id);

            if (isForMyOrder || isForMyTask) {
              setReceivedProposals(prev => [newProposal, ...prev]);
            }

            if (!profiles[newProposal.user_id]) {
              const { data: profileData } = await getSupabase()
                .from('profiles')
                .select('id, name, avatar_url')
                .eq('id', newProposal.user_id)
                .single();
              if (profileData) {
                setProfiles(prev => ({ ...prev, [profileData.id]: profileData }));
              }
            }

            if (newProposal.order_id && !orders[newProposal.order_id]) {
              const { data: orderData } = await getSupabase()
                .from('orders')
                .select('id, title, user_id')
                .eq('id', newProposal.order_id)
                .single();
              if (orderData) {
                setOrders(prev => ({ ...prev, [orderData.id]: orderData }));
              }
            }

            if (newProposal.task_id && !tasks[newProposal.task_id]) {
              const { data: taskData } = await getSupabase()
                .from('tasks')
                .select('id, title, user_id')
                .eq('id', newProposal.task_id)
                .single();
              if (taskData) {
                setTasks(prev => ({ ...prev, [taskData.id]: taskData }));
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedProposal = payload.new as any;
            setSentProposals(prev => prev.map(p => p.id === updatedProposal.id ? updatedProposal : p));
            setReceivedProposals(prev => prev.map(p => p.id === updatedProposal.id ? updatedProposal : p));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setSentProposals(prev => prev.filter(p => p.id !== deletedId));
            setReceivedProposals(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadProposals = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const supabase = getSupabase();

      const { data: sent } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const orderIds = await getUserOrderIds();
      const taskIds = await getUserTaskIds();

      let received: any[] = [];

      if (orderIds.length > 0 || taskIds.length > 0) {
        const conditions: string[] = [];
        if (orderIds.length > 0) conditions.push(`order_id.in.(${orderIds.join(',')})`);
        if (taskIds.length > 0) conditions.push(`task_id.in.(${taskIds.join(',')})`);

        const { data: receivedData } = await supabase
          .from('proposals')
          .select('*')
          .or(conditions.join(','))
          .order('created_at', { ascending: false });

        received = receivedData || [];
      }

      setSentProposals(sent || []);
      setReceivedProposals(received);

      const allUserIds = new Set<string>();
      (sent || []).forEach((p: any) => allUserIds.add(p.user_id));
      (received || []).forEach((p: any) => allUserIds.add(p.user_id));

      const allOrderIds = new Set<string>();
      const allTaskIds = new Set<string>();
      (sent || []).forEach((p: any) => {
        if (p.order_id) allOrderIds.add(p.order_id);
        if (p.task_id) allTaskIds.add(p.task_id);
      });
      (received || []).forEach((p: any) => {
        if (p.order_id) allOrderIds.add(p.order_id);
        if (p.task_id) allTaskIds.add(p.task_id);
      });

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

      if (allOrderIds.size > 0) {
        const { data: ordersData } = await getSupabase()
          .from('orders')
          .select('id, title, user_id')
          .in('id', Array.from(allOrderIds));

        const ordersMap: Record<string, any> = {};
        (ordersData || []).forEach((o: any) => {
          ordersMap[o.id] = o;
        });
        setOrders(ordersMap);
      }

      if (allTaskIds.size > 0) {
        const { data: tasksData } = await getSupabase()
          .from('tasks')
          .select('id, title, user_id')
          .in('id', Array.from(allTaskIds));

        const tasksMap: Record<string, any> = {};
        (tasksData || []).forEach((t: any) => {
          tasksMap[t.id] = t;
        });
        setTasks(tasksMap);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserOrderIds = async () => {
    if (!user) return [];
    const { data } = await getSupabase()
      .from('orders')
      .select('id')
      .eq('user_id', user.id);
    return (data || []).map((o: any) => o.id);
  };

  const getUserTaskIds = async () => {
    if (!user) return [];
    const { data } = await getSupabase()
      .from('tasks')
      .select('id')
      .eq('user_id', user.id);
    return (data || []).map((t: any) => t.id);
  };

  const handleAccept = async (proposal: any) => {
    if (!user) return;

    try {
      const item = proposal.order_id ? orders[proposal.order_id] : tasks[proposal.task_id];
      const clientId = item.user_id;
      const freelancerId = proposal.user_id;

      let chatId = null;

      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(participant1_id.eq.${clientId},participant2_id.eq.${freelancerId}),and(participant1_id.eq.${freelancerId},participant2_id.eq.${clientId})`)
        .maybeSingle();

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            participant1_id: clientId,
            participant2_id: freelancerId
          })
          .select()
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
      }

      const { error: dealError } = await supabase
        .from('deals')
        .insert({
          proposal_id: proposal.id,
          order_id: proposal.order_id,
          task_id: proposal.task_id,
          client_id: clientId,
          freelancer_id: freelancerId,
          chat_id: chatId,
          title: item.title,
          description: proposal.message,
          price: proposal.price,
          currency: proposal.currency,
          delivery_days: proposal.delivery_days,
          status: 'in_progress'
        });

      if (dealError) throw dealError;

      const { error: proposalError } = await supabase
        .from('proposals')
        .update({ status: 'accepted' })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      alert('Отклик принят! Сделка создана.');
      loadProposals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Ошибка при принятии отклика');
    }
  };

  const handleReject = async (proposalId: string) => {
    const confirmed = confirm('Вы уверены, что хотите отклонить этот отклик?');
    if (!confirmed) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      if (error) throw error;

      alert('Отклик отклонён');
      loadProposals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Ошибка при отклонении отклика');
    }
  };

  const handleWithdraw = async (proposalId: string) => {
    const confirmed = confirm('Вы уверены, что хотите отозвать этот отклик?');
    if (!confirmed) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;

      alert('Отклик отозван');
      loadProposals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
      alert('Ошибка при отзыве отклика');
    }
  };

  const showDetails = (proposal: any) => {
    setSelectedProposal(proposal);
    setDetailsOpen(true);
  };

  const proposals = activeTab === 'sent' ? sentProposals : receivedProposals;

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') return <Badge className="bg-green-100 text-green-800">Принят</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Отклонён</Badge>;
    return <Badge variant="secondary">На рассмотрении</Badge>;
  };

  const getProposalTitle = (proposal: any) => {
    if (proposal.order_id && orders[proposal.order_id]) {
      return orders[proposal.order_id].title;
    }
    if (proposal.task_id && tasks[proposal.task_id]) {
      return tasks[proposal.task_id].title;
    }
    return 'Без названия';
  };

  const getItemOwnerId = (proposal: any) => {
    if (proposal.order_id && orders[proposal.order_id]) {
      return orders[proposal.order_id].user_id;
    }
    if (proposal.task_id && tasks[proposal.task_id]) {
      return tasks[proposal.task_id].user_id;
    }
    return null;
  };

  return (
    <motion.div
      key="proposals"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Отклики</h1>

        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === 'sent' ? 'default' : 'ghost'} onClick={() => setActiveTab('sent')}>
            Отправленные
          </Button>
          <Button variant={activeTab === 'received' ? 'default' : 'ghost'} onClick={() => setActiveTab('received')}>
            Полученные
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#6FE7C8] mx-auto mb-3" />
              <p className="text-[#3F7F6E]">Загрузка...</p>
            </CardContent>
          </Card>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-[#3F7F6E]">
                {activeTab === 'sent' ? 'Вы ещё не отправили ни одного отклика' : 'Вы ещё не получили ни одного отклика'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {activeTab === 'received' && (
                          <div
                            className="hover:opacity-80 transition cursor-pointer"
                            onClick={() => navigateToProfile(proposal.user_id, user?.id)}
                          >
                            {profiles[proposal.user_id]?.avatar_url ? (
                              <img src={profiles[proposal.user_id].avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                                <User className="h-5 w-5 text-[#3F7F6E]" />
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">
                            {activeTab === 'sent' ? getProposalTitle(proposal) : `${profiles[proposal.user_id]?.name || 'Пользователь'} — ${getProposalTitle(proposal)}`}
                          </div>
                          <div className="text-sm text-[#3F7F6E]">
                            {activeTab === 'sent' && getItemOwnerId(proposal) && `Заказчик: ${profiles[getItemOwnerId(proposal)]?.name || 'Пользователь'}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#3F7F6E]">
                        <span>Цена: {proposal.currency} {proposal.price}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(proposal.status)}
                      {activeTab === 'received' && proposal.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleAccept(proposal)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Принять
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(proposal.id)}>
                            <X className="h-4 w-4 mr-1" />
                            Отклонить
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => showDetails(proposal)}>Подробнее</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProposal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Детали отклика
                </DialogTitle>
                <DialogDescription>
                  {getProposalTitle(selectedProposal)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {activeTab === 'received' && (
                  <div
                    className="flex items-center gap-3 p-3 bg-[#EFFFF8] rounded-lg cursor-pointer hover:opacity-80 transition"
                    onClick={() => navigateToProfile(selectedProposal.user_id, user?.id)}
                  >
                    {profiles[selectedProposal.user_id]?.avatar_url ? (
                      <img src={profiles[selectedProposal.user_id].avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center">
                        <User className="h-6 w-6 text-[#3F7F6E]" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">
                        {profiles[selectedProposal.user_id]?.name || 'Пользователь'}
                      </div>
                      <div className="text-sm text-[#3F7F6E]">Нажмите, чтобы открыть профиль</div>
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-[#3F7F6E] mb-1">Цена</div>
                    <div className="text-2xl font-bold">{selectedProposal.currency} {selectedProposal.price}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-[#3F7F6E] mb-1">Срок выполнения</div>
                    <div className="text-2xl font-bold">{selectedProposal.delivery_days} дней</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Сообщение</div>
                  <div className="p-4 bg-[#EFFFF8] rounded-lg text-sm text-[#3F7F6E]">
                    {selectedProposal.message || 'Сообщение не указано'}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#3F7F6E]">Дата отправки: </span>
                    <span className="font-medium">{new Date(selectedProposal.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div>
                    <span className="text-[#3F7F6E]">Статус: </span>
                    {getStatusBadge(selectedProposal.status)}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDetailsOpen(false)}>Закрыть</Button>
                {activeTab === 'sent' && selectedProposal.status === 'pending' && (
                  <Button variant="destructive" onClick={() => handleWithdraw(selectedProposal.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Отозвать отклик
                  </Button>
                )}
                {activeTab === 'received' && selectedProposal.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleReject(selectedProposal.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Отклонить
                    </Button>
                    <Button onClick={() => handleAccept(selectedProposal)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Принять
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
