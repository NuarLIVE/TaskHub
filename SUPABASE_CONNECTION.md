# Supabase Connection Management

## Обзор

Реализована надежная система управления соединением с Supabase, которая автоматически поддерживает соединение активным и восстанавливает его при разрыве.

## Основные возможности

### 1. Автоматический Keep-Alive
- Периодическая проверка соединения каждые 30 секунд
- Легковесные запросы к БД для поддержания активности
- Автоматический сброс счетчика попыток переподключения при успешном запросе

### 2. Health Check
- Мониторинг активности каждые 15 секунд
- Проверка времени последней активности
- Автоматическая проверка соединения при длительной неактивности (>60 сек)

### 3. Восстановление соединения
- Автоматическое переподключение при обнаружении проблем
- До 5 попыток переподключения с экспоненциальной задержкой
- Полное пересоздание клиента при необходимости
- Сброс всех каналов realtime перед переподключением

### 4. Мониторинг состояния приложения
- Автоматическая проверка соединения при возвращении в активную вкладку
- Обработка событий visibility change
- Реакция на изменения сетевого статуса (online/offline)

### 5. Визуальная индикация
- Компонент `DbStatus` показывает статус соединения
- Цветовая индикация: зеленый (подключено), желтый (проверка), синий (переподключение), красный (ошибка)
- Кнопка ручного переподключения
- Переключатель автоматического/ручного режима

## Использование

### Получение клиента Supabase

```typescript
import { getSupabase } from '@/lib/supabase';

// Использование в запросах
const supabase = getSupabase();
const { data, error } = await supabase
  .from('table')
  .select('*');
```

### Принудительное переподключение

```typescript
import { forceReconnect } from '@/lib/supabase';

await forceReconnect();
```

### Работа с подписками

```typescript
import { subscribeWithMonitoring } from '@/lib/supabase-utils';

const channel = await subscribeWithMonitoring('my-channel', {
  table: 'messages',
  event: 'INSERT',
  callback: (payload) => {
    console.log('New message:', payload);
  },
  onError: () => {
    console.error('Subscription error');
  },
  onReconnect: () => {
    console.log('Subscription reconnected');
  }
});
```

### Retry-логика для запросов

```typescript
import { executeQuery } from '@/lib/supabase-utils';

const { data, error } = await executeQuery(
  (client) => client.from('table').select('*'),
  {
    maxRetries: 3,
    timeoutMs: 8000,
    retryDelayMs: 1000
  }
);
```

## Архитектура

### SupabaseManager (singleton)

Центральный класс управления соединением:
- Создание и пересоздание клиента Supabase
- Управление keep-alive интервалом
- Управление health check интервалом
- Обработка событий видимости и сети
- Отслеживание последней активности
- Логика переподключения с backoff

### Конфигурация клиента

```typescript
createClient(url, key, {
  auth: {
    persistSession: true,        // Сохранение сессии
    autoRefreshToken: true,      // Автообновление токена
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
```

## Best Practices

1. **Всегда используйте `getSupabase()`** вместо прямого импорта `supabase`
2. **Не сохраняйте клиент в переменные** - получайте его при каждом запросе
3. **Используйте `executeQuery`** для критичных запросов с автоповтором
4. **Мониторьте подписки** с помощью `subscribeWithMonitoring`
5. **Не блокируйте UI** - все операции переподключения происходят в фоне

## Диагностика проблем

### Проверка логов
Система логирует все ключевые события:
- `✅ Supabase client reconnected successfully`
- `Keep-alive query failed`
- `Connection potentially stale`
- `Network offline`

### Ручное тестирование
1. Откройте консоль разработчика
2. Перейдите на вкладку Network
3. Включите throttling (Slow 3G)
4. Наблюдайте автоматическое переподключение

### Компонент статуса
`DbStatus` в правом нижнем углу показывает:
- Текущее состояние соединения
- Возможность ручного переподключения
- Переключение режима автопереподключения

## Производительность

- Keep-alive запросы: ~1 КБ трафика каждые 30 сек
- Health check: без сетевых запросов, только проверка времени
- Переподключение: полное пересоздание клиента за ~500мс
- Минимальная нагрузка на CPU и память
