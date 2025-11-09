# Region and Currency Auto-Detection Feature

## Overview
The application now automatically detects the user's region (language and currency) and allows manual switching between languages and currencies. All prices are automatically converted to the user's preferred currency using real-time exchange rates.

## Features Implemented

### 1. Auto-Detection
- **Language Detection**: Automatically detects browser language on first visit
- **Currency Detection**: Maps detected language to appropriate currency
  - English → USD
  - Russian → RUB
  - German/French/Spanish → EUR
  - Chinese → CNY
  - Japanese → JPY
  - Korean → KRW
  - Portuguese → BRL
  - Arabic → AED

### 2. Manual Selection
- Globe icon in navigation bar opens region selector
- Two tabs:
  - **Language**: Choose from 10 supported languages
  - **Currency**: Choose from 20+ supported currencies
- Settings are saved for authenticated users
- Anonymous users' preferences stored in browser session

### 3. Currency Conversion
- Real-time exchange rates fetched from exchangerate-api.com
- Rates cached in database for 1 hour to reduce API calls
- All prices on market pages automatically converted
- Formatted according to currency locale (e.g., $1,234.56, €1.234,56, ₽1 234,56)

### 4. Database Schema
Three new tables:
- `currencies`: Stores available currencies with symbols and locales
- `exchange_rates`: Caches exchange rates with timestamps
- `user_preferences`: Stores user language and currency preferences

### 5. Edge Function
- `fetch-exchange-rates`: Fetches current rates and stores in database
- Automatic caching prevents excessive API calls
- Supports batch rate fetching for all currencies

## Technical Details

### Context Provider: RegionContext
Located at: `src/contexts/RegionContext.tsx`

Provides:
- `language`: Current language code
- `currency`: Current currency code
- `currencySymbol`: Symbol for current currency
- `currencies`: List of available currencies
- `setLanguage(lang)`: Change language
- `setCurrency(currency)`: Change currency (triggers rate fetch)
- `convertPrice(amount, fromCurrency)`: Convert price to user's currency
- `formatPrice(amount, fromCurrency)`: Convert and format price with symbol

### UI Component: RegionSelector
Located at: `src/components/RegionSelector.tsx`

Features:
- Dropdown with language and currency tabs
- Visual indicator of current selection
- Checkmarks for active selections
- Auto-closes after selection

### Updated Pages
All market and deal pages now use `formatPrice` from RegionContext:
- `MarketPage.tsx`: Market listings and detail modal
- `OrderDetailPage.tsx`: Order details
- `TaskDetailPage.tsx`: Task details
- `MyDealsPage.tsx`: Deal listings

### Exchange Rate API
Uses exchangerate-api.com free tier:
- 1500 requests per month
- Rates cached in database for 1 hour
- Automatic fallback to cached rates

## Usage Examples

### For Users
1. Click globe icon in navigation
2. Select language in first tab
3. Select currency in second tab
4. All prices automatically update

### For Developers
```typescript
// Use in any component
import { useRegion } from '@/contexts/RegionContext';

function MyComponent() {
  const { formatPrice, currency, setCurrency } = useRegion();

  // Convert and format a price
  const displayPrice = formatPrice(100, 'USD'); // "€92.50" if user's currency is EUR

  // Change currency programmatically
  await setCurrency('EUR');
}
```

## Supported Currencies
USD, EUR, RUB, GBP, JPY, CNY, KRW, INR, BRL, AUD, CAD, CHF, SEK, NOK, PLN, TRY, MXN, AED, SGD, HKD

## Supported Languages
English, Russian, Spanish, German, French, Chinese, Japanese, Korean, Portuguese, Arabic

## Notes
- Exchange rates update every hour automatically
- For offline users, last cached rates are used
- Currency conversion is bidirectional (handles both base and inverse rates)
- All prices maintain their original currency in the database
