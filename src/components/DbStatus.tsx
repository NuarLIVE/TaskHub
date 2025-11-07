import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function DbStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const { error } = await Promise.race([
        supabase.from('profiles').select('id').limit(1),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 6000)
        )
      ]);

      setStatus(error ? 'disconnected' : 'connected');
      setLastCheck(new Date());
    } catch {
      setStatus('disconnected');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'connected') return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
      status === 'checking' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {status === 'checking' ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Проверка связи...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Нет связи с БД</span>
          <button
            onClick={checkConnection}
            className="ml-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Переподключить
          </button>
        </>
      )}
    </div>
  );
}
