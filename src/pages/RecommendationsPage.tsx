import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Calendar, TrendingUp, Lock, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import PriceDisplay from '@/components/PriceDisplay';
import SubscriptionPurchaseDialog from '@/components/SubscriptionPurchaseDialog';

interface Recommendation {
  id: string;
  order_id: string;
  match_score: number;
  match_reasons: Array<{ type: string; value: string }>;
  order: {
    id: string;
    title: string;
    description: string;
    budget: number;
    created_at: string;
    status: string;
  };
}

interface Order {
  id: string;
  title: string;
  description: string;
  budget: number;
  created_at: string;
  status: string;
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [generalOrders, setGeneralOrders] = useState<Order[]>([]);
  const [skillsWarning, setSkillsWarning] = useState('');
  const [specialtyWarning, setSpecialtyWarning] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (hasSubscription !== null) {
      if (hasSubscription) {
        loadRecommendations();
      } else {
        loadGeneralOrders();
      }
    }
  }, [hasSubscription]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const skills = profileData?.skills || [];
      if (skills.length === 0) {
        setSkillsWarning('У вас мало навыков, попробуйте добавить больше!');
      } else if (skills.length < 8) {
        setSkillsWarning('У вас мало навыков, попробуйте добавить больше!');
      }

      if (!profileData?.specialty && !profileData?.category) {
        setSpecialtyWarning('Укажите специальность для точных рекомендаций!');
      }

      const { data, error } = await supabase.rpc('has_active_recommendations_subscription', {
        p_user_id: user.id,
      });

      if (error) throw error;

      setHasSubscription(data || false);

      if (data) {
        const { data: days } = await supabase.rpc('get_subscription_days_remaining', {
          p_user_id: user.id,
        });
        setDaysRemaining(days || 0);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setHasSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  const loadGeneralOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, title, description, budget, created_at, status')
        .eq('status', 'open')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, 20);
      setGeneralOrders(shuffled);
    } catch (err) {
      console.error('Error loading general orders:', err);
    }
  };

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_recommendations')
        .select(`
          id,
          order_id,
          match_score,
          match_reasons,
          order:orders (
            id,
            title,
            description,
            budget,
            created_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('is_visible', true)
        .order('match_score', { ascending: false });

      if (error) throw error;

      setRecommendations(data || []);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!user || !hasSubscription) return;

    try {
      setGenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-order-recommendations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate recommendations');
      }

      await loadRecommendations();
    } catch (err: any) {
      console.error('Error generating recommendations:', err);
      alert(err.message || 'Ошибка при генерации рекомендаций');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    loadProfile();
    setShowPurchaseDialog(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Войдите, чтобы увидеть рекомендации</p>
          <Button asChild>
            <a href="#/login">Войти</a>
          </Button>
        </div>
      </div>
    );
  }

  if (hasSubscription === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#3F7F6E]" />
      </div>
    );
  }

  if (!hasSubscription) {
    return (
      <>
        {(skillsWarning || specialtyWarning) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 mx-4 mt-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {skillsWarning && <div>{skillsWarning}</div>}
                  {specialtyWarning && <div className="mt-1">{specialtyWarning}</div>}
                </p>
              </div>
            </div>
          </div>
        )}

        {specialtyWarning && generalOrders.length > 0 ? (
          <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h1 className="text-2xl font-bold mb-2">Общие рекомендации</h1>
                <p className="text-gray-600">
                  Кажется для вас нет ничего подходящего, но возможно эти объявления вам подойдут
                </p>
              </div>

              <div className="grid gap-4">
                {generalOrders.map((order) => (
                  <a
                    key={order.id}
                    href={`#/orders/${order.id}`}
                    className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold mb-2">{order.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {order.description}
                    </p>
                    <div className="text-xl font-bold text-[#3F7F6E]">
                      <PriceDisplay amount={order.budget} />
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-8 bg-gradient-to-r from-[#3F7F6E]/10 to-[#2F6F5E]/10 rounded-2xl p-8 text-center">
                <h2 className="text-xl font-bold mb-4">Хотите персональные рекомендации?</h2>
                <p className="text-gray-600 mb-6">
                  Укажите специальность и подключите AI-рекомендации для точного подбора заказов
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button asChild variant="outline">
                    <a href="#/profile">Заполнить профиль</a>
                  </Button>
                  <Button
                    onClick={() => setShowPurchaseDialog(true)}
                    className="bg-[#3F7F6E] hover:bg-[#2F6F5E]"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Подключить рекомендации
                  </Button>
                </div>
              </div>
            </div>

            <SubscriptionPurchaseDialog
              isOpen={showPurchaseDialog}
              onClose={() => setShowPurchaseDialog(false)}
              onSuccess={handleSubscriptionSuccess}
            />
          </div>
        ) : (
          <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#3F7F6E] to-[#2F6F5E] px-8 py-12 text-center text-white">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-6">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4">Рекомендации заказов с AI</h1>
                  <p className="text-lg text-white/90 max-w-2xl mx-auto">
                    Персональный подбор заказов на основе анализа ваших навыков, опыта и предпочтений
                  </p>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#3F7F6E]/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-[#3F7F6E]" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Умный анализ</h3>
                        <p className="text-sm text-gray-600">
                          AI анализирует ваш профиль, навыки, средний чек и историю работ
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#3F7F6E]/10 flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-[#3F7F6E]" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Высокое соответствие</h3>
                        <p className="text-sm text-gray-600">
                          Получайте только те заказы, которые идеально подходят вам
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#3F7F6E]/10 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className="w-6 h-6 text-[#3F7F6E]" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Автообновление</h3>
                        <p className="text-sm text-gray-600">
                          Список рекомендаций обновляется автоматически
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#3F7F6E]/10 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-6 h-6 text-[#3F7F6E]" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Актуальность</h3>
                        <p className="text-sm text-gray-600">
                          Недоступные заказы автоматически убираются из списка
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-8 border-t">
                    <Button
                      onClick={() => setShowPurchaseDialog(true)}
                      size="lg"
                      className="h-14 px-12 text-lg bg-[#3F7F6E] hover:bg-[#2F6F5E]"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Подключить рекомендации
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <SubscriptionPurchaseDialog
              isOpen={showPurchaseDialog}
              onClose={() => setShowPurchaseDialog(false)}
              onSuccess={handleSubscriptionSuccess}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {(skillsWarning || specialtyWarning) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {skillsWarning && <div>{skillsWarning}</div>}
                {specialtyWarning && <div className="mt-1">{specialtyWarning}</div>}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Рекомендации заказов</h1>
              <p className="text-gray-600">AI подобрал для вас {recommendations.length} подходящих заказов</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-[#3F7F6E]/10 to-[#2F6F5E]/10 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-[#3F7F6E] mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Подписка активна</span>
                </div>
                <div className="text-xs text-gray-600">
                  Осталось дней: <span className="font-semibold">{daysRemaining}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#3F7F6E] h-full transition-all rounded-full"
                    style={{ width: `${Math.min(100, (daysRemaining / 30) * 100)}%` }}
                  />
                </div>
              </div>

              <Button
                onClick={generateRecommendations}
                disabled={generating}
                className="bg-[#3F7F6E] hover:bg-[#2F6F5E]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Обновление...' : 'Обновить'}
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#3F7F6E]" />
            <p className="text-gray-600 mt-4">Загрузка рекомендаций...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Пока нет рекомендаций</h3>
            <p className="text-gray-600 mb-6">
              Нажмите "Обновить", чтобы получить персональные рекомендации заказов
            </p>
            <Button onClick={generateRecommendations} disabled={generating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Сгенерировать рекомендации
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <a
                key={rec.id}
                href={`#/orders/${rec.order.id}`}
                className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{rec.order.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {rec.order.description}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        {rec.match_score}% совпадение
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#3F7F6E]">
                      <PriceDisplay amount={rec.order.budget} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rec.match_reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="bg-[#3F7F6E]/10 text-[#3F7F6E] px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {reason.value}
                    </div>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
