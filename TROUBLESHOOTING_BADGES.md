# Устранение проблем с отображением рейтингов и бейджей

## Проблема: Звёзды и бейджи не отображаются

### Шаг 1: Проверить применение миграции

Выполните SQL-запрос в Supabase Dashboard → SQL Editor:

```sql
-- Запустите файл check_migration.sql
```

Или используйте готовый файл: `supabase/check_migration.sql`

**Ожидаемый результат:**
- Должны быть видны 3 новых столбца: `avg_rating`, `reviews_count`, `five_star_count`

**Если столбцов нет:**
1. Примените миграцию вручную из файла:
   `supabase/migrations/20251112151703_add_profile_ratings_and_badges.sql`

### Шаг 2: Добавить тестовые данные

Если миграция применена, но данных нет, выполните:

```sql
-- Запустите файл seed_test_badges.sql
```

Файл: `supabase/seed_test_badges.sql`

**Ожидаемый результат:**
- 5 профилей с различными уровнями рейтингов
- Как минимум 2 профиля с бейджами

### Шаг 3: Очистить кеш браузера

1. **Полная перезагрузка:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Через DevTools:**
   - Открыть DevTools (F12)
   - Правый клик на кнопке обновления
   - "Empty Cache and Hard Reload"

3. **Полная очистка кеша:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Options → Privacy → Clear Data
   - Выберите "Cached images and files"

### Шаг 4: Проверить консоль браузера

Откройте DevTools (F12) → Console

**Ищите ошибки:**
- `Cannot read property 'avg_rating' of undefined` → Данные не загружаются
- `StarRating is not defined` → Проблема с импортом компонента
- `Failed to fetch` → Проблемы с подключением к базе данных

### Шаг 5: Проверить загрузку данных

В DevTools → Network → XHR:

1. Обновите страницу
2. Найдите запрос к Supabase API с `profiles`
3. Проверьте Response:
   - Должны быть поля: `avg_rating`, `reviews_count`, `five_star_count`, `created_at`

**Если полей нет в ответе:**
- Миграция не применена или применена неправильно
- Вернитесь к Шагу 1

### Шаг 6: Проверить версию сборки

```bash
# Пересобрать проект
npm run build

# Или перезапустить dev-сервер
npm run dev
```

## Часто встречающиеся проблемы

### Бейджи не отображаются

**Причина:** Нет данных в базе

**Решение:**
```sql
-- Проверьте данные
SELECT id, name, avg_rating, reviews_count, five_star_count, created_at
FROM profiles
WHERE role = 'FREELANCER'
LIMIT 5;

-- Если данных нет, выполните seed_test_badges.sql
```

### Звёзды не показываются

**Причина:** `avg_rating` = 0 или NULL

**Решение:**
```sql
-- Обновите тестовые данные
UPDATE profiles
SET avg_rating = 4.5, reviews_count = 10
WHERE role = 'FREELANCER'
LIMIT 3;
```

### Бейдж "Недавно на бирже" не исчезает

**Причина:** Время регистрации < 7 дней

**Решение:**
- Это нормально! Бейдж автоматически исчезнет через 7 дней
- Или обновите `created_at` в тестовых данных:

```sql
UPDATE profiles
SET created_at = now() - interval '10 days'
WHERE id = 'YOUR_USER_ID';
```

## Контрольный список

- [ ] Миграция применена (проверить через check_migration.sql)
- [ ] Тестовые данные добавлены (seed_test_badges.sql)
- [ ] Кеш браузера очищен (Ctrl+Shift+R)
- [ ] Проект пересобран (npm run build)
- [ ] В консоли нет ошибок
- [ ] В Network видны правильные данные профилей

## Если ничего не помогло

1. Откройте консоль браузера (F12)
2. Сделайте скриншот ошибок
3. Проверьте Network → XHR → Посмотрите ответ от API
4. Проверьте, что Supabase доступен и подключен

## Полезные SQL-запросы

```sql
-- Посмотреть всех фрилансеров с рейтингами
SELECT * FROM profiles WHERE role = 'FREELANCER';

-- Создать тестового пользователя с высоким рейтингом
UPDATE profiles
SET avg_rating = 5.0, reviews_count = 20, five_star_count = 15
WHERE id = (SELECT id FROM profiles WHERE role = 'FREELANCER' LIMIT 1);

-- Создать нового пользователя (показать бейдж "Недавно")
UPDATE profiles
SET created_at = now() - interval '2 days'
WHERE id = (SELECT id FROM profiles WHERE role = 'FREELANCER' LIMIT 1 OFFSET 1);
```
