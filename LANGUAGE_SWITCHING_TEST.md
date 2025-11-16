# Language Switching Test Guide

## How It Works

The language switching is fully automatic and reactive!

### Architecture

1. **RegionSelector** changes language in RegionContext
2. **RegionContext** updates `language` state
3. **useTranslation** hook reads current language from RegionContext
4. **Components using `t()`** automatically re-render when language changes
5. **NavBar** recreates links with new translations on every render

### Technical Flow

```
User clicks language in RegionSelector
           ↓
RegionContext.setLanguage(newLang)
           ↓
RegionContext state updates
           ↓
All components using useRegion/useTranslation re-render
           ↓
NavBar calls t('nav.market') again with new language
           ↓
UI updates instantly!
```

### Why It Works

1. **NavBar uses useTranslation hook:**
   ```typescript
   const { t, language } = useTranslation();
   ```

2. **Links are recreated on every render:**
   ```typescript
   const PUBLIC_LINKS = [
     { href: '#/market', label: t('nav.market') }, // Called on every render
     // ...
   ];
   ```

3. **RegionContext triggers re-render:**
   - When language changes, RegionContext updates state
   - All subscribers (components using useRegion) re-render
   - useTranslation reads from useRegion, so it also re-renders

### Testing Steps

1. Open the application
2. Click on Globe icon (RegionSelector) in NavBar
3. Select "Language" tab
4. Click on any language (e.g., English)
5. **IMMEDIATELY see NavBar text change:**
   - Биржа → Market
   - Сообщения → Messages
   - Кошелёк → Wallet
   - Профиль → Profile
   - etc.

6. Switch to Russian:
   - Market → Биржа
   - Messages → Сообщения
   - Wallet → Кошелёк
   - Profile → Профиль
   - etc.

### What Gets Translated

#### NavBar (Instant Update)
- ✅ All navigation links
- ✅ Login/Logout buttons
- ✅ Register button
- ✅ Learning banner ("Complete the training")
- ✅ "Start Learning" button

#### Example Translations

**English:**
- Market
- Learning
- Categories
- My Deals
- Proposals
- Messages
- Wallet
- Profile
- Login
- Logout
- Register

**Russian:**
- Биржа
- Обучение
- Категории
- Мои сделки
- Отклики
- Сообщения
- Кошелёк
- Профиль
- Вход
- Выход
- Регистрация


### Debugging

If language doesn't switch instantly, check:

1. **RegionContext is working:**
   ```typescript
   const { language } = useRegion();
   console.log('Current language:', language);
   ```

2. **Component is using useTranslation:**
   ```typescript
   const { t, language } = useTranslation();
   console.log('Translation language:', language);
   ```

3. **Translation keys exist:**
   - Check `src/locales/[lang].json`
   - Verify key path is correct

### Performance

- ✅ **No delay** in switching
- ✅ **No network requests** (translations bundled)
- ✅ **Minimal overhead** (~3-5KB per language)
- ✅ **Instant re-render** (React hooks)

### Future Components

To make ANY component react to language changes:

```typescript
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('mySection.title')}</h1>
      <p>{t('mySection.description')}</p>
    </div>
  );
}
```

That's it! Component will automatically re-render when language changes.

### Verified Working

- ✅ NavBar instant translation
- ✅ English and Russian fully supported
- ✅ No page reload needed
- ✅ Reactive hooks architecture
- ✅ Build successful

### Notes

- Language preference is saved in localStorage (via RegionContext)
- On page reload, last selected language is restored
- Currency changes automatically with language (USD for English, RUB for Russian)
- All future pages/components using `t()` will auto-translate
