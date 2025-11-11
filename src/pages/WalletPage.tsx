import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabaseClient';
import WalletDepositForm from '@/components/WalletDepositForm';

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

interface WalletBalance {
  balance_minor: number;
  currency: string;
}

interface WalletLedgerEntry {
  id: string;
  kind: 'deposit' | 'withdraw';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  amount_minor: number;
  currency: string;
  created_at: string;
  metadata: Record<string, any>;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [entries, setEntries] = useState<WalletLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadBalance();
      loadEntries();

      // Subscribe to realtime updates for wallet_ledger
      const ledgerSubscription = getSupabase()
        .channel('wallet-ledger-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_ledger',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[REALTIME] Wallet ledger update:', payload);
            loadBalance();
            loadEntries();
          }
        )
        .subscribe();

      return () => {
        ledgerSubscription.unsubscribe();
      };
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await getSupabase()
        .from('wallet_balance')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setBalance(data || { balance_minor: 0, currency: 'usd' });
    } catch (error) {
      console.error('[WALLET] Error loading balance:', error);
      setBalance({ balance_minor: 0, currency: 'usd' });
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await getSupabase()
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('[WALLET] Error loading entries:', error);
    }
  };

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  const handleDepositModalClose = () => {
    setShowDepositModal(false);
    setDepositAmount('');
    loadBalance();
    loadEntries();
  };

  const handleDepositSubmit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0.5) {
      alert('Минимальная сумма пополнения: $0.50');
      return;
    }
    // Amount is valid, WalletDepositForm will handle the rest
  };

  const filteredEntries = entries.filter((entry) => {
    if (filterType !== 'all' && entry.kind !== filterType) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        entry.id.toLowerCase().includes(search) ||
        entry.kind.toLowerCase().includes(search) ||
        entry.status.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const balanceDollars = balance ? balance.balance_minor / 100 : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Успешно</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Ожидание</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Обработка</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Ошибка</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800">Отменено</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка кошелька...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Wallet className="w-10 h-10 text-blue-600" />
              Кошелёк
            </h1>
            <p className="mt-2 text-gray-600">
              Управление балансом и история транзакций
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardHeader>
              <CardTitle className="text-white/90 text-lg">Доступный баланс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">${balanceDollars.toFixed(2)}</div>
              <p className="text-white/70 mt-2">USD</p>
              <div className="mt-6 flex gap-3">
                <Button onClick={handleDepositClick} className="bg-white text-blue-600 hover:bg-blue-50 flex-1">
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Пополнить
                </Button>
                <Button className="bg-white/10 text-white hover:bg-white/20 flex-1">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Вывести
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Всего пополнений:</span>
                <span className="font-semibold">
                  {entries.filter((e) => e.kind === 'deposit' && e.status === 'succeeded').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Сумма пополнений:</span>
                <span className="font-semibold">
                  $
                  {(
                    entries
                      .filter((e) => e.kind === 'deposit' && e.status === 'succeeded')
                      .reduce((sum, e) => sum + e.amount_minor, 0) / 100
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Всего выводов:</span>
                <span className="font-semibold">
                  {entries.filter((e) => e.kind === 'withdraw' && e.status === 'succeeded').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>История транзакций</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Все</option>
                  <option value="deposit">Пополнения</option>
                  <option value="withdraw">Выводы</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Нет транзакций</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          entry.kind === 'deposit'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {entry.kind === 'deposit' ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {entry.kind === 'deposit' ? 'Пополнение' : 'Вывод'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      {getStatusBadge(entry.status)}
                      <span
                        className={`text-lg font-bold ${
                          entry.kind === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {entry.kind === 'deposit' ? '+' : '-'}$
                        {(entry.amount_minor / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showDepositModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Пополнение кошелька</CardTitle>
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setDepositAmount('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {!depositAmount || parseFloat(depositAmount) < 0.5 ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Сумма (USD)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.50"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="text-lg"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Минимальная сумма: $0.50
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button onClick={handleDepositSubmit} className="flex-1">
                        Продолжить
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDepositModal(false);
                          setDepositAmount('');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    </div>
                  </>
                ) : (
                  <WalletDepositForm
                    amount={parseFloat(depositAmount)}
                    onClose={handleDepositModalClose}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  );
}
