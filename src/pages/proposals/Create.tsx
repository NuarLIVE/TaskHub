import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function ProposalsCreate() {
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const type = params.get('type') || 'order';
  const id = params.get('id') || '1';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Proposal submitted:', { type, id, price, days, message, attachment });
    alert('Отклик отправлен (демо)');
    window.location.hash = '/proposals';
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
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold mb-6">
          Отправить отклик на {type === 'order' ? 'заказ' : 'объявление'} #{id}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Ваше предложение</CardTitle>
          </CardHeader>
          <CardContent>
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
                <label className="text-sm font-medium mb-1 block">Вложение (необязательно)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="h-11"
                  />
                  {attachment && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachment(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[#3F7F6E] mt-1">
                  Поддерживаются: PDF, DOC, DOCX, изображения (макс. 10 МБ)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Отправить отклик
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
