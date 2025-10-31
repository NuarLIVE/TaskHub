import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsPage() {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  const handleAccept = (proposalId: number) => {
    alert(`Отклик #${proposalId} принят! Переходим к открытию сделки...`);
    window.location.hash = `/deal/open?proposalId=${proposalId}`;
  };

  const handleReject = (proposalId: number) => {
    const confirmed = confirm('Вы уверены, что хотите отклонить этот отклик?');
    if (confirmed) {
      alert(`Отклик #${proposalId} отклонён`);
      window.location.reload();
    }
  };

  const showDetails = (proposal: any) => {
    setSelectedProposal(proposal);
    setDetailsOpen(true);
  };

  const sentProposals = [
    { id: 1, order: 'Лендинг на React для стартапа', price: 650, days: 10, status: 'pending', date: '2025-10-25', client: 'NovaTech', message: 'Здравствуйте! Готов взяться за проект. Имею опыт создания лендингов на React с использованием современных технологий. Могу предложить адаптивную вёрстку и оптимизацию производительности.' },
    { id: 2, order: 'Редизайн мобильного приложения', price: 950, days: 14, status: 'accepted', date: '2025-10-23', client: 'AppNest', message: 'Добрый день! Изучил требования к редизайну. Предлагаю современный UI/UX с акцентом на пользовательский опыт.' },
    { id: 3, order: 'UX-аудит дашборда', price: 600, days: 7, status: 'rejected', date: '2025-10-20', client: 'Metricly', message: 'Здравствуйте! Проведу полный UX-аудит с рекомендациями по улучшению интерфейса.' }
  ];

  const receivedProposals = [
    { id: 4, freelancer: 'John Doe', freelancerSlug: 'johndoe', task: 'Unity прототип', price: 1200, days: 15, status: 'pending', date: '2025-10-26', avatar: 'https://i.pravatar.cc/64?img=15', message: 'Привет! Я Unity разработчик с 3+ годами опыта. Создам прототип по вашим требованиям с качественным кодом и документацией. Готов предоставить регулярные апдейты процесса разработки.' },
    { id: 5, freelancer: 'Jane Smith', freelancerSlug: 'janesmith', task: 'Unity прототип', price: 950, days: 12, status: 'pending', date: '2025-10-25', avatar: 'https://i.pravatar.cc/64?img=20', message: 'Здравствуйте! Опытный Unity разработчик. Работала над множеством прототипов и готова реализовать ваш проект качественно и в срок. Использую лучшие практики разработки.' }
  ];

  const proposals = activeTab === 'sent' ? sentProposals : receivedProposals;

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') return <Badge className="bg-green-100 text-green-800">Принят</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Отклонён</Badge>;
    return <Badge variant="secondary">На рассмотрении</Badge>;
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

        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {activeTab === 'received' && (
                        <a href={`#/u/${proposal.freelancerSlug}`} className="hover:opacity-80 transition">
                          <img src={proposal.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                        </a>
                      )}
                      <div>
                        <div className="font-semibold">
                          {activeTab === 'sent' ? proposal.order : `${proposal.freelancer} — ${proposal.task}`}
                        </div>
                        <div className="text-sm text-[#3F7F6E]">
                          {activeTab === 'sent' ? `Заказчик: ${proposal.client}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#3F7F6E]">
                      <span>Цена: ${proposal.price}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {proposal.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(proposal.status)}
                    {activeTab === 'received' && proposal.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleAccept(proposal.id)}>
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
      </section>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProposal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Детали отклика #{selectedProposal.id}
                </DialogTitle>
                <DialogDescription>
                  {activeTab === 'sent' ? `Заказ: ${selectedProposal.order}` : `Исполнитель: ${selectedProposal.freelancer}`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {activeTab === 'received' && (
                  <div className="flex items-center gap-3 p-3 bg-[#EFFFF8] rounded-lg">
                    <a href={`#/u/${selectedProposal.freelancerSlug}`} className="hover:opacity-80 transition">
                      <img src={selectedProposal.avatar} alt={selectedProposal.freelancer} className="h-12 w-12 rounded-full object-cover" />
                    </a>
                    <div>
                      <a href={`#/u/${selectedProposal.freelancerSlug}`} className="font-semibold hover:opacity-80 transition">
                        {selectedProposal.freelancer}
                      </a>
                      <div className="text-sm text-[#3F7F6E]">Задача: {selectedProposal.task}</div>
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-[#3F7F6E] mb-1">Цена</div>
                    <div className="text-2xl font-bold">${selectedProposal.price}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-[#3F7F6E] mb-1">Срок выполнения</div>
                    <div className="text-2xl font-bold">{selectedProposal.days} дней</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Сообщение</div>
                  <div className="p-4 bg-[#EFFFF8] rounded-lg text-sm text-[#3F7F6E]">
                    {selectedProposal.message}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#3F7F6E]">Дата отправки: </span>
                    <span className="font-medium">{selectedProposal.date}</span>
                  </div>
                  <div>
                    <span className="text-[#3F7F6E]">Статус: </span>
                    {getStatusBadge(selectedProposal.status)}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDetailsOpen(false)}>Закрыть</Button>
                {activeTab === 'received' && selectedProposal.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setDetailsOpen(false); handleReject(selectedProposal.id); }}>
                      <X className="h-4 w-4 mr-1" />
                      Отклонить
                    </Button>
                    <Button onClick={() => { setDetailsOpen(false); handleAccept(selectedProposal.id); }}>
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
