import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsPage() {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  const sentProposals = [
    { id: 1, order: 'Лендинг на React для стартапа', price: 650, status: 'pending', date: '2025-10-25', client: 'NovaTech' },
    { id: 2, order: 'Редизайн мобильного приложения', price: 950, status: 'accepted', date: '2025-10-23', client: 'AppNest' },
    { id: 3, order: 'UX-аудит дашборда', price: 600, status: 'rejected', date: '2025-10-20', client: 'Metricly' }
  ];

  const receivedProposals = [
    { id: 4, freelancer: 'John Doe', task: 'Unity прототип', price: 1200, status: 'pending', date: '2025-10-26', avatar: 'https://i.pravatar.cc/64?img=15' },
    { id: 5, freelancer: 'Jane Smith', task: 'Unity прототип', price: 950, status: 'pending', date: '2025-10-25', avatar: 'https://i.pravatar.cc/64?img=20' }
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
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {activeTab === 'received' && (
                        <img src={proposal.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
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
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Принять
                        </Button>
                        <Button size="sm" variant="outline">
                          <X className="h-4 w-4 mr-1" />
                          Отклонить
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost">Подробнее</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
