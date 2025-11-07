# Система управления Supabase-соединением

## Обзор

Реализована надёжная система управления соединением с Supabase с автоматическим keep-alive и восстановлением.

## Ключевые файлы

### src/lib/supabaseClient.ts
- `getSupabase()` - получение актуального клиента
- `resetSupabase()` - пересоздание клиента с переподключением realtime

### src/hooks/useSupabaseKeepAlive.ts
- Автоматическая проверка каждые 90 секунд
- HEAD-запрос для проверки связи
- Автообновление токена за 2 минуты до истечения
- При 2 ошибках - автоматический reset и вызов onRecover

## Использование

```typescript
import { getSupabase, resetSupabase } from '@/lib/supabaseClient';
import { useSupabaseKeepAlive } from '@/hooks/useSupabaseKeepAlive';

// В компоненте
useSupabaseKeepAlive({
  onRecover: async () => await reloadData(),
  intervalMs: 90_000,
  headTable: 'profiles'
});

// Запросы
const { data } = await getSupabase().from('table').select('*');
```

## Возможности

✅ Соединение не протухает при сворачивании окна
✅ Автоматический reset при отвале сокетов/токена  
✅ Мгновенный reconnect при восстановлении окна/сети
✅ Все запросы через актуальный клиент
✅ Максимум 15с ожидания
