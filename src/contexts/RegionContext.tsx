import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

interface RegionContextType {
  language: string;
  currency: string;
  currencySymbol: string;
  currencies: Currency[];
  setLanguage: (lang: string) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  convertPrice: (amount: number, fromCurrency: string) => number;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  isLoading: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ar: 'العربية',
};

const LANGUAGE_TO_CURRENCY: Record<string, string> = {
  en: 'USD',
  ru: 'RUB',
  de: 'EUR',
  fr: 'EUR',
  es: 'EUR',
  zh: 'CNY',
  ja: 'JPY',
  ko: 'KRW',
  pt: 'BRL',
  ar: 'AED',
};

export function RegionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<string>('en');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Map<string, ExchangeRate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Detect user's region on mount
  useEffect(() => {
    detectRegion();
  }, []);

  // Load user preferences when authenticated
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Load available currencies
  useEffect(() => {
    loadCurrencies();
  }, []);

  async function detectRegion() {
    try {
      // Try to detect language from browser
      const browserLang = navigator.language.split('-')[0];
      const detectedLang = SUPPORTED_LANGUAGES[browserLang as keyof typeof SUPPORTED_LANGUAGES]
        ? browserLang
        : 'en';

      // Try to detect currency from timezone/locale
      const detectedCurrency = LANGUAGE_TO_CURRENCY[detectedLang] || 'USD';

      // If user is not logged in, use detected values
      if (!user) {
        setLanguageState(detectedLang);
        setCurrencyState(detectedCurrency);
        await fetchExchangeRates(detectedCurrency);
      }
    } catch (error) {
      console.error('Error detecting region:', error);
      setLanguageState('en');
      setCurrencyState('USD');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUserPreferences() {
    try {
      const { data, error } = await getSupabase()
        .from('user_preferences')
        .select('language, currency')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLanguageState(data.language);
        setCurrencyState(data.currency);
        await fetchExchangeRates(data.currency);
      } else {
        // Create default preferences
        const browserLang = navigator.language.split('-')[0];
        const detectedLang = SUPPORTED_LANGUAGES[browserLang as keyof typeof SUPPORTED_LANGUAGES]
          ? browserLang
          : 'en';
        const detectedCurrency = LANGUAGE_TO_CURRENCY[detectedLang] || 'USD';

        await getSupabase().from('user_preferences').insert({
          user_id: user!.id,
          language: detectedLang,
          currency: detectedCurrency,
        });

        setLanguageState(detectedLang);
        setCurrencyState(detectedCurrency);
        await fetchExchangeRates(detectedCurrency);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCurrencies() {
    try {
      const { data, error } = await getSupabase()
        .from('currencies')
        .select('code, name, symbol, locale')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  }

  async function fetchExchangeRates(baseCurrency: string) {
    try {
      // Check if we have recent rates in database (less than 1 hour old)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentRates, error: dbError } = await getSupabase()
        .from('exchange_rates')
        .select('from_currency, to_currency, rate, fetched_at')
        .eq('from_currency', baseCurrency)
        .gte('fetched_at', oneHourAgo)
        .order('fetched_at', { ascending: false });

      if (!dbError && recentRates && recentRates.length > 0) {
        // Use cached rates
        const ratesMap = new Map<string, ExchangeRate>();
        recentRates.forEach((rate) => {
          const key = `${rate.from_currency}-${rate.to_currency}`;
          ratesMap.set(key, {
            from: rate.from_currency,
            to: rate.to_currency,
            rate: parseFloat(rate.rate),
            timestamp: new Date(rate.fetched_at).getTime(),
          });
        });
        setExchangeRates(ratesMap);
        return;
      }

      // Fetch fresh rates from API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-exchange-rates?base=${baseCurrency}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const result = await response.json();

      if (result.success && result.rates) {
        const ratesMap = new Map<string, ExchangeRate>();
        Object.entries(result.rates).forEach(([toCurrency, rate]) => {
          const key = `${baseCurrency}-${toCurrency}`;
          ratesMap.set(key, {
            from: baseCurrency,
            to: toCurrency,
            rate: rate as number,
            timestamp: result.timestamp,
          });
        });
        setExchangeRates(ratesMap);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  }

  async function setLanguage(lang: string) {
    setLanguageState(lang);

    if (user) {
      try {
        const { error } = await getSupabase()
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            language: lang,
            currency,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  }

  async function setCurrency(newCurrency: string) {
    setCurrencyState(newCurrency);
    await fetchExchangeRates(newCurrency);

    if (user) {
      try {
        const { error } = await getSupabase()
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            language,
            currency: newCurrency,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving currency preference:', error);
      }
    }
  }

  function convertPrice(amount: number, fromCurrency: string): number {
    if (fromCurrency === currency) return amount;

    const key = `${fromCurrency}-${currency}`;
    const rate = exchangeRates.get(key);

    if (rate) {
      return amount * rate.rate;
    }

    // Try inverse conversion
    const inverseKey = `${currency}-${fromCurrency}`;
    const inverseRate = exchangeRates.get(inverseKey);

    if (inverseRate) {
      return amount / inverseRate.rate;
    }

    // If no rate found, return original amount
    return amount;
  }

  function formatPrice(amount: number, fromCurrency?: string): string {
    const convertedAmount = fromCurrency ? convertPrice(amount, fromCurrency) : amount;
    const currencyData = currencies.find((c) => c.code === currency);

    if (currencyData) {
      try {
        return new Intl.NumberFormat(currencyData.locale, {
          style: 'currency',
          currency: currency,
        }).format(convertedAmount);
      } catch (error) {
        return `${currencyData.symbol}${convertedAmount.toFixed(2)}`;
      }
    }

    return `${convertedAmount.toFixed(2)} ${currency}`;
  }

  const currencySymbol = currencies.find((c) => c.code === currency)?.symbol || '$';

  return (
    <RegionContext.Provider
      value={{
        language,
        currency,
        currencySymbol,
        currencies,
        setLanguage,
        setCurrency,
        convertPrice,
        formatPrice,
        isLoading,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

export { SUPPORTED_LANGUAGES };
