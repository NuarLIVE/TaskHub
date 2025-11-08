import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/lib/supabaseClient';

interface PendingConfirmation {
  id: string;
  field_name: string;
  field_value: any;
  confidence: number;
  message: string;
  status: string;
  created_at: string;
}

interface CRMConfirmationProps {
  chatId: string;
}

export function CRMConfirmation({ chatId }: CRMConfirmationProps) {
  const [confirmations, setConfirmations] = useState<PendingConfirmation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfirmations();

    const supabase = getSupabase();
    const channel = supabase
      .channel(`crm-confirmations-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_pending_confirmations',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          loadConfirmations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  const loadConfirmations = async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('crm_pending_confirmations')
      .select('*')
      .eq('chat_id', chatId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setConfirmations(data);
    }
  };

  const handleConfirm = async (confirmation: PendingConfirmation) => {
    setLoading(true);
    const supabase = getSupabase();

    await supabase
      .from('crm_pending_confirmations')
      .update({ status: 'confirmed' })
      .eq('id', confirmation.id);

    const { data: crmContext } = await supabase
      .from('chat_crm_context')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (crmContext) {
      const updates: any = {};

      switch (confirmation.field_name) {
        case 'order_title':
          updates.order_title = confirmation.field_value.value;
          break;
        case 'total_price':
          updates.total_price = confirmation.field_value.value;
          if (confirmation.field_value.currency) {
            updates.currency = confirmation.field_value.currency;
          }
          break;
        case 'deadline':
          updates.deadline = confirmation.field_value.value;
          break;
        case 'priority':
          updates.priority = confirmation.field_value.value;
          break;
        case 'tasks':
          const currentTasks = crmContext.tasks || [];
          updates.tasks = [...currentTasks, ...confirmation.field_value.items];
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('chat_crm_context')
          .update(updates)
          .eq('chat_id', chatId);
      }
    }

    setLoading(false);
    loadConfirmations();
  };

  const handleReject = async (confirmationId: string) => {
    setLoading(true);
    const supabase = getSupabase();

    await supabase
      .from('crm_pending_confirmations')
      .update({ status: 'rejected' })
      .eq('id', confirmationId);

    setLoading(false);
    loadConfirmations();
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) {
      return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">Высокая</Badge>;
    } else if (confidence >= 0.4) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">Средняя</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Низкая</Badge>;
    }
  };

  if (confirmations.length === 0) return null;

  return (
    <div className="absolute left-4 top-32 z-20 w-80">
      <AnimatePresence>
        {confirmations.map((confirmation, index) => (
          <motion.div
            key={confirmation.id}
            initial={{ opacity: 0, x: -20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="mb-2"
          >
            <div className="bg-white border-2 border-[#3F7F6E] rounded-lg shadow-lg overflow-hidden">
              <div className="bg-[#3F7F6E] px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-white flex-shrink-0" />
                <span className="text-white font-semibold text-xs">CRM Подтверждение</span>
                {getConfidenceBadge(confirmation.confidence)}
              </div>
              <div className="p-3 bg-[#6FE7C8]/10">
                <p className="text-sm text-gray-800 mb-3 font-medium">{confirmation.message}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(confirmation)}
                    disabled={loading}
                    className="flex-1 bg-[#3F7F6E] hover:bg-[#2d5f52] text-white text-xs h-8"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(confirmation.id)}
                    disabled={loading}
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50 text-xs h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Отклонить
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
