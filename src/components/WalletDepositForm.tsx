import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CheckoutFormProps {
  depositId: string;
  onClose: () => void;
}

function CheckoutForm({ depositId, onClose }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || processing) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      console.log('[DEPOSIT] Confirming payment...');

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?deposit=${depositId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('[DEPOSIT] Payment failed:', error.message);
        setErrorMessage(error.message || 'Произошла ошибка обработки.');
        setProcessing(false);
      } else {
        console.log('[DEPOSIT] Payment confirmed, starting polling...');
        setPollingStatus(true);
      }
    } catch (error: any) {
      console.error('[DEPOSIT] Error:', error);
      setErrorMessage(error.message || 'Произошла ошибка обработки.');
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!pollingStatus) return;

    console.log('[DEPOSIT] Starting status polling...');
    let pollCount = 0;
    const maxPolls = 20;

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const { data, error } = await getSupabase()
          .from('wallet_ledger')
          .select('status')
          .eq('id', depositId)
          .single();

        if (error) throw error;

        console.log(`[DEPOSIT] Poll ${pollCount}: status=${data.status}`);

        if (data.status === 'succeeded') {
          console.log('[DEPOSIT] Payment succeeded!');
          clearInterval(pollInterval);
          onClose();
        } else if (data.status === 'failed' || data.status === 'canceled') {
          console.log(`[DEPOSIT] Payment ${data.status}`);
          clearInterval(pollInterval);
          setErrorMessage(`Платёж ${data.status === 'failed' ? 'не прошёл' : 'отменён'}`);
          setProcessing(false);
          setPollingStatus(false);
        } else if (pollCount >= maxPolls) {
          console.log('[DEPOSIT] Polling timeout');
          clearInterval(pollInterval);
          setErrorMessage('Превышено время ожидания. Пожалуйста, обновите страницу.');
          setProcessing(false);
          setPollingStatus(false);
        }
      } catch (error: any) {
        console.error('[DEPOSIT] Polling error:', error);
        clearInterval(pollInterval);
        setErrorMessage('Ошибка проверки статуса платежа.');
        setProcessing(false);
        setPollingStatus(false);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pollingStatus, depositId, onClose]);

  if (pollingStatus) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Проверяем платёж</h3>
          <p className="text-gray-600">Ожидайте подтверждения от платёжной системы</p>
          <p className="text-sm text-gray-500 mt-2">Это может занять несколько секунд...</p>
        </div>
      </div>
    );
  }

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
          onClick={onClose}
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

interface WalletDepositFormProps {
  amount: number;
  onClose: () => void;
}

export default function WalletDepositForm({ amount, onClose }: WalletDepositFormProps) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const initDeposit = async () => {
      try {
        console.log('[DEPOSIT] Initializing deposit...');

        const session = await getSupabase().auth.getSession();
        if (!session.data.session) {
          throw new Error('No session');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/wallet-deposit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            amountMinor: Math.round(amount * 100),
            currency: 'usd',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to initialize deposit');
        }

        const data = await response.json();
        console.log('[DEPOSIT] Initialized:', data.depositId);

        setClientSecret(data.clientSecret);
        setDepositId(data.depositId);
      } catch (error: any) {
        console.error('[DEPOSIT] Initialization error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initDeposit();
  }, [user, amount]);

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Инициализация платежа...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
        <Button onClick={onClose} className="w-full">
          Закрыть
        </Button>
      </div>
    );
  }

  if (!clientSecret || !depositId) {
    return (
      <div className="text-sm text-red-600">
        Не удалось инициализировать платёж
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm depositId={depositId} onClose={onClose} />
    </Elements>
  );
}
