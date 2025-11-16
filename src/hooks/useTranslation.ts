import { useRegion } from '@/contexts/RegionContext';
import en from '@/locales/en.json';
import ru from '@/locales/ru.json';

const translations: Record<string, any> = {
  en,
  ru,
  es: en, // Spanish - fallback to English for now
  de: en, // German - fallback to English for now
  fr: en, // French - fallback to English for now
  zh: en, // Chinese - fallback to English for now
  ja: en, // Japanese - fallback to English for now
  ko: en, // Korean - fallback to English for now
  pt: en, // Portuguese - fallback to English for now
  ar: en, // Arabic - fallback to English for now
};

export function useTranslation() {
  const { language } = useRegion();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language] || translations.en;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value !== 'string') {
      // Fallback to English if translation not found
      value = translations.en;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          value = key; // Return key if not found
          break;
        }
      }
    }

    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return String(params[paramKey] ?? `{{${paramKey}}}`);
      });
    }

    return value || key;
  };

  return { t, language };
}
