import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  X,
  CreditCard,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabaseClient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};
const pageTransition = {
  type: 'spring' as const,
  stiffness: 140,
  damping: 20,
  mass: 0.9
};

function CheckoutForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/wallet',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Произошла ошибка обработки.');
      } else {
        onSuccess();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Произошла ошибка обработки.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {errorMessage}
        </div>
      )}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={processing || !stripe}>
          {processing ? 'Обработка...' : 'Оплатить'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
          disabled={processing}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

interface LedgerAccount {
  id: string;
  balance_cents: number;
  kind: 'available' | 'escrow' | 'platform_revenue';
}

interface LedgerEntry {
  id: string;
  amount_cents: number;
  ref_type: string;
  ref_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [availableAccount, setAvailableAccount] = useState<LedgerAccount | null>(null);
  const [escrowAccount, setEscrowAccount] = useState<LedgerAccount | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWalletData();
      loadEntries();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      const { data: accounts, error } = await getSupabase()
        .from('ledger_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('kind', ['available', 'escrow']);

      if (error) throw error;

      const available = accounts?.find((a) => a.kind === 'available') || null;
      const escrow = accounts?.find((a) => a.kind === 'escrow') || null;

      setAvailableAccount(available);
      setEscrowAccount(escrow);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!user) return;

    try {
      const { data: accounts } = await getSupabase()
        .from('ledger_accounts')
        .select('id')
        .eq('user_id', user.id);

      if (!accounts || accounts.length === 0) return;

      const accountIds = accounts.map((a) => a.id);

      const { data, error } = await getSupabase()
        .from('ledger_entries')
        .select('*')
        .in('account_id', accountIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleDepositInit = async () => {
    if (!depositAmount || processing) return;

    const amount = parseFloat(depositAmount);
    if (amount < 0.5) {
      alert('Минимальная сумма пополнения: $0.50');
      return;
    }

    setProcessing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await getSupabase().auth.getSession();

      if (!session) {
        alert('Необходимо авторизоваться');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/wallet-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
          currency: 'usd',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания платежа');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
    } catch (error: any) {
      console.error('Deposit error:', error);
      alert(error.message || 'Ошибка при создании платежа');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowDepositModal(false);
    setDepositAmount('');
    setClientSecret(null);
    alert('Платеж успешно обработан! Баланс будет обновлен в течение минуты.');

    setTimeout(() => {
      loadWalletData();
      loadEntries();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setClientSecret(null);
  };

  const handleWithdraw = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await getSupabase().auth.getSession();

      if (!session) {
        alert('Необходимо авторизоваться');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/connect-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания аккаунта');
      }

      const { onboardingUrl } = await response.json();
      window.location.href = onboardingUrl;
    } catch (error: any) {
      console.error('Onboarding error:', error);
      alert(error.message || 'Ошибка при настройке вывода средств');
    } finally {
      setProcessing(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch = e.ref_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || e.ref_type === filterType;
    return matchesSearch && matchesType;
  });

  const getEntryIcon = (refType: string) => {
    if (refType === 'DEPOSIT' || refType === 'RELEASE') {
      return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
    }
    return <ArrowUpRight className="h-5 w-5 text-red-500" />;
  };

  const getEntryColor = (amountCents: number) => {
    return amountCents > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getRefTypeLabel = (refType: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: 'Пополнение',
      RESERVE: 'Резервирование',
      RELEASE: 'Выплата',
      REFUND: 'Возврат',
      SPEND: 'Покупка',
      TRANSFER: 'Перевод',
      FEE: 'Комиссия',
    };
    return labels[refType] || refType;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6FE7C8] border-r-transparent"></div>
          <p className="mt-4 text-[#3F7F6E]">Загрузка кошелька...</p>
        </div>
      </div>
    );
  }

  const balanceCents = availableAccount?.balance_cents || 0;
  const escrowCents = escrowAccount?.balance_cents || 0;
  const totalCents = balanceCents + escrowCents;

  return (
    <motion.div
      key="wallet"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold mb-8">Кошелёк</h1>

        <div className="grid gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#6FE7C8] to-[#3F7F6E] text-white overflow-hidden relative">
            <CardContent className="p-8">
              <div className="absolute top-0 right-0 opacity-10">
                <Wallet className="h-48 w-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Доступный баланс
                </div>
                <div className="text-5xl font-bold mb-8">
                  ${(balanceCents / 100).toFixed(2)}
                </div>
                {escrowCents > 0 && (
                  <div className="text-sm opacity-80 mb-6">
                    В резерве: ${(escrowCents / 100).toFixed(2)}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    variant="secondary"
                    className="bg-white text-[#3F7F6E] hover:bg-white/90"
                    disabled={processing}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Настроить вывод
                  </Button>
                  <Button
                    onClick={() => setShowDepositModal(true)}
                    variant="outline"
                    className="text-white border-white hover:bg-white/10"
                    disabled={processing}
                  >
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                    Пополнить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[#3F7F6E] mb-1">Доступно для использования</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(balanceCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[#3F7F6E] mb-1">Всего в системе</div>
                    <div className="text-2xl font-bold text-[#3F7F6E]">
                      ${(totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-[#3F7F6E]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>История операций</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск операций..."
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">Все типы</option>
                  <option value="DEPOSIT">Пополнения</option>
                  <option value="RESERVE">Резервирования</option>
                  <option value="RELEASE">Выплаты</option>
                  <option value="REFUND">Возвраты</option>
                  <option value="SPEND">Покупки</option>
                  <option value="FEE">Комиссии</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-[#3F7F6E]">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Нет операций</p>
                <p className="text-sm">История операций пуста</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-[#EFFFF8] transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                        {getEntryIcon(entry.ref_type)}
                      </div>
                      <div>
                        <div className="font-medium mb-1">{getRefTypeLabel(entry.ref_type)}</div>
                        <div className="text-sm text-[#3F7F6E]">
                          {formatDate(entry.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getEntryColor(entry.amount_cents)}`}>
                        {entry.amount_cents > 0 ? '+' : ''}
                        ${(entry.amount_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-[#3F7F6E]">
                        {entry.ref_id ? `#${entry.ref_id.substring(0, 8)}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-8">
            <Card className="w-full max-w-md my-auto">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Пополнение баланса
                  </CardTitle>
                  <button onClick={() => {
                    setShowDepositModal(false);
                    setClientSecret(null);
                    setDepositAmount('');
                  }} className="hover:opacity-70 transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                {!clientSecret ? (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Сумма пополнения (USD)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.50"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Минимум $0.50"
                        disabled={processing}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          Платеж обрабатывается через Stripe. Средства зачисляются моментально после подтверждения.
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleDepositInit} className="flex-1" disabled={processing}>
                        {processing ? 'Создание...' : 'Продолжить'}
                      </Button>
                      <Button
                        onClick={() => setShowDepositModal(false)}
                        variant="outline"
                        className="flex-1"
                        disabled={processing}
                      >
                        Отмена
                      </Button>
                    </div>
                  </>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  </Elements>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-8">
            <Card className="w-full max-w-md my-auto">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5" />
                    Настройка выплат
                  </CardTitle>
                  <button onClick={() => setShowWithdrawModal(false)} className="hover:opacity-70 transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <div className="font-medium mb-2">Stripe Connect Onboarding</div>
                  <p className="mb-3">
                    Для получения выплат необходимо создать и подключить Stripe аккаунт. Это займет несколько минут.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Безопасная верификация через Stripe</li>
                    <li>Автоматические выплаты</li>
                    <li>Поддержка банковских карт</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleWithdraw} className="flex-1" disabled={processing}>
                    {processing ? 'Загрузка...' : 'Продолжить'}
                  </Button>
                  <Button
                    onClick={() => setShowWithdrawModal(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={processing}
                  >
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}
