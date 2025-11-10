# Руководство по интернационализации (i18n)

## Обзор
Проект использует собственную систему i18n с полной типобезопасностью через TypeScript.

## Структура

### Файлы переводов
- `src/locales/en.ts` - английские переводы (базовый язык)
- `src/locales/ru.ts` - русские переводы
- `src/locales/index.ts` - экспорт всех языков

### Разделы переводов
- `nav` - навигация
- `common` - общие элементы (кнопки, действия)
- `auth` - авторизация и регистрация
- `market` - биржа/маркетплейс
- `order` - заказы
- `task` - услуги
- `profile` - профиль пользователя
- `messages` - сообщения
- `deals` - сделки
- `wallet` - кошелек
- `proposals` - отклики
- `settings` - настройки
- `footer` - подвал
- `home` - главная страница
- `errors` - ошибки
- `price` - цены и валюты

## Использование

### В компонентах

```typescript
import { useRegion } from '@/contexts/RegionContext';

function MyComponent() {
  const { t } = useRegion();

  return (
    <div>
      <h1>{t.market.title}</h1>
      <button>{t.common.save}</button>
      <p>{t.auth.loginTitle}</p>
    </div>
  );
}
```

### Примеры использования

```typescript
// Простой текст
<h1>{t.nav.market}</h1>

// В placeholder
<Input placeholder={t.market.searchPlaceholder} />

// В атрибутах
<button aria-label={t.common.close}>

// С динамическими данными
<span>{loading ? t.common.loading : t.common.save}</span>

// В условиях
{error && <div>{t.common.error}: {errorMessage}</div>}
```

## Добавление нового языка

1. Создайте файл `src/locales/xx.ts` (где xx - код языка)
2. Импортируйте тип Translation
3. Переведите все ключи

```typescript
import { Translation } from './en';

export const es: Translation = {
  nav: {
    home: 'Inicio',
    market: 'Mercado',
    // ... остальные переводы
  },
  // ...
};
```

4. Экспортируйте в `src/locales/index.ts`

```typescript
import { es } from './es';

export const translations: Record<string, Translation> = {
  en,
  ru,
  es, // добавить новый язык
};
```

5. Добавьте язык в RegionContext (`src/contexts/RegionContext.tsx`)

```typescript
const SUPPORTED_LANGUAGES = {
  en: 'English',
  ru: 'Русский',
  es: 'Español', // добавить
};
```

## Добавление новых переводов

### В существующий раздел

В `src/locales/en.ts`:
```typescript
export const en = {
  common: {
    // ...существующие
    newKey: 'New text', // добавить
  },
};
```

В `src/locales/ru.ts`:
```typescript
export const ru: Translation = {
  common: {
    // ...существующие
    newKey: 'Новый текст', // добавить
  },
};
```

### Новый раздел

В `src/locales/en.ts`:
```typescript
export const en = {
  // ...существующие разделы
  notifications: {
    title: 'Notifications',
    markAsRead: 'Mark as read',
    clear: 'Clear all',
  },
};
```

Повторить для всех языков.

## Правила

### ❌ НЕ переводить
- Контент созданный пользователями (объявления, отзывы, сообщения)
- Названия категорий (пока)
- Имена пользователей
- URL и технические идентификаторы

### ✅ Переводить
- Все элементы интерфейса
- Кнопки и labels
- Placeholders
- Подсказки и тултипы
- Сообщения об ошибках
- Уведомления системы
- Названия страниц и разделов

## Переключение языка

Пользователь может сменить язык через:
1. `RegionSelector` компонент в навигации
2. Настройки профиля

Выбор сохраняется в:
- LocalStorage (для неавторизованных)
- База данных (для авторизованных)

## Автоматическое определение

При первом посещении:
1. Определяется язык браузера
2. Если поддерживается - используется
3. Иначе - английский (по умолчанию)

## TypeScript типобезопасность

Система полностью типизирована. При добавлении/изменении ключей:
- TypeScript подсветит ошибки
- Автокомплит покажет доступные ключи
- Нельзя использовать несуществующий перевод

```typescript
t.market.title // ✅ OK
t.market.nonExistent // ❌ TypeScript error
```

## Миграция существующего кода

Найти русский текст:
```bash
grep -rn "[А-Яа-я]" src/pages src/components
```

Заменить на перевод:
```typescript
// Было:
<h1>Биржа</h1>

// Стало:
<h1>{t.market.title}</h1>
```

## Тестирование

После изменений переводов:
1. Соберите проект: `npm run build`
2. Проверьте оба языка в интерфейсе
3. Убедитесь что нет хардкод-текста

## Производительность

- Переводы загружаются синхронно
- Нет дополнительных запросов к серверу
- Размер bundle увеличивается минимально
- Переключение языка мгновенное
