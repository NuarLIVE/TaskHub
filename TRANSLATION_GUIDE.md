# Translation System Guide

## 📋 Overview

TaskHub has a complete translation system supporting 2 languages:
- 🇬🇧 English (en)
- 🇷🇺 Русский (ru)

## 🏗️ Structure

### Translation Files Location
```
src/locales/
├── en.json  (English - Full translations)
└── ru.json  (Russian - Full translations)
```

### Hook Usage
```typescript
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t('nav.market')}</h1>;
}
```

## 📝 Translation Keys Structure

```json
{
  "common": { ... },
  "nav": { ... },
  "auth": { ... },
  "market": { ... },
  "order": { ... },
  "task": { ... },
  "proposal": { ... },
  "deal": { ... },
  "messages": { ... },
  "wallet": { ... },
  "profile": { ... },
  "admin": { ... },
  "learning": { ... },
  "categories": { ... },
  "errors": { ... },
  "success": { ... },
  "validation": { ... },
  "footer": { ... }
}
```

## 🎯 Usage Examples

### Simple Translation
```typescript
t('common.save') // "Save" or "Сохранить"
```

### With Parameters
```typescript
t('validation.minLength', { min: 5 })
// "Minimum length: 5" or "Минимальная длина: 5"
```

### Nested Keys
```typescript
t('order.status.open') // "Open" or "Открыт"
```

## 🔄 How Language Selection Works

1. User selects language in RegionSelector
2. Language is stored in RegionContext
3. useTranslation hook reads current language
4. Translations are loaded from corresponding JSON file
5. If translation not found in selected language, falls back to English

## ✅ Currently Translated

### ✓ Components
- NavBar (navigation links)
- RegionSelector (integrated)

### ✓ Translation Files
- **en.json**: Complete English translations (~400+ keys)
- **ru.json**: Complete Russian translations (~400+ keys)

## 🚀 Adding New Translations

### Step 1: Add translation key to en.json
```json
{
  "mySection": {
    "myKey": "My English Text"
  }
}
```

### Step 2: Add translation to ru.json
```json
{
  "mySection": {
    "myKey": "Мой русский текст"
  }
}
```

### Step 3: Use in component
```typescript
const { t } = useTranslation();
<button>{t('mySection.myKey')}</button>
```

## 📦 What's Included

### Navigation (nav.*)
- Market, Learning, Categories
- My Deals, Proposals, Messages
- Wallet, Profile
- Entrance, Terms of Use

### Authentication (auth.*)
- Login/Register forms
- Email, Password fields
- Buttons and placeholders

### Market (market.*)
- Orders and Tasks
- Create buttons
- Budget, Deadline, Proposals

### Orders (order.*)
- Create, Edit, Details
- Title, Description, Category
- Status labels (Open, In Progress, etc.)

### Tasks (task.*)
- Create, Edit, Details
- Price, Delivery Days
- Status labels

### Proposals (proposal.*)
- Create, Edit, Details
- Message, Portfolio
- Status labels (Pending, Accepted, etc.)

### Deals (deal.*)
- My Deals
- Client, Freelancer
- Start, Submit, Accept
- Status labels
- Escrow messages

### Messages (messages.*)
- Type message, Send
- Online/Offline status
- New message

### Wallet (wallet.*)
- Balance, Deposit, Withdraw
- Transactions
- Transaction types

### Profile (profile.*)
- Edit Profile
- Name, Bio, Skills
- Portfolio, Reviews
- Badges (Newcomer, Verified, etc.)

### Admin Panel (admin.*)
- Dashboard, Users, Deals
- Finance, Categories, Moderation
- Statistics labels
- User actions (Mute, Ban, etc.)

### Learning (learning.*)
- Complete Profile
- Get Started
- How It Works

### Categories (categories.*)
- All Categories
- Popular
- Subcategories

### Common (common.*)
- Save, Cancel, Delete, Edit
- Search, Filter, All
- Login, Logout, Register
- Back, Next, Continue

### Errors & Success (errors.*, success.*)
- Generic error messages
- Success notifications
- Validation errors

### Footer (footer.*)
- About, Terms, Privacy
- Contact, Help

## 🌐 Language-Currency Mapping

The system automatically suggests currency based on language:
- English → USD
- Русский → RUB

## 🔧 Technical Details

### Fallback System
1. Try to get translation from selected language
2. If not found, try English
3. If still not found, return key itself

### Performance
- Translations loaded synchronously (bundled with app)
- No network requests for translations
- Minimal overhead (<5KB per language file gzipped)

## 📝 Adding New Languages

To add support for additional languages in the future:

1. Create new translation file in `src/locales/[lang].json`
2. Copy structure from `en.json` or `ru.json`
3. Translate all values (keep keys exactly as-is)
4. Add language to `SUPPORTED_LANGUAGES` in `RegionContext.tsx`
5. Add language mapping in `LANGUAGE_TO_CURRENCY`
6. Import and add to `translations` object in `useTranslation.ts`

## 🎨 Best Practices

1. **Always use translation keys** instead of hardcoded text
2. **Keep keys semantic**: `nav.market` not `navigation.pageMarket`
3. **Group by feature**: All order-related in `order.*`
4. **Use parameters** for dynamic content: `{{count}} items`
5. **Test all languages** before deploying
6. **Document new keys** when adding features

## 🐛 Troubleshooting

### Translation not showing
- Check if key exists in translation file
- Verify language code matches RegionContext
- Check console for errors

### Fallback to English
- Translation file might be missing
- Key might not exist in selected language
- This is expected behavior for incomplete translations

### Wrong language displayed
- Check RegionContext language state
- Verify useTranslation hook is called
- Check localStorage for saved language preference

## 📚 Resources

- Translation files: `/src/locales/`
- Translation hook: `/src/hooks/useTranslation.ts`
- Region context: `/src/contexts/RegionContext.tsx`
- Example usage: `/src/components/NavBar.tsx`
