import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Download,
  Calendar,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabaseClient';
import { useRegion } from '@/contexts/RegionContext';

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

interface WalletData {
  id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'outcome' | 'withdrawal' | 'deposit' | 'fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  completed_at?: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { currency, formatPrice, convertPrice } = useRegion();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [profileBalance, setProfileBalance] = useState<number>(0);
  const [profileCurrency, setProfileCurrency] = useState<string>('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadProfileBalance().then(() => {
        getSupabase()
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              localStorage.setItem(`viewed_wallet_${user.id}`, JSON.stringify({ balance: data.balance || 0 }));
            }
          });
      });
      loadWalletData();
      loadTransactions();

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadProfileBalance();
          loadWalletData();
          loadTransactions();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user]);

  const loadProfileBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('balance, currency')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfileBalance(data.balance || 0);
        setProfileCurrency(data.currency || 'USD');
      }
    } catch (error) {
      console.error('Error loading profile balance:', error);
    }
  };

  const loadWalletData = async () => {
    if (!user) return;

    try {
      const { data, error } = await getSupabase()
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      const { data: walletData } = await getSupabase()
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!walletData) return;

      const { data, error } = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !wallet || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > wallet.balance) {
      alert('Некорректная сумма для вывода');
      return;
    }

    try {
      const { error } = await getSupabase()
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount: amount,
          status: 'pending',
          description: `Вывод средств $${amount.toFixed(2)}`,
          reference_type: 'withdrawal'
        });

      if (error) throw error;

      await getSupabase()
        .from('wallets')
        .update({
          balance: wallet.balance - amount,
          pending_balance: wallet.pending_balance + amount,
          total_withdrawn: wallet.total_withdrawn + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      await loadProfileBalance();
      await loadWalletData();
      await loadTransactions();
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      alert('Ошибка при создании запроса на вывод');
    }
  };

  const handleDeposit = async () => {
    if (!user || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (amount <= 0 || isNaN(amount)) {
      alert('Некорректная сумма для пополнения');
      return;
    }

    try {
      const newProfileBalance = profileBalance + amount;

      const profileUpdate = await getSupabase()
        .from('profiles')
        .update({
          balance: newProfileBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileUpdate.error) throw profileUpdate.error;

      let currentWallet = wallet;

      if (!currentWallet) {
        const { data: newWallet, error: walletCreateError } = await getSupabase()
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            currency: 'USD'
          })
          .select()
          .single();

        if (walletCreateError) throw walletCreateError;
        currentWallet = newWallet;
      }

      if (currentWallet) {
        const newWalletBalance = currentWallet.balance + amount;
        const newTotalEarned = currentWallet.total_earned + amount;

        const walletUpdate = await getSupabase()
          .from('wallets')
          .update({
            balance: newWalletBalance,
            total_earned: newTotalEarned,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentWallet.id);

        if (walletUpdate.error) throw walletUpdate.error;

        const transactionInsert = await getSupabase()
          .from('transactions')
          .insert({
            wallet_id: currentWallet.id,
            type: 'deposit',
            amount: amount,
            status: 'completed',
            description: `Тестовое пополнение ${formatPrice(amount, profileCurrency)}`,
            reference_type: 'deposit',
            completed_at: new Date().toISOString()
          });

        if (transactionInsert.error) throw transactionInsert.error;
      }

      alert(`Успешно пополнено на ${formatPrice(amount, profileCurrency)}`);
      setShowDepositModal(false);
      setDepositAmount('');
      await loadProfileBalance();
      await loadWalletData();
      await loadTransactions();
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert('Ошибка при пополнении баланса: ' + (error as Error).message);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTransactionIcon = (type: string) => {
    if (type === 'income' || type === 'deposit') {
      return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
    }
    return <ArrowUpRight className="h-5 w-5 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'income' || type === 'deposit') return 'text-green-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'destructive'
    };
    const labels: Record<string, string> = {
      completed: 'Завершено',
      pending: 'В обработке',
      failed: 'Ошибка',
      cancelled: 'Отменено'
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
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

  if (!wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-[#3F7F6E]">
          <Wallet className="h-12 w-12 mx-auto mb-4" />
          <p>Кошелек не найден</p>
        </div>
      </div>
    );
  }

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
                  {formatPrice(profileBalance, profileCurrency)}
                </div>
                {profileCurrency !== currency && (
                  <div className="text-sm opacity-80 mb-2">
                    Оригинальная сумма: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: profileCurrency,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(profileBalance)}
                  </div>
                )}
                {wallet.pending_balance > 0 && (
                  <div className="text-sm opacity-80 mb-6">
                    В обработке: ${wallet.pending_balance.toFixed(2)}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    variant="secondary"
                    className="bg-white text-[#3F7F6E] hover:bg-white/90"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Вывести
                  </Button>
                  <Button
                    onClick={() => setShowDepositModal(true)}
                    variant="outline"
                    className="text-white border-white hover:bg-white/10"
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
                    <div className="text-sm text-[#3F7F6E] mb-1">Всего заработано</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${wallet.total_earned.toFixed(2)}
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
                    <div className="text-sm text-[#3F7F6E] mb-1">Всего выведено</div>
                    <div className="text-2xl font-bold text-[#3F7F6E]">
                      ${wallet.total_withdrawn.toFixed(2)}
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
              <CardTitle>История транзакций</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск транзакций..."
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">Все типы</option>
                  <option value="income">Поступления</option>
                  <option value="outcome">Расходы</option>
                  <option value="withdrawal">Выводы</option>
                  <option value="deposit">Пополнения</option>
                  <option value="fee">Комиссии</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">Все статусы</option>
                  <option value="completed">Завершено</option>
                  <option value="pending">В обработке</option>
                  <option value="failed">Ошибка</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-[#3F7F6E]">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Нет транзакций</p>
                <p className="text-sm">История транзакций пуста</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-[#EFFFF8] transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#EFFFF8] flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium mb-1">{transaction.description}</div>
                        <div className="text-sm text-[#3F7F6E] flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold mb-1 ${getTransactionColor(
                          transaction.type
                        )}`}
                      >
                        {transaction.type === 'income' || transaction.type === 'deposit'
                          ? '+'
                          : '-'}
                        ${transaction.amount.toFixed(2)}
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md m-4">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <CardTitle>Вывод средств</CardTitle>
                <button onClick={() => setShowWithdrawModal(false)} className="hover:opacity-70 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Доступно: ${wallet.balance.toFixed(2)}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={wallet.balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Введите сумму"
                />
              </div>
              <div className="text-sm text-[#3F7F6E]">
                Средства будут переведены на ваш счет в течение 1-3 рабочих дней
              </div>
              <div className="flex gap-3">
                <Button onClick={handleWithdraw} className="flex-1">
                  Вывести
                </Button>
                <Button
                  onClick={() => setShowWithdrawModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md m-4">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <CardTitle>Пополнение баланса</CardTitle>
                <button onClick={() => setShowDepositModal(false)} className="hover:opacity-70 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <div>
                <label className="text-sm font-medium mb-2 block">Сумма пополнения (тестовый ввод)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Введите сумму"
                />
              </div>
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <strong>Тестовый режим:</strong> Средства будут зачислены мгновенно для тестирования функционала
              </div>
              <div className="flex gap-3">
                <Button onClick={handleDeposit} className="flex-1">
                  Пополнить
                </Button>
                <Button
                  onClick={() => setShowDepositModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
